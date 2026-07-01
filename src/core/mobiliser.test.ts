import { describe, it, expect } from "vitest";
import { mobilise, slugify, classifyTable } from "./mobiliser";

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

  // Regression: found via the docx edge-case corpus (Task 15) — marked's own
  // table tokenizer silently pads every parsed row to header.length before
  // mobilise() ever sees it, which hid the ragged-row artefact a merged
  // (colspan) cell produces in the source GFM table. Without recovering the
  // true per-row cell count from the raw table text, a merged-cell docx
  // would always be misclassified as "cards" and misattribute values to the
  // wrong labelled field instead of falling back to a raw table.
  it("classifies a table as ragged even though marked pads the parsed row to the header width", () => {
    const md =
      "## List\n\n| Bed | Patient | Job |\n| --- | --- | --- |\n" +
      "| 1 | AB - bloods due, review bloods |\n| 2 | CD | Scan |\n";
    const vm = mobilise(md);
    const block = vm.sections[0].blocks[0];
    expect(block).toEqual({
      kind: "table",
      headers: ["Bed", "Patient", "Job"],
      rows: [["1", "AB - bloods due, review bloods"], ["2", "CD", "Scan"]],
      reason: "ragged rows",
    });
  });
});

describe("classifyTable", () => {
  it("returns cards for a clean header + uniform rows", () => {
    expect(classifyTable(["Bed", "Patient"], [["1", "AB"], ["2", "CD"]])).toBe("cards");
  });
  it("falls back to table for ragged rows (merged-cell artefact)", () => {
    expect(classifyTable(["Bed", "Patient", "Job"], [["1", "AB"], ["2"]])).toBe("table");
  });
  it("falls back to table when a header cell is empty (no plausible header)", () => {
    expect(classifyTable(["Bed", ""], [["1", "AB"]])).toBe("table");
  });
});
