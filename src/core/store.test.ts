import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { saveDoc, getDoc, listDocs, purgeExpired } from "./store";
import type { Envelope } from "./envelope";

const env: Envelope = {
  v: 1, profile: "confidential", ttlHours: 36, title: "Ward 5", md: "# Ward 5\n",
};
const HOUR = 3600e3;

beforeEach(async () => {
  // Reset IndexedDB between tests for real per-test isolation. fake-indexeddb/auto
  // (loaded in test-setup.ts) installs `indexedDB` on globalThis; reassigning it to a
  // fresh IDBFactory gives each test an empty database. Cast is narrow (globalThis as
  // { indexedDB: IDBFactory }) to avoid `any` while still allowing the reassignment.
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

describe("store", () => {
  it("saves and retrieves before expiry", async () => {
    const t0 = 1_000_000;
    const saved = await saveDoc(env, t0);
    expect(saved.expiresAt).toBe(t0 + 36 * HOUR);
    const got = await getDoc(saved.id, t0 + 10 * HOUR);
    expect(got?.envelope.title).toBe("Ward 5");
  });

  it("returns null and purges after expiry", async () => {
    const t0 = 1_000_000;
    const saved = await saveDoc(env, t0);
    const got = await getDoc(saved.id, t0 + 37 * HOUR);
    expect(got).toBeNull();
    expect(await listDocs(t0 + 37 * HOUR)).toHaveLength(0);
  });

  it("lists live docs newest-first and purges expired", async () => {
    const a = await saveDoc({ ...env, title: "A" }, 1000);
    const b = await saveDoc({ ...env, title: "B" }, 2000);
    await saveDoc({ ...env, ttlHours: 1, title: "C" }, 3000);
    const live = await listDocs(3000 + 2 * HOUR); // C expired
    expect(live.map((d) => d.envelope.title)).toEqual(["B", "A"]);
    expect([a.id, b.id]).toHaveLength(2);
  });

  it("purgeExpired returns the count removed", async () => {
    await saveDoc({ ...env, ttlHours: 1, title: "X" }, 1000);
    expect(await purgeExpired(1000 + 2 * HOUR)).toBe(1);
  });
});
