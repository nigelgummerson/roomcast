import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidentialBanner } from "./ConfidentialBanner";

const HOUR = 3600e3;

describe("ConfidentialBanner", () => {
  it("renders with role=status and confidentiality text when profile='confidential'", () => {
    render(
      <ConfidentialBanner
        profile="confidential"
        expiresAt={1000 + 36 * HOUR}
        now={1000}
      />
    );
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("CONFIDENTIAL");
    expect(banner).toHaveTextContent("do not screenshot or forward");
  });

  it("does not render when profile='standard'", () => {
    render(
      <ConfidentialBanner
        profile="standard"
        expiresAt={1000 + 36 * HOUR}
        now={1000}
      />
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
