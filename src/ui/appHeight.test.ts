import { describe, it, expect } from "vitest";
import { installAppHeight } from "./appHeight";

describe("installAppHeight", () => {
  it("sets --app-height from innerHeight and updates on resize", () => {
    const root = document.documentElement;
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    const cleanup = installAppHeight(window);
    expect(root.style.getPropertyValue("--app-height")).toBe("800px");
    Object.defineProperty(window, "innerHeight", { value: 640, configurable: true });
    window.dispatchEvent(new Event("resize"));
    expect(root.style.getPropertyValue("--app-height")).toBe("640px");
    cleanup();
    Object.defineProperty(window, "innerHeight", { value: 500, configurable: true });
    window.dispatchEvent(new Event("resize"));
    expect(root.style.getPropertyValue("--app-height")).toBe("640px"); // unchanged after cleanup
  });
});
