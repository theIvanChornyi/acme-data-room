import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { FileUp } from 'lucide-react';

export function WorkspaceDropzone({ children, onFiles, showPrompt = true }: { children: ReactNode; onFiles: (files: File[]) => void; showPrompt?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null); const [draggingFiles, setDraggingFiles] = useState(false);
  const filesOnly = (event: DragEvent<HTMLElement>) => Array.from(event.dataTransfer.types).includes('Files');
  const add = (files: FileList | null) => { if (files?.length) onFiles(Array.from(files)); };
  const change = (event: ChangeEvent<HTMLInputElement>) => { add(event.target.files); event.target.value = ''; };
  return <div onDragOver={(event) => { if (filesOnly(event)) { event.preventDefault(); setDraggingFiles(true); } }} onDragLeave={(event) => { if (filesOnly(event)) setDraggingFiles(false); }} onDrop={(event) => { if (filesOnly(event)) { event.preventDefault(); setDraggingFiles(false); add(event.dataTransfer.files); } }} className="relative">{showPrompt && <button onClick={() => inputRef.current?.click()} className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition ${draggingFiles ? 'border-brand bg-blue-50 text-brand' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-300 hover:bg-blue-50/50'}`}><FileUp size={17} />Drop PDF files here, or click to browse</button>}<input ref={inputRef} onChange={change} type="file" accept="application/pdf,.pdf" multiple className="hidden" />{children}{draggingFiles && <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl border-2 border-dashed border-brand bg-blue-50/90"><div className="text-center text-brand"><FileUp className="mx-auto" size={30} /><p className="mt-2 text-sm font-semibold">Drop PDF files to upload</p></div></div>}</div>;
}
