import { describe, it, expect } from "vitest";
import { ScanSession } from "./scanner";
import { encodeToFrames } from "../core/frames";
import { packEnvelope, type Envelope } from "../core/envelope";

const env: Envelope = {
  v: 1,
  profile: "confidential",
  ttlHours: 36,
  title: "Ward 5",
  md: "# Ward 5\n",
};

describe("ScanSession", () => {
  it("accumulates frames and yields the envelope when complete", () => {
    const frames = encodeToFrames(packEnvelope(env), { frameBytes: 100, loops: 2 });
    const s = new ScanSession();
    let last = { progress: 0, done: false };
    for (const f of frames) {
      last = s.feed(f);
      if (last.done) break;
    }
    expect(last.done).toBe(true);
    expect(s.envelope()).toEqual(env);
  });

  it("throws if envelope() is called before completion", () => {
    const s = new ScanSession();
    expect(() => s.envelope()).toThrow();
  });
});
