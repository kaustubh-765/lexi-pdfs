'use client';

import { LogOut, Upload } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { SessionItem } from './SessionItem';

interface SessionInfo {
  id: string;
  pdfName: string;
  summary: string | null;
  createdAt: string;
}

interface SessionSidebarProps {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewUpload?: () => void;
}

export function SessionSidebar({ sessions, activeSessionId, onSelect, onDelete, onNewUpload }: SessionSidebarProps) {
  return (
    <div className="w-64 flex flex-col glass border-r border-white/5 h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/5">
        <h1 className="text-lg font-bold gradient-text">LexiPDF</h1>
        <p className="text-xs text-slate-500">Chat with your documents</p>
      </div>

      {/* New Upload button */}
      {onNewUpload && (
        <div className="px-2 pt-3">
          <button
            onClick={onNewUpload}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload new PDF
          </button>
        </div>
      )}

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="px-2 text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
          Documents
        </p>
        {sessions.length === 0 ? (
          <p className="px-2 text-xs text-slate-600">Upload a PDF to get started</p>
        ) : (
          <div className="space-y-0.5">
            <AnimatePresence initial={false}>
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <SessionItem
                    {...session}
                    isActive={session.id === activeSessionId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="px-2 py-3 border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
