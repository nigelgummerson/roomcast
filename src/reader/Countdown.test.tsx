import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Countdown } from "./Countdown";

const HOUR = 3600e3;

describe("Countdown", () => {
  it("shows hours and minutes remaining", () => {
    render(<Countdown expiresAt={1000 + 31 * HOUR + 12 * 60e3} now={1000} />);
    expect(screen.getByText(/expires in 31h 12m/i)).toBeInTheDocument();
  });

  it("shows 'expired' when past the deadline", () => {
    render(<Countdown expiresAt={1000} now={2000} />);
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });
});
