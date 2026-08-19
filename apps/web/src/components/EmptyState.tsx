import { FolderPlus } from 'lucide-react';

export function EmptyState({ onNewFolder }: { onNewFolder: () => void }) {
  return <div className="mx-auto flex max-w-sm flex-col items-center py-20 text-center">
    <div className="mb-5 rounded-2xl bg-blue-50 p-4 text-brand"><FolderPlus size={30} /></div>
    <h2 className="text-lg font-semibold">This folder is empty</h2>
    <p className="mt-2 text-sm leading-6 text-slate-500">Create a folder to organize your due diligence material.</p>
    <button onClick={onNewFolder} className="mt-6 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><FolderPlus size={16} className="mr-2 inline" />New folder</button>
  </div>;
}
