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
  await expect(page.getByRole("button", { name: /scan a broadcast/i })).toBeVisible();
});

test("presenter links to the receiver and back", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: /receive a broadcast/i }).click();
  await expect(page.getByRole("button", { name: /scan a broadcast/i })).toBeVisible();
  await page.getByRole("link", { name: /presenter mode/i }).click();
  await expect(page.getByRole("heading", { name: /roomcast — presenter/i })).toBeVisible();
});
