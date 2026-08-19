import { useEffect, useState, type DragEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DataRoomSummary } from '@acme/contracts';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Plus, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';

export interface TreeFolder {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  hasChildren: boolean;
}

interface FolderNodeProps {
  roomId: string;
  folder: TreeFolder;
  activeFolderId?: string;
  expandedFolderIds: Set<string>;
  draggedFileId: string | null;
  onSelectFolder: (folderId?: string) => void;
  onDropFile: (fileId: string, destinationId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
}

function FolderNode({
  roomId,
  folder,
  activeFolderId,
  expandedFolderIds,
  draggedFileId,
  onSelectFolder,
  onDropFile,
  onCreateFolder,
}: FolderNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [dropTarget, setDropTarget] = useState(false);
  const shouldExpand = expandedFolderIds.has(folder.id);
  useEffect(() => {
    if (shouldExpand) setExpanded(true);
  }, [shouldExpand]);
  const childrenQuery = useQuery({
    queryKey: ['folder-children', roomId, folder.id],
    queryFn: () => api.folders(roomId, folder.id),
    enabled: expanded && folder.hasChildren,
    staleTime: 30_000,
  });
  const dropFolder = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDropTarget(false);
    if (draggedFileId) onDropFile(draggedFileId, folder.id);
  };
  const toggle = () => {
    if (folder.hasChildren) setExpanded((current) => !current);
  };
  return (
    <div>
      <div
        onDragOver={(event) => {
          if (draggedFileId) {
            event.preventDefault();
            setDropTarget(true);
          }
        }}
        onDragLeave={() => setDropTarget(false)}
        onDrop={dropFolder}
        style={{ paddingLeft: `${34 + folder.depth * 16}px` }}
        className={`flex items-center rounded-md transition ${activeFolderId === folder.id ? 'bg-blue-50 font-medium text-brand' : dropTarget ? 'bg-blue-100 text-brand' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <button
          type="button"
          onClick={toggle}
          disabled={!folder.hasChildren}
          title={
            folder.hasChildren ? `${expanded ? 'Collapse' : 'Expand'} ${folder.name}` : undefined
          }
          aria-label={expanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
          aria-expanded={folder.hasChildren ? expanded : undefined}
          className="grid h-7 w-5 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:cursor-default disabled:hover:bg-transparent"
        >
          {folder.hasChildren &&
            (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>
        <button
          title={`Open ${folder.name}`}
          onClick={() => onSelectFolder(folder.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm"
        >
          <span className="text-amber-500">
            {activeFolderId === folder.id ? (
              <FolderOpen fill="currentColor" size={17} />
            ) : (
              <Folder fill="currentColor" size={17} />
            )}
          </span>
          <span className="truncate">{folder.name}</span>
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onCreateFolder(folder.id);
          }}
          title={`New folder in ${folder.name}`}
          aria-label={`New folder in ${folder.name}`}
          className="mr-1 rounded p-1 hover:bg-blue-100"
        >
          <Plus size={15} />
        </button>
      </div>
      {expanded && folder.hasChildren && (
        <div>
          {childrenQuery.isPending ? (
            <p
              style={{ paddingLeft: `${54 + folder.depth * 16}px` }}
              className="py-1 text-xs text-slate-400"
            >
              Loading…
            </p>
          ) : childrenQuery.isError ? (
            <button
              type="button"
              onClick={() => void childrenQuery.refetch()}
              style={{ paddingLeft: `${54 + folder.depth * 16}px` }}
              className="py-1 text-xs text-red-600 hover:underline"
            >
              Could not load folders. Retry
            </button>
          ) : (
            childrenQuery.data?.map((child) => (
              <FolderNode
                key={child.id}
                roomId={roomId}
                folder={child}
                activeFolderId={activeFolderId}
                expandedFolderIds={expandedFolderIds}
                draggedFileId={draggedFileId}
                onSelectFolder={onSelectFolder}
                onDropFile={onDropFile}
                onCreateFolder={onCreateFolder}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  rooms,
  rootFolders,
  loadingRootFolders,
  activeRoomId,
  activeFolderId,
  expandedFolderIds,
  draggedFileId,
  onSelectRoom,
  onSelectFolder,
  onDropFile,
  onDropFileToRoom,
  onCreateFolder,
  onCreateDataRoom,
}: {
  rooms: DataRoomSummary[];
  rootFolders: TreeFolder[];
  loadingRootFolders: boolean;
  activeRoomId: string;
  activeFolderId?: string;
  expandedFolderIds: Set<string>;
  draggedFileId: string | null;
  onSelectRoom: (roomId: string) => void;
  onSelectFolder: (folderId?: string) => void;
  onDropFile: (fileId: string, destinationId: string | null) => void;
  onDropFileToRoom: (fileId: string, destinationRoomId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateDataRoom: () => void;
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dropRoom = (event: DragEvent<HTMLElement>, roomId: string) => {
    event.preventDefault();
    setDropTarget(null);
    if (draggedFileId) onDropFileToRoom(draggedFileId, roomId);
  };
  return (
    <aside className="w-full shrink-0 border-b bg-white p-4 lg:min-h-0 lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="mb-3 flex items-center justify-between px-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Data Rooms</p>
        <button
          type="button"
          onClick={onCreateDataRoom}
          title="New Data Room"
          aria-label="New Data Room"
          className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-brand"
        >
          <Plus size={16} />
        </button>
      </div>
      <nav className="space-y-0.5">
        {rooms.map((room) => {
          const roomSelected = activeRoomId === room.id && !activeFolderId;
          return (
            <div key={room.id}>
              <div
                onDragOver={(event) => {
                  if (draggedFileId) {
                    event.preventDefault();
                    setDropTarget(`room:${room.id}`);
                  }
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(event) => dropRoom(event, room.id)}
                className={`flex items-center rounded-md transition ${roomSelected ? 'bg-blue-50 text-brand' : dropTarget === `room:${room.id}` ? 'bg-blue-100 text-brand' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <button
                  title={`Open ${room.name}`}
                  onClick={() => onSelectRoom(room.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm"
                >
                  <ChevronDown
                    size={14}
                    className={roomSelected ? 'text-brand' : 'text-slate-400'}
                  />
                  <ShieldCheck size={17} />
                  <span className="truncate">{room.name}</span>
                </button>
                {activeRoomId === room.id && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onCreateFolder(null);
                    }}
                    title="New folder"
                    aria-label="New folder"
                    className="mr-1 rounded p-1 hover:bg-blue-100"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
              {activeRoomId === room.id && (
                <div>
                  {loadingRootFolders ? (
                    <div aria-label="Loading folders" className="space-y-2 px-3 py-2">
                      <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-3/5 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                    </div>
                  ) : (
                    rootFolders.map((folder) => (
                      <FolderNode
                        key={folder.id}
                        roomId={room.id}
                        folder={folder}
                        activeFolderId={activeFolderId}
                        expandedFolderIds={expandedFolderIds}
                        draggedFileId={draggedFileId}
                        onSelectFolder={onSelectFolder}
                        onDropFile={onDropFile}
                        onCreateFolder={onCreateFolder}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
