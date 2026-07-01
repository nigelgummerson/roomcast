import { describe, it, expect } from "vitest";
import { buildBroadcast } from "./buildBroadcast";
import { ScanSession } from "../reader/scanner";

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
});
