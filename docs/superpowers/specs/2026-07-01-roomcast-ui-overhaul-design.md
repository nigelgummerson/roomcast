# roomcast — UI/UX Overhaul + Camera Reliability — Design Spec

**Date:** 2026-07-01
**Status:** Design approved (brainstorm) — pending user review before implementation plan
**Author:** Nigel Gummerson (with Claude)
**Supersedes/extends:** the original build spec `2026-07-01-roomcast-design.md` (this is a follow-up covering presentation and reliability, not new product scope).

---

## 1. Why

Live testing surfaced three problems: (a) camera scanning is unreliable and the receiver never auto-starts the camera, so opening the reader via the in-app link doesn't begin scanning; (b) the projected QR codes are poorly positioned (crammed near the top); (c) the UI is unpolished relative to the spine-planner bar. This overhaul addresses all three as one coherent pass. **No new product features** — polish, layout, camera reliability, and durable re-access only.

## 2. Design system (`src/ui/`, spine-planner-calibrated)

- **Tokens in CSS** (Tailwind v4, config-in-CSS): primary accent **NHS Blue `#005EB8`**; slate neutrals; white cards. `rounded-lg` default radius; `shadow-2xl` for elevated surfaces; one `fadeIn` keyframe (`opacity 0→1, scale .98→1`, 0.2s); global `:focus-visible` outline (`2px #3b82f6`); `@media (prefers-reduced-motion: reduce)` nulls animations.
- **Typography:** system-font-first stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`) with self-hosted `@fontsource/inter` fallback (no CDN). `--app-height` set from `window.innerHeight` (JS), `env(safe-area-inset-*)` padding on root, `viewport-fit=cover` + `maximum-scale=1` in the viewport meta.
- **Reusable primitives** (small, focused files):
  - `Button` (variants: primary / ghost / danger), `Card`, `Banner` (soft amber / hard red), `Toast` (context + `aria-live`), `Spinner` / circular progress ring.
  - `icons.tsx` — hand-rolled Feather-style SVG set (`viewBox 0 0 24 24`, `stroke=currentColor`, `strokeWidth 2`), the handful roomcast needs (camera, close, back, search, torch, download, chevrons, shield/lock, spinner).
- These primitives replace the current raw-Tailwind ad-hoc elements across both apps.

## 3. Presenter — setup screen

Polished single card:
- Title input; **security profile as a segmented toggle** (Confidential / Standard), Confidential default; TTL (hours) input.
- **Drag-and-drop `.docx` drop zone** (also click-to-browse); non-`.docx` rejection surfaced as a toast/banner (existing logic).
- **Live preview inside a phone frame** so the presenter sees exactly what phones render; size warning as a soft banner (existing `sizeBytes` guard).
- Prominent **Broadcast** primary button (shows frame count).

## 4. Presenter — broadcast (projected) screen

Layout = **centred stage + corner join panel** (chosen):
- Dark stage filling the viewport.
- **Top strip:** document title + a **confidential pill** + live expiry note ("copies expire in Xh · scan-only").
- **Centre:** the **fountain QR**, large and vertically centred with generous margin on all sides (never touching the top). High contrast (pure black on white), adequate quiet zone, sized to `min(vw,vh)` with a sensible cap.
- **Bottom-right:** a persistent **"Scan to receive"** join panel — the small join QR (links to the reader) + the short URL — so latecomers can join at any time. Visually distinct (bordered card) from the fountain QR to avoid confusion about which to scan.
- A subtle **Stop** control (top-right or bottom-left).
- **Scannability tuning:** larger fountain QR, tuned error-correction level and frame rate for reliable capture from across a room. Frame rate remains fixed (documented value).

## 5. Reader — behaviour & scanning (the reliability fix)

**Landing logic** (reconciles auto-start with durable re-access):
1. On open, request **persistent storage** once (`navigator.storage.persist()`), then load live copies.
2. **If ≥1 live copy exists → "Your copies" landing** (see §6): show them first so a returning user immediately reaches their handover; a clear **"Scan a broadcast"** action is available. Camera is **not** auto-started.
3. **If 0 copies → auto-start the camera** straight into the viewfinder (fixes "the link doesn't trigger the camera").

**Scanning UX:**
- Live **viewfinder** with a framing overlay + "Point at the code" guidance and a **circular progress ring** showing % of frames gathered.
- **Torch toggle** where `MediaStreamTrack` torch capability exists.
- **Permission handling:** if the camera is blocked/denied/unavailable, show a clear state with an **"Enable camera"** button and guidance (don't silently fail).
- On completion: save to IndexedDB, show the document (§7).

**Decode engine — hybrid:**
- Use the browser-native **`BarcodeDetector`** when available (`'BarcodeDetector' in window` and QR supported) — fast, hardware-accelerated (Android/Chrome).
- **Fall back to zxing-wasm** otherwise (iOS Safari) — the existing self-hosted decoder.
- Encapsulated behind one interface `detectQr(imageBitmapOrData): Promise<string | null>` with a capability check chosen once; the rest of the scan loop is engine-agnostic. Higher-res `facingMode:"environment"` constraints (`width: { ideal: 1280 }`); decode loop throttled via `requestAnimationFrame`. `ScanSession` (foreign-frame-tolerant) is unchanged.

## 6. Reader — "Your copies" landing (returning users)

- A styled list/grid of live saved copies (title, time received, live countdown chip), newest first. Tapping opens it (re-checks expiry via `getDoc(id, now)` — existing).
- Primary action: **"Scan a broadcast"** → enters the scanning flow (§5).
- Empty state is never shown here (0 copies goes straight to the camera per §5.3).

## 7. Reader — document view

- Polished `MobileView`: real **cards** (label/value), sticky **confidential banner** + countdown, styled **search** field, section index as tappable **chips**; the existing Mobile⇄Original toggle and table fallback retained.
- **Back** returns to the "Your copies" landing (not a dead end).
- Expiry-while-open auto-close retained (existing).

## 8. Persistence & durability

- **Durable by default:** copies live in IndexedDB (survives tab/browser close, reboot) for the TTL. Re-access = reopen the reader URL → "Your copies".
- **`navigator.storage.persist()`** requested on reader open to protect against early eviction under storage pressure / Safari ITP within the 36h window. (The TTL still deletes on schedule — this only prevents *premature* loss.)
- **No Add-to-Home-Screen prompt** (deliberately out of scope): the 36h window sits inside Safari's ~7-day cap, and `persist()` covers storage pressure. The app remains a PWA for the offline shell.

## 9. Component boundaries / files

- `src/ui/` — `Button.tsx`, `Card.tsx`, `Banner.tsx`, `Toast.tsx` (+ `useToast`), `Spinner.tsx`, `icons.tsx`. Pure/presentational; independently testable.
- `src/reader/detectQr.ts` — decode-engine selector (BarcodeDetector ↔ zxing-wasm) behind `detectQr()`; pure capability logic unit-tested.
- `src/reader/scanner.ts` — camera loop uses `detectQr`; adds torch + higher-res constraints; `ScanSession` unchanged.
- `src/reader/ReaderApp.tsx` — landing logic (§5), viewfinder, permission states, "Your copies".
- `src/reader/MobileView.tsx`, `ConfidentialBanner.tsx`, `Countdown.tsx` — restyled via `src/ui`.
- `src/presenter/PresenterApp.tsx` — split into setup (§3) + broadcast (§4) using `src/ui`; drag-and-drop zone; phone-frame preview.
- Global: `src/index.css` (tokens, keyframes, focus, reduced-motion, safe-area), `src/main.tsx` (`--app-height`), `index.html` (viewport meta), fonts.

## 10. Testing

- **Unit:** `detectQr` engine selection (BarcodeDetector present vs absent → correct path; both mocked); any layout/size helper.
- **Component (@testing-library/react, mocked `getUserMedia` + `BarcodeDetector`):** reader landing branches (copies-present → "Your copies", no-copies → camera auto-start), permission-denied state renders "Enable camera", scanning viewfinder + progress ring, `ui` primitives (Button variants, Banner severities, Toast lifecycle).
- **Keep green:** existing 67 unit tests must still pass (restyling must not break behaviour/assertions — update selectors only where markup necessarily changes).
- **e2e (Playwright):** update routing/nav specs for the new layout; the pipeline round-trip + zxing decode specs remain; add a smoke that the reader shows either "Your copies" or a viewfinder. `typecheck:e2e` stays green.
- **Manual (unautomatable):** real projector + 2–3 phones at distance — the true scannability + torch + re-open-after-close checks.

## 11. Out of scope (YAGNI)

- Theme switcher / dark-mode toggle (fixed light UI; broadcast stage is dark by design).
- Add-to-Home-Screen install prompt (see §8).
- Any new product feature (re-sharing, PDF input, accounts, analytics) — unchanged from the original spec's exclusions.

## 12. Open questions for planning

1. `BarcodeDetector` on desktop Chrome can be flaky for some formats — verify QR support via `BarcodeDetector.getSupportedFormats()` at runtime, not just presence.
2. Exact fountain-QR size cap + error-correction level for best room-distance capture — tune during the manual projector test; expose as constants.
3. Whether to downscale the video frame before `detectQr` for a faster loop (ROI/centre-crop around the framing overlay).
