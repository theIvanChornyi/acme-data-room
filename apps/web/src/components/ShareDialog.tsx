import { useEffect, useMemo, useState } from 'react';
import type { PublicShare } from '@acme/contracts';
import { Check, Copy, Link2, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import type { PublicShareTarget } from '../lib/api';

export function ShareDialog({ roomId, target, targetName, open, onClose }: { roomId: string; target: PublicShareTarget; targetName: string; open: boolean; onClose: () => void }) {
  const [shares, setShares] = useState<PublicShare[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const targetId = target.targetType === 'FOLDER' ? target.folderId : target.targetType === 'FILE' ? target.fileId : '';
  const stableTarget = useMemo<PublicShareTarget>(() => target.targetType === 'FOLDER' ? { targetType: 'FOLDER', folderId: targetId } : target.targetType === 'FILE' ? { targetType: 'FILE', fileId: targetId } : { targetType: 'DATA_ROOM' }, [target.targetType, targetId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setError('');
    void api.publicShares(roomId, stableTarget).then(setShares).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load public links.')).finally(() => setLoading(false));
  }, [open, roomId, stableTarget]);

  const create = async () => {
    setCreating(true); setError('');
    try {
      const share = await api.createPublicShare(roomId, stableTarget, description.trim() || undefined);
      setShares((current) => [share, ...current]);
      setDescription('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create a public link.');
    } finally {
      setCreating(false);
    }
  };
  const copy = async (share: PublicShare) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/shared/${share.token}`); setCopiedId(share.id); window.setTimeout(() => setCopiedId(null), 1800); }
    catch { setError('Unable to copy the link. Select it manually and copy it.'); }
  };
  const revoke = async (shareId: string) => {
    setError('');
    try { await api.revokePublicShare(roomId, shareId); setShares((current) => current.filter((share) => share.id !== shareId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to revoke this link.'); }
  };

  if (!open) return null;
  const scopeDescription = target.targetType === 'DATA_ROOM' ? 'this Data Room and its documents.' : target.targetType === 'FOLDER' ? 'this folder and everything inside it.' : 'this document only.';
  return <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/30 p-4" role="dialog" aria-modal="true" aria-labelledby="share-title">
    <section className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="share-title" className="text-lg font-semibold">Share {targetName}</h2><p className="mt-1 text-sm text-slate-500">Anyone with a public link can view {scopeDescription}</p></div>
        <button type="button" title="Close sharing" aria-label="Close sharing" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={20} /></button>
      </div>
      <label className="mt-5 block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={280} rows={2} placeholder="For example: Financial materials for review" className="mt-1.5 block w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15" />
      </label>
      <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{description.length}/280</span><button type="button" title="Create public link" onClick={create} disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50">{creating ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}Create public link</button></div>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 border-t pt-4"><h3 className="text-sm font-semibold">Active public links</h3>{loading ? <p className="mt-3 text-sm text-slate-500">Loading links…</p> : shares.length ? <ul className="mt-3 space-y-3">{shares.map((share) => {
        const link = `${window.location.origin}/shared/${share.token}`;
        return <li key={share.id} className="rounded-lg border bg-slate-50 p-3"><div className="flex items-center gap-2"><Link2 className="shrink-0 text-brand" size={17} /><input readOnly value={link} aria-label="Public share link" className="min-w-0 flex-1 bg-transparent text-sm text-slate-600 outline-none" /><button type="button" title="Copy public link" aria-label="Copy public link" onClick={() => void copy(share)} className="rounded p-1.5 text-slate-500 hover:bg-white hover:text-brand">{copiedId === share.id ? <Check className="text-emerald-600" size={17} /> : <Copy size={17} />}</button><button type="button" title="Revoke public link" aria-label="Revoke public link" onClick={() => void revoke(share.id)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button></div>{share.description && <p className="mt-2 text-sm text-slate-600">{share.description}</p>}<p className="mt-2 text-xs text-slate-400">Created {new Date(share.createdAt).toLocaleString()}</p></li>;
      })}</ul> : <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No public links yet. Create one when you are ready to share.</p>}</div>
    </section>
  </div>;
}
