import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App routing", () => {
  beforeEach(() => { window.location.hash = ""; });

  it("shows presenter by default", () => {
    render(<App />);
    expect(screen.getByText(/presenter/i)).toBeInTheDocument();
  });

  it("shows reader on #reader", () => {
    window.location.hash = "#reader";
    render(<App />);
    expect(screen.getByRole("button", { name: /scan a broadcast/i })).toBeInTheDocument();
  });
});
