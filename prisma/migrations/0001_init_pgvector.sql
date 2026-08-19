-- Run this after `prisma db push` to enable pgvector extension and create HNSW index.
-- Default EMBEDDING_PROVIDER=huggingface uses sentence-transformers/all-MiniLM-L6-v2,
-- which produces 384-dimensional vectors (schema uses vector(384)).
-- The HNSW index below is dimension-agnostic (dimension lives on the column type),
-- so switching providers never requires editing this file's index DDL.
-- If you switch EMBEDDING_PROVIDER to gemini (768 dims) or openai (1536 dims), you must:
--   1. Change vector(384) -> vector(768) or vector(1536) in prisma/schema.prisma
--   2. Re-run: prisma db push --force-reset && psql $DATABASE_URL -f this file
--   3. Re-upload all PDFs — there is no in-place re-embedding of existing vectors

CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX IF NOT EXISTS document_section_embedding_idx
  ON "DocumentSection" USING hnsw (embedding vector_cosine_ops);
