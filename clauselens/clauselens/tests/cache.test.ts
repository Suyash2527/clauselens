import { describe, expect, it, vi } from "vitest";
import { TtlCache, cacheKey } from "@/lib/cache";

describe("TtlCache", () => {
  it("returns a stored value", () => {
    const cache = new TtlCache<string>();
    cache.set("a", "value");
    expect(cache.get("a")).toBe("value");
  });

  it("returns undefined for a missing key", () => {
    expect(new TtlCache<string>().get("missing")).toBeUndefined();
  });

  it("expires entries after the TTL", () => {
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
  it("is stable for identical input", () => {
    expect(cacheKey("tenant", "text")).toBe(cacheKey("tenant", "text"));
  });

  it("differs when the perspective changes", () => {
    expect(cacheKey("tenant", "text")).not.toBe(cacheKey("landlord", "text"));
  });

  it("does not leak the source text into the key", () => {
    expect(cacheKey("tenant", "secret clause")).not.toContain("secret");
  });
});
