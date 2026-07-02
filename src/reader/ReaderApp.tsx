import { useEffect, useRef, useState } from "react";
import { ScanSession, startCamera } from "./scanner";
import {
  saveDoc,
  getDoc,
  listDocs,
  purgeExpired,
  renameDoc,
  deleteDoc,
  type StoredDoc,
} from "../core/store";
import { MobileView } from "./MobileView";
import { ConfidentialBanner } from "./ConfidentialBanner";
import { Countdown } from "./Countdown";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Banner } from "../ui/Banner";
import { Logo } from "../ui/Logo";
import { ProgressRing } from "../ui/ProgressRing";
import { Spinner } from "../ui/Spinner";
import { IconBack, IconCamera, IconShield, IconTorch } from "../ui/icons";

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
  const [torch, setTorch] = useState<{ toggle: (on: boolean) => Promise<void> } | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const refresh = () => listDocs(Date.now()).then(setSaved);

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
    if (doc && doc.expiresAt != null && doc.expiresAt <= now) {
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
      {
        onTorchAvailable: (toggle) => setTorch({ toggle }),
        onError: () => setView("denied"),
      },
    );
    return () => {
      stop();
      // Torch is a property of the camera session that just ended — don't let
      // a stale toggle/on-state linger into the next scan or view.
      setTorch(null);
      setTorchOn(false);
    };
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
        <a href="#home" className="flex items-center gap-2 font-semibold">
          <Logo size={24} />
          RoomCast
        </a>
        <a href="#present" className="text-sm font-medium text-[var(--rc-accent)] hover:underline">
          Present
        </a>
      </div>

      {view === "loading" ? (
        <div className="flex justify-center py-12" role="status">
          <Spinner size={32} />
          <span className="sr-only">Loading</span>
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
            {torch && (
              <Button
                variant="ghost"
                className="absolute bottom-3 left-3"
                aria-pressed={torchOn}
                onClick={() => {
                  void torch.toggle(!torchOn);
                  setTorchOn((v) => !v);
                }}
              >
                <IconTorch size={16} /> Torch
              </Button>
            )}
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
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      {editingId === d.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            aria-label="Title"
                            className="w-full rounded border px-2 py-1 text-sm"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            onClick={() => {
                              renameDoc(d.id, editValue, Date.now()).then(() => {
                                setEditingId(null);
                                refresh();
                              });
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="block w-full truncate text-left"
                          onClick={() => {
                            // Re-fetch rather than trusting the last-listed copy: it may have
                            // expired between listing and click. A null result means it's gone
                            // — refresh the list so the stale entry drops off instead of opening.
                            getDoc(d.id, Date.now()).then((fresh) => {
                              if (fresh) setDoc(fresh);
                              else refresh();
                            });
                          }}
                        >
                          {d.envelope.title}
                        </button>
                      )}
                      <div className="text-xs text-slate-500">
                        <Countdown expiresAt={d.expiresAt} now={now} />
                      </div>
                    </div>
                    {editingId !== d.id && confirmingDeleteId === d.id && (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm text-slate-600">Delete this copy?</span>
                        <Button
                          variant="danger"
                          onClick={() => {
                            deleteDoc(d.id).then(() => {
                              setConfirmingDeleteId(null);
                              refresh();
                            });
                          }}
                        >
                          Delete
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirmingDeleteId(null)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                    {editingId !== d.id && confirmingDeleteId !== d.id && (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingId(d.id);
                            setEditValue(d.envelope.title);
                          }}
                        >
                          Rename
                        </Button>
                        <Button variant="danger" onClick={() => setConfirmingDeleteId(d.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
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
