import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rateLimit';

const RETRY_LIMIT = 10;
const RETRY_WINDOW_MS = 60 * 60 * 1000;

interface RouteParams {
  params: { sessionId: string };
}

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { allowed, retryAfterMs } = checkRateLimit('sessions:retry', authSession.user.id, RETRY_LIMIT, RETRY_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.userId !== authSession.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (session.status !== 'FAILED') {
    return NextResponse.json({ error: 'Only failed sessions can be retried' }, { status: 400 });
  }

  const updated = await prisma.session.update({
    where: { id: params.sessionId },
    data: { status: 'PENDING', errorMessage: null },
    select: {
      id: true,
      pdfName: true,
      summary: true,
      status: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}
