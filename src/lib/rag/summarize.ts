import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getChatLLM } from '@/lib/llm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('rag.summarize');

const mapPrompt = PromptTemplate.fromTemplate(
  `Summarize the following text excerpt from a PDF document in 2-3 sentences:

{text}

Summary:`
);

const reducePrompt = PromptTemplate.fromTemplate(
  `You are given summaries of different sections of a PDF document.
Combine them into a single, coherent summary of the entire document in 3-5 sentences.

Section summaries:
{summaries}

Final summary:`
);

/**
 * Map-reduce summarization over in-memory chunk text. Takes no sessionId/DB
 * dependency so it can run before any DocumentSection rows exist for the session.
 */
export async function summarizeChunks(chunks: string[]): Promise<string> {
  if (chunks.length === 0) {
    return 'No content available to summarize.';
  }

  const llm = getChatLLM({ temperature: 0 });
  const outputParser = new StringOutputParser();

  // Map: summarize each chunk
  const mapChain = mapPrompt.pipe(llm).pipe(outputParser);
  const chunkSummaries: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const summary = await mapChain.invoke({ text: chunks[i] });
      chunkSummaries.push(summary.trim());
    } catch (err) {
      logger.error('map-stage summarization failed', { err, chunkIndex: i, totalChunks: chunks.length });
      throw err;
    }
  }

  // Reduce: combine all summaries
  const reduceChain = reducePrompt.pipe(llm).pipe(outputParser);
  const finalSummary = await reduceChain.invoke({
    summaries: chunkSummaries.join('\n\n---\n\n'),
  });

  return finalSummary.trim();
}
