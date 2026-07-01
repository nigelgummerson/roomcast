import { useState } from "react";
import { buildBroadcast } from "./buildBroadcast";
import { useFrameLoop } from "./useFrameLoop";
import { QrImage } from "./QrImage";
import { MobileView } from "../reader/MobileView";
import type { SecurityProfile } from "../core/envelope";

export function PresenterApp() {
  const [title, setTitle] = useState("Handover");
  const [profile, setProfile] = useState<SecurityProfile>("confidential");
  const [ttlHours, setTtlHours] = useState(36);
  const [md, setMd] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [broadcasting, setBroadcasting] = useState(false);
  const frame = useFrameLoop(frames, 8);

  const onFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const built = await buildBroadcast(buf, { title, profile, ttlHours });
    setMd(built.md);
    setFrames(built.frames);
    setBroadcasting(false);
  };

  if (broadcasting) {
    const readerUrl = `${location.origin}${location.pathname}#reader`;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black text-white">
        <QrImage text={frame} size={Math.min(window.innerHeight, window.innerWidth) * 0.7} />
        <div className="text-center">
          <p className="text-lg font-semibold">{title}</p>
          {profile === "confidential" && (
            <p className="text-red-400">CONFIDENTIAL · copies expire in {ttlHours}h · scan-only</p>
          )}
          <p className="mt-2 text-sm text-gray-400">Reader: scan the small code or open {readerUrl}</p>
        </div>
        <QrImage text={readerUrl} size={120} />
        <button className="underline" onClick={() => setBroadcasting(false)}>Stop</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">roomcast — presenter</h1>
      <label className="block">Title
        <input className="mt-1 w-full rounded border px-2 py-1"
          value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="block">Security profile
        <select className="mt-1 w-full rounded border px-2 py-1" value={profile}
          onChange={(e) => setProfile(e.target.value as SecurityProfile)}>
          <option value="confidential">Confidential (36h, scan-only)</option>
          <option value="standard">Standard</option>
        </select>
      </label>
      <label className="block">Expiry (hours)
        <input type="number" className="mt-1 w-full rounded border px-2 py-1"
          value={ttlHours} onChange={(e) => setTtlHours(Number(e.target.value))} />
      </label>
      <input type="file" accept=".docx"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

      {md && (
        <div className="space-y-3">
          <h2 className="font-semibold">Preview (as phones will see it)</h2>
          <div className="rounded border p-3"><MobileView md={md} /></div>
          <button className="rounded bg-blue-600 px-4 py-2 text-white"
            onClick={() => setBroadcasting(true)}>
            Broadcast ({frames.length} frames)
          </button>
        </div>
      )}
    </div>
  );
}
