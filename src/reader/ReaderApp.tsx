import { useEffect, useRef, useState } from "react";
import { ScanSession, startCamera } from "./scanner";
import { saveDoc, listDocs, type StoredDoc } from "../core/store";
import { MobileView } from "./MobileView";
import { ConfidentialBanner } from "./ConfidentialBanner";

export function ReaderApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [doc, setDoc] = useState<StoredDoc | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saved, setSaved] = useState<StoredDoc[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    listDocs(Date.now()).then(setSaved);
  }, [doc]);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    const session = new ScanSession();
    const stop = startCamera(videoRef.current, (text) => {
      const p = session.feed(text);
      setProgress(p.progress);
      if (p.done) {
        stop();
        setScanning(false);
        saveDoc(session.envelope(), Date.now()).then(setDoc);
      }
    });
    return stop;
  }, [scanning]);

  if (doc) {
    return (
      <div>
        <ConfidentialBanner
          profile={doc.envelope.profile}
          expiresAt={doc.expiresAt}
          now={now}
        />
        <div className="p-3">
          <button className="mb-3 underline" onClick={() => setDoc(null)}>
            ← Back
          </button>
          <MobileView md={doc.envelope.md} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">roomcast</h1>
      {scanning ? (
        <div>
          <video ref={videoRef} className="w-full rounded" muted playsInline />
          <p className="mt-2 text-sm">Scanning… {Math.round(progress * 100)}%</p>
        </div>
      ) : (
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white"
          onClick={() => setScanning(true)}
        >
          Scan a broadcast
        </button>
      )}

      {saved.length > 0 && (
        <div>
          <h2 className="mt-4 font-semibold">Saved copies</h2>
          <ul className="divide-y">
            {saved.map((d) => (
              <li key={d.id}>
                <button className="w-full py-2 text-left" onClick={() => setDoc(d)}>
                  {d.envelope.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
