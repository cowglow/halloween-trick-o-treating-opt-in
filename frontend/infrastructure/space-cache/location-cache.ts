// docs/SPEC.md section 6: "Location data does not change [often]: cache it in
// IndexedDB keyed by space and data version. Serve from cache first, then
// revalidate with a conditional request (ETag/If-None-Match, cheap 304) at
// most once per session or per N hours (configurable, default 24h)." Native
// IndexedDB, no new dependency - this app only ever needs one tiny
// key-by-space record, not a query engine.
import type { SpaceLocation } from "domain/space/space.types.ts";

const DB_NAME = "space-cache";
const DB_VERSION = 1;
const STORE = "locations";

// Bump alongside any change to what a cached record's shape means (not the
// same thing as an individual pin's data - this is the *cache format*
// version, so an old cached record from a previous deploy is discarded
// instead of misread).
const CACHE_FORMAT_VERSION = 1;

type CacheRecord = {
  spaceSlug: string;
  formatVersion: number;
  locations: SpaceLocation[];
  etag: string | null;
  cachedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "spaceSlug" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Every call is wrapped so a private-browsing/blocked-storage environment
// (where indexedDB can throw synchronously or every request can fail) makes
// the cache a silent no-op instead of breaking the page - this is a
// convenience layer, not the source of truth (the API always is).
async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function readCachedLocations(
  spaceSlug: string,
): Promise<{ locations: SpaceLocation[]; etag: string | null; cachedAt: number } | null> {
  const record = await withStore<CacheRecord>("readonly", (store) => store.get(spaceSlug));
  if (!record || record.formatVersion !== CACHE_FORMAT_VERSION) return null;
  return { locations: record.locations, etag: record.etag, cachedAt: record.cachedAt };
}

export async function writeCachedLocations(spaceSlug: string, locations: SpaceLocation[], etag: string | null = null): Promise<void> {
  const record: CacheRecord = { spaceSlug, formatVersion: CACHE_FORMAT_VERSION, locations, etag, cachedAt: Date.now() };
  await withStore("readwrite", (store) => store.put(record));
}

export async function clearSpaceCache(spaceSlug: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(spaceSlug));
}

const DEFAULT_TTL_HOURS = Number(import.meta.env.VITE_LOCATION_CACHE_TTL_HOURS ?? 24);

export function shouldRevalidate(cachedAt: number, ttlHours: number = DEFAULT_TTL_HOURS): boolean {
  return Date.now() - cachedAt >= ttlHours * 60 * 60 * 1000;
}
