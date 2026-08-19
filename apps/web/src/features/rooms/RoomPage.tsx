import { useEffect, useState, useTransition } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Search, Share2, X } from 'lucide-react';
import {
  ShareTargetType,
  type DataRoomSummary,
  type FolderDeletionSummary,
  type FolderContents,
  type RoomItem,
} from '@acme/contracts';
import { AppLayout } from '../../components/AppLayout';
import { CreateFolderDialog } from '../../components/CreateFolderDialog';
import { DataRoomDialog } from '../../components/DataRoomDialog';
import { DeleteDialog, MoveFileDialog, RenameDialog } from '../../components/ItemDialogs';
import { EmptyState } from '../../components/EmptyState';
import { FolderTree } from '../../components/FolderTree';
import { PageControls } from '../../components/PageControls';
import { PdfViewerDialog } from '../../components/PdfViewerDialog';
import { RoomContents, type ItemAction } from '../../components/RoomContents';
import { ShareDialog } from '../../components/ShareDialog';
import { UploadSnackbar, type UploadSnackbarItem } from '../../components/UploadSnackbar';
import { WorkspaceDropzone } from '../../components/WorkspaceDropzone';
import { api, type PublicShareTarget } from '../../lib/api';
import { messageFrom, WebMessages } from '../../lib/messages';
import { QueryKeys } from '../../lib/query-keys';
import { AppRoutes } from '../../routes/app-routes';

const MAX_FILES_PER_UPLOAD = 10;

export function RoomPage() {
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
  const [deletionSummary, setDeletionSummary] = useState<FolderDeletionSummary | null>(null);
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
  const queryRoomId = roomId ?? '';
  const contentsQuery = useQuery({
    queryKey: QueryKeys.roomContents(queryRoomId, folderId, activeCursor),
    queryFn: () => api.contents(roomId!, folderId, activeCursor),
    enabled: Boolean(roomId),
  });
  const searchFilesQuery = useQuery({
    queryKey: QueryKeys.fileSearch(queryRoomId, searchTerm, activeSearchCursor),
    queryFn: () => api.searchFiles(roomId!, searchTerm, activeSearchCursor),
    enabled: Boolean(roomId) && searchTerm.length >= 3,
  });
  const rootFoldersQuery = useQuery({
    queryKey: QueryKeys.folderChildren(queryRoomId, null),
    queryFn: () => api.folders(roomId!),
    enabled: Boolean(roomId),
  });
  const folderOptionsQuery = useQuery({
    queryKey: QueryKeys.folderOptions(queryRoomId),
    queryFn: () => api.folderOptions(roomId!),
    enabled: Boolean(roomId) && activeAction === 'move',
    placeholderData: keepPreviousData,
  });
  const roomsQuery = useQuery({
    queryKey: QueryKeys.rooms(),
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

  if (!roomId) return <Navigate to={AppRoutes.dashboard} replace />;

  const refreshContents = () => {
    void queryClient.invalidateQueries({ queryKey: QueryKeys.roomContentsByRoom(roomId) });
    void queryClient.invalidateQueries({ queryKey: QueryKeys.fileSearchByRoom(roomId) });
  };
  const refreshFolders = () => {
    void queryClient.invalidateQueries({ queryKey: QueryKeys.folderChildrenByRoom(roomId) });
    void queryClient.invalidateQueries({ queryKey: QueryKeys.folderOptions(roomId) });
  };
  const refreshRooms = () => void queryClient.invalidateQueries({ queryKey: QueryKeys.rooms() });
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
  const createFolder = async (name: string) => {
    const folder = (await workspaceMutation.mutateAsync(() =>
      api.createFolder(roomId, name, newFolderParentId ?? undefined),
    )) as RoomItem;
    if (newFolderParentId === (folderId ?? null)) {
      queryClient.setQueryData<FolderContents>(
        QueryKeys.roomContents(roomId, folderId, activeCursor),
        (current) =>
          current
            ? { ...current, items: [...current.items, { ...folder, kind: 'folder' }] }
            : current,
      );
    }
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
      setActionError(messageFrom(cause, WebMessages.workspace.openFileFailed));
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
      setActionError(messageFrom(cause, WebMessages.workspace.downloadFileFailed));
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
      setActionError(messageFrom(cause, WebMessages.workspace.prepareActionFailed));
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
    } else {
      await workspaceMutation.mutateAsync(() => api.renameFile(roomId, activeItem.id, name));
    }
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
      QueryKeys.roomContents(roomId, folderId, activeCursor),
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
    const contentsKey = QueryKeys.roomContents(roomId, folderId, activeCursor);
    const previous = queryClient.getQueryData<FolderContents>(contentsKey);
    queryClient.setQueryData<FolderContents>(contentsKey, (current) =>
      current ? { ...current, items: current.items.filter((item) => item.id !== fileId) } : current,
    );
    try {
      await workspaceMutation.mutateAsync(() => api.moveFile(roomId, fileId, destinationId));
    } catch (cause) {
      queryClient.setQueryData(contentsKey, previous);
      setActionError(messageFrom(cause, WebMessages.workspace.moveFileFailed));
    } finally {
      refreshContents();
      refreshFolders();
    }
  };
  const dropFileToRoom = async (fileId: string, destinationRoomId: string) => {
    setDraggedFileId(null);
    if (destinationRoomId === roomId && !folderId) return;
    const contentsKey = QueryKeys.roomContents(roomId, folderId, activeCursor);
    const previous = queryClient.getQueryData<FolderContents>(contentsKey);
    queryClient.setQueryData<FolderContents>(contentsKey, (current) =>
      current ? { ...current, items: current.items.filter((item) => item.id !== fileId) } : current,
    );
    try {
      await workspaceMutation.mutateAsync(() =>
        api.moveFileToRoom(roomId, fileId, destinationRoomId),
      );
    } catch (cause) {
      queryClient.setQueryData(contentsKey, previous);
      setActionError(messageFrom(cause, WebMessages.workspace.moveFileToRoomFailed));
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
          ? { targetType: ShareTargetType.FOLDER, folderId: item.id }
          : { targetType: ShareTargetType.FILE, fileId: item.id },
      name: item.name,
    });
  const saveDataRoom = async (name: string, description: string) => {
    if (dataRoomDialog) {
      const updated = (await workspaceMutation.mutateAsync(() =>
        api.renameRoom(dataRoomDialog.id, name, description),
      )) as DataRoomSummary;
      queryClient.setQueryData<DataRoomSummary[]>(QueryKeys.rooms(), (current) =>
        current?.map((room) => (room.id === updated.id ? updated : room)),
      );
      return;
    }
    const created = (await workspaceMutation.mutateAsync(() =>
      api.createRoom(name, description || undefined),
    )) as DataRoomSummary;
    queryClient.setQueryData<DataRoomSummary[]>(QueryKeys.rooms(), (current) => [
      created,
      ...(current ?? []),
    ]);
    navigate(AppRoutes.room(created.id));
  };
  const startWorkspaceUpload = (files: File[]) => {
    setActionError('');
    const eligible = files.filter(
      (file) => file.name.toLowerCase().endsWith('.pdf') && file.size <= 25 * 1024 * 1024,
    );
    const accepted = eligible.slice(0, MAX_FILES_PER_UPLOAD);
    if (!accepted.length) return setActionError(WebMessages.workspace.invalidFiles);
    const selectionMessage = WebMessages.workspace.uploadSelectionAdjusted(
      files.length - eligible.length,
      eligible.length - accepted.length,
    );
    if (selectionMessage) setActionError(selectionMessage);
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
            QueryKeys.roomContents(roomId, uploadFolderId, activeCursor),
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
                    error: messageFrom(cause, WebMessages.uploads.uploadFailed),
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
    } else if (currentRoom) {
      setDataRoomDialog(currentRoom);
    }
  };
  const titleName = contents?.folder?.name ?? activeRoomName;
  const currentShareTarget: PublicShareTarget = contents?.folder
    ? { targetType: ShareTargetType.FOLDER, folderId: contents.folder.id }
    : { targetType: ShareTargetType.DATA_ROOM };

  return (
    <AppLayout workspace>
      <button
        title="All Data Rooms"
        onClick={() => navigate(AppRoutes.dashboard)}
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
            navigate(AppRoutes.room(destinationRoomId));
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
    </AppLayout>
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
