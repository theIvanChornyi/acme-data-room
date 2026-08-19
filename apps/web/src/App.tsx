import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { LogOut, MoreHorizontal, Pencil, Plus, Share2, ShieldCheck, Trash2 } from 'lucide-react';
import type { DataRoomSummary, FolderContents, RoomItem } from '@acme/contracts';
import { api, type PublicShareTarget } from './lib/api';
import { supabase } from './lib/supabase';
import { CreateFolderDialog } from './components/CreateFolderDialog';
import { EmptyState } from './components/EmptyState';
import { RoomContents, type ItemAction } from './components/RoomContents';
import { DeleteDialog, RenameDialog } from './components/ItemDialogs';
import { FolderTree, type TreeFolder } from './components/FolderTree';
import { DataRoomDialog, DeleteDataRoomDialog } from './components/DataRoomDialog';
import { WorkspaceDropzone } from './components/WorkspaceDropzone';
import { UploadSnackbar, type UploadSnackbarItem } from './components/UploadSnackbar';
import { ShareDialog } from './components/ShareDialog';
import { SharedRoom } from './components/SharedRoom';
import { PdfViewerDialog } from './components/PdfViewerDialog';

function Login() {
  const [error, setError] = useState('');
  const signIn = async () => { if (!supabase) return setError('Add Supabase credentials to apps/web/.env before signing in.'); const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); if (authError) setError(authError.message); };
  return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-card"><div className="mb-8 flex items-center gap-3"><div className="rounded-xl bg-brand p-2 text-white"><ShieldCheck size={22} /></div><span className="font-semibold">Acme Data Room</span></div><h1 className="text-2xl font-semibold tracking-tight">Due diligence, organized.</h1><p className="mt-3 text-sm leading-6 text-slate-500">Securely collect, organize, and share the documents your deal team needs.</p><button onClick={signIn} className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border bg-white py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50"><span className="font-bold text-blue-500">G</span> Continue with Google</button>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<p className="mt-7 text-center text-xs text-slate-400">Read-only sharing keeps your sensitive materials controlled.</p></section></main>;
}

function Dashboard() {
  const [rooms, setRooms] = useState<DataRoomSummary[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [editingRoom, setEditingRoom] = useState<DataRoomSummary | null | undefined>(null); const [deletingRoom, setDeletingRoom] = useState<DataRoomSummary | null>(null); const [menuRoomId, setMenuRoomId] = useState<string | null>(null);
  useEffect(() => { api.rooms().then(setRooms).catch((cause) => setError(cause.message)).finally(() => setLoading(false)); }, []);
  const saveRoom = async (name: string, description: string) => { if (editingRoom) { const updated = await api.renameRoom(editingRoom.id, name, description); setRooms((current) => current.map((room) => room.id === updated.id ? updated : room)); } else { const created = await api.createRoom(name, description || undefined); setRooms((current) => [created, ...current]); } };
  const deleteRoom = async () => { if (!deletingRoom) return; await api.deleteRoom(deletingRoom.id); setRooms((current) => current.filter((room) => room.id !== deletingRoom.id)); };
  return <Layout><div className="mb-8 flex items-end justify-between"><div><p className="text-sm font-medium text-brand">Workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Your Data Rooms</h1></div><button title="New Data Room" onClick={() => setEditingRoom(undefined)} className="rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white"><Plus className="mr-1.5 inline" size={17} />New Data Room</button></div>{error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <p className="text-sm text-slate-500">Loading your rooms…</p> : rooms.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((room) => <article key={room.id} className="relative rounded-xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-blue-200"><Link to={`/rooms/${room.id}`} className="block"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-brand"><ShieldCheck size={20} /></div><h2 className="mt-5 pr-7 font-semibold">{room.name}</h2><p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{room.description ?? 'No description provided.'}</p><p className="mt-5 text-xs text-slate-400">Updated {new Date(room.updatedAt).toLocaleDateString()}</p></Link><div className="absolute right-4 top-4"><button title={`Actions for ${room.name}`} aria-label={`Actions for ${room.name}`} onClick={() => setMenuRoomId((current) => current === room.id ? null : room.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><MoreHorizontal size={18} /></button>{menuRoomId === room.id && <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border bg-white py-1 shadow-lg"><button title={`Rename ${room.name}`} onClick={() => { setMenuRoomId(null); setEditingRoom(room); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"><Pencil size={15} />Rename</button><button title={`Delete ${room.name}`} onClick={() => { setMenuRoomId(null); setDeletingRoom(room); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 size={15} />Delete</button></div>}</div></article>)}</div> : <div className="rounded-xl border border-dashed bg-white py-20 text-center"><h2 className="font-semibold">Create your first Data Room</h2><p className="mt-2 text-sm text-slate-500">Start with one secure place for all deal documents.</p></div>}<DataRoomDialog room={editingRoom} onClose={() => setEditingRoom(null)} onSubmit={saveRoom} /><DeleteDataRoomDialog room={deletingRoom} onClose={() => setDeletingRoom(null)} onDelete={deleteRoom} /></Layout>;
}

function RoomPage() {
  const { roomId } = useParams(); const navigate = useNavigate(); const [folderId, setFolderId] = useState<string | undefined>(); const [contents, setContents] = useState<FolderContents | null>(null); const [error, setError] = useState(''); const [dialogOpen, setDialogOpen] = useState(false); const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null); const [dataRoomDialog, setDataRoomDialog] = useState<DataRoomSummary | undefined | null>(null); const [shareTarget, setShareTarget] = useState<{ target: PublicShareTarget; name: string } | null>(null); const [viewerFile, setViewerFile] = useState<{ id: string; name: string; url: string } | null>(null); const [snackbarUploads, setSnackbarUploads] = useState<UploadSnackbarItem[]>([]); const [activeItem, setActiveItem] = useState<RoomItem | null>(null); const [activeAction, setActiveAction] = useState<ItemAction | null>(null); const [folders, setFolders] = useState<TreeFolder[]>([]); const [rooms, setRooms] = useState<DataRoomSummary[]>([]); const [deletionSummary, setDeletionSummary] = useState<{ folders: number; files: number; sizeBytes: string } | null>(null); const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const load = () => { if (roomId) api.contents(roomId, folderId).then(setContents).catch((cause) => setError(cause.message)); };
  const loadFolders = () => { if (roomId) api.folders(roomId).then(setFolders).catch((cause) => setError(cause.message)); };
  const loadRooms = () => api.rooms().then(setRooms).catch((cause) => setError(cause.message));
  useEffect(load, [roomId, folderId]);
  useEffect(loadFolders, [roomId]);
  useEffect(() => { void loadRooms(); }, []);
  if (!roomId) return <Navigate to="/" replace />;
  const createFolder = async (name: string) => { await api.createFolder(roomId, name, newFolderParentId ?? undefined); load(); loadFolders(); };
  const openFile = async (fileId: string) => { try { const { url } = await api.viewFile(roomId, fileId); const file = contents?.items.find((item) => item.id === fileId); setViewerFile({ id: fileId, name: file?.name ?? 'PDF document', url }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open file.'); } };
  const downloadFile = async (file: { id: string; name: string }) => { try { const { url } = await api.downloadFile(roomId, file.id); const link = document.createElement('a'); link.href = url; link.download = file.name; document.body.append(link); link.click(); link.remove(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to download file.'); } };
  const startAction = async (action: ItemAction, item: RoomItem) => { try { setActiveItem(item); setActiveAction(action); if (action === 'delete') { setDeletionSummary(null); setDeletionSummary(item.kind === 'folder' ? await api.folderDeletionSummary(roomId, item.id) : null); } } catch (cause) { setActiveItem(null); setActiveAction(null); setError(cause instanceof Error ? cause.message : 'Unable to prepare this action.'); } };
  const closeAction = () => { setActiveItem(null); setActiveAction(null); setDeletionSummary(null); };
  const rename = async (name: string) => { if (!activeItem) return; if (activeItem.kind === 'folder') { await api.renameFolder(roomId, activeItem.id, name); loadFolders(); } else await api.renameFile(roomId, activeItem.id, name); load(); };
  const remove = async () => { if (!activeItem) return; if (activeItem.kind === 'folder') await api.deleteFolder(roomId, activeItem.id); else await api.deleteFile(roomId, activeItem.id); load(); loadFolders(); };
  const dropFile = async (fileId: string, destinationId: string | null) => { setDraggedFileId(null); try { await api.moveFile(roomId, fileId, destinationId); load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to move file.'); } };
  const dropFileToRoom = async (fileId: string, destinationRoomId: string) => { setDraggedFileId(null); try { await api.moveFileToRoom(roomId, fileId, destinationRoomId); load(); loadRooms(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to move file to this Data Room.'); } };
  const openFolderDialog = (parentId: string | null) => { setNewFolderParentId(parentId); setDialogOpen(true); };
  const openItemShare = (item: RoomItem) => setShareTarget({ target: item.kind === 'folder' ? { targetType: 'FOLDER', folderId: item.id } : { targetType: 'FILE', fileId: item.id }, name: item.name });
  const saveDataRoom = async (name: string, description: string) => {
    if (dataRoomDialog) {
      const updated = await api.renameRoom(dataRoomDialog.id, name, description);
      setRooms((current) => current.map((room) => room.id === updated.id ? updated : room));
      return;
    }
    const created = await api.createRoom(name, description || undefined);
    setRooms((current) => [created, ...current]); navigate(`/rooms/${created.id}`);
  };
  const startWorkspaceUpload = (files: File[]) => {
    const accepted = files.slice(0, 10).filter((file) => file.name.toLowerCase().endsWith('.pdf') && file.size <= 25 * 1024 * 1024);
    if (!accepted.length) return setError('Drop PDF files only; each file must be 25 MB or smaller.');
    const uploadFolderId = folderId;
    const batch = accepted.map((file) => ({ id: crypto.randomUUID(), name: file.name, progress: 0, status: 'uploading' as const }));
    setSnackbarUploads(batch);
    void Promise.allSettled(batch.map(async (entry, index) => {
      try {
        await api.uploadFile(roomId, uploadFolderId, accepted[index], (loaded, total) => setSnackbarUploads((current) => current.map((item) => item.id === entry.id ? { ...item, progress: total ? Math.round((loaded / total) * 100) : 0 } : item)));
        setSnackbarUploads((current) => current.map((item) => item.id === entry.id ? { ...item, progress: 100, status: 'complete' } : item));
      } catch (cause) { setSnackbarUploads((current) => current.map((item) => item.id === entry.id ? { ...item, status: 'error', error: cause instanceof Error ? cause.message : 'Unable to upload this file.' } : item)); }
    })).then(() => load());
  };
  const currentRoom = rooms.find((room) => room.id === roomId);
  const activeRoomName = currentRoom?.name ?? 'Data Room';
  const openTitleRename = () => {
    if (contents?.folder) {
      setActiveItem({ id: contents.folder.id, name: contents.folder.name, kind: 'folder', parentId: contents.folder.parentId, createdAt: '', updatedAt: '' });
      setActiveAction('rename');
    } else if (currentRoom) setDataRoomDialog(currentRoom);
  };
  const titleName = contents?.folder?.name ?? activeRoomName;
  const currentShareTarget: PublicShareTarget = contents?.folder ? { targetType: 'FOLDER', folderId: contents.folder.id } : { targetType: 'DATA_ROOM' };
  return <Layout><button title="All Data Rooms" onClick={() => navigate('/')} className="mb-5 text-sm text-slate-500 hover:text-ink">← All Data Rooms</button><div className="rounded-xl border bg-white shadow-card lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]"><FolderTree rooms={rooms} folders={folders} activeRoomId={roomId} activeFolderId={folderId} draggedFileId={draggedFileId} onSelectRoom={(destinationRoomId) => { setFolderId(undefined); navigate(`/rooms/${destinationRoomId}`); }} onSelectFolder={setFolderId} onDropFile={dropFile} onDropFileToRoom={dropFileToRoom} onCreateFolder={openFolderDialog} onCreateDataRoom={() => setDataRoomDialog(undefined)} /><section className="min-w-0 p-5 lg:p-7"><div className="mb-6"><nav className="mb-2 flex items-center gap-1 text-sm text-slate-500"><button title={`Open ${activeRoomName}`} onClick={() => setFolderId(undefined)} className="hover:text-brand">{activeRoomName}</button>{contents?.breadcrumbs.map((crumb) => <span key={crumb.id} className="flex items-center gap-1">/ <button title={`Open ${crumb.name}`} onClick={() => setFolderId(crumb.id)} className="hover:text-brand">{crumb.name}</button></span>)}</nav><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">{titleName}</h1><button type="button" title={`Rename ${titleName}`} aria-label={`Rename ${titleName}`} onClick={openTitleRename} disabled={!contents && !currentRoom} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"><Pencil size={17} /></button><button type="button" title={`Share ${titleName}`} aria-label={`Share ${titleName}`} onClick={() => setShareTarget({ target: currentShareTarget, name: titleName })} disabled={!currentRoom} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"><Share2 size={17} /></button></div></div><WorkspaceDropzone onFiles={startWorkspaceUpload} showPrompt={!contents?.items.length}>{error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : contents?.items.length ? <RoomContents items={contents.items} currentFolderId={folderId} draggedFileId={draggedFileId} onOpenFolder={setFolderId} onOpenFile={openFile} onAction={startAction} onShare={openItemShare} onDownload={(item) => void downloadFile(item)} onDragFile={setDraggedFileId} onDropFile={dropFile} /> : <EmptyState onNewFolder={() => openFolderDialog(folderId ?? null)} />}</WorkspaceDropzone><CreateFolderDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setNewFolderParentId(null); }} onSubmit={createFolder} /><DataRoomDialog room={dataRoomDialog} onClose={() => setDataRoomDialog(null)} onSubmit={saveDataRoom} />{shareTarget && <ShareDialog roomId={roomId} target={shareTarget.target} targetName={shareTarget.name} open onClose={() => setShareTarget(null)} />}<RenameDialog item={activeAction === 'rename' ? activeItem : null} onClose={closeAction} onSubmit={rename} /><DeleteDialog item={activeAction === 'delete' ? activeItem : null} summary={deletionSummary} onClose={closeAction} onSubmit={remove} /></section></div><UploadSnackbar items={snackbarUploads} onClose={() => setSnackbarUploads([])} /><PdfViewerDialog file={viewerFile} onClose={() => setViewerFile(null)} onDownload={downloadFile} /></Layout>;
}

function Layout({ children }: { children: ReactNode }) { return <><header className="border-b bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5"><Link to="/" className="flex items-center gap-2 font-semibold"><span className="rounded-lg bg-brand p-1.5 text-white"><ShieldCheck size={17} /></span>Acme Data Room</Link><button onClick={() => void supabase?.auth.signOut()} className="text-sm text-slate-500 hover:text-ink"><LogOut className="mr-1 inline" size={16} />Sign out</button></div></header><main className="mx-auto max-w-7xl px-5 py-10">{children}</main></> }

export default function App() { const [authenticated, setAuthenticated] = useState(false); const [ready, setReady] = useState(!supabase); useEffect(() => { if (!supabase) return; supabase.auth.getSession().then(({ data }) => { setAuthenticated(Boolean(data.session)); setReady(true); }); const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session))); return () => data.subscription.unsubscribe(); }, []); if (!ready) return null; return <Routes><Route path="/shared/:token" element={<SharedRoom />} />{supabase && authenticated ? <><Route path="/" element={<Dashboard />} /><Route path="/rooms/:roomId" element={<RoomPage />} /><Route path="*" element={<Navigate to="/" replace />} /></> : <Route path="*" element={<Login />} />}</Routes>; }
