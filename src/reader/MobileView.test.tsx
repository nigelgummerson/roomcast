import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileView } from "./MobileView";

const md =
  "# Ward 5\n\n## List\n\n| Bed | Patient | Job |\n| --- | --- | --- |\n" +
  "| 1 | Alice | Bloods |\n| 2 | Bob | Scan |\n";

describe("MobileView", () => {
  it("renders each table row as a card with labelled fields", () => {
    render(<MobileView md={md} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByText("Bed").length).toBeGreaterThan(0); // label repeated per card
  });

  it("filters cards by search text", async () => {
    render(<MobileView md={md} />);
    await userEvent.type(screen.getByRole("searchbox"), "Alice");
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("toggles to original layout showing a real table", async () => {
    render(<MobileView md={md} />);
    await userEvent.click(screen.getByRole("button", { name: /original/i }));
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
