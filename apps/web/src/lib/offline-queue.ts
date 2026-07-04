/**
 * A tiny, dependency-free offline queue for check-ins, backed by IndexedDB.
 *
 * The elder in a rural home, the daughter on the bus through a dead-zone —
 * a check-in tapped without signal must not be lost. We hold it here and
 * replay it, oldest first, the moment the connection returns. IndexedDB
 * (not localStorage) so it survives a tab close and holds structured rows.
 *
 * Everything degrades safely: if IndexedDB is unavailable the helpers behave
 * as an empty queue, and the caller falls back to "you're offline, try again".
 */

const DB_NAME = "kinos-offline";
const STORE = "checkins";
const ENDPOINT = "/api/checkin";

export interface QueuedCheckin {
  id: string; // client-generated, dedupes a double flush
  subjectId: string;
  subjectName: string;
  mood: "good" | "okay" | "low" | "unwell";
  ate?: "yes" | "no";
  note?: string;
  capturedAt: string; // ISO — the moment it was tapped
}

function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Persist a check-in to send later. Returns false if it couldn't be stored. */
export async function enqueueCheckin(item: QueuedCheckin): Promise<boolean> {
  const db = await idb();
  if (!db) return false;
  const res = await tx(db, "readwrite", (s) => s.put(item));
  db.close();
  return res !== null;
}

/** How many check-ins are waiting to send. */
export async function pendingCount(): Promise<number> {
  const db = await idb();
  if (!db) return 0;
  const n = await tx<number>(db, "readonly", (s) => s.count());
  db.close();
  return n ?? 0;
}

async function allQueued(): Promise<QueuedCheckin[]> {
  const db = await idb();
  if (!db) return [];
  const rows = await tx<QueuedCheckin[]>(db, "readonly", (s) => s.getAll());
  db.close();
  return rows ?? [];
}

async function removeQueued(id: string): Promise<void> {
  const db = await idb();
  if (!db) return;
  await tx(db, "readwrite", (s) => s.delete(id));
  db.close();
}

/** POST one queued check-in. Resolves true on success, false to keep it. */
async function send(item: QueuedCheckin): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subjectId: item.subjectId,
        mood: item.mood,
        ate: item.ate,
        note: item.note,
        capturedAt: item.capturedAt,
      }),
    });
    // A 4xx that isn't auth/rate-limit means the item will never be accepted —
    // drop it rather than retry forever. Auth (401) and rate-limit (429) are
    // transient; keep the item for the next flush.
    if (res.ok) return true;
    if (res.status === 401 || res.status === 429) return false;
    return res.status >= 400 && res.status < 500 ? true : false;
  } catch {
    return false; // offline / network error — keep it
  }
}

let flushing = false;

/**
 * Send everything waiting, oldest first. Guarded against overlap so the
 * `online` event and a manual call can't double-send. Returns how many were
 * delivered (or dropped as permanently invalid).
 */
export async function flushCheckins(): Promise<number> {
  if (flushing) return 0;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;
  flushing = true;
  let done = 0;
  try {
    const items = (await allQueued()).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    for (const item of items) {
      if (await send(item)) {
        await removeQueued(item.id);
        done++;
      }
    }
  } finally {
    flushing = false;
  }
  return done;
}
