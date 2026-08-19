'use client';

import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = 'Ask about your document...' }: ChatInputProps) {
  const [value, setValue] = useState('');

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = !!value.trim() && !disabled;

  return (
    <div className="flex items-end gap-2 p-4 border-t border-white/5 glass">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-xl px-4 py-2.5 text-sm',
          'bg-white/5 border border-white/10 text-slate-200 placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'max-h-32 overflow-y-auto'
        )}
        style={{ minHeight: '42px' }}
      />
      <motion.button
        onClick={handleSend}
        disabled={!canSend}
        whileHover={canSend ? { scale: 1.05 } : {}}
        whileTap={canSend ? { scale: 0.95 } : {}}
        className={cn(
          'p-2.5 rounded-xl text-white transition-colors',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          canSend
            ? 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25'
            : 'bg-white/10'
        )}
      >
        <Send className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
