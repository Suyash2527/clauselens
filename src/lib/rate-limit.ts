import { tooManyRequests } from "./errors";

/**
 * Fixed-window rate limiter keyed by client IP. Model calls cost money and are
 * the obvious abuse target, so every route that reaches Gemini passes through
 * here before any work is done.
 */
const WINDOW_MS = 60_000;
const DEFAULT_REQUESTS_PER_WINDOW = 10;

interface RateWindow {
  count: number;
  resetAt: number;
}

const windowsByClient = new Map<string, RateWindow>();

/** Read per call so the limit can be tuned (or tested) without a restart. */
function requestsPerWindow(): number {
  const parsed = Number.parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUESTS_PER_WINDOW;
}

/**
 * Identifies the caller by the first `x-forwarded-for` hop, which is the
 * client address behind the hosting proxy. Callers without one share a bucket.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip && ip.length > 0 ? ip : "unknown";
}

/**
 * Counts one request against the client's window, throwing a 429 `AppError`
 * once the limit is reached. `now` is injectable so window expiry is testable.
 */
export function enforceRateLimit(clientIp: string, now: number = Date.now()): void {
  const limit = requestsPerWindow();
  const existing = windowsByClient.get(clientIp);

  if (!existing || now > existing.resetAt) {
    windowsByClient.set(clientIp, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  if (existing.count >= limit) {
    const seconds = Math.ceil((existing.resetAt - now) / 1_000);
    throw tooManyRequests(`Too many requests. Try again in ${seconds}s.`);
  }
  existing.count += 1;
}

/** Test seam — clears all windows. */
export function resetRateLimits(): void {
  windowsByClient.clear();
}
