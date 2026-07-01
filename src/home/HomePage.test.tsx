import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomePage } from "./HomePage";
it("renders the RoomCast hero and both CTAs", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { name: /roomcast/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /broadcast/i })).toHaveAttribute("href", "#present");
  expect(screen.getByRole("link", { name: /receive/i })).toHaveAttribute("href", "#reader");
});
