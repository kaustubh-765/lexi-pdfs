'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

  function handleNewUpload() {
    setActiveSessionId(null);
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

  const panelKey = activeSessionId ?? 'upload';

  return (
    <div className="flex h-screen bg-[#060b18]">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        onDelete={handleDeleteSession}
        onNewUpload={handleNewUpload}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={panelKey}
            className="flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeSessionId ? (
              <ChatInterface sessionId={activeSessionId} />
            ) : (
              <UploadZone onUploadComplete={handleUploadComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
