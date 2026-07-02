/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";

// Single source of truth for the app version: package.json. Injected as the
// __APP_VERSION__ global (see src/global.d.ts) so it stays in sync with npm.
const appVersion = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
).version;

export default defineConfig({
  base: "/roomcast/", // served at plan.skeletalsurgery.com/roomcast/ (GitHub Pages project path)
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [
    react(),
    nodePolyfills({ include: ["buffer"] }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "RoomCast",
        short_name: "RoomCast",
        description: "Beam any document to the whole room — scan it to your phone.",
        start_url: "./",
        display: "standalone",
        theme_color: "#0d1b2a",
        background_color: "#ffffff",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      // Cache only the app shell/assets (JS/CSS/HTML/WASM) — never document payloads,
      // which live in IndexedDB and must survive independently of the SW cache.
      workbox: { globPatterns: ["**/*.{js,css,html,wasm,png,svg}"] },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    // e2e/ holds Playwright specs (real browser, separate runner/config) —
    // exclude it from vitest so its *.spec.ts files aren't picked up by
    // vitest's default include pattern and run under jsdom.
    exclude: ["node_modules/**", "e2e/**"],
  },
});
