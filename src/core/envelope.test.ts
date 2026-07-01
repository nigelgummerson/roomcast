import { describe, it, expect } from "vitest";
import { gzipSync } from "fflate";
import { packEnvelope, unpackEnvelope, EnvelopeError, type Envelope } from "./envelope";

const sample: Envelope = {
  v: 1,
  profile: "confidential",
  ttlHours: 36,
  title: "Ward 5 Handover",
  md: "# Ward 5\n\n| Bed | Patient | Job |\n| --- | --- | --- |\n| 1 | AB | Bloods |\n",
};

describe("envelope", () => {
  it("round-trips through pack/unpack", () => {
    const bytes = packEnvelope(sample);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(unpackEnvelope(bytes)).toEqual(sample);
  });

  it("compresses (packed smaller than raw JSON for repetitive content)", () => {
    const big: Envelope = { ...sample, md: sample.md.repeat(50) };
    const raw = new TextEncoder().encode(JSON.stringify(big)).length;
    expect(packEnvelope(big).length).toBeLessThan(raw);
  });

  it("throws EnvelopeError on corrupt bytes", () => {
    expect(() => unpackEnvelope(new Uint8Array([1, 2, 3]))).toThrow(EnvelopeError);
  });

  it("throws EnvelopeError on unknown version", () => {
    const bytes = packEnvelope({ ...sample, v: 1 });
    // hand-craft a wrong-version payload
    const wrong = new TextEncoder().encode(JSON.stringify({ ...sample, v: 99 }));
    expect(() => unpackEnvelope(gzipSync(wrong))).toThrow(EnvelopeError);
  });
});
