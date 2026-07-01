import { defineConfig, devices } from "@playwright/test";

// Two projects against two different servers, because the two halves of this
// suite need different guarantees:
//
// - "build": routing/load smoke tests against the *production* build served by
//   `vite preview`. This is what actually ships (hosted PWA under /roomcast/),
//   so it's the only server that proves the real deploy artefact serves correctly.
//
// - "dev": in-browser pipeline round-trip + zxing-wasm decode tests against the
//   Vite *dev* server. These tests need to dynamically import project source
//   modules (envelope/frames/scanner) by URL to exercise the real Buffer
//   polyfill + qrloop + fflate + wasm bundling in an actual browser (not jsdom).
//   A production build bundles/mangles module paths, so source-by-URL imports
//   404 under `vite preview` — only the dev server serves source files verbatim.
//   The helper module they import (e2e/support/pipeline.ts) lives outside src/
//   and is never referenced by index.html/main.tsx, so it is never bundled into
//   the shipped app; it's reachable only via a direct dev-server file request.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  webServer: [
    {
      command: "npm run build && npm run preview -- --port 4173 --strictPort",
      url: "http://localhost:4173/roomcast/",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --port 4174 --strictPort",
      url: "http://localhost:4174/roomcast/",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "build",
      testMatch: "build.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4173/roomcast/" },
    },
    {
      name: "dev",
      testMatch: "pipeline.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4174/roomcast/" },
    },
  ],
});
