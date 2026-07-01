import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
const errors = [];

if (!existsSync(join(dist, "index.html"))) errors.push("dist/index.html missing");
else {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  // Vite rewrites asset URLs to the base; they must be under /roomcast/
  if (!/\/roomcast\/assets\//.test(html)) errors.push("index.html not using /roomcast/ base");
}

const files = existsSync(dist) ? readdirSync(dist) : [];
if (!files.some((f) => f === "manifest.webmanifest" || f.endsWith(".webmanifest")))
  errors.push("PWA manifest missing");
if (!files.some((f) => f.startsWith("sw") && f.endsWith(".js")) &&
    !existsSync(join(dist, "sw.js")))
  errors.push("service worker missing");

if (errors.length) {
  console.error("check-build FAILED:\n" + errors.map((e) => " - " + e).join("\n"));
  process.exit(1);
}
console.log("check-build OK");
