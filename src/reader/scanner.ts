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
    this.decoder.push(text);
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
    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const text = await decodeImageData(img).catch(() => null);
      if (text) onText(text);
    }
    requestAnimationFrame(tick);
  };

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then((s) => {
      stream = s;
      video.srcObject = s;
      return video.play();
    })
    .then(() => requestAnimationFrame(tick));

  return () => {
    stopped = true;
    stream?.getTracks().forEach((t) => t.stop());
  };
}
