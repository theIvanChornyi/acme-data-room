import { useEffect, useState, type FormEvent } from 'react';
import { messageFrom, WebMessages } from '../lib/messages';

export function CreateFolderDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setName('');
      setError('');
    }
  }, [open]);
  if (!open) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError(WebMessages.dialogs.folderNameRequired);
    setSaving(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (cause) {
      setError(messageFrom(cause, WebMessages.dialogs.createFolderFailed));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-slate-950/30 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">New folder</h2>
        <p className="mt-1 text-sm text-slate-500">Names must be unique within this folder.</p>
        <label className="mt-5 block text-sm font-medium">
          Folder name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={180}
            className="mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium">
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create folder'}
          </button>
        </div>
      </form>
    </div>
  );
}
