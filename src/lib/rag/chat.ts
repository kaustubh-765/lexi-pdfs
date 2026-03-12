import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { SessionScopedRetriever } from './retriever';
import { Document } from '@langchain/core/documents';
import { getChatLLM } from '@/lib/llm';

const chatPrompt = PromptTemplate.fromTemplate(
  `You are a helpful assistant that answers questions about a PDF document.
Use the following context from the document to answer the question.
If you cannot find the answer in the context, say so clearly.

Context:
{context}

Question: {question}

Answer:`
);

function formatDocuments(docs: Document[]): string {
  return docs.map((doc) => doc.pageContent).join('\n\n---\n\n');
}

export function createChatChain(sessionId: string) {
  const retriever = new SessionScopedRetriever({ sessionId, topK: 5 });
  const llm = getChatLLM({ streaming: true, temperature: 0.7 });

  const chain = RunnableSequence.from([
    {
      context: retriever.pipe((docs: Document[]) => formatDocuments(docs)),
      question: new RunnablePassthrough(),
    },
    chatPrompt,
    llm,
    new StringOutputParser(),
  ]);

  return chain;
}
