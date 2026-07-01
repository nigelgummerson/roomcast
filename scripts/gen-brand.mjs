// Generates the committed RoomCast brand asset set (favicons, PWA icons,
// og-image) from scripts/brand/mark.svg, scripts/brand/mark-small.svg and
// scripts/brand/og.html using Playwright chromium. Run: node scripts/gen-brand.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const svg = readFileSync("scripts/brand/mark.svg", "utf8");
// mark-small is a bolder, simplified variant of the mark (single thicker
// broadcast arc, larger tile) designed to stay legible at 16/32px, where the
// detailed mark's thin concentric arcs disappear into a blob.
const smallSvg = readFileSync("scripts/brand/mark-small.svg", "utf8");
const whiteSvg = svg.replace(/#005EB8/gi, "#ffffff");
const icon = (bg, mark = svg, markSize = "80%") =>
  `<html><body style="margin:0;background:${bg};display:flex;align-items:center;justify-content:center"><style>svg{width:${markSize};height:${markSize}}</style>${mark}</body></html>`;

const jobs = [
  { file: "favicon-32.png", size: 32, html: icon("transparent", smallSvg), omitBg: true },
  { file: "favicon-16.png", size: 16, html: icon("transparent", smallSvg), omitBg: true },
  { file: "apple-touch-icon.png", size: 180, html: icon("#ffffff"), omitBg: false },
  { file: "pwa-192.png", size: 192, html: icon("#ffffff"), omitBg: false },
  { file: "pwa-512.png", size: 512, html: icon("#ffffff"), omitBg: false },
  // full-bleed blue field with a white mark scaled to a 70% safe zone, per Android
  // adaptive-icon masking guidance.
  { file: "pwa-maskable-512.png", size: 512, html: icon("#005EB8", whiteSvg, "70%"), omitBg: false },
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
