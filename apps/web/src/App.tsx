import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { DataRoomSummary, FolderContents, ReceivedShare, RoomItem } from '@acme/contracts';
import { api, type PublicShareTarget } from './lib/api';
import { supabase } from './lib/supabase';
import { CreateFolderDialog } from './components/CreateFolderDialog';
import { EmptyState } from './components/EmptyState';
import { RoomContents, type ItemAction } from './components/RoomContents';
import { DeleteDialog, MoveFileDialog, RenameDialog } from './components/ItemDialogs';
import { FolderTree } from './components/FolderTree';
import { DataRoomDialog, DeleteDataRoomDialog } from './components/DataRoomDialog';
import { WorkspaceDropzone } from './components/WorkspaceDropzone';
import { UploadSnackbar, type UploadSnackbarItem } from './components/UploadSnackbar';
import { ShareDialog } from './components/ShareDialog';
import { SharedRoom } from './components/SharedRoom';
import { PdfViewerDialog } from './components/PdfViewerDialog';
import { GlobalActivityBar } from './components/GlobalActivityBar';
import { PageControls } from './components/PageControls';

function Login() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: 'sign-in' | 'sign-up') => {
    setMode(nextMode);
    setPassword('');
    setConfirmation('');
    setError('');
    setNotice('');
  };

  const signInWithGoogle = async () => {
    if (!supabase) return setError('Add Supabase credentials to apps/web/.env before signing in.');
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (authError) setError(authError.message);
  };

  const submitEmailPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return setError('Add Supabase credentials to apps/web/.env before signing in.');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError('Enter your email address.');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    if (mode === 'sign-up' && password !== confirmation) return setError('Passwords do not match.');

    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'sign-up') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (authError) throw authError;
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to authenticate. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isSignUp = mode === 'sign-up';
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-card">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-brand p-2 text-white">
            <ShieldCheck size={22} />
          </div>
          <span className="font-semibold">Acme Data Room</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSignUp ? 'Create your account' : 'Due diligence, organized.'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {isSignUp
            ? 'Create an account to securely manage your Data Rooms.'
            : 'Securely collect, organize, and share the documents your deal team needs.'}
        </p>
        <form className="mt-7 space-y-4" onSubmit={(event) => void submitEmailPassword(event)}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              required
              type="password"
              minLength={8}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
          {isSignUp && (
            <label className="block text-sm font-medium text-slate-700">
              Confirm password
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Repeat your password"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </label>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
        {notice && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <button
          onClick={() => void signInWithGoogle()}
          className="flex w-full items-center justify-center gap-3 rounded-lg border bg-white py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <span className="font-bold text-blue-500">G</span>Continue with Google
        </button>
        <p className="mt-6 text-center text-sm text-slate-500">
          {isSignUp ? 'Already have an account?' : 'New to Acme Data Room?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignUp ? 'sign-in' : 'sign-up')}
            className="font-medium text-brand hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        <p className="mt-5 text-center text-xs text-slate-400">
          Read-only sharing keeps your sensitive materials controlled.
        </p>
      </section>
    </main>
  );
}

function Dashboard() {
  const [rooms, setRooms] = useState<DataRoomSummary[]>([]);
  const [sharedItems, setSharedItems] = useState<ReceivedShare[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<DataRoomSummary | null | undefined>(null);
  const [deletingRoom, setDeletingRoom] = useState<DataRoomSummary | null>(null);
  const [menuRoomId, setMenuRoomId] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([api.rooms(), api.sharedWithMe()])
      .then(([ownedRooms, shared]) => {
        setRooms(ownedRooms);
        setSharedItems(shared);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load your workspace.'),
      )
      .finally(() => setLoading(false));
  }, []);
  const saveRoom = async (name: string, description: string) => {
    if (editingRoom) {
      const updated = await api.renameRoom(editingRoom.id, name, description);
      setRooms((current) => current.map((room) => (room.id === updated.id ? updated : room)));
    } else {
      const created = await api.createRoom(name, description || undefined);
      setRooms((current) => [created, ...current]);
    }
  };
  const deleteRoom = async () => {
    if (!deletingRoom) return;
    await api.deleteRoom(deletingRoom.id);
    setRooms((current) => current.filter((room) => room.id !== deletingRoom.id));
  };
  return (
    <Layout>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-brand">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your Data Rooms</h1>
        </div>
        <button
          title="New Data Room"
          onClick={() => setEditingRoom(undefined)}
          className="rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white"
        >
          <Plus className="mr-1.5 inline" size={17} />
          New Data Room
        </button>
      </div>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Loading your workspace…</p>
      ) : (
        <>
          <section>
            {rooms.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <article
                    key={room.id}
                    className="relative min-w-0 rounded-xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-blue-200"
                  >
                    <Link to={`/rooms/${room.id}`} className="block min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-brand">
                        <ShieldCheck size={20} />
                      </div>
                      <h2 className="mt-5 break-words pr-7 font-semibold line-clamp-2">
                        {room.name}
                      </h2>
                      <p className="mt-1 line-clamp-2 min-h-10 break-words text-sm text-slate-500">
                        {room.description ?? 'No description provided.'}
                      </p>
                      <p className="mt-5 text-xs text-slate-400">
                        Updated {new Date(room.updatedAt).toLocaleDateString()}
                      </p>
                    </Link>
                    <div className="absolute right-4 top-4">
                      <button
                        title={`Actions for ${room.name}`}
                        aria-label={`Actions for ${room.name}`}
                        onClick={() =>
                          setMenuRoomId((current) => (current === room.id ? null : room.id))
                        }
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {menuRoomId === room.id && (
                        <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border bg-white py-1 shadow-lg">
                          <button
                            title={`Rename ${room.name}`}
                            onClick={() => {
                              setMenuRoomId(null);
                              setEditingRoom(room);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <Pencil size={15} />
                            Rename
                          </button>
                          <button
                            title={`Delete ${room.name}`}
                            onClick={() => {
                              setMenuRoomId(null);
                              setDeletingRoom(room);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-white py-20 text-center">
                <h2 className="font-semibold">Create your first Data Room</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Start with one secure place for all deal documents.
                </p>
              </div>
            )}
          </section>
          <section className="mt-10 border-t pt-8">
            <div>
              <p className="text-sm font-medium text-brand">Read-only access</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Shared with me</h2>
              <p className="mt-1 text-sm text-slate-500">
                Data Rooms, folders, and documents other people shared with you.
              </p>
            </div>
            {sharedItems.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sharedItems.map((share) => (
                  <Link
                    key={share.id}
                    to={`/shared-with-me/${share.id}`}
                    className="min-w-0 rounded-xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-blue-200"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-brand">
                      <Share2 size={20} />
                    </div>
                    <h3 className="mt-5 break-words font-semibold line-clamp-2">
                      {share.targetName}
                    </h3>
                    <p className="mt-1 break-words text-sm text-slate-500 line-clamp-2">
                      {share.targetType === 'DATA_ROOM'
                        ? 'Data Room'
                        : share.targetType === 'FOLDER'
                          ? `Folder in ${share.roomName}`
                          : `PDF in ${share.roomName}`}
                    </p>
                    <p className="mt-3 truncate text-xs text-slate-400">
                      Shared by {share.sharedBy}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Shared {new Date(share.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed bg-white px-5 py-8 text-sm text-slate-500">
                Nothing has been shared with you yet.
              </p>
            )}
          </section>
        </>
      )}
      <DataRoomDialog room={editingRoom} onClose={() => setEditingRoom(null)} onSubmit={saveRoom} />
      <DeleteDataRoomDialog
        room={deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onDelete={deleteRoom}
      />
    </Layout>
  );
}

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [folderId, setFolderId] = useState<string | undefined>();
  const [pageCursors, setPageCursors] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCursors, setSearchCursors] = useState<Array<string | undefined>>([undefined]);
  const [searchPageIndex, setSearchPageIndex] = useState(0);
  const [actionError, setActionError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [dataRoomDialog, setDataRoomDialog] = useState<DataRoomSummary | undefined | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    target: PublicShareTarget;
    name: string;
  } | null>(null);
  const [viewerFile, setViewerFile] = useState<{ id: string; name: string; url: string } | null>(
    null,
  );
  const [snackbarUploads, setSnackbarUploads] = useState<UploadSnackbarItem[]>([]);
  const [activeItem, setActiveItem] = useState<RoomItem | null>(null);
  const [activeAction, setActiveAction] = useState<ItemAction | null>(null);
  const [deletionSummary, setDeletionSummary] = useState<{
    folders: number;
    files: number;
    sizeBytes: string;
  } | null>(null);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const workspaceMutation = useMutation({ mutationFn: (work: () => Promise<unknown>) => work() });
  useEffect(() => {
    setPageCursors([undefined]);
    setPageIndex(0);
  }, [roomId, folderId]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    setSearchCursors([undefined]);
    setSearchPageIndex(0);
  }, [roomId, searchTerm]);
  const activeCursor = pageCursors[pageIndex];
  const activeSearchCursor = searchCursors[searchPageIndex];
  const searchIsActive = searchInput.trim().length >= 3;
  const contentsQuery = useQuery({
    queryKey: ['room-contents', roomId, folderId, activeCursor],
    queryFn: () => api.contents(roomId!, folderId, activeCursor),
    enabled: Boolean(roomId),
  });
  const searchFilesQuery = useQuery({
    queryKey: ['file-search', roomId, searchTerm, activeSearchCursor],
    queryFn: () => api.searchFiles(roomId!, searchTerm, activeSearchCursor),
    enabled: Boolean(roomId) && searchTerm.length >= 3,
  });
  const rootFoldersQuery = useQuery({
    queryKey: ['folder-children', roomId, null],
    queryFn: () => api.folders(roomId!),
    enabled: Boolean(roomId),
  });
  const folderOptionsQuery = useQuery({
    queryKey: ['folder-options', roomId],
    queryFn: () => api.folderOptions(roomId!),
    enabled: Boolean(roomId) && activeAction === 'move',
    placeholderData: keepPreviousData,
  });
  const roomsQuery = useQuery({
    queryKey: ['rooms'],
    queryFn: api.rooms,
    placeholderData: keepPreviousData,
  });
  const contents = contentsQuery.data ?? null;
  const searchResults = searchFilesQuery.data ?? null;
  const rootFolders = rootFoldersQuery.data ?? [];
  const folderOptions = folderOptionsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const queryError = searchIsActive
    ? !searchResults
      ? searchFilesQuery.error
      : null
    : !contentsQuery.data
      ? (contentsQuery.error ?? rootFoldersQuery.error ?? roomsQuery.error)
      : null;
  const queryErrorMessage = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Unable to load this Data Room.'
    : '';
  const refreshContents = () => {
    void queryClient.invalidateQueries({ queryKey: ['room-contents', roomId] });
    void queryClient.invalidateQueries({ queryKey: ['file-search', roomId] });
  };
  const openPage = (nextPageIndex: number) => setPageIndex(nextPageIndex);
  const nextPage = () => {
    if (pageIndex < pageCursors.length - 1) return setPageIndex(pageIndex + 1);
    if (!contents?.nextCursor) return;
    setPageCursors((current) => [...current.slice(0, pageIndex + 1), contents.nextCursor!]);
    setPageIndex(pageIndex + 1);
  };
  const openSearchPage = (nextPageIndex: number) => setSearchPageIndex(nextPageIndex);
  const nextSearchPage = () => {
    if (searchPageIndex < searchCursors.length - 1) return setSearchPageIndex(searchPageIndex + 1);
    if (!searchResults?.nextCursor) return;
    setSearchCursors((current) => [
      ...current.slice(0, searchPageIndex + 1),
      searchResults.nextCursor!,
    ]);
    setSearchPageIndex(searchPageIndex + 1);
  };
  const selectFolder = (nextFolderId: string | undefined) => {
    setPageCursors([undefined]);
    setPageIndex(0);
    startTransition(() => setFolderId(nextFolderId));
  };
  const refreshFolders = () => {
    void queryClient.invalidateQueries({ queryKey: ['folder-children', roomId] });
    void queryClient.invalidateQueries({ queryKey: ['folder-options', roomId] });
  };
  const refreshRooms = () => void queryClient.invalidateQueries({ queryKey: ['rooms'] });
  if (!roomId) return <Navigate to="/" replace />;
  const createFolder = async (name: string) => {
    const folder = (await workspaceMutation.mutateAsync(() =>
      api.createFolder(roomId, name, newFolderParentId ?? undefined),
    )) as RoomItem;
    if (newFolderParentId === (folderId ?? null))
      queryClient.setQueryData<FolderContents>(
        ['room-contents', roomId, folderId, activeCursor],
        (current) =>
          current
            ? { ...current, items: [...current.items, { ...folder, kind: 'folder' }] }
            : current,
      );
    refreshContents();
    refreshFolders();
  };
  const openFile = async (fileId: string) => {
    try {
      const { url } = await api.viewFile(roomId, fileId);
      const file = (searchIsActive ? searchResults?.items : contents?.items)?.find(
        (item) => item.id === fileId,
      );
      setViewerFile({ id: fileId, name: file?.name ?? 'PDF document', url });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to open file.');
    }
  };
  const downloadFile = async (file: { id: string; name: string }) => {
    try {
      const { url } = await api.downloadFile(roomId, file.id);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.append(link);
      link.click();
      link.remove();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to download file.');
    }
  };
  const startAction = async (action: ItemAction, item: RoomItem) => {
    try {
      setActiveItem(item);
      setActiveAction(action);
      if (action === 'delete') {
        setDeletionSummary(null);
        setDeletionSummary(
          item.kind === 'folder' ? await api.folderDeletionSummary(roomId, item.id) : null,
        );
      }
    } catch (cause) {
      setActiveItem(null);
      setActiveAction(null);
      setActionError(cause instanceof Error ? cause.message : 'Unable to prepare this action.');
    }
  };
  const closeAction = () => {
    setActiveItem(null);
    setActiveAction(null);
    setDeletionSummary(null);
  };
  const rename = async (name: string) => {
    if (!activeItem) return;
    if (activeItem.kind === 'folder') {
      await workspaceMutation.mutateAsync(() => api.renameFolder(roomId, activeItem.id, name));
      refreshFolders();
    } else await workspaceMutation.mutateAsync(() => api.renameFile(roomId, activeItem.id, name));
    refreshContents();
  };
  const moveFromDialog = async (destinationFolderId: string | null) => {
    if (!activeItem || activeItem.kind !== 'file') return;
    await workspaceMutation.mutateAsync(() =>
      api.moveFile(roomId, activeItem.id, destinationFolderId),
    );
    refreshContents();
    refreshFolders();
  };
  const remove = async () => {
    if (!activeItem) return;
    const removed = activeItem;
    queryClient.setQueryData<FolderContents>(
      ['room-contents', roomId, folderId, activeCursor],
      (current) =>
        current
          ? { ...current, items: current.items.filter((item) => item.id !== removed.id) }
          : current,
    );
    try {
      await workspaceMutation.mutateAsync(() =>
        removed.kind === 'folder'
          ? api.deleteFolder(roomId, removed.id)
          : api.deleteFile(roomId, removed.id),
      );
    } catch (cause) {
      refreshContents();
      throw cause;
    } finally {
      refreshContents();
      refreshFolders();
    }
  };
  const dropFile = async (fileId: string, destinationId: string | null) => {
    setDraggedFileId(null);
    if (destinationId === (folderId ?? null)) return;
    const previous = queryClient.getQueryData<FolderContents>([
      'room-contents',
      roomId,
      folderId,
      activeCursor,
    ]);
    queryClient.setQueryData<FolderContents>(
      ['room-contents', roomId, folderId, activeCursor],
      (current) =>
        current
          ? { ...current, items: current.items.filter((item) => item.id !== fileId) }
          : current,
    );
    try {
      await workspaceMutation.mutateAsync(() => api.moveFile(roomId, fileId, destinationId));
    } catch (cause) {
      queryClient.setQueryData(['room-contents', roomId, folderId, activeCursor], previous);
      setActionError(cause instanceof Error ? cause.message : 'Unable to move file.');
    } finally {
      refreshContents();
      refreshFolders();
    }
  };
  const dropFileToRoom = async (fileId: string, destinationRoomId: string) => {
    setDraggedFileId(null);
    if (destinationRoomId === roomId && !folderId) return;
    const previous = queryClient.getQueryData<FolderContents>([
      'room-contents',
      roomId,
      folderId,
      activeCursor,
    ]);
    queryClient.setQueryData<FolderContents>(
      ['room-contents', roomId, folderId, activeCursor],
      (current) =>
        current
          ? { ...current, items: current.items.filter((item) => item.id !== fileId) }
          : current,
    );
    try {
      await workspaceMutation.mutateAsync(() =>
        api.moveFileToRoom(roomId, fileId, destinationRoomId),
      );
    } catch (cause) {
      queryClient.setQueryData(['room-contents', roomId, folderId, activeCursor], previous);
      setActionError(
        cause instanceof Error ? cause.message : 'Unable to move file to this Data Room.',
      );
    } finally {
      refreshContents();
      refreshRooms();
    }
  };
  const openFolderDialog = (parentId: string | null) => {
    setNewFolderParentId(parentId);
    setDialogOpen(true);
  };
  const openItemShare = (item: RoomItem) =>
    setShareTarget({
      target:
        item.kind === 'folder'
          ? { targetType: 'FOLDER', folderId: item.id }
          : { targetType: 'FILE', fileId: item.id },
      name: item.name,
    });
  const saveDataRoom = async (name: string, description: string) => {
    if (dataRoomDialog) {
      const updated = (await workspaceMutation.mutateAsync(() =>
        api.renameRoom(dataRoomDialog.id, name, description),
      )) as DataRoomSummary;
      queryClient.setQueryData<DataRoomSummary[]>(['rooms'], (current) =>
        current?.map((room) => (room.id === updated.id ? updated : room)),
      );
      return;
    }
    const created = (await workspaceMutation.mutateAsync(() =>
      api.createRoom(name, description || undefined),
    )) as DataRoomSummary;
    queryClient.setQueryData<DataRoomSummary[]>(['rooms'], (current) => [
      created,
      ...(current ?? []),
    ]);
    navigate(`/rooms/${created.id}`);
  };
  const startWorkspaceUpload = (files: File[]) => {
    setActionError('');
    const accepted = files
      .slice(0, 10)
      .filter((file) => file.name.toLowerCase().endsWith('.pdf') && file.size <= 25 * 1024 * 1024);
    if (!accepted.length)
      return setActionError('Drop PDF files only; each file must be 25 MB or smaller.');
    const uploadFolderId = folderId;
    const batch = accepted.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      progress: 0,
      status: 'uploading' as const,
    }));
    setSnackbarUploads(batch);
    void Promise.allSettled(
      batch.map(async (entry, index) => {
        try {
          const uploaded = (await workspaceMutation.mutateAsync(() =>
            api.uploadFile(roomId, uploadFolderId, accepted[index], (loaded, total) =>
              setSnackbarUploads((current) =>
                current.map((item) =>
                  item.id === entry.id
                    ? { ...item, progress: total ? Math.round((loaded / total) * 100) : 0 }
                    : item,
                ),
              ),
            ),
          )) as RoomItem;
          queryClient.setQueryData<FolderContents>(
            ['room-contents', roomId, uploadFolderId, activeCursor],
            (current) => (current ? { ...current, items: [...current.items, uploaded] } : current),
          );
          setSnackbarUploads((current) =>
            current.map((item) =>
              item.id === entry.id ? { ...item, progress: 100, status: 'complete' } : item,
            ),
          );
        } catch (cause) {
          setSnackbarUploads((current) =>
            current.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    status: 'error',
                    error: cause instanceof Error ? cause.message : 'Unable to upload this file.',
                  }
                : item,
            ),
          );
        }
      }),
    ).then(() => refreshContents());
  };
  const currentRoom = rooms.find((room) => room.id === roomId);
  const activeRoomName = currentRoom?.name ?? 'Data Room';
  const openTitleRename = () => {
    if (contents?.folder) {
      setActiveItem({
        id: contents.folder.id,
        name: contents.folder.name,
        kind: 'folder',
        parentId: contents.folder.parentId,
        createdAt: '',
        updatedAt: '',
      });
      setActiveAction('rename');
    } else if (currentRoom) setDataRoomDialog(currentRoom);
  };
  const titleName = contents?.folder?.name ?? activeRoomName;
  const currentShareTarget: PublicShareTarget = contents?.folder
    ? { targetType: 'FOLDER', folderId: contents.folder.id }
    : { targetType: 'DATA_ROOM' };
  return (
    <Layout workspace>
      <button
        title="All Data Rooms"
        onClick={() => navigate('/')}
        className="mb-5 shrink-0 text-sm text-slate-500 hover:text-ink"
      >
        ← All Data Rooms
      </button>
      <div className="min-h-0 flex-1 rounded-xl border bg-white shadow-card lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <FolderTree
          rooms={rooms}
          rootFolders={rootFolders}
          activeRoomId={roomId}
          activeFolderId={folderId}
          expandedFolderIds={new Set(contents?.breadcrumbs.map((crumb) => crumb.id))}
          draggedFileId={draggedFileId}
          onSelectRoom={(destinationRoomId) => {
            setPageCursors([undefined]);
            setPageIndex(0);
            setFolderId(undefined);
            navigate(`/rooms/${destinationRoomId}`);
          }}
          onSelectFolder={selectFolder}
          onDropFile={dropFile}
          onDropFileToRoom={dropFileToRoom}
          onCreateFolder={openFolderDialog}
          onCreateDataRoom={() => setDataRoomDialog(undefined)}
        />
        <section className="min-h-0 min-w-0 overflow-y-auto p-5 lg:p-7">
          <div className="mb-6">
            <nav className="mb-2 flex items-center gap-1 text-sm text-slate-500">
              <button
                title={`Open ${activeRoomName}`}
                onClick={() => selectFolder(undefined)}
                className="hover:text-brand"
              >
                {activeRoomName}
              </button>
              {contents?.breadcrumbs.map((crumb) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  /{' '}
                  <button
                    title={`Open ${crumb.name}`}
                    onClick={() => selectFolder(crumb.id)}
                    className="hover:text-brand"
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{titleName}</h1>
              <button
                type="button"
                title={`Rename ${titleName}`}
                aria-label={`Rename ${titleName}`}
                onClick={openTitleRename}
                disabled={!contents && !currentRoom}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Pencil size={17} />
              </button>
              <button
                type="button"
                title={`Share ${titleName}`}
                aria-label={`Share ${titleName}`}
                onClick={() => setShareTarget({ target: currentShareTarget, name: titleName })}
                disabled={!currentRoom}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Share2 size={17} />
              </button>
            </div>
          </div>
          <label className="mb-5 flex items-center gap-2 rounded-lg border bg-white px-3 text-sm text-slate-500 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
            <Search size={17} className="shrink-0 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search file names in this Data Room"
              aria-label="Search file names in this Data Room"
              className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-slate-400"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                title="Clear search"
                aria-label="Clear search"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </label>
          <WorkspaceDropzone
            onFiles={startWorkspaceUpload}
            showPrompt={!contents?.items.length && !searchIsActive}
          >
            {actionError ? (
              <DismissibleError message={actionError} onClose={() => setActionError('')} />
            ) : queryErrorMessage ? (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                {queryErrorMessage}
              </p>
            ) : searchInput.trim() && !searchIsActive ? (
              <p className="rounded-lg border border-dashed bg-slate-50 p-5 text-sm text-slate-500">
                Enter at least 3 characters to search file names.
              </p>
            ) : searchIsActive &&
              (searchTerm !== searchInput.trim() || searchFilesQuery.isPending) ? (
              <RoomContentsSkeleton />
            ) : searchIsActive ? (
              searchResults?.items.length ? (
                <>
                  <p className="mb-3 text-sm text-slate-500">
                    Files matching “{searchTerm}” across this Data Room
                  </p>
                  <RoomContents
                    items={searchResults.items}
                    draggedFileId={draggedFileId}
                    onOpenFolder={selectFolder}
                    onOpenFile={openFile}
                    onAction={startAction}
                    onShare={openItemShare}
                    onDownload={(item) => void downloadFile(item)}
                    onDragFile={setDraggedFileId}
                    onDropFile={dropFile}
                    allowCurrentFolderDrop={false}
                  />
                  <PageControls
                    pageIndex={searchPageIndex}
                    pageCount={searchCursors.length}
                    hasNext={Boolean(searchResults.nextCursor)}
                    loading={searchFilesQuery.isFetching}
                    onSelect={openSearchPage}
                    onNext={nextSearchPage}
                  />
                </>
              ) : (
                <p className="rounded-lg border border-dashed bg-slate-50 p-5 text-sm text-slate-500">
                  No files match “{searchTerm}”.
                </p>
              )
            ) : contentsQuery.isPending ? (
              <p className="rounded-lg border border-dashed bg-slate-50 p-5 text-sm text-slate-500">
                Loading Data Room…
              </p>
            ) : contents?.items.length ? (
              <>
                <RoomContents
                  items={contents.items}
                  currentFolderId={folderId}
                  draggedFileId={draggedFileId}
                  onOpenFolder={selectFolder}
                  onOpenFile={openFile}
                  onAction={startAction}
                  onShare={openItemShare}
                  onDownload={(item) => void downloadFile(item)}
                  onDragFile={setDraggedFileId}
                  onDropFile={dropFile}
                />
                <PageControls
                  pageIndex={pageIndex}
                  pageCount={pageCursors.length}
                  hasNext={Boolean(contents.nextCursor)}
                  loading={contentsQuery.isFetching}
                  onSelect={openPage}
                  onNext={nextPage}
                />
              </>
            ) : (
              <EmptyState onNewFolder={() => openFolderDialog(folderId ?? null)} />
            )}
          </WorkspaceDropzone>
          <CreateFolderDialog
            open={dialogOpen}
            onClose={() => {
              setDialogOpen(false);
              setNewFolderParentId(null);
            }}
            onSubmit={createFolder}
          />
          <DataRoomDialog
            room={dataRoomDialog}
            onClose={() => setDataRoomDialog(null)}
            onSubmit={saveDataRoom}
          />
          {shareTarget && (
            <ShareDialog
              roomId={roomId}
              target={shareTarget.target}
              targetName={shareTarget.name}
              open
              onClose={() => setShareTarget(null)}
            />
          )}
          <RenameDialog
            item={activeAction === 'rename' ? activeItem : null}
            onClose={closeAction}
            onSubmit={rename}
          />
          <MoveFileDialog
            item={activeAction === 'move' ? activeItem : null}
            folders={folderOptions}
            loading={folderOptionsQuery.isPending}
            onClose={closeAction}
            onSubmit={moveFromDialog}
          />
          <DeleteDialog
            item={activeAction === 'delete' ? activeItem : null}
            summary={deletionSummary}
            onClose={closeAction}
            onSubmit={remove}
          />
        </section>
      </div>
      <UploadSnackbar items={snackbarUploads} onClose={() => setSnackbarUploads([])} />
      <PdfViewerDialog
        file={viewerFile}
        onClose={() => setViewerFile(null)}
        onDownload={downloadFile}
      />
    </Layout>
  );
}

function DismissibleError({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
      role="alert"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        title="Dismiss error"
        aria-label="Dismiss error"
        className="-m-1 rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-800"
      >
        <X size={17} />
      </button>
    </div>
  );
}

function RoomContentsSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border bg-white shadow-card"
      aria-label="Loading folder contents"
    >
      <div className="h-11 border-b bg-slate-50" />
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,1fr)_9rem_6rem_7rem_2.5rem] items-center gap-4 border-b px-5 py-3.5 last:border-0"
        >
          <div className="h-4 w-3/5 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-14 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-5 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function Layout({ children, workspace = false }: { children: ReactNode; workspace?: boolean }) {
  return (
    <div className={workspace ? 'flex min-h-screen flex-col' : undefined}>
      <header className="shrink-0 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="rounded-lg bg-brand p-1.5 text-white">
              <ShieldCheck size={17} />
            </span>
            Acme Data Room
          </Link>
          <button
            onClick={() => void supabase?.auth.signOut()}
            className="text-sm text-slate-500 hover:text-ink"
          >
            <LogOut className="mr-1 inline" size={16} />
            Sign out
          </button>
        </div>
      </header>
      <main
        className={
          workspace
            ? 'mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-5 py-5'
            : 'mx-auto max-w-7xl px-5 py-10'
        }
      >
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(!supabase);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setAuthenticated(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return null;
  return (
    <>
      <GlobalActivityBar />
      <Routes>
        <Route path="/shared/:token" element={<SharedRoom />} />
        {supabase && authenticated ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rooms/:roomId" element={<RoomPage />} />
            <Route path="/shared-with-me" element={<Navigate to="/" replace />} />
            <Route path="/shared-with-me/:shareId" element={<SharedRoom />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Login />} />
        )}
      </Routes>
    </>
  );
}
