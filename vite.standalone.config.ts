import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { viteSingleFile } from "vite-plugin-singlefile";

const appVersion = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
).version;

export default defineConfig({
  base: "./", // relative base so the single file works from file:// and any path
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [react(), nodePolyfills({ include: ["buffer"] }), viteSingleFile()],
  build: { outDir: "dist-standalone" },
});
