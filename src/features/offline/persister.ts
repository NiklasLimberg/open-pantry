import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, delMany, get, keys, set } from "idb-keyval";

// The pantry query cache is saved to IndexedDB so a page that starts without the network (see
// src/sw.ts) can show the latest copy. Entries are keyed by user and pantry, expire after two
// weeks, and are removed on sign-out.

/** Bump when the shape of a cached query changes; older saved caches are then discarded. */
export const CACHE_VERSION = "1";
export const CACHE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;

const prefix = "open-pantry:query-cache:";

export function createStockPersister(userId: string, pantryId: string) {
  return createAsyncStoragePersister({
    key: `${prefix}${userId}:${pantryId}`,
    throttleTime: 1000,
    // The server renders the page too, where there is no IndexedDB: saving and restoring do nothing.
    storage:
      typeof indexedDB === "undefined"
        ? undefined
        : {
            getItem: async (key) => (await get<string>(key)) ?? null,
            setItem: (key, value) => set(key, value),
            removeItem: (key) => del(key),
          },
  });
}

const pantryKey = `${prefix}pantry`;

/** The last pantry details loaded online, so the signed-in screens can start offline. */
export async function savePantry(pantry: unknown) {
  try {
    await set(pantryKey, pantry);
  } catch {
    // Storage unavailable or full: the app works online without it.
  }
}

export async function loadPantry<T>(): Promise<T | undefined> {
  try {
    return await get<T>(pantryKey);
  } catch {
    return undefined;
  }
}

/** Removes everything this device keeps for the signed-in user: saved queries, pages, pictures. */
export async function clearLocalData() {
  await Promise.allSettled([
    keys().then((all) => delMany(all.filter((key) => String(key).startsWith(prefix)))),
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("pages-") || name === "product-images")
            .map((name) => caches.delete(name)),
        ),
      ),
  ]);
}
