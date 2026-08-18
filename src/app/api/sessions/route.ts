import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { createLogger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rateLimit';
import { isPdf } from '@/lib/pdfSignature';

const logger = createLogger('api.sessions');
const UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      pdfName: true,
      summary: true,
      status: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { allowed, retryAfterMs } = checkRateLimit('sessions:upload', authSession.user.id, UPLOAD_LIMIT, UPLOAD_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    }

    // file.type is a client-supplied header and trivially spoofable — check
    // the actual bytes before writing anything to storage.
    if (!(await isPdf(file))) {
      return NextResponse.json({ error: 'File does not appear to be a valid PDF' }, { status: 400 });
    }

    // Save file
    const storage = getStorageProvider();
    const pdfPath = await storage.save(file);

    // Create session as PENDING — the in-process ingestion worker (see
    // src/lib/worker/ingestionWorker.ts) picks it up and processes it asynchronously,
    // so we respond immediately instead of blocking on parse/embed/summarize here.
    const dbSession = await prisma.session.create({
      data: {
        userId: authSession.user.id,
        pdfName: file.name,
        pdfPath,
        status: 'PENDING',
      },
      select: {
        id: true,
        pdfName: true,
        summary: true,
        status: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    return NextResponse.json(dbSession, { status: 202 });
  } catch (error) {
    logger.error('session creation failed', { err: error });
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 });
  }
}
