import { prisma } from '@/lib/prisma';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getChatLLM } from '@/lib/llm';

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

export async function summarizePdf(sessionId: string): Promise<string> {
  const sections = await prisma.documentSection.findMany({
    where: { sessionId },
    select: { id: true, content: true },
    orderBy: { createdAt: 'asc' },
  });

  if (sections.length === 0) {
    return 'No content available to summarize.';
  }

  const llm = getChatLLM({ temperature: 0 });
  const outputParser = new StringOutputParser();

  // Map: summarize each chunk
  const mapChain = mapPrompt.pipe(llm).pipe(outputParser);
  const chunkSummaries: string[] = [];

  for (const section of sections) {
    const summary = await mapChain.invoke({ text: section.content });
    chunkSummaries.push(summary.trim());
  }

  // Reduce: combine all summaries
  const reduceChain = reducePrompt.pipe(llm).pipe(outputParser);
  const finalSummary = await reduceChain.invoke({
    summaries: chunkSummaries.join('\n\n---\n\n'),
  });

  return finalSummary.trim();
}
