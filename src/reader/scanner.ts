import { readBarcodes } from "zxing-wasm/reader";
import { FrameDecoder } from "../core/frames";
import { unpackEnvelope, type Envelope } from "../core/envelope";

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

export function startCamera(
  video: HTMLVideoElement,
  onText: (t: string) => void,
): () => void {
  let stopped = false;
  let stream: MediaStream | null = null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const tick = async () => {
    if (stopped) return;
    try {
      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const text = await decodeImageData(img).catch(() => null);
        if (text) onText(text);
      }
    } catch {
      // A decode/callback failure must not permanently stop the scan loop.
    } finally {
      requestAnimationFrame(tick);
    }
  };

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then((s) => {
      // If stop() already ran while the permission prompt was pending,
      // don't turn the camera on — shut the returned stream down instead.
      if (stopped) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = s;
      video.srcObject = s;
      return video.play();
    })
    .then(() => {
      if (!stopped) requestAnimationFrame(tick);
    })
    // A denied permission or missing camera should not surface as an
    // unhandled promise rejection.
    .catch(() => undefined);

  return () => {
    stopped = true;
    stream?.getTracks().forEach((t) => t.stop());
  };
}
