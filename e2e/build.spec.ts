import { test, expect } from "@playwright/test";

// Runs against the production build (`vite build` + `vite preview`, see the
// "build" project in playwright.config.ts). Proves the real deploy artefact —
// the hosted PWA under the /roomcast/ base path — actually serves and routes.

test("presenter loads at the /roomcast/ base", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByText(/presenter/i)).toBeVisible();
});

test("reader route loads", async ({ page }) => {
  await page.goto("./#reader");
  // With no saved copies the reader auto-starts the camera once its initial
  // load resolves (loading spinner -> viewfinder), which Playwright can't
  // grant a real device for reliably. Assert the persistent reader shell —
  // the "Presenter mode" footer link — rather than a state-specific button.
  await expect(page.getByRole("link", { name: /presenter mode/i })).toBeVisible();
});

test("presenter links to the receiver and back", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: /receive a broadcast/i }).click();
  await expect(page.getByRole("link", { name: /presenter mode/i })).toBeVisible();
  await page.getByRole("link", { name: /presenter mode/i }).click();
  await expect(page.getByRole("heading", { name: /roomcast — presenter/i })).toBeVisible();
});
