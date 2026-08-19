import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { messageFrom, WebMessages } from '../lib/messages';

interface UploadEntry {
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export function UploadDialog({
  open,
  initialFiles = [],
  onClose,
  onUpload,
}: {
  open: boolean;
  initialFiles?: File[];
  onClose: () => void;
  onUpload: (file: File, reportProgress: (loaded: number, total: number) => void) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setEntries(initialFiles.map((file) => ({ file, progress: 0, status: 'queued' })));
      setError('');
      setUploading(false);
    }
  }, [open, initialFiles]);
  if (!open) return null;

  const add = (files: FileList | File[]) => {
    const values = Array.from(files);
    const invalid = values.find(
      (file) => !file.name.toLowerCase().endsWith('.pdf') || file.size > 25 * 1024 * 1024,
    );
    if (invalid) return setError(WebMessages.uploads.invalidFiles);
    setError('');
    setEntries((current) => [
      ...current,
      ...values
        .slice(0, 10 - current.length)
        .map((file) => ({ file, progress: 0, status: 'queued' as const })),
    ]);
  };

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) add(event.target.files);
    event.target.value = '';
  };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    add(event.dataTransfer.files);
  };
  const submit = async () => {
    if (!entries.length) return setError(WebMessages.uploads.fileRequired);
    setUploading(true);
    setError('');
    const pending = entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.status !== 'complete');
    const results = await Promise.allSettled(
      pending.map(async ({ entry, index }) => {
        setEntries((current) =>
          current.map((value, position) =>
            position === index
              ? { ...value, status: 'uploading', progress: 0, error: undefined }
              : value,
          ),
        );
        try {
          await onUpload(entry.file, (loaded, total) =>
            setEntries((current) =>
              current.map((value, position) =>
                position === index
                  ? { ...value, progress: total ? Math.round((loaded / total) * 100) : 0 }
                  : value,
              ),
            ),
          );
          setEntries((current) =>
            current.map((value, position) =>
              position === index ? { ...value, status: 'complete', progress: 100 } : value,
            ),
          );
        } catch (cause) {
          const message = messageFrom(cause, WebMessages.uploads.uploadFailed);
          setEntries((current) =>
            current.map((value, position) =>
              position === index ? { ...value, status: 'error', error: message } : value,
            ),
          );
          throw new Error(message);
        }
      }),
    );
    setUploading(false);
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length) setError(WebMessages.uploads.failedFiles(failed.length));
    else onClose();
  };

  const canSubmit = entries.some((entry) => entry.status !== 'complete');
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-slate-950/30 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Upload PDF files</h2>
            <p className="mt-1 text-sm text-slate-500">
              Up to 10 PDFs, 25 MB each. Duplicate names are kept safely.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          onClick={() => inputRef.current?.click()}
          className={`mt-5 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-brand bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
        >
          <UploadCloud className="mx-auto text-brand" size={28} />
          <p className="mt-3 text-sm font-medium">Drop PDFs here, or browse files</p>
          <p className="mt-1 text-xs text-slate-500">Files remain private to this Data Room.</p>
          <input
            ref={inputRef}
            onChange={change}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
          />
        </div>
        {entries.length > 0 && (
          <ul className="mt-4 max-h-44 space-y-3 overflow-y-auto">
            {entries.map((entry, index) => (
              <li key={`${entry.file.name}-${index}`} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="shrink-0 text-rose-500" size={17} />
                  <span className="min-w-0 flex-1 truncate font-medium">{entry.file.name}</span>
                  <span className="text-xs text-slate-500">
                    {Math.ceil(entry.file.size / 1024)} KB
                  </span>
                  {!uploading && entry.status !== 'complete' && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setEntries((current) =>
                          current.filter((_, position) => position !== index),
                        );
                      }}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all ${entry.status === 'error' ? 'bg-red-500' : entry.status === 'complete' ? 'bg-emerald-500' : 'bg-brand'}`}
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
                {entry.status === 'complete' && (
                  <p className="mt-1 text-xs text-emerald-600">Uploaded</p>
                )}
                {entry.error && <p className="mt-1 text-xs text-red-600">{entry.error}</p>}
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={uploading || !canSubmit}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uploading
              ? 'Uploading…'
              : entries.some((entry) => entry.status === 'error')
                ? 'Retry failed files'
                : `Upload${entries.length ? ` ${entries.length} file${entries.length === 1 ? '' : 's'}` : ''}`}
          </button>
        </div>
      </section>
    </div>
  );
}
