import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { runIngestionPipeline } from '@/lib/rag/pipeline';
import { createLogger } from '@/lib/logger';

const logger = createLogger('worker.ingestion');

const POLL_INTERVAL_MS = Number(process.env.INGESTION_POLL_INTERVAL_MS ?? 2000);
const MAX_ERROR_MESSAGE_LENGTH = 4000;

const globalForWorker = globalThis as unknown as {
  ingestionWorkerStarted?: boolean;
};

interface ClaimedSession {
  id: string;
  pdfPath: string;
}

/**
 * Atomically claims the oldest PENDING session by flipping it to PROCESSING in
 * one statement. FOR UPDATE SKIP LOCKED is a cheap safety margin against two
 * concurrent claimers within this single process/instance — it is NOT a
 * substitute for a real queue if this app ever runs as more than one instance.
 */
async function claimNextPendingSession(): Promise<ClaimedSession | null> {
  const rows = await prisma.$queryRaw<ClaimedSession[]>`
    UPDATE "Session"
    SET status = 'PROCESSING'::"SessionStatus", "updatedAt" = NOW()
    WHERE id = (
      SELECT id FROM "Session"
      WHERE status = 'PENDING'::"SessionStatus"
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "pdfPath"
  `;
  return rows[0] ?? null;
}

async function processNextPendingSession(): Promise<void> {
  const claimed = await claimNextPendingSession();
  if (!claimed) return;

  const log = logger.child({ sessionId: claimed.id });
  log.info('claimed session for ingestion');

  try {
    const absolutePath = await getStorageProvider().getPath(claimed.pdfPath);
    await runIngestionPipeline(claimed.id, absolutePath);
    log.info('ingestion succeeded');
  } catch (err) {
    log.error('ingestion failed', { err });

    const message = err instanceof Error ? err.message : String(err);
    try {
      await prisma.session.update({
        where: { id: claimed.id },
        data: { status: 'FAILED', errorMessage: message.slice(0, MAX_ERROR_MESSAGE_LENGTH) },
      });
    } catch (updateErr) {
      // Session may have been deleted by the user mid-flight — not a real error.
      log.warn('could not persist FAILED status (session likely deleted)', { err: updateErr });
    }
  }
}

async function pollLoop(): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processNextPendingSession();
    } catch (err) {
      logger.error('worker poll iteration failed', { err });
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Starts the in-process ingestion worker exactly once per server process.
 * Guarded via globalThis so Next.js dev-mode HMR doesn't spawn duplicate loops
 * (same pattern as the Prisma client singleton in src/lib/prisma.ts).
 */
export function startIngestionWorker(): void {
  if (globalForWorker.ingestionWorkerStarted) return;
  globalForWorker.ingestionWorkerStarted = true;

  logger.info('ingestion worker starting', { pollIntervalMs: POLL_INTERVAL_MS });
  void pollLoop();
}
