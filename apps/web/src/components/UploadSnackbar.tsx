import { CheckCircle2, FileText, LoaderCircle, XCircle } from 'lucide-react';

type UploadStatus = 'preparing' | 'uploading' | 'finalizing' | 'complete' | 'error';

export interface UploadSnackbarItem {
  id: string;
  name: string;
  progress: number;
  status: UploadStatus;
  error?: string;
}

function statusLabel(item: UploadSnackbarItem) {
  if (item.status === 'preparing') return 'Preparing upload…';
  if (item.status === 'uploading') return `Uploading ${item.progress}%`;
  if (item.status === 'finalizing') return 'Saving in Data Room…';
  if (item.status === 'complete') return 'Uploaded';
  return item.error ?? 'Upload failed';
}

function statusIcon(status: UploadStatus) {
  if (status === 'complete') return <CheckCircle2 className="text-emerald-600" size={16} />;
  if (status === 'error') return <XCircle className="text-red-600" size={16} />;
  return <LoaderCircle className="animate-spin text-brand" size={16} />;
}

export function UploadSnackbar({ items, onClose }: { items: UploadSnackbarItem[]; onClose: () => void }) {
  if (!items.length) return null;
  const hasActiveUploads = items.some(
    (item) => item.status === 'preparing' || item.status === 'uploading' || item.status === 'finalizing',
  );
  return (
    <aside
      className="fixed bottom-5 right-5 z-30 flex h-72 w-[26rem] max-w-[calc(100vw-2.5rem)] flex-col rounded-xl border bg-white p-4 shadow-xl"
      aria-live="polite"
      role="status"
    >
      <div className="mb-3 flex min-h-11 items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{hasActiveUploads ? 'Uploading files' : 'Upload status'}</p>
          <p className="text-xs text-slate-500">You can continue working while this completes.</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-sm text-slate-500 hover:text-ink">
          Hide
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <li key={item.id} className="h-[4.5rem] rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="shrink-0 text-rose-500" size={17} />
              <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
              <span className="shrink-0" aria-hidden="true">
                {statusIcon(item.status)}
              </span>
            </div>
            <div className="mt-1 flex h-4 items-center justify-between gap-3 text-xs">
              <span className={item.status === 'error' ? 'truncate text-red-600' : 'truncate text-slate-500'}>
                {statusLabel(item)}
              </span>
              <span className="shrink-0 text-slate-500">{item.progress}%</span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
              aria-label={`${item.name}: ${statusLabel(item)}`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={item.progress}
              role="progressbar"
            >
              <div
                className={`h-full transition-[width] duration-200 ${item.status === 'error' ? 'bg-red-500' : item.status === 'complete' ? 'bg-emerald-500' : 'bg-brand'}`}
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
