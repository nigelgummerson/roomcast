import { describe, it, expect } from "vitest";
import { sanitiseCell, stripImages } from "./sanitise";

describe("sanitiseCell", () => {
  it("collapses newlines to a space", () => {
    expect(sanitiseCell("line1\nline2")).toBe("line1 line2");
  });
  it("escapes a literal pipe so it can't break a GFM table", () => {
    expect(sanitiseCell("a|b")).toBe("a\\|b");
  });
});

describe("stripImages", () => {
  it("replaces img tags with a placeholder", () => {
    expect(stripImages('<p>x<img src="data:image/png;base64,AAAA"/>y</p>'))
      .toBe("<p>x[image omitted]y</p>");
  });
});
