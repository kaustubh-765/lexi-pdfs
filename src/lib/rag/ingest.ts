import { prisma } from '@/lib/prisma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Prisma } from '@prisma/client';
import { readFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getEmbeddingsClient } from '@/lib/llm';

// Import from internal path to avoid test-runner pollution
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

export async function ingestPdf(sessionId: string, pdfPath: string): Promise<void> {
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

  const embeddings = getEmbeddingsClient({ taskType: 'RETRIEVAL_DOCUMENT' });

  // 3. Embed in batches of 100 to avoid rate limits
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const vectors = await embeddings.embedDocuments(batch);

    // 4. Bulk insert using $executeRaw with ::vector cast
    for (let j = 0; j < batch.length; j++) {
      const id = uuidv4();
      const content = batch[j];
      const vector = vectors[j];

      if (!vector || vector.length === 0) {
        throw new Error(
          `Embedding API returned an empty vector for chunk ${i + j}. ` +
          'Verify GEMINI_API_KEY is valid and EMBEDDING_PROVIDER is set correctly.'
        );
      }

      const vectorLiteral = `[${vector.join(',')}]`;

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "DocumentSection" (id, "sessionId", content, embedding, "createdAt")
          VALUES (${id}, ${sessionId}, ${content}, ${vectorLiteral}::vector, NOW())
        `
      );
    }
  }
}
