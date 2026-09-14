import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientKey, enforceRateLimit, resetRateLimits } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";

describe("enforceRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    process.env.RATE_LIMIT_PER_MINUTE = "3";
  });
  afterEach(() => {
    delete process.env.RATE_LIMIT_PER_MINUTE;
  });

  it("allows requests up to the configured limit", () => {
    for (let i = 0; i < 3; i += 1) expect(() => enforceRateLimit("1.2.3.4")).not.toThrow();
  });

  it("rejects the request that exceeds the limit with a 429", () => {
    for (let i = 0; i < 3; i += 1) enforceRateLimit("1.2.3.4");
    try {
      enforceRateLimit("1.2.3.4");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(429);
    }
  });

  it("tracks clients independently", () => {
    for (let i = 0; i < 3; i += 1) enforceRateLimit("1.1.1.1");
    expect(() => enforceRateLimit("2.2.2.2")).not.toThrow();
  });

  it("opens a fresh window once the previous one expires", () => {
    const start = 1_000_000;
    for (let i = 0; i < 3; i += 1) enforceRateLimit("9.9.9.9", start);
    expect(() => enforceRateLimit("9.9.9.9", start + 61_000)).not.toThrow();
  });
});

describe("clientKey", () => {
  it("uses the first address in x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" });
    expect(clientKey(headers)).toBe("203.0.113.5");
  });

  it("falls back when the header is absent", () => {
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
