# LexiPDF

A Next.js 14 (App Router) application for isolated, RAG-based PDF summarization and chat. Each user uploads PDFs into isolated sessions; vector search is always scoped by `sessionId` at the SQL level, making cross-session contamination structurally impossible.

## Architecture

```
Upload PDF → Parse → Chunk → Embed (OpenAI) → Store (pgvector)
                                                     ↓
Chat message → Embed query → Cosine similarity search (scoped by sessionId)
                                    ↓
              Retrieved chunks → GPT-4o-mini → Streaming SSE response
```

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- OpenAI API key

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
OPENAI_API_KEY="sk-..."
STORAGE_PROVIDER="local"
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
4. Wait for processing — the app will embed all text chunks and generate a summary
5. Ask questions about your document in the chat interface
6. Upload multiple PDFs — each gets its own isolated session

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing |
| `NEXTAUTH_URL` | Yes | App base URL (e.g. `http://localhost:3000`) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings + chat |
| `STORAGE_PROVIDER` | No | `local` (default) or `s3` |

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (auth)/register/     # Registration page
│   ├── (app)/dashboard/     # Protected dashboard
│   └── api/
│       ├── auth/[...nextauth]/  # NextAuth handler
│       ├── register/            # User registration
│       ├── sessions/            # List + create sessions
│       ├── sessions/[id]/       # Get + delete session
│       └── chat/[sessionId]/    # Streaming SSE chat
├── components/
│   ├── ui/                  # Button, Input, Spinner
│   ├── auth/                # LoginForm, RegisterForm
│   └── dashboard/           # DashboardShell, ChatInterface, UploadZone, etc.
└── lib/
    ├── prisma.ts            # Singleton Prisma client
    ├── auth/                # Password hashing
    ├── storage/             # LocalFileService + S3Provider stub
    └── rag/
        ├── ingest.ts        # PDF → chunks → embeddings → DB
        ├── retriever.ts     # Session-scoped vector search
        ├── chat.ts          # LCEL streaming chain
        └── summarize.ts     # Map-reduce summarization
```

## Production Deployment

See [SUMMARY.md](./SUMMARY.md) for the full production checklist.
