import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { ReaderApp } from "./ReaderApp";
import { saveDoc } from "../core/store";
import type { Envelope } from "../core/envelope";

// Mock the camera so no real getUserMedia is needed — the landing-state tests
// only care whether startCamera was invoked, not what it does. It always
// reports torch availability (with a no-op toggle) so the mock behaves
// consistently across tests; only the torch test below asserts on it.
vi.mock("./scanner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./scanner")>();
  const startCamera: typeof actual.startCamera = (_video, _onText, opts) => {
    opts?.onTorchAvailable?.(async () => {});
    return () => {};
  };
  return { ...actual, startCamera: vi.fn(startCamera) };
});

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
  vi.clearAllMocks();
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

    // Seeded doc appears under "Your copies" without any camera interaction.
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

describe("ReaderApp landing state", () => {
  it("shows 'Your copies' first when a live copy exists (no auto camera)", async () => {
    await saveDoc(env, Date.now());
    render(<ReaderApp />);
    await waitFor(() => expect(screen.getByText(/your copies/i)).toBeInTheDocument());
    expect(screen.getByText("Ward 5 handover")).toBeInTheDocument();
    const { startCamera } = await import("./scanner");
    expect(startCamera).not.toHaveBeenCalled();
  });

  it("auto-starts the camera when there are no copies", async () => {
    render(<ReaderApp />);
    const { startCamera } = await import("./scanner");
    await waitFor(() => expect(startCamera).toHaveBeenCalled());
  });

  it("synchronously shows loading indicator (not scan button) on empty store", async () => {
    // Render with empty store (no saved docs).
    render(<ReaderApp />);

    // On first synchronous render, "Scan a broadcast" button must NOT be present yet
    // — it should only appear after listDocs resolves. If the initial view regresses
    // to "copies", this assertion fails and locks that regression.
    expect(
      screen.queryByRole("button", { name: /scan a broadcast/i }),
    ).not.toBeInTheDocument();

    // Loading status must be present (role="status" + sr-only label).
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Settle pending async state updates to avoid act() warnings.
    await waitFor(() => {});
  });
});

describe("ReaderApp copy management", () => {
  it("deletes a saved copy from Your copies", async () => {
    await saveDoc(env, Date.now());
    render(<ReaderApp />);
    await screen.findByText("Ward 5 handover");
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(screen.queryByText("Ward 5 handover")).not.toBeInTheDocument());
  });

  it("renames a saved copy", async () => {
    await saveDoc(env, Date.now());
    render(<ReaderApp />);
    await screen.findByText("Ward 5 handover");
    await userEvent.click(screen.getByRole("button", { name: /rename/i }));
    const input = screen.getByRole("textbox", { name: /title/i });
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(screen.getByText("Renamed")).toBeInTheDocument());
  });
});

describe("ReaderApp torch control", () => {
  it("renders a torch button when startCamera reports torch availability, and wires the click", async () => {
    const toggle = vi.fn(async () => {});
    const { startCamera } = await import("./scanner");
    vi.mocked(startCamera).mockImplementationOnce((_video, _onText, opts) => {
      opts?.onTorchAvailable?.(toggle);
      return () => {};
    });

    render(<ReaderApp />);

    const torchButton = await waitFor(() =>
      screen.getByRole("button", { name: /torch/i }),
    );
    expect(torchButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(torchButton);

    expect(toggle).toHaveBeenCalledWith(true);
    expect(torchButton).toHaveAttribute("aria-pressed", "true");
  });
});
