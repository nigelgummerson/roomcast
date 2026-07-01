import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Banner } from "./Banner";

describe("Banner", () => {
  it("soft uses amber, hard uses red", () => {
    const { rerender } = render(<Banner severity="soft">careful</Banner>);
    expect(screen.getByText("careful").className).toMatch(/amber/);
    rerender(<Banner severity="hard">stop</Banner>);
    expect(screen.getByText("stop").className).toMatch(/red/);
  });
});
