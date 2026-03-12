import { BaseRetriever, BaseRetrieverInput } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getEmbeddingsClient } from '@/lib/llm';

interface SectionRow {
  id: string;
  content: string;
  distance: number;
}

interface SessionScopedRetrieverInput extends BaseRetrieverInput {
  sessionId: string;
  topK?: number;
}

export class SessionScopedRetriever extends BaseRetriever {
  lc_namespace = ['lexi', 'retrievers'];

  private sessionId: string;
  private topK: number;

  constructor(fields: SessionScopedRetrieverInput) {
    super(fields);
    this.sessionId = fields.sessionId;
    this.topK = fields.topK ?? 5;
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const embeddings = getEmbeddingsClient({ taskType: 'RETRIEVAL_QUERY' });
    const queryVector = await embeddings.embedQuery(query);
    const vectorLiteral = `[${queryVector.join(',')}]`;

    // Session-scoped similarity search — isolation enforced at SQL level
    const rows = await prisma.$queryRaw<SectionRow[]>(
      Prisma.sql`
        SELECT id, content,
               embedding <=> ${vectorLiteral}::vector AS distance
        FROM "DocumentSection"
        WHERE "sessionId" = ${this.sessionId}
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${this.topK}
      `
    );

    return rows.map(
      (row) =>
        new Document({
          pageContent: row.content,
          metadata: { id: row.id, sessionId: this.sessionId, distance: row.distance },
        })
    );
  }
}
