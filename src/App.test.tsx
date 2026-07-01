import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App routing", () => {
  beforeEach(() => { window.location.hash = ""; });

  it("shows the Home page by default", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /roomcast/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /broadcast/i })).toHaveAttribute("href", "#present");
  });

  it("shows presenter on #present", () => {
    window.location.hash = "#present";
    render(<App />);
    expect(screen.getByText(/presenter/i)).toBeInTheDocument();
  });

  it("shows reader on #reader", () => {
    window.location.hash = "#reader";
    render(<App />);
    // The reader now lands on a loading spinner (then auto-camera or "Your
    // copies") rather than synchronously showing a "Scan a broadcast" button
    // — assert the persistent reader shell (the RoomCast brand-home link)
    // instead of that transient state.
    expect(screen.getByRole("link", { name: /roomcast/i })).toHaveAttribute("href", "#home");
  });
});
