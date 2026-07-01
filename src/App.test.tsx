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
    // The reader now lands on a loading spinner (then auto-camera or "Your
    // copies") rather than synchronously showing a "Scan a broadcast" button
    // — assert the persistent reader shell instead of that transient state.
    expect(screen.getByText(/presenter mode/i)).toBeInTheDocument();
  });
});
