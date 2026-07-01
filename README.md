# roomcast

An offline, browser-only tool that broadcasts a document to a room via an animated
"fountain" QR code. Drop a file into the presenter app, project it, and anyone in the
room scans the animation once with a phone camera to receive a phone-readable copy that
self-expires (36 hours by default). No server, no login, no network transfer of the
document itself, no paper.

Clinical ward handover is the flagship, most information-governance-sensitive use case
— see the IG warning below.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL for the **presenter** view. Drop a `.docx` (try
`samples/dummy-handover.md`'s content, or generate the matching `.docx` fixture — see
Task 15) to build a broadcast and start the animated QR.

Open the same URL with `#reader` appended (e.g. `http://localhost:5173/#reader`) on a
second, camera-equipped device to act as the **reader**: point the camera at the
animated code on the presenter screen to scan it in.

## Build

```bash
npm run build            # hosted PWA build -> dist/
npm run build:standalone # single-file offline HTML -> dist-standalone/
npm test                 # run the test suite
npm run lint             # oxlint
```

## Hosting

Hosted build is served at **plan.skeletalsurgery.com/roomcast/** (GitHub Pages). The
standalone build is a single self-contained HTML file for fully offline use with no
hosting at all.

## Information governance

**Do not use roomcast with real patient-identifiable data.** Live-ward use requires
sign-off from a trust's Information Governance function / Caldicott Guardian — see
`docs/DPIA-draft.md`. All sample data and testing in this repository is entirely
fictional (`samples/dummy-handover.md`).

See `AGENTS.md` for architecture and `CLAUDE.md` for project/session history.
