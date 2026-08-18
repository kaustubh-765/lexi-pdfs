import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { readFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getEmbeddingsClient } from '@/lib/llm';
import { createLogger } from '@/lib/logger';

// Import from internal path to avoid test-runner pollution
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const logger = createLogger('rag.ingest');

export interface PreparedSection {
  id: string;
  content: string;
  vector: number[];
}

/**
 * Parses, chunks, and embeds a PDF. Performs no database writes — this is pure
 * external computation (filesystem read + embeddings API calls) so that callers
 * can wrap only the DB persistence step in a transaction, and a failure here never
 * leaves partial rows to roll back.
 */
export async function prepareIngestion(sessionId: string, pdfPath: string): Promise<PreparedSection[]> {
  const log = logger.child({ sessionId });

  // 1. Read and parse PDF
  const buffer = await readFile(pdfPath);
  const data = await pdfParse(buffer);
  const text: string = data.text;

  if (!text || text.trim().length === 0) {
    throw new Error('PDF appears to be empty or unreadable');
  }

  // 2. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitText(text);

  if (chunks.length === 0) {
    throw new Error('No text chunks generated from PDF');
  }

  log.info('starting embedding', { totalChunks: chunks.length });

  const embeddings = getEmbeddingsClient({ taskType: 'RETRIEVAL_DOCUMENT' });

  // 3. Embed in batches of 100 to avoid rate limits
  const batchSize = 100;
  const sections: PreparedSection[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    log.info('embedding batch', { batchStart: i, batchSize: batch.length, totalChunks: chunks.length });

    try {
      const vectors = await embeddings.embedDocuments(batch);

      for (let j = 0; j < batch.length; j++) {
        const vector = vectors[j];
        if (!vector || vector.length === 0) {
          throw new Error(`Embedding API returned an empty vector for chunk ${i + j}`);
        }
        sections.push({ id: uuidv4(), content: batch[j], vector });
      }
    } catch (err) {
      log.error('embedding batch failed', { err, batchStart: i, batchSize: batch.length });
      throw err;
    }
  }

  log.info('embedding complete', { totalChunks: chunks.length });
  return sections;
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
