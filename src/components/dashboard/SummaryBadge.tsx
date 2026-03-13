'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SummaryBadgeProps {
  summary: string | null;
  className?: string;
}

export function SummaryBadge({ summary, className }: SummaryBadgeProps) {
  if (!summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3 }}
      className={cn(
        'glass border border-indigo-500/20 rounded-lg p-3 overflow-hidden',
        className
      )}
    >
      <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Summary</p>
      <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
    </motion.div>
  );
}
