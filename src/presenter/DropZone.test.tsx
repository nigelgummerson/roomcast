import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DropZone } from "./DropZone";

describe("DropZone", () => {
  it("calls onFile when a file is dropped", () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    const zone = screen.getByText(/drop a \.docx/i);
    const file = new File(["x"], "handover.docx");
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });
});
