import type { Envelope } from "./envelope";
import { slugify } from "./mobiliser";

export interface StoredDoc {
  id: string;
  envelope: Envelope;
  scannedAt: number;
  expiresAt: number | null;
}

const isLive = (d: StoredDoc, now: number): boolean => d.expiresAt == null || d.expiresAt > now;

const DB_NAME = "roomcast";
const STORE = "docs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        t.oncomplete = () => db.close();
        t.onerror = () => db.close();
        t.onabort = () => db.close();
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function allDocs(): Promise<StoredDoc[]> {
  return tx<StoredDoc[]>("readonly", (s) => s.getAll() as IDBRequest<StoredDoc[]>);
}

function txAll(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => void): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
        t.onabort = () => {
          db.close();
          reject(t.error);
        };
        fn(t.objectStore(STORE));
      }),
  );
}

export async function saveDoc(envelope: Envelope, now: number): Promise<StoredDoc> {
  const doc: StoredDoc = {
    id: `${now}-${slugify(envelope.title) || "doc"}`,
    envelope,
    scannedAt: now,
    expiresAt: envelope.ttlHours == null ? null : now + envelope.ttlHours * 3600e3,
  };
  await tx("readwrite", (s) => s.put(doc));
  return doc;
}

export async function purgeExpired(now: number): Promise<number> {
  const docs = await allDocs();
  const expired = docs.filter((d) => d.expiresAt != null && d.expiresAt <= now);
  if (expired.length > 0) {
    await txAll("readwrite", (s) => {
      for (const d of expired) s.delete(d.id);
    });
  }
  return expired.length;
}

export async function getDoc(id: string, now: number): Promise<StoredDoc | null> {
  await purgeExpired(now);
  const doc = await tx<StoredDoc | undefined>("readonly", (s) => s.get(id));
  return doc && isLive(doc, now) ? doc : null;
}

export async function listDocs(now: number): Promise<StoredDoc[]> {
  await purgeExpired(now);
  const docs = await allDocs();
  return docs.filter((d) => isLive(d, now)).sort((a, b) => b.scannedAt - a.scannedAt);
}
