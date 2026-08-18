import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { prepareIngestion, toVectorLiteral } from './ingest';
import { summarizeChunks } from './summarize';
import { createLogger } from '@/lib/logger';

const logger = createLogger('rag.pipeline');

const INSERT_BATCH_SIZE = 500;
const TRANSACTION_TIMEOUT_MS = 30_000;
const TRANSACTION_MAX_WAIT_MS = 10_000;

/**
 * Runs the full ingestion pipeline for a session: parse+chunk+embed the PDF,
 * summarize it, then persist chunks + summary + READY status atomically.
 *
 * Embeddings and LLM calls (external HTTP, no DB) happen entirely before the
 * transaction opens, so a failure there touches zero DocumentSection rows.
 * Only the DB writes are transactional — either all chunks + the summary +
 * status land together, or none of them do.
 */
export async function runIngestionPipeline(sessionId: string, pdfPath: string): Promise<void> {
  const log = logger.child({ sessionId });

  const sections = await prepareIngestion(sessionId, pdfPath);
  log.info('sections prepared, summarizing', { chunkCount: sections.length });

  const summary = await summarizeChunks(sections.map((s) => s.content));
  log.info('summary generated, persisting', { chunkCount: sections.length });

  await prisma.$transaction(
    async (tx) => {
      // Defensive no-op safety net: clears out any stale rows from a prior partial
      // attempt (e.g. a manual retry after a FAILED run) before inserting fresh ones.
      await tx.documentSection.deleteMany({ where: { sessionId } });

      for (let i = 0; i < sections.length; i += INSERT_BATCH_SIZE) {
        const batch = sections.slice(i, i + INSERT_BATCH_SIZE);
        const values = batch.map(
          (s) =>
            Prisma.sql`(${s.id}, ${sessionId}, ${s.content}, ${toVectorLiteral(s.vector)}::vector, NOW())`
        );

        await tx.$executeRaw(
          Prisma.sql`
            INSERT INTO "DocumentSection" (id, "sessionId", content, embedding, "createdAt")
            VALUES ${Prisma.join(values)}
          `
        );
      }

      await tx.session.update({
        where: { id: sessionId },
        data: { summary, status: 'READY', errorMessage: null },
      });
    },
    { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_MAX_WAIT_MS }
  );

  log.info('ingestion pipeline completed', { chunkCount: sections.length });
}
