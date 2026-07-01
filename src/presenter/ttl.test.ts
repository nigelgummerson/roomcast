import { describe, it, expect } from "vitest";
import { resolveTtlHours, DEFAULT_TTL } from "./ttl";

describe("resolveTtlHours", () => {
  it("standard → null (never expires)", () => {
    expect(resolveTtlHours("standard", 36, "")).toBeNull();
  });
  it("confidential + preset → that number", () => {
    expect(resolveTtlHours("confidential", 12, "")).toBe(12);
  });
  it("confidential + custom → parsed positive hours", () => {
    expect(resolveTtlHours("confidential", "custom", "72")).toBe(72);
  });
  it("confidential + blank/invalid custom → default", () => {
    expect(resolveTtlHours("confidential", "custom", "")).toBe(DEFAULT_TTL);
    expect(resolveTtlHours("confidential", "custom", "-5")).toBe(DEFAULT_TTL);
    expect(resolveTtlHours("confidential", "custom", "abc")).toBe(DEFAULT_TTL);
  });
});
