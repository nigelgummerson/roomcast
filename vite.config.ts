/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/roomcast/", // served at plan.skeletalsurgery.com/roomcast/ (GitHub Pages project path)
  plugins: [
    react(),
    nodePolyfills({ include: ["buffer"] }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "roomcast",
        short_name: "roomcast",
        start_url: "./#reader",
        display: "standalone",
      },
      // Cache only the app shell/assets (JS/CSS/HTML/WASM) — never document payloads,
      // which live in IndexedDB and must survive independently of the SW cache.
      workbox: { globPatterns: ["**/*.{js,css,html,wasm}"] },
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
