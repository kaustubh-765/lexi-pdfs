import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createChatChain } from '@/lib/rag/chat';
import { checkRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
});

const CHAT_LIMIT = 30;
const CHAT_WINDOW_MS = 10 * 60 * 1000;

interface RouteParams {
  params: { sessionId: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { allowed, retryAfterMs } = checkRateLimit('chat', authSession.user.id, CHAT_LIMIT, CHAT_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  // Verify session ownership
  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.userId !== authSession.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { message } = chatSchema.parse(body);

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: params.sessionId,
        role: 'user',
        content: message,
      },
    });

    // Create chat chain and stream response
    const chain = createChatChain(params.sessionId);
    const encoder = new TextEncoder();
    let fullResponse = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = await chain.stream(message);
          for await (const chunk of stream) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // Save assistant message after stream completes
          await prisma.chatMessage.create({
            data: {
              sessionId: params.sessionId,
              role: 'assistant',
              content: fullResponse,
            },
          });
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
