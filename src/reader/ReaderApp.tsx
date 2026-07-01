import { useEffect, useRef, useState } from "react";
import { ScanSession, startCamera } from "./scanner";
import { saveDoc, getDoc, listDocs, purgeExpired, type StoredDoc } from "../core/store";
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
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 30000);
    // Also re-check on regaining focus/visibility, so a doc that expired
    // while the tab was backgrounded disappears as soon as it's looked at
    // again rather than waiting for the next 30s tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Enforce expiry while a document is open: if the open doc has passed its
  // expiry on any `now` tick, close it immediately rather than leaving the
  // patient data on screen until the user manually navigates away.
  useEffect(() => {
    if (doc && doc.expiresAt <= now) {
      setDoc(null);
      purgeExpired(now).then(() => listDocs(now)).then(setSaved);
    }
  }, [doc, now]);

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
                <button
                  className="w-full py-2 text-left"
                  onClick={() => {
                    // Re-fetch rather than trusting the last-listed copy: it may have
                    // expired between listing and click. A null result means it's gone
                    // — refresh the list so the stale entry drops off instead of opening.
                    getDoc(d.id, Date.now()).then((fresh) => {
                      if (fresh) setDoc(fresh);
                      else listDocs(Date.now()).then(setSaved);
                    });
                  }}
                >
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
