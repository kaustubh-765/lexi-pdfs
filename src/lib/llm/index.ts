import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';

/**
 * LLM_PROVIDER       — controls the chat model
 *   openai  → gpt-4o-mini           (requires OPENAI_API_KEY)
 *   gemini  → gemini-2.5-flash      (requires GEMINI_API_KEY)
 *
 * EMBEDDING_PROVIDER — controls the embedding model
 *   gemini  → text-embedding-004    768 dims  (requires GEMINI_API_KEY)  ← default
 *   openai  → text-embedding-3-small 1536 dims (requires OPENAI_API_KEY)
 *
 * IMPORTANT: The DB schema column type must match the embedding dimensions.
 *   Current schema: vector(768)  →  use EMBEDDING_PROVIDER=gemini
 *   To switch to OpenAI embeddings (1536 dims):
 *     1. Change vector(768) → vector(1536) in prisma/schema.prisma
 *     2. npx prisma db push --force-reset
 *     3. psql $DATABASE_URL -f prisma/migrations/0001_init_pgvector.sql
 *     4. Set EMBEDDING_PROVIDER=openai and re-upload all PDFs
 */
export type LLMProvider = 'openai' | 'gemini';
export type EmbeddingProvider = 'gemini' | 'openai';

export interface ChatLLMOptions {
  streaming?: boolean;
  temperature?: number;
}

/**
 * taskType tunes Gemini embeddings for the operation being performed.
 * 'RETRIEVAL_DOCUMENT' — for indexing chunks at ingest time
 * 'RETRIEVAL_QUERY'    — for embedding the user's search query at retrieval time
 * Omitting it causes the Gemini API to return empty values arrays.
 * Has no effect when EMBEDDING_PROVIDER=openai.
 */
export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY';

export interface EmbeddingsOptions {
  taskType?: EmbeddingTaskType;
}

export function getChatLLM(options: ChatLLMOptions = {}): BaseChatModel {
  const provider = (process.env.LLM_PROVIDER ?? 'openai') as LLMProvider;
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
    });
  }

  // Default: OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ChatOpenAI } = require('@langchain/openai');
  return new ChatOpenAI({
    model: 'gpt-4o-mini',
    openAIApiKey: apiKey,
    streaming,
    temperature,
  });
}

export function getEmbeddingsClient(options: EmbeddingsOptions = {}): Embeddings {
  const provider = (process.env.EMBEDDING_PROVIDER ?? 'gemini') as EmbeddingProvider;
  const { taskType } = options;

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OpenAIEmbeddings } = require('@langchain/openai');
    return new OpenAIEmbeddings({
      model: 'text-embedding-3-small', // 1536 dims — requires vector(1536) in schema
      openAIApiKey: apiKey,
    });
  }

  // Default: Gemini
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
  });
}
