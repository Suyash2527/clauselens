import { tooManyRequests } from "./errors";

/**
 * Fixed-window rate limiter keyed by client IP. Model calls cost money and are
 * the obvious abuse target, so every route that reaches Gemini passes through
 * here before any work is done.
 */
const WINDOW_MS = 60_000;

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

function limitFromEnv(): number {
  const parsed = Number.parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip && ip.length > 0 ? ip : "unknown";
}

export function enforceRateLimit(key: string, now: number = Date.now()): void {
  const limit = limitFromEnv();
  const existing = windows.get(key);

  if (!existing || now > existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
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
  windows.clear();
}
