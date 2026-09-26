import { forbidden } from "./errors";

/** Exact-match allowlist. No wildcards or suffix matching. */
export function enforceSameOrigin(headers: Headers): void {
  const origin = headers.get("origin");
  if (!origin) return; // same-origin fetches from some browsers and server-to-server calls omit it
  const host = headers.get("host");
  const allowed = new Set(
    (process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
  );
  if (host) { allowed.add(`https://${host}`); allowed.add(`http://${host}`); }
  if (!allowed.has(origin)) throw forbidden("Cross-origin requests are not allowed.");
}
