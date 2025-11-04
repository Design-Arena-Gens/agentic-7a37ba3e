'use client';

import { useCallback, useRef, useState } from 'react';
import { clsx } from 'clsx';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export type FileDropZoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

export function FileDropZone({ onFiles, disabled }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isActive, setActive] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const accepted: File[] = [];
      Array.from(files).forEach((file) => {
        if (ACCEPTED_TYPES.includes(file.type)) {
          accepted.push(file);
        }
      });
      if (!accepted.length) {
        setHint('Only PNG, JPG, or WEBP images are supported.');
        return;
      }
      setHint(null);
      onFiles(accepted);
    },
    [onFiles],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      setActive(false);
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setActive(true);
  }, [disabled]);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setActive(false);
  }, [disabled]);

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className="space-y-3">
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={0}
        onClick={openFileDialog}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            openFileDialog();
          }
        }}
        className={clsx(
          'flex h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all',
          disabled && 'cursor-not-allowed opacity-50',
          isActive ? 'border-indigo-400 bg-indigo-950/40' : 'border-ink-700 bg-ink-800/40 hover:border-indigo-500',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          hidden
          disabled={disabled}
          onChange={(event) => {
            if (event.target.files) {
              handleFiles(event.target.files);
            }
          }}
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-lg font-semibold text-ink-100">Drop manga page scans here</span>
          <span className="text-sm text-ink-400">PNG, JPG, or WEBP · multi-page chapters supported</span>
          <span className="mt-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200">
            {disabled ? 'Processing...' : 'Click or drop files to begin'}
          </span>
        </div>
      </div>
      {hint ? <p className="text-sm text-rose-300">{hint}</p> : null}
    </div>
  );
}
