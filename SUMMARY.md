# LexiPDF — Technical Summary

## RAG Pipeline Walkthrough

### Ingestion Flow

```
PDF file
  └─> pdf-parse           (extract raw text)
  └─> RecursiveCharacterTextSplitter  (1000 chars, 200 overlap)
  └─> OpenAIEmbeddings (text-embedding-3-small, 1536 dims)
      [batched 100 at a time to respect rate limits]
  └─> $executeRaw INSERT INTO "DocumentSection" ... ::vector
```

Each chunk is stored as a row in `DocumentSection` with:
- `sessionId` — links to the user's session (enables isolation)
- `content` — the raw text chunk
- `embedding` — 1536-dimension vector (`vector(1536)` pgvector column)

### Chat Flow

```
User message
  └─> OpenAIEmbeddings.embedQuery()     (embed the question)
  └─> $queryRaw cosine similarity search WHERE sessionId = X
      (returns top-5 most relevant chunks)
  └─> PromptTemplate (context + question)
  └─> ChatOpenAI gpt-4o-mini (streaming: true)
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

This scales to arbitrarily large PDFs. The summary is generated once at upload time and stored in `Session.summary`.

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
- [ ] **OpenAI error handling**: Retry on 429 (rate limit) with exponential backoff

### Infrastructure
- [ ] **S3 for PDF storage**: `LocalFileService` writes to the container filesystem; this is lost on redeploy. Switch to S3 for persistent storage.
- [ ] **CDN**: Serve static assets via CDN (Next.js on Vercel does this automatically)
- [ ] **Monitoring**: Add error tracking (Sentry) and uptime monitoring
- [ ] **Embedding costs**: `text-embedding-3-small` costs ~$0.02 per 1M tokens. Add size limits and/or cost estimates per upload.
