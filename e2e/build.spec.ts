import { test, expect } from "@playwright/test";

// Runs against the production build (`vite build` + `vite preview`, see the
// "build" project in playwright.config.ts). Proves the real deploy artefact —
// the hosted PWA under the /roomcast/ base path — actually serves and routes.

test("base route loads the Home landing", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /roomcast/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /broadcast a document/i }),
  ).toHaveAttribute("href", /#present$/);
  await expect(
    page.getByRole("link", { name: /receive a document/i }),
  ).toHaveAttribute("href", /#reader$/);
});

test("#present route loads the presenter", async ({ page }) => {
  await page.goto("./#present");
  await expect(page.getByLabel("Title")).toBeVisible();
});

test("#reader route loads the reader shell", async ({ page }) => {
  await page.goto("./#reader");
  // With no saved copies the reader auto-starts the camera once its initial
  // load resolves (loading spinner -> viewfinder), which Playwright can't
  // grant a real device for reliably. Assert the persistent reader shell —
  // the RoomCast brand-home link — rather than a state-specific button.
  await expect(page.getByRole("link", { name: /roomcast/i })).toBeVisible();
});

test("Home links to the presenter and back", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: /broadcast a document/i }).click();
  await expect(page.getByLabel("Title")).toBeVisible();
  await page.getByRole("link", { name: /roomcast/i }).click();
  await expect(page.getByRole("heading", { name: /roomcast/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /broadcast a document/i }),
  ).toBeVisible();
});

test("Home links to the reader and back", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: /receive a document/i }).click();
  await expect(page.getByRole("link", { name: /roomcast/i })).toBeVisible();
  await page.getByRole("link", { name: /roomcast/i }).click();
  await expect(page.getByRole("heading", { name: /roomcast/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /receive a document/i }),
  ).toBeVisible();
});
