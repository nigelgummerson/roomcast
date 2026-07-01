import { useEffect, useState } from "react";
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
import { FOUNTAIN_ECC, FOUNTAIN_FPS, fountainQrSize } from "./qrTuning";

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
  const frame = useFrameLoop(frames, FOUNTAIN_FPS);
  const { showToast } = useToast();
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    if (!broadcasting) return;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [broadcasting]);

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
    const qrSize = fountainQrSize(viewport.w, viewport.h);
    return (
      <div className="relative flex min-h-[var(--app-height)] flex-col bg-slate-950 text-white">
        <div className="flex items-center gap-4 px-6 py-4">
          <p className="text-lg font-semibold">{title}</p>
          <div className="flex items-center gap-3 ml-auto">
            {profile === "confidential" && (
              <>
                <span className="rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold">
                  CONFIDENTIAL · SCAN-ONLY
                </span>
                <span className="text-xs text-slate-400">expires in {ttlHours}h</span>
              </>
            )}
            <Button variant="ghost" className="!bg-white/10 !text-white hover:!bg-white/20" onClick={() => setBroadcasting(false)}>Stop</Button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <QrImage text={frame} size={qrSize} ecc={FOUNTAIN_ECC} />
          </div>
        </div>

        <div className="absolute bottom-6 right-6 rounded-lg border border-white/10 bg-slate-900/95 p-4 text-center shadow-lg">
          <p className="text-sm font-semibold">Scan to receive</p>
          <div className="mt-2 rounded-lg bg-white p-2">
            <QrImage text={readerUrl} size={132} />
          </div>
          <p className="mt-2 max-w-[160px] break-words text-xs text-slate-400">{readerUrl}</p>
        </div>
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
