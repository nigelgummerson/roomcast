# RoomCast — Home Page, Branding & Delivery-Model Refinements — Design Spec

**Date:** 2026-07-01
**Status:** Design approved (brainstorm) — pending user review before implementation plan
**Author:** Nigel Gummerson (with Claude)
**Extends:** the build spec + UI-overhaul spec (this round adds branding, a home page, and refines the delivery/expiry model).

---

## 1. Why

Live use surfaced product-shaping needs: the app needs a real **home/landing page** and proper **RoomCast branding** (logo, favicons, social/share graphics); the **delivery model** should be two clear choices (Confidential with a chosen expiry, or Standard that never expires) rather than a free-form hours field; and a few UX refinements (Escape stops a broadcast, a true phone-sized scrollable preview, and managing saved copies). **Screen-capture prevention is explicitly out of scope** — a web app cannot block screenshots/recording (native-only); noted as a future native-path item.

## 2. Delivery models & expiry

Two models, chosen by the presenter's profile toggle:

- **Confidential** — expires after a chosen duration. Quick presets: **8h / 12h / 24h / 36h / 1 week (168h)**, **default 36h**, PLUS a **"Custom…"** option that reveals a free-form hours input (any positive value). When Confidential is selected, the duration control (presets + Custom) appears; Standard hides it.
- **Standard** — **no expiry** (kept until the user removes it).

Data-model change:
- `Envelope.ttlHours: number | null` (`null` = Standard/never).
- `store.ts`: `StoredDoc.expiresAt: number | null`. `saveDoc` sets `expiresAt = env.ttlHours == null ? null : now + env.ttlHours*3600e3`. `purgeExpired`/`getDoc`/`listDocs` treat `expiresAt == null` as **never expires** (always live, never purged).
- `Countdown`/`formatRemaining`: render **"Does not expire"** when there is no expiry; otherwise the existing "expires in Xh Ym" / "expired".
- Expiry-while-open auto-close in ReaderApp only fires when `expiresAt != null`.
- `buildBroadcast`: `ttlHours` = the chosen duration (preset or custom value) for Confidential, `null` for Standard.
- Presenter setup shows the duration control (presets + Custom entry) only for Confidential; the profile toggle labels themselves carry **no times**. A custom value is validated as a positive number (fallback to the default if blank/invalid).

## 3. "Your copies" management (reader)

Each saved copy in the "Your copies" landing supports:
- **Open** (existing; re-checks expiry via `getDoc`).
- **Rename** — inline edit of the copy's title → `renameDoc(id, title)`.
- **Delete** — remove the copy → `deleteDoc(id)` (needed because Standard copies never auto-expire).
- A status chip: countdown for Confidential, **"Does not expire"** for Standard.

`store.ts` gains `renameDoc(id, title, now)` and `deleteDoc(id)`; both operate on the existing IndexedDB record (rename updates the stored title; delete removes it). After either, the list refreshes.

## 4. Small UX fixes

- **Escape stops the broadcast**: a keydown handler on the projected broadcast screen calls the same stop path as the Stop button (only while broadcasting; cleaned up).
- **Phone-frame preview**: the presenter preview is a fixed **phone aspect ratio (≈9:19.5)** frame with **internal vertical scroll** (`overflow-y-auto`), so long documents scroll inside the frame instead of stretching the page.

## 5. Branding — "RoomCast"

- **Display name "RoomCast"** everywhere user-facing (headers, `<title>`, PWA name); the repo, URL, and `/roomcast/` base path stay lowercase.
- **Logo:** a flat SVG mark — a rounded "screen" tile with broadcast arcs radiating from a corner (the "cast"), in NHS-Blue `#005EB8`; a white-on-blue variant for the maskable icon. Plus a `RoomCast` wordmark lockup. A small `src/ui/Logo.tsx` renders the inline SVG mark for in-app use.
- **Asset set** (generated from SVG source by a Playwright render script, committed into `public/`):
  - `favicon.svg`, `favicon-32.png`, `favicon-16.png`
  - `apple-touch-icon.png` (180×180)
  - `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`
  - `og-image.png` (1200×630) — dark stage, logo + "RoomCast" + tagline
- **Social meta** in `index.html`: `og:title/description/url/image` (+ width/height), `twitter:card=summary_large_image` + `twitter:title/description/image`, `theme-color`, `application-name`, `apple-mobile-web-app-title`.
- **PWA manifest** (vite-plugin-pwa config): `name`/`short_name` = "RoomCast", `description`, `theme_color`, `icons` (192/512 + maskable), `start_url` `"./"`.

**Asset generation:** `scripts/gen-brand.mjs` uses the existing Playwright chromium dev dependency to render SVG/HTML templates at exact pixel sizes and screenshot them to PNG in `public/`. Generated PNGs are committed so deploy/CI needs no image toolchain. An npm script `gen:brand` regenerates them.

## 6. Home page + routing

- **Routing** (`src/App.tsx`, hash-based): base / `#home` → **HomePage**; `#present` → PresenterApp; `#reader` → ReaderApp. (Base was previously the presenter — this changes it.)
- **HomePage** (`src/home/HomePage.tsx`), styled after spine-planner's landing but on our design system (NHS-Blue, system font):
  - **Top bar:** RoomCast brand (Logo + wordmark) + a primary CTA.
  - **Hero:** "RoomCast" headline; tagline (model-agnostic — must NOT hardcode "36 hours" or "forever") — *"Beam any document to the whole room. Everyone scans it to their phone — you set how long it lasts, then it's gone."*; two CTAs: **Broadcast a document** → `#present`, **Receive a broadcast** → `#reader`.
  - **How it works** trio: 1) Drop a document → 2) It's beamed as a live QR → 3) Scan to keep your own copy (Confidential expires after the time you choose; Standard stays until removed).
  - **Confidential by default / IG** blurb: offline, no server, scan-only, self-expiring; dummy-data-only until IG/DPIA sign-off.
  - **Footer:** developed in Leeds; link to the repo; the IG note.
- **Back to Home:** Presenter and Reader headers carry the **RoomCast brand linking to Home** (`#home`), satisfying "a link back to a home page". The previous direct presenter↔reader cross-links are replaced by routing through Home (Home is the hub).

## 7. Component boundaries / files

- `src/core/envelope.ts` — `ttlHours: number | null`.
- `src/core/store.ts` — `expiresAt: number | null`; null-expiry handling; `renameDoc`, `deleteDoc`.
- `src/reader/Countdown.tsx` — "Does not expire" path.
- `src/reader/ReaderApp.tsx` — "Your copies" open/rename/delete; brand-home header link.
- `src/presenter/PresenterApp.tsx` — preset expiry selector (Confidential only); remove hours field; Escape-stops-broadcast; phone-frame scrollable preview; brand-home header link.
- `src/presenter/buildBroadcast.ts` — ttl mapping.
- `src/home/HomePage.tsx` — the landing (new).
- `src/ui/Logo.tsx` — inline SVG mark (new).
- `src/App.tsx` — home/present/reader routing.
- `index.html` — social/branding meta + title.
- `public/` — generated brand assets; `scripts/gen-brand.mjs` + `gen:brand` script.
- vite PWA manifest config — RoomCast name/icons/theme.

## 8. Testing

- **Unit:** envelope round-trip with `ttlHours: null`; store null-expiry never purges & always lists/gets as live; `renameDoc` updates title; `deleteDoc` removes; `formatRemaining` → "Does not expire" when no expiry; `buildBroadcast` maps a preset → number and Standard → null.
- **Component:** HomePage renders the hero + both CTAs with `href="#present"`/`"#reader"`; "Your copies" shows Rename + Delete and they call the store fns (mock) and update the list; the Confidential duration control sets the ttl (a preset AND the Custom free-form path) and is hidden for Standard; Escape triggers the broadcast-stop handler. `buildBroadcast` maps preset, custom, and Standard(null) correctly.
- **Routing:** App.test updated — base → HomePage, `#present` → presenter, `#reader` → reader; e2e updated — base=Home, nav Home↔present↔reader, brand-home links; pipeline/zxing e2e unchanged.
- **Branding:** assert the built manifest `name` = "RoomCast"; a check that the expected `public/` assets exist (og-image, icons).
- **Keep green:** all existing unit + e2e; restyles/routing must not weaken assertions (update selectors only where markup necessarily changes).

## 9. Out of scope (YAGNI)

- **Screen-capture prevention** — deferred (web cannot block capture; native FLAG_SECURE / iOS capture-detection only). Recorded as a possible future native-path item.
- Home-page i18n (spine-planner has it; not needed yet).
- No new delivery features beyond the two models.

## 10. Open questions for planning

1. Logo mark: finalise the exact SVG (arc count, corner, weight) on the first rendered asset; iterate.
2. og-image composition (logo + wordmark + tagline on dark) — tune once rendered.
3. Duration control layout: a segmented row of the 5 presets plus a "Custom…" chip that reveals a small hours input — pick exact form during implementation; segmented + reveal reads better than a `<select>` for presets-plus-custom.
