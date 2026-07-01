import { describe, it, expect } from "vitest";
import { mobilise, slugify } from "./mobiliser";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Bed 3 — Mr AB")).toBe("bed-3-mr-ab");
  });
});

describe("mobilise", () => {
  it("splits into sections by heading and builds an index", () => {
    const md = "# Ward 5\n\nintro\n\n## Bay A\n\nnotes\n";
    const vm = mobilise(md);
    expect(vm.sections.map((s) => s.title)).toEqual(["Ward 5", "Bay A"]);
    expect(vm.index).toEqual([
      { id: "ward-5", title: "Ward 5" },
      { id: "bay-a", title: "Bay A" },
    ]);
  });

  it("turns a header-row table into a cards block", () => {
    const md =
      "## List\n\n| Bed | Patient | Job |\n| --- | --- | --- |\n" +
      "| 1 | AB | Bloods |\n| 2 | CD | Scan |\n";
    const vm = mobilise(md);
    const cards = vm.sections[0].blocks.find((b) => b.kind === "cards");
    expect(cards).toEqual({
      kind: "cards",
      headers: ["Bed", "Patient", "Job"],
      rows: [
        ["1", "AB", "Bloods"],
        ["2", "CD", "Scan"],
      ],
    });
  });

  it("keeps paragraphs and lists as text blocks", () => {
    const md = "## Notes\n\nHello world\n\n- one\n- two\n";
    const vm = mobilise(md);
    const kinds = vm.sections[0].blocks.map((b) => b.kind);
    expect(kinds).toContain("text");
  });

  it("puts pre-heading content in an untitled leading section", () => {
    const vm = mobilise("plain text with no heading\n");
    expect(vm.sections[0].title).toBeNull();
    expect(vm.sections[0].blocks[0]).toEqual({ kind: "text", md: expect.any(String) });
  });

  it("does not let the leading section's placeholder id steal a real 'intro' heading's slug", () => {
    const vm = mobilise("# Intro\n\nhello\n");
    expect(vm.sections).toEqual([
      { id: "intro", title: "Intro", level: 1, blocks: [{ kind: "text", md: expect.any(String) }] },
    ]);
    expect(vm.index).toEqual([{ id: "intro", title: "Intro" }]);
  });

  it("dedupes duplicate headings by appending -2, -3, ...", () => {
    const md = "## Notes\n\nfirst\n\n## Notes\n\nsecond\n";
    const vm = mobilise(md);
    expect(vm.index).toEqual([
      { id: "notes", title: "Notes" },
      { id: "notes-2", title: "Notes" },
    ]);
  });
});
