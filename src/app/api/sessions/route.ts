import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { ingestPdf } from '@/lib/rag/ingest';
import { summarizePdf } from '@/lib/rag/summarize';

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

    // Save file
    const storage = getStorageProvider();
    const pdfPath = await storage.save(file);

    // Create session record
    const dbSession = await prisma.session.create({
      data: {
        userId: authSession.user.id,
        pdfName: file.name,
        pdfPath,
      },
    });

    // Get absolute path for ingestion
    const absolutePath = await storage.getPath(pdfPath);

    // Ingest PDF (embed chunks)
    await ingestPdf(dbSession.id, absolutePath);

    // Generate summary (map-reduce)
    const summary = await summarizePdf(dbSession.id);

    // Update session with summary
    const updated = await prisma.session.update({
      where: { id: dbSession.id },
      data: { summary },
      select: {
        id: true,
        pdfName: true,
        summary: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 });
  }
}
