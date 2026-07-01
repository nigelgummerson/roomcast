import { useEffect, useRef, useState } from "react";
import { ScanSession, startCamera } from "./scanner";
import { saveDoc, getDoc, listDocs, purgeExpired, type StoredDoc } from "../core/store";
import { MobileView } from "./MobileView";
import { ConfidentialBanner } from "./ConfidentialBanner";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Banner } from "../ui/Banner";
import { ProgressRing } from "../ui/ProgressRing";
import { Spinner } from "../ui/Spinner";
import { IconBack, IconCamera, IconShield } from "../ui/icons";

type View = "loading" | "copies" | "scanning" | "denied";

export function ReaderApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Starts as "loading" (not "copies") so a brand-new user never sees the
  // "Scan a broadcast" button flash before we know whether they have any
  // saved copies — see the listDocs effect below.
  const [view, setView] = useState<View>("loading");
  const [progress, setProgress] = useState(0);
  const [doc, setDoc] = useState<StoredDoc | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saved, setSaved] = useState<StoredDoc[]>([]);

  // Request persistent storage once on mount so saved copies survive the
  // browser's storage-eviction heuristics. Not every browser implements
  // this, hence the guard.
  useEffect(() => {
    void navigator.storage?.persist?.();
  }, []);

  // Decide the initial landing state once listDocs resolves: a returning
  // user with a live copy lands on "copies"; a first-time/empty user goes
  // straight to "scanning" (the camera). Until this resolves the view stays
  // "loading" (a spinner), so neither state flashes before we know which one
  // applies.
  useEffect(() => {
    listDocs(Date.now()).then((docs) => {
      setSaved(docs);
      setView(docs.length === 0 ? "scanning" : "copies");
    });
  }, []);

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
    if (view !== "scanning" || !videoRef.current) return;
    setProgress(0);
    const session = new ScanSession();
    const stop = startCamera(
      videoRef.current,
      (text) => {
        const p = session.feed(text);
        setProgress(p.progress);
        if (p.done) {
          stop();
          saveDoc(session.envelope(), Date.now()).then((stored) => {
            setDoc(stored);
            setView("copies");
          });
        }
      },
      { onError: () => setView("denied") },
    );
    return stop;
  }, [view]);

  if (doc) {
    return (
      <div>
        <ConfidentialBanner
          profile={doc.envelope.profile}
          expiresAt={doc.expiresAt}
          now={now}
        />
        <div className="p-3">
          <Button variant="ghost" className="mb-3" onClick={() => setDoc(null)}>
            <IconBack size={16} /> Back
          </Button>
          <MobileView md={doc.envelope.md} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-bold">roomcast</h1>
        <a href="#" className="text-sm text-blue-600 underline">← Presenter mode</a>
      </div>

      {view === "loading" ? (
        <div className="flex justify-center py-12" role="status" aria-label="Loading">
          <Spinner size={32} />
        </div>
      ) : view === "scanning" ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} className="w-full" muted playsInline />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-2/3 w-2/3 rounded-2xl border-4 border-white/80" />
            </div>
            <div className="pointer-events-none absolute bottom-3 right-3 text-white">
              <ProgressRing value={progress} size={48} />
            </div>
          </div>
          <p className="text-center text-sm text-slate-600">Point at the code</p>
          {saved.length > 0 && (
            <Button variant="ghost" onClick={() => setView("copies")}>
              ← Your copies
            </Button>
          )}
        </div>
      ) : view === "denied" ? (
        <Card className="space-y-3">
          <Banner severity="hard">
            Camera access was denied — roomcast needs the camera to scan a broadcast.
          </Banner>
          <Button onClick={() => setView("scanning")}>
            <IconCamera size={16} /> Enable camera
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Button onClick={() => setView("scanning")}>
            <IconCamera size={16} /> Scan a broadcast
          </Button>

          {saved.length > 0 && (
            <div>
              <h2 className="mt-4 flex items-center gap-2 font-semibold">
                <IconShield size={18} /> Your copies
              </h2>
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
      )}
    </div>
  );
}
