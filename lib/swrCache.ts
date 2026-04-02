/**
 * Lightweight SWR (Stale-While-Revalidate) cache.
 *
 * Usage in pages:
 *   const cached = swrCache.get<MyData[]>("my-key");
 *   if (cached) { setData(cached); setLoading(false); }
 *   // ... fetch fresh data ...
 *   swrCache.set("my-key", freshData);
 */

const mem = new Map<string, { data: unknown; ts: number }>();

const PREFIX = "swr:";

export const swrCache = {
  get<T>(key: string): T | null {
    // Memory first (instant)
    const m = mem.get(key);
    if (m) return m.data as T;

    // Then sessionStorage
    if (typeof sessionStorage === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      mem.set(key, parsed); // warm memory
      return parsed.data as T;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T): void {
    const entry = { data, ts: Date.now() };
    mem.set(key, entry);
    if (typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // quota exceeded — memory cache still works
    }
  },

  invalidate(key: string): void {
    mem.delete(key);
    if (typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.removeItem(PREFIX + key);
    } catch {}
  },

  /** Invalidate all keys that start with the given prefix. */
  invalidatePrefix(prefix: string): void {
    for (const k of mem.keys()) {
      if (k.startsWith(prefix)) mem.delete(k);
    }
    if (typeof sessionStorage === "undefined") return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(PREFIX + prefix)) toRemove.push(k);
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  },
};
