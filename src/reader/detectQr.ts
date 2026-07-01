import { decodeImageData } from "./scanner";

export type QrDetector = (source: ImageData) => Promise<string | null>;

// Minimal shape of the parts of the BarcodeDetector API we use (no DOM lib guarantee).
interface BarcodeDetectorLike {
  detect(source: ImageData): Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

export async function createQrDetector(
  win: typeof globalThis = globalThis,
): Promise<{ engine: "native" | "wasm"; detect: QrDetector }> {
  const Ctor = (win as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (Ctor) {
    try {
      const formats = await Ctor.getSupportedFormats();
      if (formats.includes("qr_code")) {
        const bd = new Ctor({ formats: ["qr_code"] });
        return {
          engine: "native",
          detect: async (source) => {
            const res = await bd.detect(source).catch(() => []);
            return res.length ? res[0].rawValue : null;
          },
        };
      }
    } catch {
      /* fall through to wasm */
    }
  }
  return { engine: "wasm", detect: (source) => decodeImageData(source) };
}
