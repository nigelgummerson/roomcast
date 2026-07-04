import { readBarcodes, setZXingModuleOverrides } from "zxing-wasm/reader";
// zxing-wasm defaults to fetching its .wasm binary from the jsDelivr CDN
// (https://github.com/Sec-ant/zxing-wasm#serving-via-web-or-cdn). Point it at the
// locally bundled copy instead so it's part of the app shell that vite-plugin-pwa
// precaches for offline use, rather than requiring network access on first scan.
import zxingReaderWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { FrameDecoder } from "../core/frames";
import { unpackEnvelope, type Envelope } from "../core/envelope";
import { createQrDetector } from "./detectQr";

setZXingModuleOverrides({
  locateFile: (path: string, prefix: string) =>
    path.endsWith(".wasm") ? zxingReaderWasmUrl : prefix + path,
});

export interface ScanProgress {
  progress: number;
  done: boolean;
}

export class ScanSession {
  private decoder = new FrameDecoder();

  feed(text: string): ScanProgress {
    try {
      this.decoder.push(text);
    } catch {
      // Not one of our frames (a stray/foreign QR code) — ignore it and
      // report unchanged progress rather than letting the scan loop die.
      return { progress: this.decoder.progress, done: this.decoder.complete };
    }
    return { progress: this.decoder.progress, done: this.decoder.complete };
  }

  envelope(): Envelope {
    return unpackEnvelope(this.decoder.result());
  }
}

export async function decodeImageData(img: ImageData): Promise<string | null> {
  const results = await readBarcodes(img, {
    tryHarder: true,
    formats: ["QRCode"],
    maxNumberOfSymbols: 1,
  });
  return results.length ? results[0].text : null;
}

// Torch (camera flashlight) control isn't part of the standard DOM lib's
// MediaTrackCapabilities/MediaTrackConstraintSet types, so it's declared here
// as a narrow extension used only for the casts below (no `any`).
interface TorchCapabilities {
  torch?: boolean;
}
interface TorchConstraintSet {
  torch?: boolean;
}

export interface StartCameraOptions {
  onTorchAvailable?: (toggle: (on: boolean) => Promise<void>) => void;
  // Fires on a denied/missing camera or detector-setup failure, so callers
  // can show a "permission denied" state instead of a silently frozen
  // viewfinder.
  onError?: (err: unknown) => void;
}

export function startCamera(
  video: HTMLVideoElement,
  onText: (t: string) => void,
  opts?: StartCameraOptions,
): () => void {
  let stopped = false;
  let stream: MediaStream | null = null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  // Detector is created once (below, before the loop starts) rather than
  // per-frame — creating it repeatedly would be wasteful and, for the native
  // BarcodeDetector path, pointless re-construction of the same detector.
  let detect: (source: ImageData) => Promise<string | null> = decodeImageData;

  const tick = async () => {
    if (stopped) return;
    try {
      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const text = await detect(img).catch(() => null);
        if (text) onText(text);
      }
    } catch {
      // A decode/callback failure must not permanently stop the scan loop.
    } finally {
      requestAnimationFrame(tick);
    }
  };

  // Run inside an async fn so that a *synchronous* failure — e.g. some iOS
  // WebViews leave `navigator.mediaDevices` undefined, making
  // `mediaDevices.getUserMedia(...)` throw a TypeError before any promise even
  // exists — is turned into a rejection and reaches onError, rather than
  // escaping as an uncaught throw that leaves a silent black viewfinder.
  const run = async () => {
    const md = navigator.mediaDevices;
    if (!md || typeof md.getUserMedia !== "function") {
      throw new Error(
        `Camera API unavailable (mediaDevices=${md ? "present" : "missing"}, ` +
          `secureContext=${window.isSecureContext}). On iOS, only Safari can use ` +
          `the camera in some setups — try opening this page in Safari.`,
      );
    }

    const [detector, s] = await Promise.all([
      createQrDetector(),
      md.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }),
    ]);
    detect = detector.detect;

    // If stop() already ran while the permission prompt was pending,
    // don't turn the camera on — shut the returned stream down instead.
    if (stopped) {
      s.getTracks().forEach((t) => t.stop());
      return;
    }
    stream = s;
    video.srcObject = s;

    const track = s.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() as
      | (MediaTrackCapabilities & TorchCapabilities)
      | undefined;
    if (capabilities?.torch) {
      opts?.onTorchAvailable?.((on) =>
        track.applyConstraints({
          advanced: [
            { torch: on } as unknown as MediaTrackConstraintSet & TorchConstraintSet,
          ],
        }),
      );
    }

    await video.play();
    if (!stopped) requestAnimationFrame(tick);
  };

  // A denied permission, missing camera, unavailable API, or detector-setup
  // failure should not surface as an unhandled rejection — report it via
  // onError (if the caller wants it) instead.
  run().catch((err: unknown) => {
    if (!stopped) opts?.onError?.(err);
  });

  return () => {
    stopped = true;
    stream?.getTracks().forEach((t) => t.stop());
  };
}
