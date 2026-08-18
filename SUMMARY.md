# LexiPDF — Technical Summary

## RAG Pipeline Walkthrough

### Providers

Both the chat/summarization LLM and the embeddings model are swappable via env vars, resolved in `src/lib/llm/index.ts`:

| | `LLM_PROVIDER` (chat + summarization) | `EMBEDDING_PROVIDER` |
|---|---|---|
| Default | `groq` → `openai/gpt-oss-120b` | `huggingface` → `sentence-transformers/all-MiniLM-L6-v2` (384 dims) |
| Alternative | `gemini` → `gemini-2.5-flash` | `gemini` → `text-embedding-004` (768 dims) |
| Alternative | `openai` → `gpt-4o-mini` | `openai` → `text-embedding-3-small` (1536 dims) |

Groq has no embeddings endpoint (chat/completions only), so `EMBEDDING_PROVIDER` is always one of the other three regardless of `LLM_PROVIDER`. **Switching `EMBEDDING_PROVIDER` is a breaking schema change** — the pgvector column dimension must match the new model's output, and there's no in-place re-embedding of already-ingested PDFs (see the migration steps in `src/lib/llm/index.ts`'s doc comment).

### Ingestion Flow (asynchronous)

`POST /api/sessions` only saves the file and creates a `Session` row with `status: PENDING`, then responds `202` immediately. Actual processing happens in a background worker (`src/lib/worker/ingestionWorker.ts`, started once per server process via `instrumentation.ts`) that polls Postgres for `PENDING` sessions:

```
Worker claims a PENDING session (atomic UPDATE ... RETURNING, status → PROCESSING)
  └─> prepareIngestion() [src/lib/rag/ingest.ts] — pure compute, no DB writes:
        pdf-parse (extract raw text)
        └─> RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
        └─> getEmbeddingsClient().embedDocuments() [batched 100 at a time]
  └─> summarizeChunks() [src/lib/rag/summarize.ts] — map-reduce over in-memory chunks
  └─> prisma.$transaction(...) [src/lib/rag/pipeline.ts]:
        multi-row INSERT INTO "DocumentSection" ... ::vector  (batched 500 rows)
        UPDATE "Session" SET summary = ..., status = 'READY'
  └─> on any failure: status → FAILED, errorMessage set (zero partial rows persisted)
```

Embeddings/LLM calls (external HTTP) happen entirely *before* the transaction opens — only the DB writes are transactional, so a mid-pipeline failure (e.g. a 429) never leaves partial `DocumentSection` rows. Every stage logs through `src/lib/logger.ts` (structured JSON, `sessionId`-scoped). A `FAILED` session can be retried via `PATCH /api/sessions/[sessionId]/retry`, which resets it to `PENDING` for the worker to pick up again — there is no automatic retry/backoff.

Each chunk is stored as a row in `DocumentSection` with:
- `sessionId` — links to the user's session (enables isolation)
- `content` — the raw text chunk
- `embedding` — a pgvector column sized to match `EMBEDDING_PROVIDER` (`vector(384)` by default)

### Chat Flow

```
User message
  └─> getEmbeddingsClient().embedQuery()     (embed the question)
  └─> $queryRaw cosine similarity search WHERE sessionId = X
      (returns top-5 most relevant chunks)
  └─> PromptTemplate (context + question)
  └─> getChatLLM() (streaming: true)
  └─> SSE stream to browser (data: {"chunk": "..."}\n\n)
  └─> Save assistant message to DB after stream closes
```

The chain is built with LangChain LCEL `RunnableSequence` (not deprecated `RetrievalQAChain`).

---

## Session Isolation Design

### SQL-Level Guarantee

The `SessionScopedRetriever` always adds a `WHERE "sessionId" = $sessionId` clause to every vector similarity query:

```sql
SELECT id, content, embedding <=> '[...]'::vector AS distance
FROM "DocumentSection"
WHERE "sessionId" = 'clxxx...'    -- ← structurally impossible to omit
ORDER BY embedding <=> '[...]'::vector
LIMIT 5
```

This is not a filter applied in application code after fetching — it is part of the SQL query itself. A bug in application code cannot leak rows from another session because the database enforces the constraint.

### API-Level Ownership Check

Every `/api/sessions/[sessionId]` and `/api/chat/[sessionId]` endpoint verifies:

```ts
if (session.userId !== authSession.user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

Even if a user guesses another session's ID, the API returns 403 before any DB query runs.

### Cascade Deletion

All related data is deleted when a session is deleted:

```prisma
session   Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
```

Deleting a `Session` row automatically deletes all its `ChatMessage` and `DocumentSection` rows, including embeddings. No orphaned vectors can persist.

---

## Map-Reduce Summarization

Standard "stuff" summarization fails for long documents because the full text exceeds the LLM context window.

LexiPDF uses a **two-stage map-reduce** approach:

**Map stage** — each `DocumentSection` chunk is summarized independently:
```
"Summarize the following text excerpt in 2-3 sentences: {text}"
```

**Reduce stage** — all chunk summaries are combined:
```
"Combine these section summaries into a 3-5 sentence final summary: {summaries}"
```

This scales to arbitrarily large PDFs. The summary is generated by the background worker as part of the ingestion pipeline (`src/lib/rag/pipeline.ts`) and committed to `Session.summary` in the same transaction as the chunk inserts and the `READY` status update.

---

## S3 Production Roadmap

The `S3Provider` stub in `src/lib/storage/S3Provider.ts` documents the full implementation roadmap:

1. **Install**: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
2. **Env vars**: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
3. **`save()`**: Use `PutObjectCommand` to upload file buffer to S3 key `uploads/<uuid>/<name>`
4. **`getPath()`**: For server-side ingestion, use `GetObjectCommand` and stream directly to `pdf-parse` (avoid writing to disk)
5. **IAM policy**: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::bucket/uploads/*`
6. **Multipart upload**: For files > 5MB, use `createMultipartUpload` to avoid memory pressure

Switch providers by setting `STORAGE_PROVIDER=s3` in production.

---

## Production Checklist

### Already addressed
- **Async, transactional ingestion**: `POST /api/sessions` no longer blocks on parse/embed/summarize — a background worker processes `PENDING` sessions and commits chunks + summary + `READY` status in one transaction, so a mid-pipeline failure never leaves partial `DocumentSection` rows (see `src/lib/rag/pipeline.ts`, `src/lib/worker/ingestionWorker.ts`).
- **Structured logging**: `src/lib/logger.ts` provides leveled, `sessionId`-scoped JSON logs for the ingestion pipeline and worker. It's a lightweight console wrapper, not a shipping/aggregation solution — pair with a log aggregator (or swap for pino) if you need cross-instance search.

### Database
- [ ] **PgBouncer**: Add connection pooler between app and Postgres. Prisma's `?pgbouncer=true` flag must be set in `DATABASE_URL`. Without this, serverless/edge deployments exhaust Postgres connection limits.
- [ ] **HNSW index**: Run `prisma/migrations/0001_init_pgvector.sql` to create the HNSW index on `DocumentSection.embedding`. Without this, vector search performs a full sequential scan.
- [ ] **Backup**: Enable automated Postgres backups (WAL archiving or managed DB snapshots)

### Application
- [ ] **Multi-stage Dockerfile**: Separate build and runtime stages to reduce image size
  ```dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npx prisma generate && npm run build

  FROM node:20-alpine AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  CMD ["node", "server.js"]
  ```
- [ ] **`NEXTAUTH_SECRET`**: Must be cryptographically random, never committed to source control
- [ ] **Rate limiting**: Add rate limiting to `/api/register`, `/api/sessions` (POST), and `/api/chat`
- [ ] **Provider error handling / backoff**: The ingestion worker currently has no automatic retry — a `FAILED` session requires a manual `PATCH /api/sessions/[id]/retry`. This is intentional (avoids burning API calls retrying deterministically-bad PDFs) but a transient 429 from Groq/HuggingFace still requires the user to click Retry. Add backoff-and-auto-retry if that's not acceptable.
- [ ] **Multi-instance ingestion**: The worker's claim query uses `FOR UPDATE SKIP LOCKED`, which is safe against double-processing but is not a substitute for a real queue if you ever run more than one app instance — there's no distributed leader election or work redistribution.

### Infrastructure
- [ ] **S3 for PDF storage**: `LocalFileService` writes to the container filesystem; this is lost on redeploy. Switch to S3 for persistent storage.
- [ ] **CDN**: Serve static assets via CDN (Next.js on Vercel does this automatically)
- [ ] **Monitoring**: Add error tracking (Sentry) and uptime monitoring
- [ ] **Free-tier rate limits**: Groq and the HuggingFace hosted Inference API both have free-tier request/rate limits (and HF has cold-start latency on lesser-used models) — fine for development, but budget for paid tiers or self-hosted inference before real production traffic.
