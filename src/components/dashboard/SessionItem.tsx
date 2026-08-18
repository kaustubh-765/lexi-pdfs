'use client';

import { FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import type { SessionStatus } from './DashboardShell';

interface SessionItemProps {
  id: string;
  pdfName: string;
  createdAt: string;
  status: SessionStatus;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SessionItem({ id, pdfName, createdAt, status, isActive, onSelect, onDelete }: SessionItemProps) {
  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`Delete "${pdfName}"? This cannot be undone.`)) {
      onDelete(id);
    }
  }

  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        'w-full text-left px-3 py-3 rounded-lg transition-colors group flex items-start gap-3',
        isActive ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-100 text-gray-700'
      )}
    >
      <FileText className={cn('h-4 w-4 mt-0.5 shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{pdfName}</p>
          {(status === 'PENDING' || status === 'PROCESSING') && (
            <Spinner size="sm" className="h-3 w-3 shrink-0" />
          )}
          {status === 'FAILED' && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0"
              title="Processing failed"
            />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 hover:text-red-600 transition-all"
        title="Delete session"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </button>
  );
}
