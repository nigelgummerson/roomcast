// Generates the committed RoomCast brand asset set (favicons, PWA icons,
// og-image) from scripts/brand/mark.svg and scripts/brand/og.html using
// Playwright chromium. Run: node scripts/gen-brand.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const svg = readFileSync("scripts/brand/mark.svg", "utf8");
const icon = (bg) =>
  `<html><body style="margin:0;background:${bg};display:flex;align-items:center;justify-content:center">${svg}</body></html>`;

const jobs = [
  { file: "favicon-32.png", size: 32, html: icon("transparent"), omitBg: true },
  { file: "favicon-16.png", size: 16, html: icon("transparent"), omitBg: true },
  { file: "apple-touch-icon.png", size: 180, html: icon("#ffffff"), omitBg: false },
  { file: "pwa-192.png", size: 192, html: icon("#ffffff"), omitBg: false },
  { file: "pwa-512.png", size: 512, html: icon("#ffffff"), omitBg: false },
  { file: "pwa-maskable-512.png", size: 512, html: icon("#005EB8"), omitBg: false }, // full-bleed for maskable
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  await page.setContent(j.html);
  await page.screenshot({ path: `public/${j.file}`, omitBackground: j.omitBg });
}
// og-image 1200x630
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(readFileSync("scripts/brand/og.html", "utf8"));
await page.screenshot({ path: "public/og-image.png" });
await browser.close();
console.log("brand assets written to public/");
