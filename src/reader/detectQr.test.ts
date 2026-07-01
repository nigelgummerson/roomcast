import { describe, it, expect, vi, afterEach } from "vitest";
import { createQrDetector } from "./detectQr";

const g = globalThis as unknown as { BarcodeDetector?: unknown };
afterEach(() => { delete g.BarcodeDetector; vi.restoreAllMocks(); });

describe("createQrDetector", () => {
  it("uses native BarcodeDetector when qr_code is supported", async () => {
    class FakeBD {
      static getSupportedFormats = async () => ["qr_code", "ean_13"];
      detect = async () => [{ rawValue: "FROM-NATIVE" }];
    }
    g.BarcodeDetector = FakeBD;
    const d = await createQrDetector(globalThis);
    expect(d.engine).toBe("native");
    // native path reads from an ImageBitmap-like; we assert via detect result on a stub
    const out = await d.detect({ width: 1, height: 1, data: new Uint8ClampedArray(4), colorSpace: "srgb" } as ImageData);
    expect(out).toBe("FROM-NATIVE");
  });

  it("falls back to wasm when BarcodeDetector is absent", async () => {
    const d = await createQrDetector(globalThis);
    expect(d.engine).toBe("wasm");
  });

  it("falls back to wasm when qr_code is unsupported", async () => {
    class FakeBD { static getSupportedFormats = async () => ["ean_13"]; }
    g.BarcodeDetector = FakeBD;
    const d = await createQrDetector(globalThis);
    expect(d.engine).toBe("wasm");
  });
});
