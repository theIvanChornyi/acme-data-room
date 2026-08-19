import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicShareContents, RoomItem } from '@acme/contracts';
import { ChevronRight, FileText, Folder, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { PdfViewerDialog } from './PdfViewerDialog';

function formatFileSize(sizeBytes?: number) {
  if (!sizeBytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const value = sizeBytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: value >= 10 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
}

export function SharedRoom() {
  const { token } = useParams();
  const [folderId, setFolderId] = useState<string | undefined>();
  const [contents, setContents] = useState<PublicShareContents | null>(null);
  const [error, setError] = useState('');
  const [viewerFile, setViewerFile] = useState<{ id: string; name: string; url: string } | null>(null);
  useEffect(() => {
    if (!token) return;
    setError(''); setContents(null);
    void api.publicContents(token, folderId).then(setContents).catch((cause) => setError(cause instanceof Error ? cause.message : 'This shared link is unavailable.'));
  }, [token, folderId]);
  const openFile = async (file: RoomItem) => {
    if (!token) return;
    try { const { url } = await api.publicViewFile(token, file.id); setViewerFile({ id: file.id, name: file.name, url }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open this document.'); }
  };
  const downloadFile = async (file: { id: string; name: string }) => {
    if (!token) return;
    try { const { url } = await api.publicDownloadFile(token, file.id); const link = document.createElement('a'); link.href = url; link.download = file.name; document.body.append(link); link.click(); link.remove(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to download this document.'); }
  };
  if (!token) return <SharedError message="This shared link is invalid." />;
  if (error) return <SharedError message={error} />;
  if (!contents) return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Loading shared Data Room…</main>;
  const title = contents.folder?.name ?? contents.scopeName;
  return <><header className="border-b bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-5 font-semibold"><span className="rounded-lg bg-brand p-1.5 text-white"><ShieldCheck size={17} /></span>Acme Data Room<span className="ml-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-brand">Read-only</span></div></header><main className="mx-auto max-w-6xl px-5 py-10"><nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-slate-500"><button title={`Open ${contents.scopeName}`} onClick={() => setFolderId(undefined)} className="hover:text-brand">{contents.scopeName}</button>{contents.breadcrumbs.map((crumb) => <span key={crumb.id} className="flex items-center gap-1">/ <button title={`Open ${crumb.name}`} onClick={() => setFolderId(crumb.id)} className="hover:text-brand">{crumb.name}</button></span>)}</nav><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{contents.shareDescription && <p className="mt-2 text-sm text-slate-600">{contents.shareDescription}</p>}{contents.room.description && contents.targetType === 'DATA_ROOM' && !contents.folder && <p className="mt-2 text-sm text-slate-500">{contents.room.description}</p>}<section className="mt-7 overflow-hidden rounded-xl border bg-white shadow-card"><div className="grid grid-cols-[minmax(0,1fr)_9rem_6rem_7rem] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Name</span><span>Type</span><span>Size</span><span>Modified</span></div>{contents.items.length ? contents.items.map((item) => <button key={item.id} onClick={() => item.kind === 'folder' ? setFolderId(item.id) : void openFile(item)} className="grid w-full grid-cols-[minmax(0,1fr)_9rem_6rem_7rem] items-center gap-4 border-b px-5 py-3.5 text-left last:border-0 hover:bg-blue-50/50"><span className="flex min-w-0 items-center gap-3 font-medium"><span className={item.kind === 'folder' ? 'text-amber-500' : 'text-rose-500'}>{item.kind === 'folder' ? <Folder fill="currentColor" size={20} /> : <FileText size={20} />}</span><span className="truncate">{item.name}</span>{item.kind === 'folder' && <ChevronRight className="ml-auto text-slate-400" size={17} />}</span><span className="text-sm text-slate-500">{item.kind === 'folder' ? 'Folder' : 'PDF document'}</span><span className="text-sm text-slate-500">{item.kind === 'file' ? formatFileSize(item.sizeBytes) : '—'}</span><span className="text-sm text-slate-500">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(item.updatedAt))}</span></button>) : <div className="py-16 text-center text-sm text-slate-500">This folder is empty.</div>}</section></main><PdfViewerDialog file={viewerFile} onClose={() => setViewerFile(null)} onDownload={downloadFile} /></>;
}

function SharedError({ message }: { message: string }) {
  return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-card"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600"><ShieldCheck size={22} /></div><h1 className="mt-5 text-xl font-semibold">Shared Data Room unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">{message}</p></section></main>;
}
