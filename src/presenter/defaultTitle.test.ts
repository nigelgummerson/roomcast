import { describe, it, expect } from "vitest";
import { defaultHandoverTitle } from "./defaultTitle";

describe("defaultHandoverTitle", () => {
  it("formats 'Handover YYYY-MM-DD' from the local date, zero-padded", () => {
    // new Date(year, monthIndex, day) is local time; month 6 => July
    expect(defaultHandoverTitle(new Date(2026, 6, 1))).toBe("Handover 2026-07-01");
    expect(defaultHandoverTitle(new Date(2026, 0, 9))).toBe("Handover 2026-01-09");
    expect(defaultHandoverTitle(new Date(2025, 11, 25))).toBe("Handover 2025-12-25");
  });
});
