# Data Protection Impact Assessment (DPIA) — Draft

**Project:** roomcast
**Status:** DRAFT — for Caldicott Guardian / trust Information Governance (IG) review.
**Scope:** covers the clinical **handover** use case (Confidential profile), the most
information-governance-sensitive deployment of a generic tool.

> **This document has not been approved by any trust IG function.** roomcast must not be
> used with real patient-identifiable data (PID) until it has been reviewed and signed off
> by the relevant Caldicott Guardian / IG lead. **All development, testing and demonstration
> of roomcast to date uses entirely fictional dummy data** (see `samples/dummy-handover.md`)
> — no real patient data has been entered into, transmitted by, or stored by this
> application.

---

## 1. What roomcast does

roomcast broadcasts a document (e.g. a ward handover list) from a presenter's laptop,
projected in a room, to any number of phones present, without a server, a network
transfer of the document, a login, or paper.

1. A presenter drops a document (currently `.docx`) into the presenter app.
2. The document is parsed client-side into structured markdown and reflowed into a
   phone-first preview ("mobilise").
3. The document is compressed and fountain-encoded into a stream of QR codes, animated
   on screen (8 fps, fixed) — no upload, no server round-trip.
4. Anyone in the room scans the animated code with a phone camera, using a shared
   "reader" web page.
5. The phone decodes enough frames to reconstruct the document locally, then stores a
   copy in its own browser (IndexedDB), tagged with a scan time and an expiry time.
6. The phone displays the document with a confidentiality banner and a live countdown
   to expiry. After expiry the copy is purged and inaccessible.

## 2. Data flows

**The document's content never crosses a network.** The entire encode → animate → scan →
decode → store pipeline runs in the browser, phone-to-screen, via the camera — there is
no HTTP request, WebSocket, or other network transmission that carries document content
at any point.

The **only** network traffic in the system is unrelated to document content:

- The initial page load of the **reader shell** (the static HTML/JS/CSS/WASM app itself,
  containing no patient data) is fetched once from the hosting URL, or is already cached
  by the browser as an installed Progressive Web App (PWA), or is loaded from a
  fully offline single-file HTML build carried on a USB stick / local network.
- No analytics, telemetry, crash reporting, or logging of any kind is present in the
  application. There is no server component to log to.

Data flow diagram (text):

```
[Presenter laptop, offline]                         [Phone, offline]
 .docx file                                          camera → decode frames
   -> parse to markdown (mammoth)                       -> reassemble (qrloop)
   -> compress (gzip)                                   -> decompress (gzip)
   -> fountain-encode (qrloop)                           -> structured markdown
   -> render animated QR frames                          -> mobilise (cards/sections)
   -> [projected on screen]  == light only, no network == -> store in IndexedDB
                                                           -> render + countdown + banner
```

No document content is written to disk on the presenter device beyond the user's own
file system (the source `.docx` the presenter chose to open); no document content is
written anywhere by the presenter app itself. On the phone, the only persistence is the
browser's own IndexedDB store for that origin, which is subject to the TTL/purge logic
below.

## 3. Lawful basis and Caldicott principles

For the clinical handover use case, once real PID is in scope, the lawful basis would
ordinarily be **direct care** (UK GDPR Art. 6(1)(e) / Art. 9(2)(h), common-law duty of
confidentiality satisfied by direct care). This DPIA does not itself establish that
basis — that determination, and sign-off against the **National Data Guardian's Caldicott
Principles**, is for the trust's IG function. Points relevant to that review:

- **Principle 1 (justify the purpose):** replacing paper/verbal handover with a
  self-expiring digital copy, for direct clinical care of the patients on the list.
- **Principle 2 (don't use PID unless necessary):** the tool is generic; only fields the
  presenter chooses to include in the source document are transmitted. No additional
  data is collected by the tool itself (no accounts, no device identifiers, no location).
- **Principle 3 (minimum necessary):** confined to the presenter's chosen document, for
  the duration of a single ward round/shift (default 36 h TTL).
- **Principle 4 (access on a need-to-know basis):** anyone who can see and scan the
  projected code can receive a copy — this is a **broadcast**, not access-controlled
  distribution, mirroring how a paper handover sheet pinned to a board is visible to
  the room. IG review should confirm this is acceptable for the intended room
  (e.g. an MDT/handover room with only clinical staff present), and is a materially
  smaller exposure than paper (see §4).
- **Principle 5 (everyone understands their responsibilities):** the confidentiality
  banner and "scan-only" model make the sensitivity and no-re-share expectation visible
  on-device.
- **Principle 6 (comply with the law):** IG sign-off is the explicit gate before any real
  PID use (see §7).
- **Principle 7 (the duty to share can be as important as the duty to protect):** the tool
  exists because current handover practice (paper, verbal, ad hoc photos of screens) is
  itself an IG risk; roomcast is offered as a *safer* replacement, not an additional risk.
- **Principle 8 (inform patients how their confidential information is used):** out of
  scope for this draft; a trust adopting roomcast for handover should ensure existing
  patient-facing privacy notices/fair-processing information cover internal digital
  handover tooling generally, consistent with existing handover practice.

## 4. The "strictly better than paper" argument

Ward handover today is typically a printed or verbally-relayed list. roomcast is
compared against that baseline, not against a zero-risk ideal:

| Risk | Paper handover (today) | roomcast (Confidential profile) |
|---|---|---|
| Persistence | Sheets are often kept in pockets, folders, on desks for days; disposal is manual and inconsistent | Automatic, enforced expiry (default 36 h); no manual disposal step to forget |
| Copies | Photocopies proliferate uncontrolled; anyone can photocopy again | Scan-only: the reader UI does not offer re-share/forward/print; each device holds one independent copy that itself expires |
| Loss | Sheets are dropped, left on desks, left in coat pockets, thrown in general waste | Nothing physical to lose; a lost phone is protected by the device's own lock screen |
| Distribution control | Whoever has the sheet can hand it to anyone | Only those physically present in the room when the code is displayed can scan it |
| Update propagation | Old sheets stay in circulation after being superseded | Old broadcasts expire; there is no incentive to retain an old copy |
| Audit/awareness | No confidentiality reminder on the document itself | Persistent on-screen confidentiality banner + visible countdown |

roomcast does not claim zero risk (see §6); it claims a **materially better risk profile
than the paper process it replaces**, using controls that are automatic and cannot be
forgotten by a busy clinical team, rather than relying on manual diligence.

## 5. Controls

- **No network transmission of document data.** The full pipeline (parse, compress,
  encode, render, scan, decode, store) executes client-side in the browser. See §2.
- **No server.** roomcast has no backend; there is nothing to breach, subpoena, or
  misconfigure server-side, and no central store of documents ever exists.
- **No logs.** No access logs, analytics, or telemetry exist anywhere in the system.
- **Scan-only, no re-share.** The reader UI provides no export, forward, print, or share
  action; a copy is only obtainable by independently scanning the live animated broadcast.
- **Bounded TTL, Confidential profile default (36 h).** Every broadcast defaults to the
  strictest profile; a presenter must actively choose to downgrade to the Standard
  profile for non-sensitive documents (e.g. a rota). Expiry is enforced on every open of
  the app and on a periodic/visibility check, and expired data is purged from the
  phone's IndexedDB store, not merely hidden.
- **Confidentiality banner.** The Confidential profile displays a persistent banner
  ("CONFIDENTIAL — expires in Xh — do not screenshot or forward") alongside the live
  countdown, on every view of the stored copy.
- **Ephemeral animated transport.** The document is never available as a static,
  re-scannable code sitting on a screen or in a saved image in the way a static QR
  pointing at a hosted URL would be; a single still photograph of one frame reconstructs
  nothing (fountain coding requires collecting a sufficient — not complete — spread of
  frames over the animation's duration).
- **Self-hosted decoder, no third-party CDN.** The phone-side QR/WASM decoder
  (`zxing-wasm`) is bundled locally with the app rather than fetched from a CDN at scan
  time (see Task 12 finding, recorded in `AGENTS.md`), so scanning does not depend on, or
  leak metadata to, any third-party network service.
- **No accounts, no identifiers.** No login, no device ID, no user ID is collected or
  transmitted by the tool at any point.

## 6. Residual risks (honestly logged)

These risks are not eliminated by the controls above, and are stated explicitly rather
than glossed over:

1. **Screen-recording the projection.** Anyone in the room could point a second device
   at the animated broadcast and record it, in principle reconstructing the document
   outside the app's scan-only model. This is a conspicuous, hard-to-conceal act (akin
   to conspicuously photographing every sheet of a paper handover as it is read out) and
   is treated as an acceptable residual risk on the same basis as photographing paper is
   today — but IG review should note it explicitly rather than assume it away.
2. **Unlocked-device access to the at-rest copy.** The document, once scanned, is stored
   unencrypted in the phone browser's IndexedDB (data is only protected by the OS's
   normal storage sandboxing). Anyone with physical access to an *unlocked* phone could,
   with developer tools or direct storage inspection, read the stored copy before it
   expires. This is mitigated by the **TTL** (bounding the exposure window to 36 h by
   default) and by **normal device lock-screen discipline**, which is the same
   expectation already placed on any NHS-issued device holding clinical information (Wi-Fi
   email, EPR apps, etc.). This is deliberately **not** mitigated with at-rest encryption:
   a keyless client-side web app cannot hold a secret from its own device, so encrypting
   the IndexedDB store with a key also stored in that origin would be theatre, not real
   protection (see design spec §12, "Out of scope").
3. **Reader-shell delivery requires either a one-time network fetch or a pre-cached
   PWA.** The application shell itself (not document content) must reach the phone
   somehow: either a one-off network load of the reader page (which is then cached
   offline via service worker for subsequent use), or a fully offline standalone build
   distributed by other means (e.g. a pre-installed PWA, a local Wi-Fi hotspot serving
   the shell, or a single-file HTML carried on removable media). Trusts adopting roomcast
   for areas with no reliable network access should plan reader-shell distribution
   accordingly (see `AGENTS.md` for the two build targets).

## 7. Explicit gating statement

**Live-ward use of roomcast with real, patient-identifiable data requires explicit
sign-off from the trust's Information Governance function and Caldicott Guardian before
deployment.** This DPIA draft is an input to that review, not a substitute for it.

**All development, testing, and demonstration of roomcast conducted to date uses only
entirely fictional dummy data** — see `samples/dummy-handover.md`, which contains
invented names, fictional NHS numbers (formatted `999 xxx xxxx`, a format outside real
NHS number ranges), and fictional consultants. No real patient information has been
entered into, processed by, or stored by any build of this application.

## 8. Open items for IG review

- Confirm the "broadcast, not access-controlled" model (§3, Principle 4) is acceptable
  for the intended physical spaces (handover rooms, MDT rooms) and does not require
  additional physical-access controls beyond normal ward/room security.
- Confirm the default Confidential-profile parameters (36 h TTL, scan-only, banner) are
  acceptable as compared against local information-sharing policy, and whether any
  sites require a shorter TTL (e.g. matched to shift length).
- Determine whether existing patient privacy notices already cover this class of internal
  digital handover tooling, or whether an update is needed.
- Decide the intended hosting/distribution model per site (hosted reader shell reachable
  on trust Wi-Fi vs standalone offline build) and confirm both meet local network policy.
- Confirm acceptable incident response if a device holding an unexpired copy is lost —
  expected answer: no action beyond normal lost-device process, since the copy
  self-expires and cannot be exported/forwarded from the app.
