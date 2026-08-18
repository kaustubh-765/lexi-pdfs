import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';

/**
 * Every LangChain client below inherits a default of 6 retries with generic
 * exponential backoff (via @langchain/core's AsyncCaller/p-retry) that does NOT
 * honor providers' `Retry-After` headers on 429s. Capping at 3 and adding a
 * bounded timeout (where the client supports one) keeps one slow/rate-limited
 * provider from stacking 6x retries across a single chat request or blocking
 * the ingestion worker's poll loop.
 */
const LLM_MAX_RETRIES = 3;
const LLM_TIMEOUT_MS = 30_000;

/**
 * LLM_PROVIDER       — controls the chat model
 *   groq    → openai/gpt-oss-120b       (requires GROQ_API_KEY)   ← default, chat-only (no embeddings API)
 *   gemini  → gemini-2.5-flash         (requires GEMINI_API_KEY)
 *   openai  → gpt-4o-mini              (requires OPENAI_API_KEY)
 *
 * EMBEDDING_PROVIDER — controls the embedding model
 *   huggingface → sentence-transformers/all-MiniLM-L6-v2  384 dims (requires HUGGINGFACEHUB_API_KEY)  ← default
 *   gemini      → text-embedding-004                       768 dims (requires GEMINI_API_KEY)
 *   openai      → text-embedding-3-small                   1536 dims (requires OPENAI_API_KEY)
 *
 * IMPORTANT: The DB schema column type must match the embedding dimensions.
 *   Current schema: vector(384)  →  use EMBEDDING_PROVIDER=huggingface
 *   To switch to Gemini embeddings (768 dims):
 *     1. Change vector(384) → vector(768) in prisma/schema.prisma
 *     2. npx prisma db push --force-reset
 *     3. psql $DATABASE_URL -f prisma/migrations/0001_init_pgvector.sql
 *     4. Set EMBEDDING_PROVIDER=gemini and re-upload all PDFs
 *   To switch to OpenAI embeddings (1536 dims):
 *     1. Change vector(384) → vector(1536) in prisma/schema.prisma
 *     2. npx prisma db push --force-reset
 *     3. psql $DATABASE_URL -f prisma/migrations/0001_init_pgvector.sql
 *     4. Set EMBEDDING_PROVIDER=openai and re-upload all PDFs
 */
export type LLMProvider = 'groq' | 'openai' | 'gemini';
export type EmbeddingProvider = 'huggingface' | 'gemini' | 'openai';

export interface ChatLLMOptions {
  streaming?: boolean;
  temperature?: number;
}

/**
 * taskType tunes Gemini embeddings for the operation being performed.
 * 'RETRIEVAL_DOCUMENT' — for indexing chunks at ingest time
 * 'RETRIEVAL_QUERY'    — for embedding the user's search query at retrieval time
 * Omitting it causes the Gemini API to return empty values arrays.
 * Has no effect when EMBEDDING_PROVIDER=openai or huggingface.
 */
export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY';

export interface EmbeddingsOptions {
  taskType?: EmbeddingTaskType;
}

export function getChatLLM(options: ChatLLMOptions = {}): BaseChatModel {
  const provider = (process.env.LLM_PROVIDER ?? 'groq') as LLMProvider;
  const { streaming = false, temperature = 0 } = options;

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
    return new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey,
      streaming,
      temperature,
      maxRetries: LLM_MAX_RETRIES, // no `timeout` field on this client
    });
  }

  if (provider === 'groq') {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is required when LLM_PROVIDER=groq');

    // Groq has no LangChain-JS integration compatible with the @langchain/core version
    // pinned here (@langchain/groq requires @langchain/core@^1.x). Groq's API is
    // OpenAI-compatible, so we reuse ChatOpenAI pointed at Groq's base URL instead.
    // NOTE: Groq deprecated llama-3.3-70b-versatile on 2026-06-17; openai/gpt-oss-120b
    // is their recommended replacement (131k context, function calling, JSON mode).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ChatOpenAI } = require('@langchain/openai');
    return new ChatOpenAI({
      model: 'openai/gpt-oss-120b',
      apiKey,
      streaming,
      temperature,
      maxRetries: LLM_MAX_RETRIES,
      timeout: LLM_TIMEOUT_MS,
      configuration: { baseURL: 'https://api.groq.com/openai/v1' },
    });
  }

  // Default fallback: OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ChatOpenAI } = require('@langchain/openai');
  return new ChatOpenAI({
    model: 'gpt-4o-mini',
    openAIApiKey: apiKey,
    streaming,
    temperature,
    maxRetries: LLM_MAX_RETRIES,
    timeout: LLM_TIMEOUT_MS,
  });
}

export function getEmbeddingsClient(options: EmbeddingsOptions = {}): Embeddings {
  const provider = (process.env.EMBEDDING_PROVIDER ?? 'huggingface') as EmbeddingProvider;
  const { taskType } = options;

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OpenAIEmbeddings } = require('@langchain/openai');
    return new OpenAIEmbeddings({
      model: 'text-embedding-3-small', // 1536 dims — requires vector(1536) in schema
      openAIApiKey: apiKey,
      maxRetries: LLM_MAX_RETRIES,
      timeout: LLM_TIMEOUT_MS,
    });
  }

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is required when EMBEDDING_PROVIDER=gemini');

    if (!taskType) {
      throw new Error(
        'taskType is required for Gemini embeddings. ' +
        "Use 'RETRIEVAL_DOCUMENT' when ingesting and 'RETRIEVAL_QUERY' when searching."
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
    return new GoogleGenerativeAIEmbeddings({
      model: 'text-embedding-004', // 768 dims — matches vector(768) in schema
      apiKey,
      taskType,
      maxRetries: LLM_MAX_RETRIES, // no `timeout` field on this client
    });
  }

  // Default fallback: HuggingFace Inference API
  const apiKey = process.env.HUGGINGFACEHUB_API_KEY;
  if (!apiKey) {
    throw new Error('HUGGINGFACEHUB_API_KEY is required when EMBEDDING_PROVIDER=huggingface');
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');
  return new HuggingFaceInferenceEmbeddings({
    apiKey,
    model: 'sentence-transformers/all-MiniLM-L6-v2', // 384 dims — matches vector(384) in schema
    maxRetries: LLM_MAX_RETRIES, // no `timeout` field on this client
  });
}
