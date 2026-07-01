import { describe, it, expect } from "vitest";
import { fountainQrSize } from "./qrTuning";

describe("fountainQrSize", () => {
  it("scales with the smaller viewport dimension", () => {
    expect(fountainQrSize(1920, 1080)).toBeGreaterThan(fountainQrSize(800, 600));
  });
  it("leaves margin (never fills the smaller dimension) and caps on huge screens", () => {
    expect(fountainQrSize(1000, 1000)).toBeLessThan(1000);
    expect(fountainQrSize(6000, 6000)).toBeLessThanOrEqual(900);
  });
});
