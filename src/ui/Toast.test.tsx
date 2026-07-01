import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";

function Trigger({ severity }: { severity?: "info" | "error" }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast("hello", severity ? { severity } : undefined)}>go</button>;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("shows an info toast and auto-dismisses after 3s", () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    act(() => screen.getByText("go").click());
    expect(screen.getByText("hello")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
  });
  it("keeps an error toast until dismissed", () => {
    render(<ToastProvider><Trigger severity="error" /></ToastProvider>);
    act(() => screen.getByText("go").click());
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
