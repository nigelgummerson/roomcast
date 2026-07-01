import { describe, it, expect } from "vitest";
import { htmlToGfm } from "./docParser";

describe("htmlToGfm", () => {
  it("converts a heading and paragraph", () => {
    const md = htmlToGfm("<h1>Ward 5</h1><p>Morning list</p>");
    expect(md).toContain("# Ward 5");
    expect(md).toContain("Morning list");
  });

  it("preserves a table with a header row as a GFM table", () => {
    const html =
      "<table><thead><tr><th>Bed</th><th>Patient</th></tr></thead>" +
      "<tbody><tr><td>1</td><td>AB</td></tr></tbody></table>";
    const md = htmlToGfm(html);
    expect(md).toContain("| Bed | Patient |");
    expect(md).toMatch(/\| --- \| --- \|/);
    expect(md).toContain("| 1 | AB |");
  });
});
