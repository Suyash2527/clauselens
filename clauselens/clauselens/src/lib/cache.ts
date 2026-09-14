import { createHash } from "node:crypto";

/**
 * Small in-process LRU with TTL. Re-analysing an identical document and
 * perspective is the most common repeat request (users tweak the question, not
 * the contract), so caching here removes whole rounds of model calls.
 *
 * Deliberately in-memory: a single-instance deployment needs nothing more, and
 * document text never reaches external storage.
 */
const DEFAULT_TTL_MS = 15 * 60 * 1_000;
const DEFAULT_MAX_ENTRIES = 50;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private readonly store = new Map<string, Entry<T>>();

  constructor(
    private readonly ttlMs: number = DEFAULT_TTL_MS,
    private readonly maxEntries: number = DEFAULT_MAX_ENTRIES,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency for LRU eviction.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next();
      if (!oldest.done) this.store.delete(oldest.value);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  get size(): number {
    return this.store.size;
  }
}

/** Content-addressed key. The raw document is hashed, never stored as a key. */
export function cacheKey(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}
