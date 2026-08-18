'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedPdfIcon } from './AnimatedPdfIcon';
import type { SessionInfo } from './DashboardShell';

interface UploadZoneProps {
  onUploadComplete: (session: SessionInfo) => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError('');
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        // Do NOT set Content-Type — let browser set multipart boundary
        const res = await fetch('/api/sessions', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Upload failed');
          return;
        }

        onUploadComplete(data);
      } catch {
        setError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    disabled: uploading,
    onDropRejected: (fileRejections) => {
      const reason = fileRejections[0]?.errors[0]?.message || 'Invalid file';
      setError(reason);
    },
  });

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div
        {...getRootProps()}
        className={cn(
          'w-full max-w-lg border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
          isDragActive && !isDragReject && 'border-indigo-500 bg-indigo-500/10',
          isDragReject && 'border-red-500 bg-red-500/10',
          !isDragActive && !uploading && 'border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.02] glass',
          uploading && 'border-white/5 bg-white/[0.02] glass cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-slate-300 font-medium">Uploading...</p>
            <p className="text-xs text-slate-500">Your document will be processed in the background</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <AnimatedPdfIcon />
            <div>
              <p className="text-sm font-medium text-slate-300">
                {isDragActive ? 'Drop your PDF here' : 'Upload a PDF to start chatting'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Drag & drop or click to browse • Max 20MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
