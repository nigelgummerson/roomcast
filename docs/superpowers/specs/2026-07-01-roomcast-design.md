# roomcast — Design Spec

**Date:** 2026-07-01
**Status:** Design approved (brainstorm) — pending user review before implementation plan
**Author:** Nigel Gummerson (with Claude)

---

## 1. Concept

A zero-install, offline, browser-only relay for broadcasting a document to a room. A
presenter drops a file into a projected web app, which beams it as an **animated
fountain-QR**; anyone in the room scans it once with a phone camera and receives a
**phone-readable** copy that lives in their browser for a bounded time, then
self-destructs. No server, no login, no paper. The document data never crosses a network.

**Generic tool, flagship use case:** roomcast handles *any* document. Clinical
**handover** is the headline, most information-governance-sensitive use case and drives
the default security profile.

## 2. Prior art (why this is low-risk to build)

The transport — animated QR + fountain/erasure coding + lossy-frame reassembly — is
solved and battle-tested:

- **TXQR** — reference animated-QR fountain transfer (Go).
- **libcimbar** — high-capacity colour animated barcodes + fountain coding (tens of KB/s; WASM).
- **qrxfer**, **airgapped-qr-code-transfer** (web: Vue + pako + qrcode.js + zbar-wasm).
- **BC-UR / ERC-4527** — the `ur:` multi-part animated-QR standard used in crypto hardware wallets.

We build on `qrloop` / BC-UR rather than writing our own fountain layer.

**What does not exist off the shelf** is the *application*: every mainstream "QR for a
document" product points a **static** QR at a **hosted URL** (server-based, permanent,
tracked, online). No product combines fully-offline broadcast → whole room →
self-expiring ephemeral copy → no server → confidentiality-first. The transport is a
commodity; the novelty is the ephemeral, offline, IG-first broadcast model **plus the
phone-first rendering** (below).

## 3. Two modes, one codebase

**Presenter mode** (laptop → projector):
1. Drop a `.docx` (PDF/plain-text later).
2. Parse to **structured markdown (GFM — tables preserved)**, stripping Word cruft.
3. **Preview the mobile rendering** (see §5) so a bad parse is caught in the room, not on
   20 phones.
4. Compress (fflate / gzip).
5. Fountain-encode + frame (qrloop / BC-UR).
6. Animate one large, low-density QR on a loop (~5–10 fps).
7. Also display a small static **"open the reader"** QR (links phones to the reader page)
   and a confidentiality banner + selected security profile.

**Reader mode** (phone):
1. Open reader URL (via the static app-QR).
2. Point camera at the animated QR; decode frames (zxing-wasm — reuse spine-planner engine).
3. Collect frames until reconstructable (needs *enough*, not *all*).
4. Reassemble → inflate → structured markdown.
5. **Mobilise** (§5): render phone-first, not a faithful Word reproduction.
6. Store in IndexedDB as `{payload, scannedAt, profile}`.
7. Show offline with a live expiry countdown and confidentiality banner.

## 4. Pipeline / data flow

```
.docx → mammoth.js (→ HTML) → GFM markdown (TABLES PRESERVED, cruft stripped)
      → fflate (gzip) → qrloop/BC-UR (fountain framing)
      → qrcode (render frames) → [projected animation]
      → phone camera → zxing-wasm (decode frames) → qrloop reassembly
      → fflate inflate → structured markdown → MOBILISE renderer (§5)
      → IndexedDB {payload, scannedAt, profile}
```

Two design notes:
- **Structure is preserved end-to-end** (GFM markdown, not flattened prose) precisely so
  the reader can reflow intelligently.
- Stripping Word cruft to clean structured markdown **shrinks the payload**, which
  directly eases the 30 KB+ QR-capacity constraint. Transformation and capacity pull the
  same way.
- Fountain coding is the transport crux: the phone needs *enough* frames, not every
  frame, so missed/blurred frames self-heal — and a single still photo of one frame
  reconstructs nothing.

## 5. Mobile rendering — the "mobilise" layer

Faithfully reconstructing a Word document on a phone is technically correct and
practically useless: a wide handover table becomes horizontal-scroll hell at the bedside.
The value is a **phone-first render**. Approach: **generic heuristics** (one renderer for
any document — no per-document config, no schema knowledge):

- **Table → cards:** a table with a header row reflows into **one stacked card per row**
  (label: value pairs). For handover this turns each squashed patient row into a
  scannable card. This is the headline transform.
- **Sections:** headings become collapsible sections with a **jump-to index**
  (jump to a patient / heading).
- **Search / filter:** client-side (find my patient; show only outstanding jobs).
- **Faithful fallback:** a **"Mobile view" ⇄ "Original layout" toggle** so a mangled
  transform never traps the reader — they can always see the source layout.

The same renderer powers the **presenter preview** (§3, step 3), so what the presenter
approves is what phones show. A polished handover-specific column-mapping *template* is
explicitly **deferred** (see §12) to keep the tool generic on day one.

## 6. Security profiles (generalisation)

Expiry and confidentiality are a **per-broadcast profile**, chosen by the presenter.
The strict profile is the **default** — you must actively downgrade, so a handover is
never treated casually by accident.

| Profile | Default | TTL | Re-share | Banner |
|---|---|---|---|---|
| **Confidential** (handover) | ✅ default | 36 h | ❌ scan-only | "CONFIDENTIAL — expires in Xh · do not screenshot or forward" |
| **Standard** (rota, protocol) | opt-in | configurable / none | — | light or none |

## 7. Phone-side storage & expiry

- On successful scan, store with `scannedAt`; `expiresAt = scannedAt + TTL`.
- Expiry enforced on every open **and** on a visibility/interval tick; expired data is
  purged from IndexedDB and the view shows "expired".
- Prominent live countdown ("expires in 31h 12m").
- Offline-capable: a service worker caches only the reader **shell** — never the payload/PID.

## 8. Information governance / DPIA

- **Build and test with dummy data only.** Real PID on real wards is gated behind trust
  IG approval. This spec ships with a DPIA draft to take to Caldicott.
- Controls baked in: **scan-only** (no re-share), **ephemeral animated transport**,
  bounded **TTL**, **no network transmission**, **no server**, **no logs**, no PID
  persisted anywhere but the recipient's own browser.
- Recipient copy carries a confidentiality banner (Confidential profile).
- **The defensible pitch: strictly better than paper** — guaranteed expiry, no
  photocopies, no pocket/coffee-room leakage, no printer queue.
- **Honestly logged residual risks:**
  - Screen-recording the projection (conspicuous; on par with photographing every paper
    sheet today).
  - At-rest copy readable via the phone's own devtools while unlocked — mitigated by TTL
    + device lock, **not** by at-rest encryption theatre (a keyless PWA cannot hold a
    secret from its own device).
  - The static app-QR links to a reader page: for full offline use the reader shell must
    already be cached, or the phone needs one-time network access to load it.

## 9. Tech stack

- **Vite + React + TypeScript (strict) + Tailwind** — matches the spine-planner
  ecosystem; reuses the existing **zxing-wasm** scanning work.
- **Dual build** (like spine-planner): hosted web build (reader served from a URL, e.g.
  under skeletalsurgery.com) + standalone single-file HTML so the presenter can run fully
  offline.
- Libraries: `mammoth`, `fflate`, `qrloop` (or BC-UR), `qrcode`, `zxing-wasm`, plain IndexedDB.

## 10. Component boundaries

- **docParser** — file → structured GFM markdown (tables preserved). In: File; Out:
  markdown string. Depends on mammoth.
- **codec** — markdown ⇄ compressed bytes. Depends on fflate. Pure, round-trip testable.
- **transmitter** — bytes → fountain frames → QR image stream. Depends on qrloop/qrcode.
- **receiver** — camera frames → decoded QR → reassembled bytes. Depends on zxing-wasm + qrloop.
- **mobiliser** — structured markdown → phone-first view model (table→cards, sections,
  index, search). Pure transform over parsed markdown; no I/O; heavily unit-testable.
  Shared by presenter preview and reader.
- **store** — IndexedDB persistence + TTL/expiry/purge. No other deps. Pure logic testable.
- **presenter UI** / **reader UI** — thin React shells over the above.

Each unit has one purpose, a defined interface, and is testable in isolation.

## 11. Testing (TDD)

Vitest unit tests:
- docParser: `.docx` → GFM markdown extraction (**tables preserved**).
- codec: gzip round-trip.
- transmitter/receiver: **fountain encode → decode round-trip with simulated frame drops
  and reordering**.
- mobiliser: header-row table → cards; heading tree → sections + index; search/filter;
  malformed/edge tables fall back cleanly to "Original layout".
- store: TTL/expiry + purge logic (including the "opened after expiry" path).

Integration: full encode → decode across a lossy channel; parse → mobilise render.

Manual (cannot be unit-tested): real projector + 2–3 phones at room distance — the true
scannability + bedside-readability test.

## 12. Out of scope (YAGNI, for now)

- A handover-specific column-mapping **template** (deferred; generic heuristics ship first).
- Phone-to-phone re-sharing (deliberately excluded for IG).
- PDF and image input (later; `.docx` first).
- At-rest encryption of the cached copy (rejected as theatre for a keyless PWA).
- Any server, account, or analytics.
- HCCB / Microsoft High Capacity Colour Barcode (discontinued; no browser decoder).

## 13. Open questions for implementation planning

1. `qrloop` vs BC-UR (`ur:`) as the fountain layer — evaluate capacity/robustness with a spike.
2. Whether colour barcodes (libcimbar-style) are worth the WASM cost for the 30 KB+ case,
   or monochrome qrloop is sufficient at acceptable frame counts.
3. Reader-shell delivery for true offline use (pre-cached PWA vs one-time load).
4. mobiliser: how far to push table-shape detection (multi-header rows, merged cells,
   nested tables) before falling back to "Original layout".
