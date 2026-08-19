import { useMemo, useState, type DragEvent } from 'react';
import type { DataRoomSummary } from '@acme/contracts';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Plus, ShieldCheck } from 'lucide-react';

export interface TreeFolder { id: string; name: string; parentId: string | null; depth: number; }

export function FolderTree({ rooms, folders, activeRoomId, activeFolderId, draggedFileId, onSelectRoom, onSelectFolder, onDropFile, onDropFileToRoom, onCreateFolder, onCreateDataRoom }: {
  rooms: DataRoomSummary[];
  folders: TreeFolder[];
  activeRoomId: string;
  activeFolderId?: string;
  draggedFileId: string | null;
  onSelectRoom: (roomId: string) => void;
  onSelectFolder: (folderId?: string) => void;
  onDropFile: (fileId: string, destinationId: string | null) => void;
  onDropFileToRoom: (fileId: string, destinationRoomId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateDataRoom: () => void;
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(() => new Set());
  const children = useMemo(() => folders.reduce<Map<string | null, TreeFolder[]>>((map, folder) => {
    const existing = map.get(folder.parentId) ?? [];
    existing.push(folder); map.set(folder.parentId, existing); return map;
  }, new Map()), [folders]);
  const dropFolder = (event: DragEvent<HTMLElement>, destinationId: string | null) => { event.preventDefault(); setDropTarget(null); if (draggedFileId) onDropFile(draggedFileId, destinationId); };
  const dropRoom = (event: DragEvent<HTMLElement>, roomId: string) => { event.preventDefault(); setDropTarget(null); if (draggedFileId) onDropFileToRoom(draggedFileId, roomId); };
  const toggleFolder = (folderId: string) => setCollapsedFolderIds((current) => {
    const next = new Set(current);
    if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
    return next;
  });
  const folderNodes = (parentId: string | null) => (children.get(parentId) ?? []).map((folder) => {
    const hasChildren = (children.get(folder.id)?.length ?? 0) > 0;
    const expanded = !collapsedFolderIds.has(folder.id);
    return <div key={folder.id}><div onDragOver={(event) => { if (draggedFileId) { event.preventDefault(); setDropTarget(`folder:${folder.id}`); } }} onDragLeave={() => setDropTarget(null)} onDrop={(event) => dropFolder(event, folder.id)} style={{ paddingLeft: `${34 + folder.depth * 16}px` }} className={`flex items-center rounded-md transition ${activeFolderId === folder.id ? 'bg-blue-50 font-medium text-brand' : dropTarget === `folder:${folder.id}` ? 'bg-blue-100 text-brand' : 'text-slate-600 hover:bg-slate-100'}`}><button type="button" onClick={() => toggleFolder(folder.id)} disabled={!hasChildren} title={hasChildren ? `${expanded ? 'Collapse' : 'Expand'} ${folder.name}` : undefined} aria-label={expanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`} aria-expanded={hasChildren ? expanded : undefined} className="grid h-7 w-5 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:cursor-default disabled:hover:bg-transparent">{hasChildren && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}</button><button title={`Open ${folder.name}`} onClick={() => onSelectFolder(folder.id)} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm"><span className="text-amber-500">{activeFolderId === folder.id ? <FolderOpen fill="currentColor" size={17} /> : <Folder fill="currentColor" size={17} />}</span><span className="truncate">{folder.name}</span></button><button onClick={(event) => { event.stopPropagation(); onCreateFolder(folder.id); }} title={`New folder in ${folder.name}`} aria-label={`New folder in ${folder.name}`} className="mr-1 rounded p-1 hover:bg-blue-100"><Plus size={15} /></button></div>{expanded && folderNodes(folder.id)}</div>;
  });
  return <aside className="w-full shrink-0 border-b bg-white p-4 lg:w-64 lg:border-b-0 lg:border-r"><div className="mb-3 flex items-center justify-between px-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Data Rooms</p><button type="button" onClick={onCreateDataRoom} title="New Data Room" aria-label="New Data Room" className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-brand"><Plus size={16} /></button></div><nav className="space-y-0.5">{rooms.map((room) => { const roomSelected = activeRoomId === room.id && !activeFolderId; return <div key={room.id}><div onDragOver={(event) => { if (draggedFileId) { event.preventDefault(); setDropTarget(`room:${room.id}`); } }} onDragLeave={() => setDropTarget(null)} onDrop={(event) => dropRoom(event, room.id)} className={`flex items-center rounded-md transition ${roomSelected ? 'bg-blue-50 text-brand' : dropTarget === `room:${room.id}` ? 'bg-blue-100 text-brand' : 'text-slate-600 hover:bg-slate-100'}`}><button title={`Open ${room.name}`} onClick={() => onSelectRoom(room.id)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm"><ChevronDown size={14} className={roomSelected ? 'text-brand' : 'text-slate-400'} /><ShieldCheck size={17} /><span className="truncate">{room.name}</span></button>{activeRoomId === room.id && <button onClick={(event) => { event.stopPropagation(); onCreateFolder(null); }} title="New folder" aria-label="New folder" className="mr-1 rounded p-1 hover:bg-blue-100"><Plus size={16} /></button>}</div>{activeRoomId === room.id && <div>{folderNodes(null)}</div>}</div>; })}</nav>{draggedFileId && <p className="mt-5 rounded-md bg-blue-50 px-3 py-2 text-xs leading-5 text-brand">Drop on a Data Room or folder to move the file.</p>}</aside>;
}
