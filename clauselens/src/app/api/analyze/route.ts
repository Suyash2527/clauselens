import { NextResponse } from "next/server";
import { analyzeRequestSchema } from "@/lib/types";
import { analyzeDocument } from "@/lib/analysis/analyze-document";
import { clientKey, enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, toSafeError } from "@/lib/errors";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 300_000;

/**
 * Thin handler: validate, rate-limit, delegate. All analysis logic lives in
 * `@/lib` so it can be unit-tested without spinning up a request.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    enforceRateLimit(clientKey(request.headers));

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      throw badRequest("Document is too large. Please submit under 120,000 characters.");
    }

    const parsed = analyzeRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid request.");
    }

    const analysis = await analyzeDocument(parsed.data.text, parsed.data.perspective);
    return NextResponse.json(analysis);
  } catch (error) {
    const { status, body } = toSafeError(error);
    return NextResponse.json(body, { status });
  }
}
