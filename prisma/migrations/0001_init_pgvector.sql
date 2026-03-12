-- Run this after `prisma db push` to enable pgvector extension and create HNSW index.
-- Gemini text-embedding-004 produces 768-dimensional vectors (schema uses vector(768)).
-- If you switch EMBEDDING_PROVIDER back to openai (1536 dims), you must:
--   1. Change vector(768) -> vector(1536) in prisma/schema.prisma
--   2. Re-run: prisma db push --force-reset && psql $DATABASE_URL -f this file

CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX IF NOT EXISTS document_section_embedding_idx
  ON "DocumentSection" USING hnsw (embedding vector_cosine_ops);
