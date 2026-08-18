'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SummaryBadge } from './SummaryBadge';
import { TypingIndicator } from './TypingIndicator';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { usePollWhile } from '@/hooks/usePollWhile';
import type { SessionStatus } from './DashboardShell';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SessionData {
  id: string;
  pdfName: string;
  summary: string | null;
  status: SessionStatus;
  errorMessage?: string | null;
  messages: Message[];
}

interface ChatInterfaceProps {
  sessionId: string;
  onDelete: (sessionId: string) => void;
}

export function ChatInterface({ sessionId, onDelete }: ChatInterfaceProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryGeneration, setRetryGeneration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch session');
    return (await res.json()) as SessionData;
  }, [sessionId]);

  useEffect(() => {
    setLoading(true);
    fetchSession()
      .then((data) => {
        setSessionData(data);
        setMessages(data.messages || []);
      })
      .catch(() => setSessionData(null))
      .finally(() => setLoading(false));
  }, [sessionId, fetchSession]);

  // Poll for status updates while the document is still being ingested.
  usePollWhile(
    fetchSession,
    (data) => {
      setSessionData(data);
      setMessages(data.messages || []);
    },
    (data) => data.status === 'PENDING' || data.status === 'PROCESSING',
    2000,
    `${sessionId}:${retryGeneration}`
  );

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/retry`, { method: 'PATCH' });
      if (res.ok) {
        const updated = (await res.json()) as SessionData;
        setSessionData((prev) => (prev ? { ...prev, ...updated } : prev));
        setRetryGeneration((g) => g + 1);
      }
    } finally {
      setRetrying(false);
    }
  }

  async function handleSend(message: string) {
    if (isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setStreamingContent('');
    setIsStreaming(true);

    try {
      const response = await fetch(`/api/chat/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error('Chat request failed');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) {
              accumulated += parsed.chunk;
              setStreamingContent(accumulated);
            }
          } catch {
            // ignore parse errors on partial SSE lines
          }
        }
      }

      // Move streaming content to messages
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: accumulated },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setStreamingContent('');
      setIsStreaming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        Session not found
      </div>
    );
  }

  if (sessionData.status === 'PENDING' || sessionData.status === 'PROCESSING') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-white/5 glass">
          <h2 className="font-semibold text-slate-200 truncate">{sessionData.pdfName}</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-300">Processing your document...</p>
          <p className="text-xs text-slate-500">
            Extracting text, generating embeddings, and summarizing — this can take a minute for large PDFs.
          </p>
        </div>
      </div>
    );
  }

  if (sessionData.status === 'FAILED') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-white/5 glass">
          <h2 className="font-semibold text-slate-200 truncate">{sessionData.pdfName}</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-sm font-medium text-red-400">Processing failed</p>
          {sessionData.errorMessage && (
            <p className="text-xs text-slate-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 max-w-md">
              {sessionData.errorMessage}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={handleRetry} loading={retrying} size="sm">
              Retry
            </Button>
            <Button onClick={() => onDelete(sessionId)} variant="danger" size="sm">
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 glass">
        <h2 className="font-semibold text-slate-200 truncate">{sessionData.pdfName}</h2>
        <SummaryBadge summary={sessionData.summary} className="mt-3" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center text-slate-500 mt-8">
            <p className="text-sm">Ask a question about your document</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
          ))}
        </AnimatePresence>

        {isStreaming && streamingContent && (
          <ChatMessage role="assistant" content={streamingContent} isStreaming />
        )}

        {isStreaming && !streamingContent && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
