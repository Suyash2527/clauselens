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

export const badRequest = (message: string): AppError => new AppError(400, message);
export const tooManyRequests = (message: string): AppError => new AppError(429, message);
export const upstreamFailure = (): AppError =>
  new AppError(502, "The analysis service is unavailable. Please try again shortly.");

export interface SafeErrorBody {
  error: string;
}

export function toSafeError(error: unknown): { status: number; body: SafeErrorBody } {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.publicMessage } };
  }
  console.error("[unhandled]", error);
  return { status: 500, body: { error: "Something went wrong. Please try again." } };
}
