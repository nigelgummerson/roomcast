import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFrameLoop } from "./useFrameLoop";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useFrameLoop", () => {
  it("cycles frames at the given fps and wraps around", () => {
    // Frames hoisted to a stable reference: renderHook re-invokes its callback
    // on every state update, so an inline array literal would be a fresh
    // reference each render, tripping the effect's [frames, fps] dependency
    // and resetting the frame index every tick.
    const frames = ["a", "b", "c"];
    const { result } = renderHook(() => useFrameLoop(frames, 10));
    expect(result.current).toBe("a");
    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe("b");
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current).toBe("a"); // wrapped: b->c->a
  });

  it("returns empty string for no frames", () => {
    const { result } = renderHook(() => useFrameLoop([], 10));
    expect(result.current).toBe("");
  });
});
