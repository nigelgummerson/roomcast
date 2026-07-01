import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./", // relative base so the single file works from file:// and any path
  plugins: [react(), nodePolyfills({ include: ["buffer"] }), viteSingleFile()],
  build: { outDir: "dist-standalone" },
});
