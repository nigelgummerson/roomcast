import { test, expect } from "@playwright/test";

// Runs against the Vite *dev* server (see the "dev" project in
// playwright.config.ts), because the production build bundles/mangles module
// paths and a dynamic import() of a bare "/roomcast/src/..." source path
// would 404 under `vite preview`. The dev server serves source files
// verbatim, which lets these tests import the real project modules by URL
// and exercise them in an actual Chromium — proving the Buffer polyfill,
// qrloop, fflate and zxing-wasm all bundle and run correctly in a real
// browser, which jsdom cannot verify.

test("pipeline round-trips in a real browser (Buffer/qrloop/fflate bundled)", async ({ page }) => {
  await page.goto("./");
  const ok = await page.evaluate(async () => {
    const mod = await import("/roomcast/e2e/support/pipeline.ts");
    return mod.roundTrip();
  });
  expect(ok).toBe(true);
});

test("a rendered QR frame decodes via zxing-wasm in-browser", async ({ page }) => {
  await page.goto("./");
  const text = await page.evaluate(async () => {
    const mod = await import("/roomcast/e2e/support/pipeline.ts");
    return mod.decodeRenderedQr("roomcast-e2e");
  });
  expect(text).toBe("roomcast-e2e");
});
