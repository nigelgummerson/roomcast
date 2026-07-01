import { useState } from "react";
import { buildBroadcast } from "./buildBroadcast";
import { useFrameLoop } from "./useFrameLoop";
import { QrImage } from "./QrImage";
import { DropZone } from "./DropZone";
import { MobileView } from "../reader/MobileView";
import type { SecurityProfile } from "../core/envelope";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Banner } from "../ui/Banner";
import { useToast } from "../ui/Toast";

// Soft cap on the packed envelope size before the presenter warns that
// scanning will take longer (more QR frames to loop through). Not a hard
// limit — broadcasting still proceeds.
export const DEFAULT_SIZE_WARN_BYTES = 40_000;

export function PresenterApp() {
  const [title, setTitle] = useState("Handover");
  const [profile, setProfile] = useState<SecurityProfile>("confidential");
  const [ttlHours, setTtlHours] = useState(36);
  const [md, setMd] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [sizeBytes, setSizeBytes] = useState(0);
  const [broadcasting, setBroadcasting] = useState(false);
  const frame = useFrameLoop(frames, 8);
  const { showToast } = useToast();

  const onFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const built = await buildBroadcast(buf, { title, profile, ttlHours });
      setMd(built.md);
      setFrames(built.frames);
      setSizeBytes(built.sizeBytes);
      setBroadcasting(false);
    } catch {
      setMd(null);
      setFrames([]);
      setSizeBytes(0);
      showToast("Could not read this file — please supply a .docx (not .doc)", { severity: "error" });
    }
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
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">roomcast — presenter</h1>
        <a href="#reader" className="text-sm text-blue-600 underline">
          Receive a broadcast on this device →
        </a>
      </div>

      <Card className="space-y-4">
        <label className="block">Title
          <input className="mt-1 w-full rounded border px-2 py-1"
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div>
          <span className="block text-sm font-medium text-slate-700">Security profile</span>
          <div className="mt-1 inline-flex gap-2">
            <Button
              type="button"
              variant={profile === "confidential" ? "primary" : "ghost"}
              onClick={() => setProfile("confidential")}
            >
              Confidential (36h, scan-only)
            </Button>
            <Button
              type="button"
              variant={profile === "standard" ? "primary" : "ghost"}
              onClick={() => setProfile("standard")}
            >
              Standard
            </Button>
          </div>
        </div>

        <label className="block">Expiry (hours)
          <input type="number" className="mt-1 w-full rounded border px-2 py-1"
            value={ttlHours} onChange={(e) => setTtlHours(Number(e.target.value))} />
        </label>

        <DropZone onFile={onFile} />
      </Card>

      {md && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Preview (as phones will see it)</h2>
          <div className="mx-auto w-[320px] rounded-2xl border-4 border-slate-800 bg-white p-3 shadow-lg">
            <MobileView md={md} />
          </div>
          {sizeBytes > DEFAULT_SIZE_WARN_BYTES && (
            <Banner severity="soft">
              Large document ({Math.round(sizeBytes / 1024)} KB, {frames.length} frames) — scanning
              may take longer; consider splitting.
            </Banner>
          )}
          <Button variant="primary" onClick={() => setBroadcasting(true)}>
            Broadcast ({frames.length} frames)
          </Button>
        </Card>
      )}
    </div>
  );
}
