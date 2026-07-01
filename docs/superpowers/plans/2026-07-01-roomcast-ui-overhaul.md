# roomcast UI/UX Overhaul + Camera Reliability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring roomcast to a spine-planner polish bar, fix camera scan reliability + auto-start, reposition the projected QR codes, and make received copies durably re-accessible for their TTL.

**Architecture:** Add a small `src/ui/` design system (spine-planner-calibrated), restyle presenter + reader on top of it, replace the single QR decoder with a hybrid `BarcodeDetector`→zxing-wasm selector, and give the reader a landing that shows saved copies first (returning users) or auto-starts the camera (first use). Behaviour-bearing logic is isolated and unit/component-tested; pure-visual polish is verified by build/lint/e2e + manual projector test.

**Tech Stack:** Vite + React 19 + TypeScript (strict) + Tailwind v4 + Vitest + @testing-library/react + Playwright. New dep: `@fontsource/inter`.

## Global Constraints

- TypeScript **strict**; no `any` without an inline justification comment.
- **UK English** in all user-facing copy.
- Primary accent **NHS Blue `#005EB8`**; radius `rounded-lg`; elevated surfaces `shadow-2xl`; one `fadeIn` keyframe; global `:focus-visible` outline `2px solid #3b82f6`; honour `@media (prefers-reduced-motion: reduce)`.
- System-font-first UI stack with self-hosted `@fontsource/inter` (no font CDN).
- **No network for document data**; no logging of document content; scan-only; **confidential** is the default profile everywhere.
- Every task: run `npm test` (full) AND `npm run build` (tsc type-checks; vitest does not) AND `npm run lint` before committing — all must pass/clean. Keep the existing **67 unit tests + Playwright e2e** green.
- Commit after every green test cycle. Work on branch `feat/ui-overhaul`.
- Spec of record: `docs/superpowers/specs/2026-07-01-roomcast-ui-overhaul-design.md`.

---

### Task 1: Design-system foundation (tokens, fonts, viewport)

**Files:**
- Modify: `src/index.css`, `src/main.tsx`, `index.html`
- Create: `src/ui/appHeight.ts`
- Test: `src/ui/appHeight.test.ts`
- Install: `@fontsource/inter`

**Interfaces:**
- Produces: `function installAppHeight(win?: Window & typeof globalThis): () => void` — sets `--app-height` CSS var from `innerHeight`, updates on resize; returns a cleanup fn. CSS custom classes/keyframes for the rest of the app.

- [ ] **Step 1: Install the font**

Run: `npm install @fontsource/inter`

- [ ] **Step 2: Write the failing test**

Write `src/ui/appHeight.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { installAppHeight } from "./appHeight";

describe("installAppHeight", () => {
  it("sets --app-height from innerHeight and updates on resize", () => {
    const root = document.documentElement;
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    const cleanup = installAppHeight(window);
    expect(root.style.getPropertyValue("--app-height")).toBe("800px");
    Object.defineProperty(window, "innerHeight", { value: 640, configurable: true });
    window.dispatchEvent(new Event("resize"));
    expect(root.style.getPropertyValue("--app-height")).toBe("640px");
    cleanup();
    Object.defineProperty(window, "innerHeight", { value: 500, configurable: true });
    window.dispatchEvent(new Event("resize"));
    expect(root.style.getPropertyValue("--app-height")).toBe("640px"); // unchanged after cleanup
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- appHeight`
Expected: FAIL ("Cannot find module './appHeight'").

- [ ] **Step 4: Implement**

Write `src/ui/appHeight.ts`:
```ts
export function installAppHeight(win: Window & typeof globalThis = window): () => void {
  const set = () =>
    win.document.documentElement.style.setProperty("--app-height", `${win.innerHeight}px`);
  set();
  win.addEventListener("resize", set);
  return () => win.removeEventListener("resize", set);
}
```

- [ ] **Step 5: Wire tokens + fonts into CSS**

Replace `src/index.css` with:
```css
@import "tailwindcss";
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/inter/700.css";

:root {
  --rc-accent: #005eb8;         /* NHS Blue */
  --rc-accent-hover: #004a94;
  --app-height: 100vh;          /* overwritten by installAppHeight */
  --ui-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", sans-serif;
}

html, body, #root { height: 100%; }
body {
  font-family: var(--ui-font);
  background: #f1f5f9;
  color: #1d1d1f;
  -webkit-tap-highlight-color: transparent;
}

@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: none; } }
.animate-fadeIn { animation: fadeIn 0.2s ease-out; }

:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 6: Wire --app-height + viewport meta**

In `src/main.tsx`, call `installAppHeight()` before render:
```tsx
import { installAppHeight } from "./ui/appHeight";
installAppHeight();
```
In `index.html`, replace the viewport meta line with:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1" />
```

- [ ] **Step 7: Verify**

Run: `npm test -- appHeight` → PASS.
Run: `npm test` → all still pass. `npm run build` → clean. `npm run lint` → clean.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): design-system foundation (tokens, Inter font, --app-height, viewport)"
```

---

### Task 2: UI primitives — Button, Card, Banner, Spinner, ProgressRing, icons

**Files:**
- Create: `src/ui/Button.tsx`, `src/ui/Card.tsx`, `src/ui/Banner.tsx`, `src/ui/Spinner.tsx`, `src/ui/ProgressRing.tsx`, `src/ui/icons.tsx`
- Test: `src/ui/Button.test.tsx`, `src/ui/Banner.test.tsx`

**Interfaces:**
- Produces:
  - `Button({ variant?: "primary" | "ghost" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>)`
  - `Card({ className?, children })` — white, `rounded-lg`, `shadow-sm`, border, padding.
  - `Banner({ severity: "soft" | "hard", children, className? })` — amber (soft) / red (hard).
  - `Spinner({ size?: number })`; `ProgressRing({ value: number /*0..1*/, size?: number })`.
  - `icons.tsx`: `IconCamera`, `IconClose`, `IconBack`, `IconSearch`, `IconTorch`, `IconShield`, `IconChevronRight` — each `({ size?: number, className? })`.

- [ ] **Step 1: Write the failing tests**

Write `src/ui/Button.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children and fires onClick", async () => {
    let clicked = false;
    render(<Button onClick={() => (clicked = true)}>Broadcast</Button>);
    const btn = screen.getByRole("button", { name: "Broadcast" });
    btn.click();
    expect(clicked).toBe(true);
  });
  it("applies a variant-specific class and passes disabled through", () => {
    render(<Button variant="danger" disabled>Stop</Button>);
    const btn = screen.getByRole("button", { name: "Stop" });
    expect(btn).toBeDisabled();
    expect(btn.className).toMatch(/red/);
  });
});
```

Write `src/ui/Banner.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Banner } from "./Banner";

describe("Banner", () => {
  it("soft uses amber, hard uses red", () => {
    const { rerender } = render(<Banner severity="soft">careful</Banner>);
    expect(screen.getByText("careful").className).toMatch(/amber/);
    rerender(<Banner severity="hard">stop</Banner>);
    expect(screen.getByText("stop").className).toMatch(/red/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- "ui/Button" "ui/Banner"`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the primitives**

Write `src/ui/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const variants: Record<Variant, string> = {
  primary: "bg-[var(--rc-accent)] text-white hover:bg-[var(--rc-accent-hover)]",
  ghost: "bg-black/[0.06] text-slate-800 hover:bg-black/[0.1]",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
```

Write `src/ui/Card.tsx`:
```tsx
import type { ReactNode } from "react";
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg border border-black/10 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
```

Write `src/ui/Banner.tsx`:
```tsx
import type { ReactNode } from "react";
const styles = {
  soft: "bg-amber-100 text-amber-900",
  hard: "bg-red-700 text-white",
} as const;
export function Banner({
  severity, children, className = "",
}: { severity: "soft" | "hard"; children: ReactNode; className?: string }) {
  return (
    <div role="status" className={`rounded-lg px-3 py-2 text-sm ${styles[severity]} ${className}`}>
      {children}
    </div>
  );
}
```

Write `src/ui/Spinner.tsx`:
```tsx
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
```

Write `src/ui/ProgressRing.tsx`:
```tsx
export function ProgressRing({ value, size = 64 }: { value: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="progressbar"
      aria-valuenow={Math.round(clamped * 100)} aria-valuemin={0} aria-valuemax={100}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeOpacity="0.2" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="6"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}
```

Write `src/ui/icons.tsx` (Feather-style; all share props):
```tsx
type IconProps = { size?: number; className?: string };
const S = ({ size = 20, className, children }: IconProps & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);
export const IconCamera = (p: IconProps) => (
  <S {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></S>
);
export const IconClose = (p: IconProps) => (<S {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></S>);
export const IconBack = (p: IconProps) => (<S {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></S>);
export const IconSearch = (p: IconProps) => (<S {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></S>);
export const IconTorch = (p: IconProps) => (<S {...p}><path d="M9 2h6l-1 7 3 2-7 11 1-8H8l1-5-2-2z" /></S>);
export const IconShield = (p: IconProps) => (<S {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></S>);
export const IconChevronRight = (p: IconProps) => (<S {...p}><polyline points="9 18 15 12 9 6" /></S>);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- "ui/Button" "ui/Banner"` → PASS.

- [ ] **Step 5: Verify + commit**

Run: `npm test` (all pass), `npm run build` (clean), `npm run lint` (clean).
```bash
git add src/ui
git commit -m "feat(ui): Button/Card/Banner/Spinner/ProgressRing/icons primitives"
```

---

### Task 3: Toast system

**Files:**
- Create: `src/ui/Toast.tsx`
- Test: `src/ui/Toast.test.tsx`

**Interfaces:**
- Produces: `ToastProvider({ children })`; `useToast()` → `{ showToast(message: string, opts?: { severity?: "info" | "error" }): void }`. Info auto-dismisses after 3s; error persists until clicked/dismissed. Region is `aria-live` (`polite` for info, `assertive` for error).

- [ ] **Step 1: Write the failing test**

Write `src/ui/Toast.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";

function Trigger({ severity }: { severity?: "info" | "error" }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast("hello", severity ? { severity } : undefined)}>go</button>;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("shows an info toast and auto-dismisses after 3s", () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    act(() => screen.getByText("go").click());
    expect(screen.getByText("hello")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
  });
  it("keeps an error toast until dismissed", () => {
    render(<ToastProvider><Trigger severity="error" /></ToastProvider>);
    act(() => screen.getByText("go").click());
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- "ui/Toast"` → FAIL (missing module).

- [ ] **Step 3: Implement**

Write `src/ui/Toast.tsx`:
```tsx
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
```

- [ ] **Step 4: Verify + commit**

Run: `npm test -- "ui/Toast"` → PASS. Then `npm test`, `npm run build`, `npm run lint`.
```bash
git add src/ui/Toast.tsx src/ui/Toast.test.tsx
git commit -m "feat(ui): toast system (aria-live, auto-dismiss info, persistent error)"
```

---

### Task 4: Hybrid QR decode engine selector

**Files:**
- Create: `src/reader/detectQr.ts`
- Test: `src/reader/detectQr.test.ts`

**Interfaces:**
- Produces:
  - `type QrDetector = (source: ImageData) => Promise<string | null>`
  - `async function createQrDetector(win?: typeof globalThis): Promise<{ engine: "native" | "wasm"; detect: QrDetector }>` — picks `native` iff `BarcodeDetector` exists AND `getSupportedFormats()` includes `"qr_code"`; else `wasm` (delegates to existing `decodeImageData` in `scanner.ts` — see Task 5 note).

- [ ] **Step 1: Write the failing test**

Write `src/reader/detectQr.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { createQrDetector } from "./detectQr";

const g = globalThis as unknown as { BarcodeDetector?: unknown };
afterEach(() => { delete g.BarcodeDetector; vi.restoreAllMocks(); });

describe("createQrDetector", () => {
  it("uses native BarcodeDetector when qr_code is supported", async () => {
    class FakeBD {
      static getSupportedFormats = async () => ["qr_code", "ean_13"];
      detect = async () => [{ rawValue: "FROM-NATIVE" }];
    }
    g.BarcodeDetector = FakeBD;
    const d = await createQrDetector(globalThis);
    expect(d.engine).toBe("native");
    // native path reads from an ImageBitmap-like; we assert via detect result on a stub
    const out = await d.detect({ width: 1, height: 1, data: new Uint8ClampedArray(4), colorSpace: "srgb" } as ImageData);
    expect(out).toBe("FROM-NATIVE");
  });

  it("falls back to wasm when BarcodeDetector is absent", async () => {
    const d = await createQrDetector(globalThis);
    expect(d.engine).toBe("wasm");
  });

  it("falls back to wasm when qr_code is unsupported", async () => {
    class FakeBD { static getSupportedFormats = async () => ["ean_13"]; }
    g.BarcodeDetector = FakeBD;
    const d = await createQrDetector(globalThis);
    expect(d.engine).toBe("wasm");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- detectQr` → FAIL (missing module).

- [ ] **Step 3: Implement**

Write `src/reader/detectQr.ts`:
```ts
import { decodeImageData } from "./scanner";

export type QrDetector = (source: ImageData) => Promise<string | null>;

// Minimal shape of the parts of the BarcodeDetector API we use (no DOM lib guarantee).
interface BarcodeDetectorLike {
  detect(source: ImageData): Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

export async function createQrDetector(
  win: typeof globalThis = globalThis,
): Promise<{ engine: "native" | "wasm"; detect: QrDetector }> {
  const Ctor = (win as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (Ctor) {
    try {
      const formats = await Ctor.getSupportedFormats();
      if (formats.includes("qr_code")) {
        const bd = new Ctor({ formats: ["qr_code"] });
        return {
          engine: "native",
          detect: async (source) => {
            const res = await bd.detect(source).catch(() => []);
            return res.length ? res[0].rawValue : null;
          },
        };
      }
    } catch {
      /* fall through to wasm */
    }
  }
  return { engine: "wasm", detect: (source) => decodeImageData(source) };
}
```

- [ ] **Step 4: Verify + commit**

Run: `npm test -- detectQr` → PASS. Then `npm test`, `npm run build`, `npm run lint`.
```bash
git add src/reader/detectQr.ts src/reader/detectQr.test.ts
git commit -m "feat(reader): hybrid QR decode engine selector (BarcodeDetector -> zxing-wasm)"
```

---

### Task 5: Scanner uses hybrid detector + torch + higher-res constraints

**Files:**
- Modify: `src/reader/scanner.ts`
- Test: `src/reader/scanner.test.ts` (existing ScanSession tests must stay green)

**Interfaces:**
- Consumes: `createQrDetector` (Task 4).
- Produces: `startCamera(video, onText, opts?: { onTorchAvailable?: (toggle: (on: boolean) => Promise<void>) => void })` — unchanged signature plus an optional torch hook; internally uses the hybrid detector and `facingMode:"environment"` with `width:{ideal:1280}, height:{ideal:720}`. `decodeImageData` and `ScanSession` remain exported and unchanged.

- [ ] **Step 1: Update `startCamera` (no behaviour change to ScanSession)**

In `src/reader/scanner.ts`:
- Add higher-res constraints: `getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } })`.
- Replace the per-frame `decodeImageData(img)` call in the capture loop with a detector created once via `createQrDetector()` (await before the loop; keep the loop resilient — existing try/catch/finally + rAF).
- After the stream resolves, read `stream.getVideoTracks()[0].getCapabilities?.()`; if it advertises `torch`, expose a toggle `(on) => track.applyConstraints({ advanced: [{ torch: on }] })` via `opts?.onTorchAvailable`. Torch capability typing isn't in standard DOM lib — use a narrow, commented cast (no `any`).
- Keep `decodeImageData` exported (Task 4's wasm fallback + e2e use it).

Do NOT change `ScanSession` or `decodeImageData`.

- [ ] **Step 2: Verify existing tests still pass**

Run: `npm test -- scanner`
Expected: PASS (the existing ScanSession + foreign-frame tests are unaffected — they don't exercise the camera).

- [ ] **Step 3: Full verify + commit**

Run: `npm test`, `npm run build`, `npm run lint` — all clean.
```bash
git add src/reader/scanner.ts
git commit -m "feat(reader): scanner uses hybrid detector, env camera hi-res, torch capability"
```

---

### Task 6: Reader landing, viewfinder, permission states, persistent storage

**Files:**
- Modify: `src/reader/ReaderApp.tsx`
- Test: `src/reader/ReaderApp.test.tsx` (extend; keep existing expiry test green)

**Interfaces:**
- Consumes: `startCamera`/`ScanSession` (scanner), `saveDoc`/`getDoc`/`listDocs`/`purgeExpired` (store), `MobileView`, `ConfidentialBanner`, `src/ui/*`.
- Produces: reader with three states — **Your copies** (≥1 live copy), **scanning** (viewfinder + `ProgressRing`), **permission denied** (Enable camera). Requests `navigator.storage.persist()` once on mount.

- [ ] **Step 1: Write the failing tests**

Add to `src/reader/ReaderApp.test.tsx`:
```tsx
// Mock the camera so no real getUserMedia is needed.
import { vi } from "vitest";
vi.mock("./scanner", async (orig) => {
  const actual = await orig<typeof import("./scanner")>();
  return { ...actual, startCamera: vi.fn(() => () => {}) };
});

import { render, screen, waitFor } from "@testing-library/react";
import { ReaderApp } from "./ReaderApp";
import { saveDoc } from "../core/store";
import type { Envelope } from "../core/envelope";

const env: Envelope = { v: 1, profile: "confidential", ttlHours: 36, title: "Ward X", md: "# Ward X\n" };

it("shows 'Your copies' first when a live copy exists (no auto camera)", async () => {
  await saveDoc(env, Date.now());
  render(<ReaderApp />);
  await waitFor(() => expect(screen.getByText(/your copies/i)).toBeInTheDocument());
  expect(screen.getByText("Ward X")).toBeInTheDocument();
  const { startCamera } = await import("./scanner");
  expect(startCamera).not.toHaveBeenCalled();
});

it("auto-starts the camera when there are no copies", async () => {
  render(<ReaderApp />);
  const { startCamera } = await import("./scanner");
  await waitFor(() => expect(startCamera).toHaveBeenCalled());
});
```
(Reset `indexedDB` in a `beforeEach` as the existing test file already does; if not present, add `beforeEach(() => { globalThis.indexedDB = new IDBFactory(); })` importing `IDBFactory` from `fake-indexeddb`.)

- [ ] **Step 2: Run to verify new tests fail**

Run: `npm test -- ReaderApp`
Expected: FAIL (no "Your copies" UI / camera not auto-started yet).

- [ ] **Step 3: Implement the landing logic**

Rework `src/reader/ReaderApp.tsx`:
- On mount: `void navigator.storage?.persist?.()` (guarded — not all browsers have it), then `listDocs(Date.now())`.
- **State machine:** `view: "copies" | "scanning" | "denied"` + existing `doc`.
  - After load: if `saved.length > 0` → `view = "copies"`; else → `view = "scanning"` (auto-start).
  - "Scan a broadcast" button (in copies view) → `view = "scanning"`.
  - Scanning effect (when `view === "scanning"`): create `ScanSession`, call `startCamera`; on completion save + show doc; on camera error/denied → `view = "denied"`.
  - Denied view: message + **Enable camera** button (retries `view = "scanning"`).
- Restyle everything with `src/ui` (`Button`, `Card`, `ProgressRing`, icons). Viewfinder = the `<video>` with a framing overlay + `ProgressRing` bound to scan progress + "Point at the code" caption.
- Keep: expiry-while-open auto-close, `getDoc` fresh-check on opening a saved copy, ConfidentialBanner + Countdown, the footer "Presenter mode" link.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ReaderApp` → PASS (new + existing expiry test).

- [ ] **Step 5: Full verify + commit**

Run: `npm test`, `npm run build`, `npm run lint` — all clean.
```bash
git add src/reader/ReaderApp.tsx src/reader/ReaderApp.test.tsx
git commit -m "feat(reader): copies-first landing, auto-start camera, permission state, persist()"
```

---

### Task 7: Restyle MobileView, ConfidentialBanner, Countdown

**Files:**
- Modify: `src/reader/MobileView.tsx`, `src/reader/ConfidentialBanner.tsx`, `src/reader/Countdown.tsx`
- Test: existing `MobileView.test.tsx`, `Countdown.test.tsx` must stay green (update selectors ONLY if markup necessarily changes)

**Interfaces:** unchanged public props (`MobileView({ md })`, `Countdown({ expiresAt, now })`, `ConfidentialBanner({ profile, expiresAt, now })`).

- [ ] **Step 1: Restyle with `src/ui`**

- `MobileView`: cards rendered via `Card`; search field with `IconSearch`; section index as tappable **chips** (rounded-full, accent border); Mobile⇄Original toggle as a `Button variant="ghost"`. **Preserve** the DOM roles/text the tests assert (`role="searchbox"`, `role="table"` in original view, card label/value text, index `role="link"` names). If a class change alters a queried element, keep the same role/name.
- `ConfidentialBanner`: keep sticky; use accent/red tokens, `IconShield`, embed `Countdown`.
- `Countdown`: unchanged logic; only class/format polish (keep the "expires in Xh Ym" / "expired" strings the tests assert).

- [ ] **Step 2: Verify existing tests still pass**

Run: `npm test -- MobileView Countdown`
Expected: PASS. If a selector broke because markup changed, fix the test selector to match the new markup **without** weakening the assertion (same role/name/behaviour), and note it.

- [ ] **Step 3: Full verify + commit**

Run: `npm test`, `npm run build`, `npm run lint` — all clean.
```bash
git add src/reader/MobileView.tsx src/reader/ConfidentialBanner.tsx src/reader/Countdown.tsx src/reader/MobileView.test.tsx src/reader/Countdown.test.tsx
git commit -m "style(reader): restyle MobileView/ConfidentialBanner/Countdown on ui system"
```

---

### Task 8: Presenter setup screen (drag-and-drop, toggle, phone-frame preview)

**Files:**
- Modify: `src/presenter/PresenterApp.tsx`
- Create: `src/presenter/DropZone.tsx`
- Test: `src/presenter/DropZone.test.tsx`; existing `buildBroadcast.test.ts` stays green

**Interfaces:**
- Produces: `DropZone({ onFile }: { onFile: (f: File) => void })` — drag-and-drop + click-to-browse for `.docx`; calls `onFile` with the dropped/selected file.

- [ ] **Step 1: Write the failing test**

Write `src/presenter/DropZone.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DropZone } from "./DropZone";

describe("DropZone", () => {
  it("calls onFile when a file is dropped", () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    const zone = screen.getByText(/drop a \.docx/i);
    const file = new File(["x"], "handover.docx");
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- DropZone` → FAIL (missing module).

- [ ] **Step 3: Implement DropZone + restyle setup**

Write `src/presenter/DropZone.tsx`:
```tsx
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
```
Restyle `PresenterApp` setup branch with `src/ui`: `Card` wrapper, `DropZone` for input, profile as a segmented toggle (two `Button`s, active = primary / inactive = ghost) writing the same `profile` state, TTL input, size warning via `Banner severity="soft"`, error via toast (`useToast`), a **phone-frame** wrapper around the `MobileView` preview (a fixed-width rounded-2xl bordered container), Broadcast `Button variant="primary"`. Keep `buildBroadcast` usage + `sizeBytes` logic intact.

- [ ] **Step 4: Verify**

Run: `npm test -- DropZone buildBroadcast` → PASS. Then `npm test`, `npm run build`, `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add src/presenter/PresenterApp.tsx src/presenter/DropZone.tsx src/presenter/DropZone.test.tsx
git commit -m "feat(presenter): polished setup — drag-and-drop, profile toggle, phone-frame preview"
```

---

### Task 9: Presenter broadcast (projected) screen — centred stage + corner join panel

**Files:**
- Modify: `src/presenter/PresenterApp.tsx`
- Create: `src/presenter/qrTuning.ts`
- Test: `src/presenter/qrTuning.test.ts`

**Interfaces:**
- Produces: `function fountainQrSize(vw: number, vh: number): number` — the fountain QR pixel size = `min(vw, vh)` scaled by a factor with a max cap; `const FOUNTAIN_FPS = 8`, `const FOUNTAIN_ECC = "M"`.

- [ ] **Step 1: Write the failing test**

Write `src/presenter/qrTuning.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { fountainQrSize } from "./qrTuning";

describe("fountainQrSize", () => {
  it("scales with the smaller viewport dimension", () => {
    expect(fountainQrSize(1920, 1080)).toBeGreaterThan(fountainQrSize(800, 600));
  });
  it("leaves margin (never fills the smaller dimension) and caps on huge screens", () => {
    expect(fountainQrSize(1000, 1000)).toBeLessThan(1000);
    expect(fountainQrSize(6000, 6000)).toBeLessThanOrEqual(900);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- qrTuning` → FAIL (missing module).

- [ ] **Step 3: Implement tuning + broadcast layout**

Write `src/presenter/qrTuning.ts`:
```ts
export const FOUNTAIN_FPS = 8;
export const FOUNTAIN_ECC = "M" as const;
const SCALE = 0.62;   // leave generous margin around the fountain QR
const MAX = 900;      // px cap so it never gets absurd on large displays
export function fountainQrSize(vw: number, vh: number): number {
  return Math.min(MAX, Math.round(Math.min(vw, vh) * SCALE));
}
```
Rework the `broadcasting` branch of `PresenterApp`:
- Root: `flex min-h-[var(--app-height)] flex-col bg-slate-950 text-white`.
- **Top strip** (`px-6 py-4 flex items-center justify-between`): title (left); a confidential **pill** (`rounded-full bg-red-600/90 px-3 py-1 text-xs`) + expiry note (right, confidential only); a ghost **Stop** control.
- **Centre stage** (`flex flex-1 items-center justify-center`): `<QrImage text={frame} size={fountainQrSize(window.innerWidth, window.innerHeight)} />` on a white `rounded-2xl` plate with padding (quiet zone), never touching the top (centre-flex guarantees margin).
- **Bottom-right join panel** (`absolute bottom-6 right-6`, a bordered `Card`-like dark panel): heading "Scan to receive", the join `<QrImage text={readerUrl} size={132} />`, and the short URL below.
- Use `useFrameLoop(frames, FOUNTAIN_FPS)`; pass `FOUNTAIN_ECC` to `QrImage` (add an optional `ecc` prop to `QrImage`, default keep current) if not already configurable.
- Recompute size on resize (reuse the `--app-height`/resize signal or a local `useState` on resize).

- [ ] **Step 4: Verify**

Run: `npm test -- qrTuning` → PASS. Then `npm test`, `npm run build`, `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add src/presenter/PresenterApp.tsx src/presenter/qrTuning.ts src/presenter/qrTuning.test.ts src/presenter/QrImage.tsx
git commit -m "feat(presenter): centred-stage broadcast layout + corner join panel + QR tuning"
```

---

### Task 10: App wiring, e2e updates, final verification

**Files:**
- Modify: `src/App.tsx` (wrap in `ToastProvider`), `e2e/build.spec.ts`
- Test: `src/App.test.tsx` stays green; e2e updated

**Interfaces:** none new.

- [ ] **Step 1: Wrap the app in ToastProvider**

In `src/App.tsx`, wrap the returned `PresenterApp`/`ReaderApp` in `<ToastProvider>` so `useToast` works in both. Keep the hash routing + `App.test.tsx` assertions valid (presenter default, reader on `#reader`).

- [ ] **Step 2: Update e2e for the new reader landing**

In `e2e/build.spec.ts`, the reader route test currently asserts a "Scan a broadcast" button. With no saved copies the reader now auto-starts the camera (which needs permissions Playwright won't grant), so update the reader assertion to be robust: grant camera in the Playwright context (`use: { permissions: ["camera"] }` in `playwright.config.ts` for the build project) OR assert the reader shell renders (heading/viewfinder container or the "Presenter mode" footer link) rather than a specific button. Update the existing "presenter links to the receiver and back" nav test to match the new markup (the presenter "Receive a broadcast" link and reader "Presenter mode" link must still exist and navigate).

- [ ] **Step 3: Run everything**

Run: `npm test` → all pass. `npm run build` → clean. `npm run typecheck:e2e` → clean. `npm run lint` → clean. `npm run test:e2e` → all pass (routing, nav, pipeline, zxing decode).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.test.tsx e2e playwright.config.ts
git commit -m "chore: wrap app in ToastProvider; update e2e for new reader landing/layout"
```

---

## Self-Review

**Spec coverage:**
- §2 design system → Tasks 1, 2, 3. ✓
- §3 presenter setup (drag-drop, toggle, phone preview) → Task 8. ✓
- §4 projected layout (centred stage + corner join, tuning) → Task 9. ✓
- §5 reader scanning (auto-start, viewfinder, progress, torch, permission) + hybrid decoder → Tasks 4, 5, 6. ✓
- §6 "Your copies" landing → Task 6. ✓
- §7 document view restyle → Task 7. ✓
- §8 persistence (`persist()`, no install prompt) → Task 6; durable IndexedDB already exists. ✓
- §9 component boundaries → one primitive/module per file across Tasks 1–9. ✓
- §10 testing → tests in Tasks 1–9 + e2e in Task 10; existing 67 kept green throughout. ✓
- §11 out of scope → nothing implements a theme switcher or install prompt. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Restyle steps (7, 8, 9) name exact roles/classes/constants; visual latitude is bounded by "preserve asserted roles/text".

**Type consistency:** `createQrDetector` → `{engine, detect}` (Task 4) consumed by scanner (Task 5). `installAppHeight` (1) used in main. `useToast`/`ToastProvider` (3) used in Tasks 8, 10. `DropZone({onFile})` (8), `fountainQrSize`/`FOUNTAIN_FPS`/`FOUNTAIN_ECC` (9) used in PresenterApp. `Button`/`Card`/`Banner`/`ProgressRing`/icons (2) used across 6–9. Names consistent.

**Known risks to confirm during implementation (not blockers):**
- `BarcodeDetector.detect` in browsers accepts `ImageBitmap`/canvas/video, not always raw `ImageData`; the `detect` wrapper takes `ImageData` for a uniform interface — during Task 5, feed the detector whatever it accepts fastest (e.g. pass the video/canvas frame). Keep the Task-4 unit contract (`ImageData` in) and adapt the scanner's call site if a browser rejects `ImageData` (verify against `getSupportedFormats` + a real decode in the e2e).
- Torch capability types aren't in the standard DOM lib — narrow commented cast, no `any`.
- Restyles must not weaken test assertions — update selectors only when markup necessarily changes, preserving role/name/behaviour.
