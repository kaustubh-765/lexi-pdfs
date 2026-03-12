import { cn } from '@/lib/utils';

interface SummaryBadgeProps {
  summary: string | null;
  className?: string;
}

export function SummaryBadge({ summary, className }: SummaryBadgeProps) {
  if (!summary) return null;

  return (
    <div className={cn('bg-blue-50 border border-blue-100 rounded-lg p-3', className)}>
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Summary</p>
      <p className="text-sm text-blue-900 leading-relaxed">{summary}</p>
    </div>
  );
}
