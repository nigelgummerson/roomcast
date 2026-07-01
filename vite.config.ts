/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  base: "/roomcast/", // served at plan.skeletalsurgery.com/roomcast/ (GitHub Pages project path)
  plugins: [react(), nodePolyfills({ include: ["buffer"] })],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
