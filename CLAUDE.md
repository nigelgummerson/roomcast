# roomcast — Session History

Session-history / collaboration log for this project. For the static, AI-agnostic
project description (architecture, build commands, IG constraint) see `AGENTS.md`.

## 2026-07-04 — Fix: camera never opens in iOS Chrome (on `main`)

**Symptom (Nigel, on iPhone):** tapping *Receive* opened the camera in **Safari** but
not in **Chrome** — no permission prompt at all in Chrome.

**ACTUAL root cause (found by instrumenting — see below):** the page was reachable over
plain **`http://`**. `navigator.mediaDevices` is only exposed in a **secure context**, so
on http iOS Chrome reports `secureContext=false` and `mediaDevices` is `undefined` — the
scanner can't even call `getUserMedia`. Safari happened to auto-upgrade to https (secure →
worked); iOS Chrome stayed on http (insecure → no camera). Proven by curl:
`http://…/roomcast/` returned **200** (served insecure) while `http://…/spine/`
returned **301→https**. GitHub Pages **"Enforce HTTPS" was off** for roomcast
(`https_enforced:false`) and **on** for spine-planner — which is the *only* reason
spine-planner's identical `navigator.mediaDevices.getUserMedia` code works in iOS Chrome.
It was never an app-capability limit.

**Fix (two-part, defence in depth):**
1. **App self-upgrade:** inline `http:`→`https:` redirect at the top of `index.html`
   `<head>` (runs before anything else). Skips `localhost`/`127.0.0.1` (dev is already a
   secure context) and `file://` (the standalone build).
2. **Server enforce:** enabled GitHub Pages "Enforce HTTPS" via
   `gh api -X PUT repos/nigelgummerson/roomcast/pages -F https_enforced=true` (cert state
   was already `approved`). Now `https_enforced:true`; GitHub will 301 http→https like
   spine (propagation took a few minutes).

**Investigation trail (kept — systematic-debugging):** first hypothesis was a *gesture*
issue (iOS Chrome rejecting gesture-less `getUserMedia`). That fix shipped first —
`src/reader/cameraGesture.ts` (`cameraNeedsGesture()` UA-detects iOS-non-Safari) makes an
empty iOS-non-Safari user land on the **"Scan a broadcast"** button instead of auto-
starting; Safari/desktop/Android keep zero-tap. It **did not fix it** (still no camera),
which forced proper instrumentation: `startCamera` was rewritten to route *synchronous*
failures (e.g. `mediaDevices` undefined throwing a TypeError before any promise) through
`onError`, and the denied screen now shows the real error string. That surfaced
`Camera API unavailable (mediaDevices=missing, secureContext=false)` → the true cause.
The gesture change was **kept** (harmless single tap; iOS Chrome may still want a gesture
even on https — unverified), and the richer error surfacing is a genuine UX win.

**Verification:** `npm test` (118 pass — `cameraGesture.test.ts` (3, real UA strings incl.
iPadOS-as-Mac) + iOS-Chrome no-auto-start case), `tsc --noEmit`, `npm run build`,
`npm run build:standalone` all green; redirect snippet confirmed in both `dist/` and
`dist-standalone/`. **Device-verify pending:** Nigel to confirm on iPhone Chrome once the
new deploy is live (camera should now open); Safari unchanged.

## 2026-07-04 — .odt support + responsive broadcast view (on `main`)

Two fixes (brainstormed inline, spec doc skipped per solo-dev prefs):

- **Accept `.odt` as well as `.docx`.** Google Docs has no single native file; users pick
  "Download → OpenDocument (.odt)". New `src/core/odtParser.ts` (`odtToMarkdown`): unzip
  `content.xml` with the already-shipped `fflate`, walk the ODF block subset
  (headings via `outline-level`, paragraphs, lists, tables) with the native `DOMParser`
  (present in browser + jsdom), then reuse `docParser`'s exported `htmlToGfm` so `.odt`
  inherits the same table-cell sanitisation + image stripping as `.docx`. **No new
  dependency.** Inline bold/italic not preserved (structure + text only). Malformed zip /
  missing `content.xml` / non-well-formed XML all throw → caught by the presenter's
  existing error toast. `buildBroadcast` gains a `format: "docx" | "odt"` option
  (defaults to `docx`); `PresenterApp.onFile` picks it from the file extension and rejects
  anything else with an updated toast. `DropZone` now `accept=".docx,.odt"`.
- **Responsive broadcast view (QR overlap fix).** The "Scan to receive" join panel was
  `absolute bottom-6 right-6`, so on a phone/portrait the centred fountain QR grew into
  the corner and the small QR landed on top of it. Now the panel is in normal flow
  (`mx-auto mb-6 w-max`) — stacked *below* the fountain QR on small screens — and only
  floats into the corner at `md`+ (≥768px, projector/laptop) via `md:absolute md:bottom-6
  md:right-6 md:mx-0 md:mb-0`. `PresenterApp.tsx`.

**Verification:** `npm test` (114 pass — added `odtParser.test.ts` (8) + a `buildBroadcast`
`.odt`-dispatch case), `tsc --noEmit`, `npm run build`, `npm run build:standalone` all
green. Browser-verified both fixes: a generated ward-handover `.odt` parsed and rendered
in the real presenter (table + escaped `|` preserved); the `md+` corner-overlay layout
renders with no overlap, and the sub-`md` effective class set resolves to a static,
in-flow panel stacked below the fountain QR (`overlap: false`). The automation window
couldn't be forced below ~1512px, so the phone layout was confirmed via computed styles +
stripping the inert `md:` utilities rather than a true narrow viewport.

## 2026-07-01 — Initial build

Built end-to-end via the **superpowers brainstorm → spec → plan → subagent-driven
development** flow, on branch `feat/implementation`:

- **Brainstorm/spec:** `docs/superpowers/specs/2026-07-01-roomcast-design.md` — concept,
  prior art, pipeline, mobile-rendering approach, security profiles, DPIA outline, tech
  stack, component boundaries, testing strategy, and open questions.
- **Plan:** `docs/superpowers/plans/2026-07-01-roomcast.md` — task-by-task TDD
  implementation plan executed via `superpowers:subagent-driven-development`.
- **Execution:** Tasks 1–13 completed (project scaffold; core pure modules — envelope,
  docParser, frames, mobiliser, store; presenter app; reader app + scanner; app routing +
  offline PWA shell + standalone build; this docs/fixture task). Per-task briefs and
  reports live under `.superpowers/sdd/task-*-brief.md` / `task-*-report.md`; per-task
  review diffs under `.superpowers/sdd/review-*.diff`.
- Result at this point: 13 modules/apps, 37 tests (`npm test`), hosted PWA build
  (`npm run build`, served at `plan.skeletalsurgery.com/roomcast/`) and a standalone
  single-file build (`npm run build:standalone`), both green.

### Task 13 (this task): DPIA draft, dummy fixture, project docs

Added `docs/DPIA-draft.md`, `samples/dummy-handover.md` (fictional demo ward handover
table — a matching `.docx` is generated by Task 15's fixture generator), `AGENTS.md`,
this `CLAUDE.md`, and `README.md`. No application code was changed.

**IG constraint (repeated here deliberately):** roomcast must not be used with real
patient-identifiable data until a trust's Information Governance function / Caldicott
Guardian has reviewed and signed off `docs/DPIA-draft.md`. All development and testing
to date — and all sample data in this repository — is entirely fictional.

**Verification performed for this task:**
- `npm test` — full suite still green (docs-only change, no test impact expected).
- `npm run build` — hosted PWA build still succeeds.
- `npm run build:standalone` — standalone single-file build still succeeds.
- **Deferred:** the brief's manual end-to-end step (drop `samples/dummy-handover.docx`
  into a running `npm run dev` presenter, broadcast, and scan with a second
  camera-equipped device/phone) was **not** performed in this session — live camera
  scanning cannot be driven headlessly by an agent. This is left for Nigel to run by
  hand, and is separately covered by the automated browser end-to-end test planned for
  Task 16. Full detail in `.superpowers/sdd/task-13-report.md`.

## 2026-07-01 — Full day: build → UI overhaul → RoomCast home/branding (all LIVE)

Three brainstorm→spec→plan→subagent-driven rounds, each merged via PR + CI and deployed
to **plan.skeletalsurgery.com/roomcast/**. Specs/plans under `docs/superpowers/`.

**Round 1 — initial build (PR #1).** Full offline app: core pure modules
(envelope/docParser/frames/mobiliser/store/sanitise), scanner (camera + self-hosted
zxing-wasm, no CDN), presenter + reader apps, hash routing, PWA offline shell + standalone
single-file build, 15-case hostile-`.docx` corpus + hardening, GitHub Pages deploy. Added
a `pull_request` CI workflow; bumped Actions to Node 24. Also added reciprocal
presenter↔receiver nav links.

**Round 2 — UI/UX overhaul + camera reliability (PR #4).** Spine-planner-calibrated design
system (`src/ui/`: NHS-Blue tokens, self-hosted Inter, Button/Card/Banner/Spinner/
ProgressRing/Toast/Feather icons); hybrid QR decoder (native BarcodeDetector →
zxing-wasm fallback) + torch + hi-res camera; reader auto-starts the camera and shows a
copies-first landing (loading → "Your copies" or viewfinder) + permission-denied state +
`navigator.storage.persist()`; centred-stage projected screen with a corner "Scan to
receive" join panel; drag-and-drop presenter setup with a phone-frame preview.

**Round 3 — RoomCast home page + branding + two-model delivery (PR #5).** Two delivery
models: **Confidential** (chosen expiry — presets 8/12/24/36 h + 1 week + a **Custom**
free-form entry) vs **Standard** (**never expires**), via `ttlHours`/`expiresAt` =
`number | null` (null = never), guarded at every seam; Countdown shows "Does not expire".
"Your copies" gains **rename** and **delete** (with an inline two-step confirmation).
**Escape** stops a broadcast; the preview is a phone-aspect **scrollable** frame.
**Branding "RoomCast":** `src/ui/Logo.tsx` + a Playwright render script
(`scripts/gen-brand.mjs`) producing the committed favicon / apple-touch / maskable / PWA
icons + a 1200×630 `og-image.png`; social/OG/Twitter meta + PWA manifest name "RoomCast";
a simplified bolder mark for legible 16/32 px favicons. A **Home** landing page now sits
at the base route (spine-planner style) with `#present`/`#reader` sub-routes and
brand-home links.

**Explicitly out of scope:** screen-capture prevention — a web app cannot block
screenshots/screen recording (native-only: Android FLAG_SECURE / iOS capture detection);
recorded as a possible future native path.

**State at end of day:** 104 unit tests + Playwright e2e; `build` / `build:standalone` /
`typecheck:e2e` / `lint` all clean. Each round passed per-task reviews + a final Opus
whole-branch review. LIVE and verified.

**Deferred / follow-ups (non-blocking):** presenter "expires in Xh" note can go stale if a
preset is changed after a file is dropped (re-drop to sync); minor a11y/docs polish; an
optional lock-in test for the confidential+never-expires banner path; the manual
projector + multi-phone scannability/torch test (cannot be driven headlessly).

**IG constraint stands:** no real patient-identifiable data until a trust IG/Caldicott
sign-off of `docs/DPIA-draft.md`. All development, testing, and sample data to date is
entirely fictional.

## 2026-07-02 — Cross-navigation polish (branch `feat/nav-links`)

Small wayfinding fixes so the two entry paths are always reachable and the confusion
between "present" and "receive" is removed:

- **Home header:** added a ghost **Receive** button (→ `#reader`) next to the primary
  **Present** button (→ `#present`), so both paths sit side by side. Kept the label
  "Present" (the hero already reads "Broadcast a document"; considered
  "Present (Broadcast)" but rejected as redundant).
- **Presenter page:** added a **Receive** link (→ `#reader`) beside the "Presenter" label.
- **Reader page:** added a **Present** link (→ `#present`) in the header.
- **Home footer:** removed the "Source on GitHub" link.
- Updated `HomePage.test.tsx` for the second "Receive" link (assert all `/receive/i`
  links point to `#reader`, plus the header "Present" link → `#present`).

**Verification:** `npm test` (105 pass) and `npm run build` both green.

Merged to `main` as PR #7 (squash). **Workflow change:** from here on this is a
solo-dev repo with **no PRs** — commit straight to `main`, push, deploy runs on push.
Run `npm test` locally before pushing for the same gate CI gave.

## 2026-07-02 — Escape-to-exit + version system (on `main`)

- **Escape bail-out:** pressing **Escape** in the reader (`#reader`) now navigates back
  to the presenter home (`#present`), mirroring the presenter's existing Escape (which
  stops a live broadcast and lands on `#present`). The reader handler ignores Escape
  while a text field is focused (e.g. renaming a copy) so an in-progress edit isn't lost.
  `src/reader/ReaderApp.tsx`.
- **Version system:** `package.json` version set to **`1.0.0-beta`** as the single source
  of truth; injected at build time as the `__APP_VERSION__` global via `define` in **both**
  `vite.config.ts` and `vite.standalone.config.ts` (declared in `src/global.d.ts`, exposed
  through `src/version.ts` as `APP_VERSION`). Displayed as `v1.0.0-beta` in the home-page
  footer. To bump the version, edit only `package.json`. Tagged `v1.0.0-beta`.

**Verification:** `npm test` (105 pass), `npm run build`, `npm run build:standalone` all
green; version string confirmed baked into `dist/` and `dist-standalone/` output.
