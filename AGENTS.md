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

## Prior art & positioning

roomcast's transport — an animated, **fountain-coded** (Luby-transform / rateless) QR
stream that a camera reconstructs from *enough*, not all, frames — is an established
technique, not a bespoke invention. Documenting that is deliberate: for an IG/Caldicott
reviewer, "we apply the same visual-transfer primitive as air-gapped hardware wallets"
is a far safer sentence than "we invented a novel transfer protocol." Known prior art for
the mechanism:

- **`txqr`** (github.com/divan/txqr) — the canonical "transfer data via animated QR
  codes" project, explicitly built on fountain (LT) codes; the same primitive `frames.ts`
  uses via `qrloop`.
- **BC-UR / multipart Uniform Resources** (developer.blockchaincommons.com/animated-qrs/)
  — the standard used by air-gapped Bitcoin hardware wallets (**SeedSigner**, **Keystone**,
  Sparrow) to move transaction data across a camera gap; Luby-transform rateless encoding,
  reception can begin at any frame.
- **`QRFontain`** (github.com/dridk/qrfontain) — arbitrary files → LT-coded QR sequence,
  scannable in any order.
- **`libcimbar`** (github.com/sz3/libcimbar) — animated *colour* barcodes with fountain
  codes (wirehair), fully offline. Actively maintained (v0.6.5, May 2026; ~6k stars) and
  self-described as "air-gapped data transfer"; web demo/PWA at cimbar.org. The densest,
  fastest transport in this list (~106 KB/s screen→camera vs ~5–15 KB/s for B/W fountain
  QR) — but colour capture is fragile in poor light/cheap cameras and needs a custom
  decoder, so B/W QR remains the right choice for roomcast's small payloads broadcast to
  many heterogeneous phones (robustness over throughput; a compressed handover is only a
  few KB). Still a pure codec — no TTL, no broadcast — so category 2 regardless.

**What is genuinely unoccupied is the *combination*, not the primitive.** A 2026 prior-art
scan (multi-source, adversarially verified — see `CLAUDE.md` 2026-07-05 session) found the
landscape splits into two categories that never intersect:

1. **Ephemeral document sharing with TTL** — Bitwarden Send, Tresorit Send, Wormhole,
   PrivateBin, Keeper One-Time Share. All alive in 2026 and all have real expiry, but
   every one is **server-mediated and link/URL-based**: expiry is a server-side purge, and
   nothing broadcasts to co-located receivers or leaves an on-device expiring copy.
2. **Offline fountain-QR transfer** — the projects above. All have roomcast's exact
   transport but are **pure codecs with no document TTL**, and are architected for
   **one-to-one** air-gapped handshakes, not one-to-many broadcast.

No surveyed product combines all three of roomcast's defining attributes
(offline/serverless **+** fountain-QR broadcast to *multiple* simultaneous receivers **+**
on-device expiring copies), and no clinical/handover instance of the pattern was found.
Note that fountain codes are inherently **broadcast-capable** (that is what they were
designed for) — so roomcast's one-to-many model is a **novel application of an existing
primitive**, not a new primitive. That is the accurate and defensible framing.

## Architecture

One codebase, three modes, selected by hash routing in `src/App.tsx`: the base route
(and `#home`) → the Home landing page, `#present` → presenter app, `#reader` → reader
app. The Home page carries the "RoomCast" hero and CTAs to `#present`/`#reader`; the
presenter and reader headers each carry a brand link back to `#home`.

**Presenter mode** (laptop → projector): drop a `.docx` or `.odt` → parse to structured GFM
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
  `mammoth` (docx → HTML) then `turndown` + `turndown-plugin-gfm` (HTML → GFM). Exposes
  `htmlToGfm` (the shared HTML → GFM step, with hostile-table-cell sanitisation).
- **`odtParser.ts`** — `.odt` (OpenDocument / Google Docs "Download → OpenDocument") →
  structured GFM. Unzips `content.xml` with `fflate`, walks the ODF block subset
  (headings, paragraphs, lists, tables) via `DOMParser`, then reuses `docParser`'s
  `htmlToGfm` so it inherits the same cell sanitisation and image stripping. Inline
  bold/italic is not preserved (structure + text only).
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
odtParser (.odt → GFM, tables/lists/headings + malformed-input handling),
envelope (pack/unpack round-trip), frames (fountain encode → decode round-trip with
simulated drops/reordering), mobiliser (table→cards, sections, search); a manual
"Original layout" toggle is always available to view the raw markdown, alongside an
automatic fallback for malformed/ragged tables (`classifyTable` + `TableBlock` +
`TableFallback`) that renders such a table as a scrollable original-layout table rather
than mis-mapping it into labelled cards. Store (TTL/expiry/purge), App/route, presenter,
and reader component shells are tested.
Manual-only (not unit-tested): a real projector + physical phone scanning test — the
true scannability/bedside-readability check.
