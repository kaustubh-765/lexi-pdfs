'use client';

import { useState } from 'react';
import { SessionSidebar } from './SessionSidebar';
import { ChatInterface } from './ChatInterface';
import { UploadZone } from './UploadZone';

interface SessionInfo {
  id: string;
  pdfName: string;
  summary: string | null;
  createdAt: string;
}

interface DashboardShellProps {
  initialSessions: SessionInfo[];
}

export function DashboardShell({ initialSessions }: DashboardShellProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessions[0]?.id ?? null
  );

  function handleUploadComplete(newSession: SessionInfo) {
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }

  async function handleDeleteSession(sessionId: string) {
    const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    if (!res.ok) return;

    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setActiveSessionId(remaining[0]?.id ?? null);
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        onDelete={handleDeleteSession}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeSessionId ? (
          <ChatInterface sessionId={activeSessionId} />
        ) : (
          <UploadZone onUploadComplete={handleUploadComplete} />
        )}
      </main>
    </div>
  );
}
