'use client';

import { FileText, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <motion.button
      onClick={() => onSelect(id)}
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'w-full text-left px-3 py-3 rounded-lg transition-colors group flex items-start gap-3',
        isActive
          ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-200'
          : 'hover:bg-white/5 text-slate-400 border border-transparent'
      )}
    >
      <FileText
        className={cn('h-4 w-4 mt-0.5 shrink-0', isActive ? 'text-indigo-400' : 'text-slate-500')}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn('text-sm font-medium truncate', isActive ? 'text-slate-200' : 'text-slate-400')}>
            {pdfName}
          </p>
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
        <p className="text-xs text-slate-600 mt-0.5">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-all"
        title="Delete session"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.button>
  );
}
