import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Severity = "info" | "error";
type ToastItem = { id: number; message: string; severity: Severity };
type Ctx = { showToast: (message: string, opts?: { severity?: Severity }) => void };

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const showToast = useCallback((message: string, opts?: { severity?: Severity }) => {
    const severity = opts?.severity ?? "info";
    const id = nextId.current++;
    setItems((xs) => [...xs, { id, message, severity }]);
    if (severity === "info") setTimeout(() => dismiss(id), 3000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2">
        {items.map((t) => (
          <button key={t.id} onClick={() => dismiss(t.id)}
            role={t.severity === "error" ? "alert" : "status"}
            aria-live={t.severity === "error" ? "assertive" : "polite"}
            className={`animate-fadeIn rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
              t.severity === "error" ? "bg-red-700" : "bg-slate-800"}`}>
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
