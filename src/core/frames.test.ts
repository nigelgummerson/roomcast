import { describe, it, expect } from "vitest";
import { encodeToFrames, FrameDecoder } from "./frames";

function makeBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = (i * 7) % 256;
  return a;
}

describe("frames", () => {
  it("round-trips when all frames received in order", () => {
    const data = makeBytes(2000);
    const frames = encodeToFrames(data, { frameBytes: 200, loops: 2 });
    const dec = new FrameDecoder();
    for (const f of frames) dec.push(f);
    expect(dec.complete).toBe(true);
    expect(dec.result()).toEqual(data);
  });

  it("recovers from dropped and reordered frames (fountain redundancy)", () => {
    const data = makeBytes(2000);
    const frames = encodeToFrames(data, { frameBytes: 200, loops: 3 });
    // drop every 4th frame, then shuffle deterministically
    const kept = frames.filter((_, i) => i % 4 !== 0);
    const shuffled = kept.map((f, i) => ({ f, k: (i * 131) % kept.length }))
      .sort((a, b) => a.k - b.k).map((x) => x.f);
    const dec = new FrameDecoder();
    for (const f of shuffled) {
      dec.push(f);
      if (dec.complete) break;
    }
    expect(dec.complete).toBe(true);
    expect(dec.result()).toEqual(data);
  });

  it("reports progress before completion and throws if result() called early", () => {
    const data = makeBytes(2000);
    const frames = encodeToFrames(data, { frameBytes: 200, loops: 1 });
    const dec = new FrameDecoder();
    dec.push(frames[0]);
    expect(dec.complete).toBe(false);
    expect(dec.progress).toBeGreaterThan(0);
    expect(dec.progress).toBeLessThan(1);
    expect(() => dec.result()).toThrow();
  });
});
