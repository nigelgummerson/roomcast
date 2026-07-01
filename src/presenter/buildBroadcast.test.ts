import { describe, it, expect } from "vitest";
import { buildBroadcast } from "./buildBroadcast";
import { ScanSession } from "../reader/scanner";
import { packEnvelope } from "../core/envelope";

// Minimal valid docx is awkward to embed; test the encode path via a stubbed parser is
// covered elsewhere. Here we verify the frames a presenter emits are decodable by a reader.
import * as parser from "../core/docParser";
import { vi } from "vitest";

describe("buildBroadcast", () => {
  it("produces frames a ScanSession can reassemble into the same envelope", async () => {
    vi.spyOn(parser, "docxToMarkdown").mockResolvedValue("# Ward 5\n\nhello\n");
    const { md, frames } = await buildBroadcast(new ArrayBuffer(0), {
      title: "Ward 5",
      profile: "confidential",
      ttlHours: 36,
    });
    expect(md).toContain("# Ward 5");
    const s = new ScanSession();
    for (const f of frames) if (s.feed(f).done) break;
    expect(s.envelope()).toEqual({
      v: 1, profile: "confidential", ttlHours: 36, title: "Ward 5", md,
    });
  });

  it("returns sizeBytes matching the packed envelope's length", async () => {
    vi.spyOn(parser, "docxToMarkdown").mockResolvedValue("# Ward 5\n\nhello\n");
    const opts = { title: "Ward 5", profile: "confidential" as const, ttlHours: 36 };
    const { md, sizeBytes } = await buildBroadcast(new ArrayBuffer(0), opts);
    const expected = packEnvelope({ v: 1, md, ...opts });
    expect(sizeBytes).toBe(expected.length);
  });

  it("carries ttlHours null (standard) into the reconstructed envelope", async () => {
    vi.spyOn(parser, "docxToMarkdown").mockResolvedValue("# Rota\n\nx\n");
    const { md, frames } = await buildBroadcast(new ArrayBuffer(0), {
      title: "Rota", profile: "standard", ttlHours: null,
    });
    const s = new ScanSession();
    for (const f of frames) if (s.feed(f).done) break;
    expect(s.envelope()).toEqual({ v: 1, profile: "standard", ttlHours: null, title: "Rota", md });
  });
});
