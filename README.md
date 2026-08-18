# LexiPDF

A Next.js 14 (App Router) application for isolated, RAG-based PDF summarization and chat. Each user uploads PDFs into isolated sessions; vector search is always scoped by `sessionId` at the SQL level, making cross-session contamination structurally impossible.

## Architecture

```
Upload PDF → 202 response (status: PENDING) → in-process worker picks it up
                                                     ↓
                          Parse → Chunk → Embed (via EMBEDDING_PROVIDER) → Summarize
                                                     ↓
                     Transactional write: chunks + summary + status → READY (or FAILED)
                                                     ↓
Chat message → Embed query (via EMBEDDING_PROVIDER) → Cosine similarity search (scoped by sessionId)
                                    ↓
              Retrieved chunks → Chat LLM (via LLM_PROVIDER) → Streaming SSE response
```

Ingestion runs asynchronously: `POST /api/sessions` returns immediately once the file is saved, and a background worker (`src/lib/worker/ingestionWorker.ts`, started via `instrumentation.ts`) polls for `PENDING` sessions and processes them. The dashboard polls session status until it's `READY` or `FAILED`.

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- A free [Groq API key](https://console.groq.com/keys) (chat/summarization) and a free [HuggingFace API token](https://huggingface.co/settings/tokens) (embeddings) — or OpenAI/Gemini keys if you'd rather use those providers instead

## Setup

### 1. Clone and install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://lexi:lexi_secret@localhost:5432/lexipdf"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
STORAGE_PROVIDER="local"

LLM_PROVIDER="groq"
EMBEDDING_PROVIDER="huggingface"
GROQ_API_KEY="gsk_..."
HUGGINGFACEHUB_API_KEY="hf_..."
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 3. Start Postgres with pgvector

```bash
docker-compose up -d
```

### 4. Initialize the database

```bash
# Create all tables
npx prisma db push

# Enable pgvector extension and create HNSW index
psql $DATABASE_URL -f prisma/migrations/0001_init_pgvector.sql
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Navigate to `/register` to create an account
2. Log in at `/login`
3. On the dashboard, drag & drop or click to upload a PDF (max 20MB)
4. The session appears immediately with a processing indicator while a background worker embeds all text chunks and generates a summary; if it fails, you'll see an error with a Retry button
5. Ask questions about your document in the chat interface once it's ready
6. Upload multiple PDFs — each gets its own isolated session

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing |
| `NEXTAUTH_URL` | Yes | App base URL (e.g. `http://localhost:3000`) |
| `STORAGE_PROVIDER` | No | `local` (default) or `s3` |
| `LLM_PROVIDER` | No | `groq` (default), `openai`, or `gemini` — controls chat + summarization |
| `EMBEDDING_PROVIDER` | No | `huggingface` (default, 384 dims), `gemini` (768 dims), or `openai` (1536 dims) |
| `GROQ_API_KEY` | Required when `LLM_PROVIDER=groq` | Free key from [console.groq.com](https://console.groq.com/keys). Chat-only — Groq has no embeddings API |
| `HUGGINGFACEHUB_API_KEY` | Required when `EMBEDDING_PROVIDER=huggingface` | Free token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (hosted Inference API) |
| `GEMINI_API_KEY` | Required when `LLM_PROVIDER=gemini` or `EMBEDDING_PROVIDER=gemini` | Google AI Studio key |
| `OPENAI_API_KEY` | Required when `LLM_PROVIDER=openai` or `EMBEDDING_PROVIDER=openai` | OpenAI key |
| `INGESTION_POLL_INTERVAL_MS` | No | How often the ingestion worker polls for `PENDING` sessions (default `2000`) |
| `LOG_LEVEL` | No | `debug`, `info` (default), `warn`, or `error` |

**Switching `EMBEDDING_PROVIDER` is a breaking schema change** — the pgvector column dimension must match the model's output (384/768/1536), and previously-ingested PDFs are not automatically re-embedded. See the doc comment in `src/lib/llm/index.ts` for the exact migration steps.

## Project Structure

```
src/
├── instrumentation.ts       # Boots the in-process ingestion worker on server start
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (auth)/register/     # Registration page
│   ├── (app)/dashboard/     # Protected dashboard
│   └── api/
│       ├── auth/[...nextauth]/     # NextAuth handler
│       ├── register/               # User registration
│       ├── sessions/               # List + create (fire-and-forget) sessions
│       ├── sessions/[id]/          # Get + delete session
│       ├── sessions/[id]/retry/    # Retry a FAILED session
│       └── chat/[sessionId]/       # Streaming SSE chat
├── components/
│   ├── ui/                  # Button, Input, Spinner
│   ├── auth/                # LoginForm, RegisterForm
│   └── dashboard/           # DashboardShell, ChatInterface, UploadZone, etc.
├── hooks/
│   └── usePollWhile.ts      # Generic polling hook (used for session status)
└── lib/
    ├── prisma.ts            # Singleton Prisma client
    ├── logger.ts            # Structured logger
    ├── llm/                 # getChatLLM() / getEmbeddingsClient() provider switch
    ├── auth/                # Password hashing
    ├── storage/             # LocalFileService + S3Provider stub
    ├── worker/
    │   └── ingestionWorker.ts  # Polls Postgres for PENDING sessions, processes them
    └── rag/
        ├── ingest.ts        # PDF → chunks → embeddings (pure compute, no DB writes)
        ├── summarize.ts     # Map-reduce summarization over in-memory chunks
        ├── pipeline.ts      # Transactional glue: ingest + summarize + persist
        ├── retriever.ts     # Session-scoped vector search
        └── chat.ts          # LCEL streaming chain
```

## Production Deployment

See [SUMMARY.md](./SUMMARY.md) for the full production checklist.
