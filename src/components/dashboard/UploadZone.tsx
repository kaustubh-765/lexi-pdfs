'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
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
          isDragActive && !isDragReject && 'border-blue-400 bg-blue-50',
          isDragReject && 'border-red-400 bg-red-50',
          !isDragActive && !uploading && 'border-gray-300 hover:border-blue-300 hover:bg-gray-50',
          uploading && 'border-gray-200 bg-gray-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-gray-600 font-medium">Uploading...</p>
            <p className="text-xs text-gray-400">Your document will be processed in the background</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {isDragActive ? (
              <FileText className="h-12 w-12 text-blue-400" />
            ) : (
              <Upload className="h-12 w-12 text-gray-300" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isDragActive ? 'Drop your PDF here' : 'Upload a PDF to start chatting'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Drag & drop or click to browse • Max 20MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
      )}
    </div>
  );
}
