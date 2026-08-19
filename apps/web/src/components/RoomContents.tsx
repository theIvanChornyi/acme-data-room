import type { RoomItem } from '@acme/contracts';
import { ChevronRight, FileText, Folder, MoreHorizontal } from 'lucide-react';

export function RoomContents({
  items,
  onOpenFolder,
}: {
  items: RoomItem[];
  onOpenFolder: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-card">
      <div className="grid grid-cols-[minmax(0,1fr)_9rem_7rem_2.5rem] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Name</span><span>Type</span><span>Modified</span><span />
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => item.kind === 'folder' && onOpenFolder(item.id)}
          className="grid w-full grid-cols-[minmax(0,1fr)_9rem_7rem_2.5rem] items-center gap-4 border-b px-5 py-3.5 text-left last:border-0 hover:bg-blue-50/50"
        >
          <span className="flex min-w-0 items-center gap-3 font-medium">
            <span className={item.kind === 'folder' ? 'text-amber-500' : 'text-rose-500'}>
              {item.kind === 'folder' ? <Folder fill="currentColor" size={20} /> : <FileText size={20} />}
            </span>
            <span className="truncate">{item.name}</span>
            {item.kind === 'folder' && <ChevronRight className="ml-auto text-slate-400" size={17} />}
          </span>
          <span className="text-sm text-slate-500">{item.kind === 'folder' ? 'Folder' : 'PDF document'}</span>
          <span className="text-sm text-slate-500">
            {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(item.updatedAt))}
          </span>
          <span className="text-slate-400"><MoreHorizontal size={18} /></span>
        </button>
      ))}
    </div>
  );
}
