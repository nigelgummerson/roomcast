import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children and fires onClick", async () => {
    let clicked = false;
    render(<Button onClick={() => (clicked = true)}>Broadcast</Button>);
    const btn = screen.getByRole("button", { name: "Broadcast" });
    btn.click();
    expect(clicked).toBe(true);
  });
  it("applies a variant-specific class and passes disabled through", () => {
    render(<Button variant="danger" disabled>Stop</Button>);
    const btn = screen.getByRole("button", { name: "Stop" });
    expect(btn).toBeDisabled();
    expect(btn.className).toMatch(/red/);
  });
});
