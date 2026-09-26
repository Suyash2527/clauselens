/**
 * Error type carrying an HTTP status and a message that is safe to show the
 * user. Anything not wrapped in this class is treated as an internal fault and
 * reported generically, so provider errors never leak into the response body.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = "AppError";
  }
}

/** Shown for any fault we did not anticipate; deliberately says nothing specific. */
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** Shown by the browser when a request never produced a readable response. */
export const NETWORK_ERROR_MESSAGE = "Could not reach the server. Check your connection and try again.";

/** Rejects input the caller can fix; the message is shown to them verbatim. */
export function badRequest(message: string): AppError {
  return new AppError(400, message);
}

export function forbidden(message: string): AppError {
  return new AppError(403, message);
}

export function payloadTooLarge(message: string): AppError {
  return new AppError(413, message);
}

export function unsupportedMediaType(message: string): AppError {
  return new AppError(415, message);
}

/** Signals rate limiting; the message tells the caller when to retry. */
export function tooManyRequests(message: string): AppError {
  return new AppError(429, message);
}

/**
 * Stands in for every model-side failure (network, quota, malformed JSON). The
 * provider's own error text is logged server-side and never forwarded.
 */
export function upstreamFailure(): AppError {
  return new AppError(502, "The analysis service is unavailable. Please try again shortly.");
}

/** JSON body every API route returns on failure. */
export interface SafeErrorBody {
  error: string;
}

/**
 * The single exit point from a route's catch block. Only `AppError` messages
 * reach the client; everything else is logged and replaced with a generic line.
 */
export function toSafeError(error: unknown): { status: number; body: SafeErrorBody } {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.publicMessage } };
  }
  console.error("[unhandled]", error);
  return { status: 500, body: { error: GENERIC_ERROR_MESSAGE } };
}

/**
 * Reads the `error` field of a `SafeErrorBody` on the client. The body is
 * `unknown` because a proxy or crash can return anything, so the fallback
 * covers responses that did not come from `toSafeError`.
 */
export function readErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string") return error;
  }
  return fallback;
}
