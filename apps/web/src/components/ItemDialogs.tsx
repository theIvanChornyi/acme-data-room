import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { BulkDeletionSummary, FolderDeletionSummary, RoomItem } from '@acme/contracts';
import { messageFrom, WebMessages } from '../lib/messages';

export function RenameDialog({
  item,
  onClose,
  onSubmit,
}: {
  item: RoomItem | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setName(item?.name ?? '');
    setError('');
  }, [item]);
  if (!item) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError(WebMessages.dialogs.nameRequired);
    setSaving(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (cause) {
      setError(messageFrom(cause, WebMessages.dialogs.renameFailed));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog title={`Rename ${item.kind}`}>
      <form onSubmit={submit}>
        <label className="block text-sm font-medium">
          Name
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={180}
            className="mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <DialogActions saving={saving} label="Save" onClose={onClose} />
      </form>
    </Dialog>
  );
}

export function MoveFileDialog({
  item,
  folders,
  loading = false,
  onClose,
  onSubmit,
}: {
  item: RoomItem | null;
  folders: Array<{ id: string; name: string; depth: number }>;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (folderId: string | null) => Promise<void>;
}) {
  const [folderId, setFolderId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setFolderId('');
    setError('');
  }, [item]);
  if (!item) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setSaving(true);
    try {
      await onSubmit(folderId || null);
      onClose();
    } catch (cause) {
      setError(messageFrom(cause, WebMessages.dialogs.moveFailed));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog title="Move file">
      <form onSubmit={submit}>
        <p className="text-sm text-slate-500">
          Choose where to move <span className="font-medium text-ink">{item.name}</span>.
        </p>
        <label className="mt-5 block text-sm font-medium">
          Destination
          <select
            value={folderId}
            disabled={loading}
            onChange={(event) => setFolderId(event.target.value)}
            className="mt-2 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
          >
            <option value="">Data Room root</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {'— '.repeat(folder.depth)}
                {folder.name}
              </option>
            ))}
          </select>
        </label>
        {loading && <p className="mt-2 text-xs text-slate-500">Loading folder options…</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <DialogActions saving={saving} disabled={loading} label="Move file" onClose={onClose} />
      </form>
    </Dialog>
  );
}

export function DeleteDialog({
  item,
  summary,
  onClose,
  onSubmit,
}: {
  item: RoomItem | null;
  summary: FolderDeletionSummary | null;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setError(''), [item]);
  if (!item) return null;
  const submit = async () => {
    setDeleting(true);
    try {
      await onSubmit();
      onClose();
    } catch (cause) {
      setError(messageFrom(cause, WebMessages.dialogs.deleteFailed));
    } finally {
      setDeleting(false);
    }
  };
  const folderText = summary
    ? `This permanently removes ${summary.folders} folder${summary.folders === 1 ? '' : 's'} and ${summary.files} file${summary.files === 1 ? '' : 's'}.`
    : 'This permanently removes the selected document.';
  const shareEffects = summary
    ? [
        summary.shares.publicLinks
          ? `${summary.shares.publicLinks} public link${summary.shares.publicLinks === 1 ? '' : 's'}`
          : null,
        summary.shares.userAccessGrants
          ? `${summary.shares.userAccessGrants} read-only access grant${summary.shares.userAccessGrants === 1 ? '' : 's'}`
          : null,
      ].filter((effect): effect is string => Boolean(effect))
    : [];
  return (
    <Dialog title={`Delete ${item.kind}?`}>
      <p className="text-sm leading-6 text-slate-600">
        {folderText}{' '}
        {shareEffects.length
          ? `It also revokes ${shareEffects.join(' and ')}. `
          : ''}
        This cannot be undone.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} disabled={deleting} className="px-3 py-2 text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={deleting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </Dialog>
  );
}

export function BulkDeleteDialog({
  count,
  summary,
  onClose,
  onSubmit,
}: {
  count: number;
  summary: BulkDeletionSummary | null;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setError(''), [count, summary]);
  const submit = async () => {
    setDeleting(true);
    try {
      await onSubmit();
      onClose();
    } catch (cause) {
      setError(messageFrom(cause, WebMessages.dialogs.deleteFailed));
    } finally {
      setDeleting(false);
    }
  };
  const shareEffects = summary
    ? [
        summary.shares.publicLinks
          ? `${summary.shares.publicLinks} public link${summary.shares.publicLinks === 1 ? '' : 's'}`
          : null,
        summary.shares.userAccessGrants
          ? `${summary.shares.userAccessGrants} read-only access grant${summary.shares.userAccessGrants === 1 ? '' : 's'}`
          : null,
      ].filter((effect): effect is string => Boolean(effect))
    : [];
  return (
    <Dialog title={`Delete ${count} selected item${count === 1 ? '' : 's'}?`}>
      <p className="text-sm leading-6 text-slate-600">
        {summary
          ? `This permanently removes ${summary.folders} folder${summary.folders === 1 ? '' : 's'} and ${summary.files} file${summary.files === 1 ? '' : 's'}. `
          : 'Preparing the deletion summary… '}
        {shareEffects.length ? `It also revokes ${shareEffects.join(' and ')}. ` : ''}
        This cannot be undone.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} disabled={deleting} className="px-3 py-2 text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={deleting || !summary}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </Dialog>
  );
}

function Dialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-slate-950/30 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}
function DialogActions({
  saving,
  disabled = false,
  label,
  onClose,
}: {
  saving: boolean;
  disabled?: boolean;
  label: string;
  onClose: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="px-3 py-2 text-sm font-medium"
      >
        Cancel
      </button>
      <button
        disabled={saving || disabled}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : label}
      </button>
    </div>
  );
}
