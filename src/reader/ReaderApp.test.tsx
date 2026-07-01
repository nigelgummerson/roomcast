import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { ReaderApp } from "./ReaderApp";
import { saveDoc } from "../core/store";
import type { Envelope } from "../core/envelope";

const HOUR = 3600e3;

const env: Envelope = {
  v: 1,
  profile: "confidential",
  ttlHours: 1,
  title: "Ward 5 handover",
  md: "# Ward 5\n\n| Name | Bed |\n| --- | --- |\n| Jane Doe | 3 |\n",
};

beforeEach(() => {
  // Fresh IndexedDB per test — see src/core/store.test.ts for the rationale.
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ReaderApp expiry enforcement", () => {
  it("opens a saved copy from the list, then auto-closes it once it expires while open", async () => {
    const t0 = 1_000_000;
    // shouldAdvanceTime lets real timers (used internally by fake-indexeddb's
    // task scheduling) keep progressing in real time, while Date/setInterval
    // stay under our control for simulating expiry.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(t0);

    await saveDoc(env, t0); // expires at t0 + 1h

    render(<ReaderApp />);

    // Seeded doc appears under "Saved copies" without any camera interaction.
    const savedButton = await vi.waitFor(() =>
      screen.getByRole("button", { name: /ward 5 handover/i }),
    );
    fireEvent.click(savedButton);

    // Opening re-checks expiry (getDoc), so flush that async chain.
    await vi.waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());

    // Advance the clock well past expiry and let the 30s tick fire.
    vi.setSystemTime(t0 + HOUR + 60_000);
    await vi.advanceTimersByTimeAsync(30_000);

    // The open document must auto-close — content gone, not just the banner
    // flipping to "expired" while the data stays on screen.
    await vi.waitFor(() => expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /scan a broadcast/i })).toBeInTheDocument();
  });
});
