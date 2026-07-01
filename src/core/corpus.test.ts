import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { docxToMarkdown } from "./docParser";
import { mobilise } from "./mobiliser";
import { packEnvelope, unpackEnvelope } from "./envelope";
import { encodeToFrames } from "./frames";

const dir = "samples/edge";
const files = readdirSync(dir).filter((f) => f.endsWith(".docx"));

describe("docx corpus (no input may crash the pipeline)", () => {
  it("has fixtures", () => expect(files.length).toBeGreaterThan(0));

  for (const f of files) {
    it(`parses + mobilises + encodes: ${f}`, async () => {
      const buf = readFileSync(join(dir, f));
      const md = await docxToMarkdown(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      expect(typeof md).toBe("string");

      const vm = mobilise(md);
      expect(Array.isArray(vm.sections)).toBe(true);

      // no image data-URIs survive into the payload
      expect(md).not.toMatch(/data:image\//);

      // envelope round-trips and frames are producible
      const env = { v: 1 as const, profile: "confidential" as const, ttlHours: 36, title: f, md };
      const bytes = packEnvelope(env);
      expect(unpackEnvelope(bytes)).toEqual(env);
      const frames = encodeToFrames(bytes, { frameBytes: 200, loops: 2 });
      expect(frames.length).toBeGreaterThan(0);
    });
  }
});

describe("non-.docx input is rejected, not an unhandled throw", () => {
  it("rejects a legacy binary .doc buffer", async () => {
    const buf = readFileSync(join(dir, "legacy-format.doc"));
    await expect(
      docxToMarkdown(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
    ).rejects.toThrow();
  });

  it("rejects a plain-text (non-Word) buffer", async () => {
    const buf = readFileSync(join(dir, "not-a-word-file.txt"));
    await expect(
      docxToMarkdown(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
    ).rejects.toThrow();
  });
});
