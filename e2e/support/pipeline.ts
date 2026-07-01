// Test-only helper module, loaded exclusively by e2e/pipeline.spec.ts via a
// direct dynamic import() of this file's dev-server URL. It lives outside
// src/ and is never imported by main.tsx/App.tsx, so it is never part of the
// production module graph and never ships in a built bundle — it only exists
// because `vite dev` serves any file under the project root on request.
//
// It re-exercises the real pipeline modules (not test doubles) so that
// Buffer/qrloop/fflate/zxing-wasm bundling problems that jsdom hides show up
// here, in an actual Chromium.
import { packEnvelope, unpackEnvelope, type Envelope } from "../../src/core/envelope";
import { encodeToFrames } from "../../src/core/frames";
import { ScanSession } from "../../src/reader/scanner";
import QRCode from "qrcode";
import { readBarcodes } from "zxing-wasm/reader";

export function roundTrip(): boolean {
  const env: Envelope = { v: 1, profile: "confidential", ttlHours: 36, title: "E2E", md: "# Hi\n" };
  const frames = encodeToFrames(packEnvelope(env), { frameBytes: 100, loops: 2 });
  const session = new ScanSession();
  for (const frame of frames) {
    if (session.feed(frame).done) break;
  }
  return JSON.stringify(session.envelope()) === JSON.stringify(unpackEnvelope(packEnvelope(env)));
}

export async function decodeRenderedQr(text: string): Promise<string | null> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, text, { width: 300, margin: 2 });
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const results = await readBarcodes(img, { formats: ["QRCode"], tryHarder: true });
  return results[0]?.text ?? null;
}
