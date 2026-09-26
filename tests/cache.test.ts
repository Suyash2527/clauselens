import { describe, expect, it, vi } from "vitest";
import { TtlCache, cacheKey } from "@/lib/cache";

describe("TtlCache", () => {
  it("returns a value that was set and has not expired", () => {
    const cache = new TtlCache<string>();
    cache.set("a", "value");
    expect(cache.get("a")).toBe("value");
  });

  it("returns undefined for a missing key", () => {
    expect(new TtlCache<string>().get("missing")).toBeUndefined();
  });

  it("returns undefined once an entry's TTL has passed", () => {
    vi.useFakeTimers();
    const cache = new TtlCache<string>(1_000);
    cache.set("a", "value");
    vi.advanceTimersByTime(1_500);
    expect(cache.get("a")).toBeUndefined();
    vi.useRealTimers();
  });

  it("evicts the least recently used entry at capacity", () => {
    const cache = new TtlCache<string>(60_000, 2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a"); // refresh recency of "a"
    cache.set("c", "3");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
  });
});

describe("cacheKey", () => {
  it("produces the same key for identical input", () => {
    expect(cacheKey("tenant", "text")).toBe(cacheKey("tenant", "text"));
  });

  it("produces a different key when the perspective changes", () => {
    expect(cacheKey("tenant", "text")).not.toBe(cacheKey("landlord", "text"));
  });

  it("hashes the source text instead of embedding it in the key", () => {
    expect(cacheKey("tenant", "secret clause")).not.toContain("secret");
  });
});
