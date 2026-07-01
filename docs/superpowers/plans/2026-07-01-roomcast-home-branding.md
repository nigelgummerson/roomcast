# RoomCast — Home Page, Branding & Delivery-Model Refinements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a RoomCast home/landing page, full branding (logo + favicon/PWA/social assets), a two-model delivery scheme (Confidential with preset+custom expiry / Standard never-expires), saved-copy rename+delete, and small UX fixes (Escape stops broadcast, phone-frame scrollable preview).

**Architecture:** Widen the expiry data model to `ttlHours: number | null` / `expiresAt: number | null` through envelope→store→UI; add store rename/delete; refactor the presenter's expiry input into a profile toggle + duration control; add a `HomePage` at the base route with `#present`/`#reader` sub-routes and brand-home links; generate brand assets from SVG via a Playwright render script. Pure logic (types, store, ttl resolution, formatRemaining) is unit-tested; components get component tests; assets are verified by existence + a manifest-name check.

**Tech Stack:** Vite + React 19 + TS (strict) + Tailwind v4 + Vitest + @testing-library/react + Playwright. No new runtime deps (Playwright already a dev dep for the render script).

## Global Constraints

- TypeScript **strict**; no `any` without an inline justification comment.
- **UK English** in all user-facing copy.
- Display name **"RoomCast"** in all user-facing text, `<title>`, and PWA manifest; the repo, URL, and `/roomcast/` base path stay lowercase `roomcast`.
- Primary accent **NHS Blue `#005EB8`**; reuse the `src/ui/` design system.
- **Two delivery models:** Confidential = a chosen duration, presets **8/12/24/36/168 hours** (default **36**) **plus a Custom free-form hours entry**; Standard = **no expiry** (`ttlHours: null`). Expiry data model is `ttlHours: number | null`, `expiresAt: number | null` (null = never).
- The Confidential model's tagline/description must NOT hardcode "36 hours" or "forever".
- **No network for document data**; no logging of document content; scan-only.
- Every task: run `npm test` (full) AND `npm run build` AND `npm run lint` before committing — all pass/clean. Keep the existing **88 unit tests + Playwright e2e** green.
- Commit after every green cycle. Work on branch `feat/roomcast-home-brand`.
- Spec: `docs/superpowers/specs/2026-07-01-roomcast-home-branding-design.md`.

---

### Task 1: Nullable-expiry data model (envelope + buildBroadcast)

**Files:**
- Modify: `src/core/envelope.ts`, `src/presenter/buildBroadcast.ts`
- Test: `src/core/envelope.test.ts`, `src/presenter/buildBroadcast.test.ts`

**Interfaces:**
- Produces: `Envelope.ttlHours: number | null`; `buildBroadcast(file, { title, profile, ttlHours: number | null })`.

- [ ] **Step 1: Widen the envelope type + add a null-round-trip test**

In `src/core/envelope.ts`, change `ttlHours: number;` to `ttlHours: number | null;`. No other logic change (`unpackEnvelope` doesn't validate `ttlHours`, so `null` round-trips through JSON+gzip).

Add to `src/core/envelope.test.ts`:
```ts
it("round-trips a standard (never-expires) envelope with ttlHours null", () => {
  const env = { v: 1 as const, profile: "standard" as const, ttlHours: null, title: "Rota", md: "# Rota\n" };
  expect(unpackEnvelope(packEnvelope(env))).toEqual(env);
});
```

- [ ] **Step 2: Run to verify**

Run: `npm test -- envelope` → PASS (existing + new).

- [ ] **Step 3: Widen buildBroadcast + test**

In `src/presenter/buildBroadcast.ts` change the opts type to `{ title: string; profile: SecurityProfile; ttlHours: number | null }`. No other change.

Add to `src/presenter/buildBroadcast.test.ts`:
```ts
it("carries ttlHours null (standard) into the reconstructed envelope", async () => {
  vi.spyOn(parser, "docxToMarkdown").mockResolvedValue("# Rota\n\nx\n");
  const { md, frames } = await buildBroadcast(new ArrayBuffer(0), {
    title: "Rota", profile: "standard", ttlHours: null,
  });
  const s = new ScanSession();
  for (const f of frames) if (s.feed(f).done) break;
  expect(s.envelope()).toEqual({ v: 1, profile: "standard", ttlHours: null, title: "Rota", md });
});
```

- [ ] **Step 4: Verify + commit**

Run: `npm test`, `npm run build`, `npm run lint` — all clean.
```bash
git add src/core/envelope.ts src/core/envelope.test.ts src/presenter/buildBroadcast.ts src/presenter/buildBroadcast.test.ts
git commit -m "feat(core): ttlHours number|null (standard = never expires)"
```

---

### Task 2: Store — nullable expiry (never-expires)

**Files:**
- Modify: `src/core/store.ts`
- Test: `src/core/store.test.ts`

**Interfaces:**
- Produces: `StoredDoc.expiresAt: number | null`. `saveDoc` sets `expiresAt = null` when `envelope.ttlHours == null`. `purgeExpired`/`getDoc`/`listDocs` treat `expiresAt == null` as never-expires.

- [ ] **Step 1: Write failing tests**

Add to `src/core/store.test.ts`:
```ts
it("a standard (ttlHours null) doc has null expiresAt and never purges", async () => {
  const std = { ...env, profile: "standard" as const, ttlHours: null, title: "Rota" };
  const saved = await saveDoc(std, 1000);
  expect(saved.expiresAt).toBeNull();
  expect(await purgeExpired(1000 + 1e12)).toBe(0);           // far future, still not purged
  expect(await getDoc(saved.id, 1000 + 1e12)).not.toBeNull(); // still live
  expect((await listDocs(1000 + 1e12)).map((d) => d.envelope.title)).toContain("Rota");
});
```
(`env` is the existing confidential fixture in this file.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- store` → FAIL (null handling not implemented; `null <= now` / `null > now` are wrong).

- [ ] **Step 3: Implement null-expiry handling**

In `src/core/store.ts`:
- `interface StoredDoc { ...; expiresAt: number | null }`.
- `saveDoc`: `expiresAt: envelope.ttlHours == null ? null : now + envelope.ttlHours * 3600e3,`.
- Add a helper `const isLive = (d: StoredDoc, now: number) => d.expiresAt == null || d.expiresAt > now;`.
- `purgeExpired`: `const expired = docs.filter((d) => d.expiresAt != null && d.expiresAt <= now);` (null never expired).
- `getDoc`: `return doc && isLive(doc, now) ? doc : null;`.
- `listDocs`: `return docs.filter((d) => isLive(d, now)).sort((a, b) => b.scannedAt - a.scannedAt);`.

- [ ] **Step 4: Run to verify + commit**

Run: `npm test -- store` → PASS. Then `npm test`, `npm run build`, `npm run lint`.
```bash
git add src/core/store.ts src/core/store.test.ts
git commit -m "feat(store): null expiresAt = never expires"
```

---

### Task 3: Store — rename & delete

**Files:**
- Modify: `src/core/store.ts`
- Test: `src/core/store.test.ts`

**Interfaces:**
- Produces: `renameDoc(id: string, title: string, now: number): Promise<StoredDoc | null>` (updates the stored copy's `envelope.title`, returns the updated doc or null if gone/expired); `deleteDoc(id: string): Promise<void>`.

- [ ] **Step 1: Write failing tests**

Add to `src/core/store.test.ts`:
```ts
it("renameDoc updates the stored title", async () => {
  const saved = await saveDoc({ ...env, title: "Old" }, 1000);
  const renamed = await renameDoc(saved.id, "New", 1000);
  expect(renamed?.envelope.title).toBe("New");
  expect((await getDoc(saved.id, 1000))?.envelope.title).toBe("New");
});
it("deleteDoc removes the copy", async () => {
  const saved = await saveDoc(env, 1000);
  await deleteDoc(saved.id);
  expect(await getDoc(saved.id, 1000)).toBeNull();
  expect(await listDocs(1000)).toHaveLength(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- store` → FAIL (functions undefined).

- [ ] **Step 3: Implement**

Add to `src/core/store.ts`:
```ts
export async function renameDoc(id: string, title: string, now: number): Promise<StoredDoc | null> {
  const doc = await getDoc(id, now);
  if (!doc) return null;
  const updated: StoredDoc = { ...doc, envelope: { ...doc.envelope, title } };
  await tx("readwrite", (s) => s.put(updated));
  return updated;
}
export async function deleteDoc(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}
```

- [ ] **Step 4: Verify + commit**

Run: `npm test -- store` → PASS. Then `npm test`, `npm run build`, `npm run lint`.
```bash
git add src/core/store.ts src/core/store.test.ts
git commit -m "feat(store): renameDoc + deleteDoc for saved copies"
```

---

### Task 4: Countdown / ConfidentialBanner — "Does not expire"

**Files:**
- Modify: `src/reader/Countdown.tsx`, `src/reader/ConfidentialBanner.tsx`
- Test: `src/reader/Countdown.test.tsx`

**Interfaces:**
- Produces: `formatRemaining(expiresAt: number | null, now: number): string` → `"Does not expire"` when `expiresAt == null`; `Countdown({ expiresAt: number | null, now })`. `ConfidentialBanner` accepts `expiresAt: number | null`.

- [ ] **Step 1: Write failing test**

Add to `src/reader/Countdown.test.tsx`:
```ts
it("shows 'Does not expire' when there is no expiry", () => {
  render(<Countdown expiresAt={null} now={1000} />);
  expect(screen.getByText(/does not expire/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- Countdown` → FAIL (type error / no such text).

- [ ] **Step 3: Implement**

In `src/reader/Countdown.tsx`:
```ts
export function formatRemaining(expiresAt: number | null, now: number): string {
  if (expiresAt == null) return "Does not expire";
  const ms = expiresAt - now;
  if (ms <= 0) return "expired";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `expires in ${h}h ${m}m`;
}
export function Countdown({ expiresAt, now }: { expiresAt: number | null; now: number }) {
  return <span className="tabular-nums">{formatRemaining(expiresAt, now)}</span>;
}
```
In `src/reader/ConfidentialBanner.tsx`, widen the `expiresAt` prop to `number | null` (confidential always passes a number, but the type must match `StoredDoc.expiresAt`). No behaviour change.

- [ ] **Step 4: Verify + commit**

Run: `npm test -- Countdown` → PASS. Then `npm test`, `npm run build`, `npm run lint` (fix any type mismatches where `StoredDoc.expiresAt` now flows into these props).
```bash
git add src/reader/Countdown.tsx src/reader/Countdown.test.tsx src/reader/ConfidentialBanner.tsx
git commit -m "feat(reader): Countdown handles never-expires"
```

---

### Task 5: TTL resolution helper + presenter duration control, Escape-stop, phone-frame preview

**Files:**
- Create: `src/presenter/ttl.ts`, `src/presenter/ttl.test.ts`
- Modify: `src/presenter/PresenterApp.tsx`

**Interfaces:**
- Produces: `const TTL_PRESETS = [8, 12, 24, 36, 168] as const`; `const DEFAULT_TTL = 36`; `type TtlChoice = number | "custom"`; `resolveTtlHours(profile: SecurityProfile, choice: TtlChoice, customHours: string): number | null`.

- [ ] **Step 1: Write failing test for the resolver**

Write `src/presenter/ttl.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveTtlHours, DEFAULT_TTL } from "./ttl";

describe("resolveTtlHours", () => {
  it("standard → null (never expires)", () => {
    expect(resolveTtlHours("standard", 36, "")).toBeNull();
  });
  it("confidential + preset → that number", () => {
    expect(resolveTtlHours("confidential", 12, "")).toBe(12);
  });
  it("confidential + custom → parsed positive hours", () => {
    expect(resolveTtlHours("confidential", "custom", "72")).toBe(72);
  });
  it("confidential + blank/invalid custom → default", () => {
    expect(resolveTtlHours("confidential", "custom", "")).toBe(DEFAULT_TTL);
    expect(resolveTtlHours("confidential", "custom", "-5")).toBe(DEFAULT_TTL);
    expect(resolveTtlHours("confidential", "custom", "abc")).toBe(DEFAULT_TTL);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- "presenter/ttl"` → FAIL (missing module).

- [ ] **Step 3: Implement the resolver**

Write `src/presenter/ttl.ts`:
```ts
import type { SecurityProfile } from "../core/envelope";

export const TTL_PRESETS = [8, 12, 24, 36, 168] as const;
export const DEFAULT_TTL = 36;
export type TtlChoice = number | "custom";

export function resolveTtlHours(
  profile: SecurityProfile,
  choice: TtlChoice,
  customHours: string,
): number | null {
  if (profile === "standard") return null;
  if (choice === "custom") {
    const n = Number(customHours);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL;
  }
  return choice;
}
```

- [ ] **Step 4: Run to verify + wire into PresenterApp**

Run: `npm test -- "presenter/ttl"` → PASS.

In `src/presenter/PresenterApp.tsx` (setup branch):
- Replace the free-form "Expiry (hours)" input with a **duration control shown only when `profile === "confidential"`**: a segmented row of `TTL_PRESETS` (label e.g. `168 → "1 week"`, others `"{n}h"`) plus a **"Custom…"** chip; when "custom" is chosen, reveal a small number input bound to `customHours` state. State: `const [choice, setChoice] = useState<TtlChoice>(DEFAULT_TTL)`, `const [customHours, setCustomHours] = useState("")`.
- On file/broadcast build, pass `ttlHours: resolveTtlHours(profile, choice, customHours)` to `buildBroadcast`.
- Profile toggle labels stay time-free ("Confidential" / "Standard").

In the **broadcast branch** of `PresenterApp.tsx`:
- **Escape stops the broadcast:** add `useEffect` that, while `broadcasting`, listens for `keydown` and calls `setBroadcasting(false)` on `Escape`; clean up the listener. (Add `broadcasting` to deps; early-return when not broadcasting.)
- Confidential expiry note: derive from the effective ttl (show the chosen hours), not a hardcoded 36.

In the **preview** (setup branch): make the phone-frame a fixed phone aspect ratio with internal scroll — e.g. wrap `MobileView` in `<div className="mx-auto w-[300px] aspect-[9/19.5] overflow-y-auto rounded-2xl border-4 border-slate-800 bg-white p-2">`.

- [ ] **Step 5: Verify + commit**

Run: `npm test`, `npm run build`, `npm run lint` — all clean (App.test still green; the presenter is rendered by App on the default route until Task 9 changes routing — ensure the duration control + escape changes don't break it).
```bash
git add src/presenter/ttl.ts src/presenter/ttl.test.ts src/presenter/PresenterApp.tsx
git commit -m "feat(presenter): duration control (presets+custom), Escape stops broadcast, phone-frame scroll preview"
```

---

### Task 6: Reader "Your copies" — rename & delete, never-expires chip

**Files:**
- Modify: `src/reader/ReaderApp.tsx`
- Test: `src/reader/ReaderApp.test.tsx`

**Interfaces:**
- Consumes: `renameDoc`, `deleteDoc` (Task 3), `Countdown` (Task 4).

- [ ] **Step 1: Write failing tests**

Add to `src/reader/ReaderApp.test.tsx` (the file already mocks `./scanner`; seed the store with `saveDoc`):
```ts
it("deletes a saved copy from Your copies", async () => {
  await saveDoc(env, Date.now());
  render(<ReaderApp />);
  await screen.findByText("Ward X");
  await userEvent.click(screen.getByRole("button", { name: /delete/i }));
  await waitFor(() => expect(screen.queryByText("Ward X")).not.toBeInTheDocument());
});
it("renames a saved copy", async () => {
  await saveDoc(env, Date.now());
  render(<ReaderApp />);
  await screen.findByText("Ward X");
  await userEvent.click(screen.getByRole("button", { name: /rename/i }));
  const input = screen.getByRole("textbox", { name: /title/i });
  await userEvent.clear(input);
  await userEvent.type(input, "Renamed");
  await userEvent.click(screen.getByRole("button", { name: /save/i }));
  await waitFor(() => expect(screen.getByText("Renamed")).toBeInTheDocument());
});
```
(`env` is the confidential fixture used by existing tests; import `userEvent`.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- ReaderApp` → FAIL (no rename/delete UI).

- [ ] **Step 3: Implement**

In the "Your copies" list of `src/reader/ReaderApp.tsx`, for each `StoredDoc` render: the title (Open), a status chip `<Countdown expiresAt={d.expiresAt} now={now} />`, and **Rename** + **Delete** `Button`s (ui). Rename toggles an inline `<input aria-label="Title">` + Save button → `renameDoc(d.id, value, Date.now()).then(refresh)`; Delete → `deleteDoc(d.id).then(refresh)` where `refresh = () => listDocs(Date.now()).then(setSaved)`. Use `IconBack`/existing icons or text labels. Keep Open behaviour (getDoc fresh-check). No `any`.

- [ ] **Step 4: Verify + commit**

Run: `npm test -- ReaderApp` → PASS. Then `npm test`, `npm run build`, `npm run lint`.
```bash
git add src/reader/ReaderApp.tsx src/reader/ReaderApp.test.tsx
git commit -m "feat(reader): rename + delete saved copies; never-expires chip"
```

---

### Task 7: RoomCast logo component + brand asset generation

**Files:**
- Create: `src/ui/Logo.tsx`, `src/ui/Logo.test.tsx`, `scripts/gen-brand.mjs`, brand SVG source under `scripts/brand/` (mark.svg, og.html)
- Create (generated, committed): `public/favicon.svg`, `public/favicon-32.png`, `public/favicon-16.png`, `public/apple-touch-icon.png`, `public/pwa-192.png`, `public/pwa-512.png`, `public/pwa-maskable-512.png`, `public/og-image.png`
- Modify: `package.json` (add `gen:brand` script)

**Interfaces:**
- Produces: `Logo({ size?: number, className? })` — inline SVG RoomCast mark.

- [ ] **Step 1: Write the Logo mark + a render test**

Write `src/ui/Logo.tsx` — a flat SVG mark: a rounded-square "screen" tile with three broadcast arcs radiating from the top-right, stroked/filled in NHS-Blue `#005EB8`. Example:
```tsx
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className}
      role="img" aria-label="RoomCast">
      <rect x="6" y="14" width="28" height="24" rx="5" fill="#005EB8" />
      <g fill="none" stroke="#005EB8" strokeWidth="3" strokeLinecap="round">
        <path d="M32 16a8 8 0 0 1 8 8" />
        <path d="M32 10a14 14 0 0 1 14 14" />
      </g>
    </svg>
  );
}
```
Write `src/ui/Logo.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";
it("renders an accessible RoomCast mark", () => {
  render(<Logo />);
  expect(screen.getByRole("img", { name: /roomcast/i })).toBeInTheDocument();
});
```
Run: `npm test -- "ui/Logo"` → RED then GREEN.

- [ ] **Step 2: Write the brand-asset generator**

Create `scripts/brand/mark.svg` (the same mark, standalone) and `scripts/brand/og.html` (a 1200×630 dark page: slate-950 bg, the mark, "RoomCast" wordmark, tagline "Beam any document to the whole room."). Write `scripts/gen-brand.mjs` using Playwright chromium to render each at exact size and screenshot to `public/`:
```js
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const svg = readFileSync("scripts/brand/mark.svg", "utf8");
const icon = (bg) => `<html><body style="margin:0;background:${bg};display:flex;align-items:center;justify-content:center">${svg}</body></html>`;

const jobs = [
  { file: "favicon-32.png", size: 32, html: icon("transparent"), omitBg: true },
  { file: "favicon-16.png", size: 16, html: icon("transparent"), omitBg: true },
  { file: "apple-touch-icon.png", size: 180, html: icon("#ffffff"), omitBg: false },
  { file: "pwa-192.png", size: 192, html: icon("#ffffff"), omitBg: false },
  { file: "pwa-512.png", size: 512, html: icon("#ffffff"), omitBg: false },
  { file: "pwa-maskable-512.png", size: 512, html: icon("#005EB8"), omitBg: false }, // full-bleed for maskable
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  await page.setContent(j.html);
  await page.screenshot({ path: `public/${j.file}`, omitBackground: j.omitBg });
}
// og-image 1200x630
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(readFileSync("scripts/brand/og.html", "utf8"));
await page.screenshot({ path: "public/og-image.png" });
await browser.close();
console.log("brand assets written to public/");
```
Also write `public/favicon.svg` = the mark SVG (hand-copied from `mark.svg`).
Add to `package.json`: `"gen:brand": "node scripts/gen-brand.mjs"`.

- [ ] **Step 3: Generate + verify assets exist**

Run: `npm run gen:brand`
Run: `ls public/ | grep -E "og-image|pwa-|apple-touch|favicon"` → all present.
(Chromium is already installed from the e2e setup; if not, `npx playwright install chromium`.)

- [ ] **Step 4: Verify + commit (including the generated PNGs)**

Run: `npm test`, `npm run build`, `npm run lint`. Ensure `public/*.png` are NOT gitignored (only `dist/` is) so they commit.
```bash
git add src/ui/Logo.tsx src/ui/Logo.test.tsx scripts/gen-brand.mjs scripts/brand public package.json
git commit -m "feat(brand): RoomCast logo + generated favicon/PWA/OG assets"
```

---

### Task 8: Social meta + PWA manifest → RoomCast

**Files:**
- Modify: `index.html`, `vite.config.ts`, `scripts/check-build.mjs`
- Test: `scripts/check-build.mjs` (extend)

**Interfaces:** none new.

- [ ] **Step 1: Update index.html head**

Set `<title>RoomCast</title>`; `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`; add `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` and the social meta:
```html
<meta name="application-name" content="RoomCast" />
<meta name="apple-mobile-web-app-title" content="RoomCast" />
<meta name="theme-color" content="#0d1b2a" />
<meta name="description" content="Beam any document to the whole room. Everyone scans it to their phone — you set how long it lasts, then it's gone." />
<meta property="og:title" content="RoomCast" />
<meta property="og:description" content="Beam any document to the whole room — scan it to your phone." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://plan.skeletalsurgery.com/roomcast/" />
<meta property="og:image" content="https://plan.skeletalsurgery.com/roomcast/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="RoomCast" />
<meta name="twitter:description" content="Beam any document to the whole room — scan it to your phone." />
<meta name="twitter:image" content="https://plan.skeletalsurgery.com/roomcast/og-image.png" />
```

- [ ] **Step 2: Update the PWA manifest**

In `vite.config.ts`'s `VitePWA({ manifest: {...} })`, set:
```ts
manifest: {
  name: "RoomCast",
  short_name: "RoomCast",
  description: "Beam any document to the whole room — scan it to your phone.",
  start_url: "./",
  display: "standalone",
  theme_color: "#0d1b2a",
  background_color: "#ffffff",
  icons: [
    { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
    { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
    { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
},
```
Keep `workbox.globPatterns` as-is (also caches `png`? add `png` to the glob so icons/og are precached: `["**/*.{js,css,html,wasm,png,svg}"]`).

- [ ] **Step 3: Extend the build-output check**

In `scripts/check-build.mjs`, after the existing checks, assert the manifest names RoomCast and og-image shipped:
```js
const manifestFile = files.find((f) => f.endsWith(".webmanifest"));
if (manifestFile) {
  const mf = JSON.parse(readFileSync(join(dist, manifestFile), "utf8"));
  if (mf.name !== "RoomCast") errors.push(`manifest name is '${mf.name}', expected RoomCast`);
}
if (!existsSync(join(dist, "og-image.png"))) errors.push("og-image.png missing from build");
```

- [ ] **Step 4: Verify + commit**

Run: `npm run test:build` → build + "check-build OK" (manifest=RoomCast, og-image present). Then `npm test`, `npm run lint`.
```bash
git add index.html vite.config.ts scripts/check-build.mjs
git commit -m "feat(brand): RoomCast title/social meta + PWA manifest"
```

---

### Task 9: Home page + routing + brand-home links

**Files:**
- Create: `src/home/HomePage.tsx`, `src/home/HomePage.test.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/presenter/PresenterApp.tsx`, `src/reader/ReaderApp.tsx`

**Interfaces:**
- Produces: `HomePage()` rendering hero + CTAs (`href="#present"`, `href="#reader"`).

- [ ] **Step 1: Write the HomePage test**

Write `src/home/HomePage.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { HomePage } from "./HomePage";
it("renders the RoomCast hero and both CTAs", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { name: /roomcast/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /broadcast/i })).toHaveAttribute("href", "#present");
  expect(screen.getByRole("link", { name: /receive/i })).toHaveAttribute("href", "#reader");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- HomePage` → FAIL (missing module).

- [ ] **Step 3: Implement HomePage**

Write `src/home/HomePage.tsx` — a landing on the design system, styled after spine-planner's page: a top bar (`Logo` + "RoomCast" wordmark + a "Broadcast" CTA); a hero (`<h1>RoomCast</h1>`, the model-agnostic tagline "Beam any document to the whole room. Everyone scans it to their phone — you set how long it lasts, then it's gone.", two CTA anchors: "Broadcast a document" `href="#present"` primary, "Receive a broadcast" `href="#reader"` ghost); a "How it works" trio (Drop → Beam as a live QR → Scan to keep; Confidential expires after the time you choose, Standard stays); a "Confidential by default" IG blurb (offline, no server, scan-only, self-expiring; dummy-data-only until IG/DPIA sign-off); a footer (developed in Leeds; repo link). NHS-Blue accents, `Card`s, generous spacing. No `any`, UK English.

- [ ] **Step 4: Add the Home route**

In `src/App.tsx`, route on hash: `#present` → `PresenterApp`; `#reader` → `ReaderApp`; anything else (incl. `""`/`#home`) → `HomePage`. Keep `ToastProvider` wrapping.
```tsx
const view = hash === "#present" ? <PresenterApp /> : hash === "#reader" ? <ReaderApp /> : <HomePage />;
return <ToastProvider>{view}</ToastProvider>;
```

- [ ] **Step 5: Update App.test for base=Home**

In `src/App.test.tsx`: base route now renders HomePage — assert the RoomCast hero heading; `#present` → presenter (assert "presenter" text); `#reader` → reader (assert the persistent "Home"/brand link or reader shell). Update the existing assertions accordingly without weakening intent (three distinct routes).

- [ ] **Step 6: Brand-home links in presenter + reader**

In `PresenterApp.tsx` and `ReaderApp.tsx` headers, add a RoomCast brand element (`Logo` + "RoomCast") that is a link to `#home` (`<a href="#home">`), replacing the previous ad-hoc cross-links. Keep any existing e2e-relied link text updated in Task 10.

- [ ] **Step 7: Verify + commit**

Run: `npm test -- HomePage App` → PASS. Then `npm test`, `npm run build`, `npm run lint`.
```bash
git add src/home src/App.tsx src/App.test.tsx src/presenter/PresenterApp.tsx src/reader/ReaderApp.tsx
git commit -m "feat(home): RoomCast landing at base route + brand-home links"
```

---

### Task 10: e2e updates + final verification

**Files:**
- Modify: `e2e/build.spec.ts`
- Test: e2e

**Interfaces:** none.

- [ ] **Step 1: Update e2e for the Home landing**

In `e2e/build.spec.ts`:
- Base route now renders Home: update the first test to assert the RoomCast hero and the two CTAs (`link` "Broadcast" → `#present`, "Receive" → `#reader`).
- Replace the old "presenter loads at base" assumption: `#present` shows the presenter; `#reader` shows the reader shell.
- Update the nav round-trip test to the new topology: Home → Broadcast (`#present`) → brand-home link back to Home; Home → Receive (`#reader`) → brand-home link back. Assert each transition by a marker unique to that view.
- Keep `e2e/pipeline.spec.ts` (round-trip + zxing decode) unchanged.

- [ ] **Step 2: Run the full gate**

Run: `npm test` → all pass. `npm run build` → clean. `npm run typecheck:e2e` → clean. `npm run lint` → clean. `npm run test:e2e` → all pass.

- [ ] **Step 3: Commit**

```bash
git add e2e
git commit -m "test(e2e): update routing/nav for the Home landing"
```

---

## Self-Review

**Spec coverage:**
- §2 two models + preset/custom/standard-null expiry → Tasks 1, 2, 5. ✓
- §2 store null-expiry never purges → Task 2. ✓
- §3 rename/delete + never-expires chip → Tasks 3, 6. ✓
- §4 Escape-stop + phone-frame scrollable preview → Task 5. ✓
- §5 logo + favicon/apple/maskable/PWA/og assets + gen script → Task 7. ✓
- §5 social meta + manifest RoomCast → Task 8. ✓
- §6 HomePage at base route + #present/#reader + brand-home links + model-agnostic tagline → Task 9. ✓
- §8 testing (store null-expiry, rename/delete, formatRemaining Does-not-expire, buildBroadcast ttl, HomePage CTAs, manifest name, routing/e2e) → Tasks 1–10. ✓
- §9 out of scope (screen-capture, i18n) → not implemented. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Component/asset tasks name exact structure, classes, and assertions.

**Type consistency:** `ttlHours: number | null` (Task 1) flows to `saveDoc`/`expiresAt: number | null` (Task 2) → `formatRemaining(expiresAt: number|null)` (Task 4) → `Countdown` chip (Task 6). `resolveTtlHours`/`TTL_PRESETS`/`DEFAULT_TTL`/`TtlChoice` (Task 5) consumed by PresenterApp. `renameDoc`/`deleteDoc` (Task 3) consumed by Task 6. `Logo` (Task 7) consumed by Tasks 8-index?/9. Routing markers (`#present`/`#reader`/`#home`) consistent across Tasks 9-10. Names align.

**Known risks to confirm during implementation (not blockers):**
- Widening `StoredDoc.expiresAt`/`Envelope.ttlHours` to `number | null` will surface `tsc` errors wherever the old `number` was assumed (Countdown/ConfidentialBanner/ReaderApp) — fix each at build time; the plan sequences the type widening (Tasks 1-4) before the consumers (5-6, 9).
- `og:image`/manifest icon URLs must resolve under the `/roomcast/` base — reference by root-relative path and let Vite base-rewrite them; verify in `dist/`.
- Playwright must be able to launch chromium locally for `gen:brand`; if the sandbox blocks it, generate on a machine that can and commit the PNGs (CI does not run `gen:brand`).
