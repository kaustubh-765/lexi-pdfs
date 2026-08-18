'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { SessionItem } from './SessionItem';
import type { SessionInfo } from './DashboardShell';

interface SessionSidebarProps {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SessionSidebar({ sessions, activeSessionId, onSelect, onDelete }: SessionSidebarProps) {
  return (
    <div className="w-64 flex flex-col bg-white border-r border-gray-200 h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">LexiPDF</h1>
        <p className="text-xs text-gray-400">Chat with your documents</p>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Documents
        </p>
        {sessions.length === 0 ? (
          <p className="px-2 text-xs text-gray-400">Upload a PDF to get started</p>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                {...session}
                isActive={session.id === activeSessionId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="px-2 py-3 border-t border-gray-100">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
