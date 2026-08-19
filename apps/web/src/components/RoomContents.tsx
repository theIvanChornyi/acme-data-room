import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { RoomItem } from '@acme/contracts';
import {
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from 'lucide-react';

export type ItemAction = 'rename' | 'move' | 'delete';

function formatFileSize(sizeBytes?: number) {
  if (!sizeBytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const value = sizeBytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: value >= 10 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
}

export function RoomContents({
  items,
  currentFolderId,
  draggedFileId,
  onOpenFolder,
  onOpenFile,
  onAction,
  onShare,
  onDownload,
  onDragFile,
  onDropFile,
  allowFileMoves = true,
  allowCurrentFolderDrop = true,
}: {
  items: RoomItem[];
  currentFolderId?: string;
  draggedFileId: string | null;
  onOpenFolder: (id: string) => void;
  onOpenFile: (id: string) => void;
  onAction: (action: ItemAction, item: RoomItem) => void;
  onShare: (item: RoomItem) => void;
  onDownload: (item: RoomItem) => void;
  onDragFile: (fileId: string | null) => void;
  onDropFile: (fileId: string, destinationId: string | null) => void;
  allowFileMoves?: boolean;
  allowCurrentFolderDrop?: boolean;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement>(null);
  const openItem = (item: RoomItem) => {
    if (item.kind === 'folder') onOpenFolder(item.id);
    else onOpenFile(item.id);
  };
  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = (event: PointerEvent) => {
      if (event.target instanceof Node && !openMenuRef.current?.contains(event.target))
        setOpenMenuId(null);
    };
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [openMenuId]);
  const startDrag = (event: DragEvent<HTMLDivElement>, item: RoomItem) => {
    if (!allowFileMoves || item.kind !== 'file') return;
    event.dataTransfer.effectAllowed = 'move';
    onDragFile(item.id);
  };
  const dropOn = (event: DragEvent<HTMLElement>, destinationId: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    setDropTargetId(null);
    if (draggedFileId) onDropFile(draggedFileId, destinationId);
  };
  return (
    <div
      onDragOver={(event) => {
        if (allowFileMoves && allowCurrentFolderDrop && draggedFileId) event.preventDefault();
      }}
      onDrop={(event) => {
        if (allowFileMoves && allowCurrentFolderDrop && draggedFileId)
          dropOn(event, currentFolderId ?? null);
      }}
      className="overflow-visible rounded-xl border bg-white shadow-card"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_9rem_6rem_7rem_2.5rem] gap-4 rounded-t-xl border-b bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Name</span>
        <span>Type</span>
        <span>Size</span>
        <span>Modified</span>
        <span />
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          draggable={allowFileMoves && item.kind === 'file'}
          onClick={() => openItem(item)}
          onDragStart={(event) => startDrag(event, item)}
          onDragEnd={() => onDragFile(null)}
          onDragOver={(event) => {
            if (allowFileMoves && item.kind === 'folder' && draggedFileId) {
              event.preventDefault();
              event.stopPropagation();
              setDropTargetId(item.id);
            }
          }}
          onDragLeave={() => setDropTargetId(null)}
          onDrop={(event) => {
            if (allowFileMoves && item.kind === 'folder' && draggedFileId) dropOn(event, item.id);
          }}
          className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_9rem_6rem_7rem_2.5rem] items-center gap-4 border-b px-5 py-3.5 last:rounded-b-xl last:border-0 ${dropTargetId === item.id ? 'bg-blue-100 ring-1 ring-inset ring-blue-300' : 'hover:bg-blue-50/50'} ${allowFileMoves && item.kind === 'file' ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
          <button
            title={`Open ${item.name}`}
            onClick={(event) => {
              event.stopPropagation();
              openItem(item);
            }}
            className="flex min-w-0 items-center gap-3 text-left font-medium"
          >
            <span className={item.kind === 'folder' ? 'text-amber-500' : 'text-rose-500'}>
              {item.kind === 'folder' ? (
                <Folder fill="currentColor" size={20} />
              ) : (
                <FileText size={20} />
              )}
            </span>
            <span className="truncate">{item.name}</span>
            {item.kind === 'folder' && (
              <ChevronRight className="ml-auto text-slate-400" size={17} />
            )}
          </button>
          <span className="text-sm text-slate-500">
            {item.kind === 'folder' ? 'Folder' : 'PDF document'}
          </span>
          <span className="text-sm text-slate-500">
            {item.kind === 'file' ? formatFileSize(item.sizeBytes) : '—'}
          </span>
          <span className="text-sm text-slate-500">
            {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
              new Date(item.updatedAt),
            )}
          </span>
          <div ref={openMenuId === item.id ? openMenuRef : undefined} className="relative">
            <button
              title={`Actions for ${item.name}`}
              aria-label={`Actions for ${item.name}`}
              onClick={(event) => {
                event.stopPropagation();
                setOpenMenuId((current) => (current === item.id ? null : item.id));
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand"
            >
              <MoreHorizontal size={18} />
            </button>
            {openMenuId === item.id && (
              <div
                className="absolute right-0 z-10 mt-1 w-36 rounded-lg border bg-white py-1 shadow-lg"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  title={`Share ${item.name}`}
                  onClick={() => {
                    setOpenMenuId(null);
                    onShare(item);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <Share2 size={15} />
                  Share
                </button>
                {item.kind === 'file' && (
                  <>
                    <button
                      title={`Download ${item.name}`}
                      onClick={() => {
                        setOpenMenuId(null);
                        onDownload(item);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <Download size={15} />
                      Download
                    </button>
                    <button
                      title={`Move ${item.name}`}
                      onClick={() => {
                        setOpenMenuId(null);
                        onAction('move', item);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <FolderInput size={15} />
                      Move
                    </button>
                  </>
                )}
                <button
                  title={`Rename ${item.name}`}
                  onClick={() => {
                    setOpenMenuId(null);
                    onAction('rename', item);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <Pencil size={15} />
                  Rename
                </button>
                <button
                  title={`Delete ${item.name}`}
                  onClick={() => {
                    setOpenMenuId(null);
                    onAction('delete', item);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
