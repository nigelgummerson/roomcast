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
  it("soft uses role status, hard uses role alert", () => {
    const { rerender } = render(<Banner severity="soft">warning</Banner>);
    const softBanner = screen.getByText("warning");
    expect(softBanner).toHaveAttribute("role", "status");
    rerender(<Banner severity="hard">error</Banner>);
    const hardBanner = screen.getByText("error");
    expect(hardBanner).toHaveAttribute("role", "alert");
  });
});
