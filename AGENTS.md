# roomcast

Static, AI-agnostic project description. For session history and collaboration log see
`CLAUDE.md`. For the design rationale see `docs/superpowers/specs/2026-07-01-roomcast-design.md`
and the implementation plan at `docs/superpowers/plans/2026-07-01-roomcast.md`.

## What it is

roomcast is a zero-install, offline, browser-only tool that broadcasts a document to a
room via an animated "fountain" QR code. A presenter drops a file into a projected web
app; anyone in the room scans the animated code once with a phone camera and receives a
phone-readable copy that lives in their browser for a bounded time (default 36 hours)
before self-destructing. There is no server, no login, no account, no network transfer
of document content, and no paper.

**Generic tool, flagship use case:** roomcast handles any document, but clinical
**ward handover** is the headline, most information-governance-sensitive use case, and
it drives the default ("Confidential") security profile.

## IG constraint — read before using real data

**Real patient-identifiable data (PID) must never be used with roomcast until a trust's
Information Governance function and Caldicott Guardian have reviewed and signed off**
the DPIA at `docs/DPIA-draft.md`. All development, testing, and demonstration use only
entirely fictional dummy data — see `samples/dummy-handover.md`. Anyone extending or
running this app should keep to fictional data unless that sign-off exists.

## Architecture

One codebase, three modes, selected by hash routing in `src/App.tsx`: the base route
(and `#home`) → the Home landing page, `#present` → presenter app, `#reader` → reader
app. The Home page carries the "RoomCast" hero and CTAs to `#present`/`#reader`; the
presenter and reader headers each carry a brand link back to `#home`.

**Presenter mode** (laptop → projector): drop a `.docx` → parse to structured GFM
markdown → preview the phone-first render → compress → fountain-encode into QR frames →
animate on screen, alongside a small static "open the reader" QR and a confidentiality
banner.

**Reader mode** (phone): open the reader page → point the camera at the animated QR →
decode and accumulate frames until reconstructable → reassemble → decompress → mobilise
into a phone-first view → store in IndexedDB with a TTL → show with a live countdown and
confidentiality banner.

### Core pure modules (`src/core/`)

These have no I/O and no React dependency; they are the heavily unit-tested heart of the
app.

- **`envelope.ts`** — the wire format: pack/unpack a `{ profile, markdown, ... }`
  `Envelope` to/from bytes (the codec/compression layer referred to as "codec" in the
  design spec).
- **`docParser.ts`** — `.docx` → structured GFM markdown (tables preserved), via
  `mammoth` (docx → HTML) then `turndown` + `turndown-plugin-gfm` (HTML → GFM).
- **`frames.ts`** — bytes ⇄ fountain-coded QR frame stream (`encodeToFrames`,
  `FrameDecoder`), built on `qrloop`. This is the transmitter/receiver pair from the
  design spec: the phone needs *enough* frames, not every frame, so dropped/blurred
  frames self-heal and a single still photo reconstructs nothing.
- **`mobiliser.ts`** — pure transform from structured markdown to a phone-first
  `ViewModel` (table→cards, sections + jump index, search/filter support). Shared by
  both the presenter's live preview and the reader's render, so what the presenter
  approves is what phones show.
- **`store.ts`** — IndexedDB persistence with TTL/expiry/purge logic (`saveDoc`,
  `getDoc`, `listDocs`, `purgeExpired`). No network, no other dependencies.

### Presenter app (`src/presenter/`)

`PresenterApp.tsx` (React shell), `QrImage.tsx` (renders one QR frame), `useFrameLoop.ts`
(animates the frame stream), `buildBroadcast.ts` (wires docParser → envelope → frames
together for the presenter side).

### Reader app (`src/reader/`)

`ReaderApp.tsx` (React shell), `scanner.ts` (camera capture + `zxing-wasm` decode via
`ScanSession`/`decodeImageData`/`startCamera`), `MobileView.tsx` (renders a mobiliser
`ViewModel`), `Countdown.tsx` (live TTL countdown), `ConfidentialBanner.tsx`.

## Build / test commands

```bash
npm install
npm run dev              # local dev server
npm test                 # vitest run (unit + component tests)
npm run test:watch       # vitest watch mode
npm run lint             # oxlint
npm run build            # hosted PWA build (tsc -b && vite build) -> dist/
npm run build:standalone # single-file offline HTML build -> dist-standalone/
```

## Hosting

The hosted build is served at **`plan.skeletalsurgery.com/roomcast/`** via GitHub Pages
(`vite.config.ts` sets `base: "/roomcast/"` to match). It is built as an installable PWA
(`vite-plugin-pwa`, `generateSW` mode) so the reader shell (app code only, never
document content) can be cached for offline use after a first visit.

The **standalone build** (`npm run build:standalone`, `vite.standalone.config.ts`, base
`"./"`, `vite-plugin-singlefile`) produces a single self-contained `index.html` for
fully offline use (e.g. copied to a laptop with no network access at all) — no CDN
dependency, no separate assets.

## zxing-wasm self-hosting (important build note)

`zxing-wasm` (the QR/WASM decoder used by the reader) does **not** bundle its `.wasm`
file locally by default: out of the box it points `locateFile` at a **jsDelivr CDN**
URL, which would silently require network access on first scan — defeating the offline
goal for both build targets. `src/reader/scanner.ts` overrides this by importing the
wasm via Vite's `?url` asset pipeline
(`zxing-wasm/reader/zxing_reader.wasm?url`) and calling `setZXingModuleOverrides({
locateFile })` to point at that local, fingerprinted asset instead.

As a result:
- The **hosted build** ships the wasm as a real local asset (`dist/assets/zxing_reader-*.wasm`,
  ~1.09 MB) that is correctly picked up by the PWA's workbox precache — the reader's
  decoder is genuinely available offline once cached, not just the shell.
- The **standalone build** inlines the wasm as a `data:` URI via `vite-plugin-singlefile`,
  so the single HTML file has no CDN dependency at all.

Do not remove the `locateFile` override — without it, both build targets regress to a
runtime CDN dependency that breaks the "offline reader" claim.

## Security profiles

Every broadcast carries a `SecurityProfile` (`"confidential" | "standard"`, defined in
`envelope.ts`). **Confidential is the default everywhere a profile is chosen** (36 h TTL,
scan-only, on-screen banner); downgrading to Standard is an explicit user action, never
a default, so a handover is never treated casually by accident.

## Testing

Vitest, run via `npm test`. Coverage includes: docParser (.docx → GFM extraction),
envelope (pack/unpack round-trip), frames (fountain encode → decode round-trip with
simulated drops/reordering), mobiliser (table→cards, sections, search); a manual
"Original layout" toggle is always available to view the raw markdown, alongside an
automatic fallback for malformed/ragged tables (`classifyTable` + `TableBlock` +
`TableFallback`) that renders such a table as a scrollable original-layout table rather
than mis-mapping it into labelled cards. Store (TTL/expiry/purge), App/route, presenter,
and reader component shells are tested.
Manual-only (not unit-tested): a real projector + physical phone scanning test — the
true scannability/bedside-readability check.
