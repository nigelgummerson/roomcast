import { useRef, useState } from "react";

export function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (f: File | undefined) => { if (f) onFile(f); };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center text-sm transition-colors ${
        over ? "border-[var(--rc-accent)] bg-blue-50" : "border-black/15 text-slate-500"}`}
    >
      Drop a .docx here, or click to choose
      <input ref={inputRef} type="file" accept=".docx" className="hidden"
        onChange={(e) => take(e.target.files?.[0] ?? undefined)} />
    </div>
  );
}
