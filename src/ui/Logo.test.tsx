import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

it("renders an accessible RoomCast mark", () => {
  render(<Logo />);
  expect(screen.getByRole("img", { name: /roomcast/i })).toBeInTheDocument();
});
