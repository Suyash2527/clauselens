import { NextResponse } from "next/server";
import { badRequest, payloadTooLarge, toSafeError, unsupportedMediaType } from "@/lib/errors";
import { answerQuestion } from "@/lib/gemini/answer-question";
import { sanitiseDocumentText } from "@/lib/injection-guard";
import { maskPii } from "@/lib/pii";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin } from "@/lib/origin-guard";
import { askRequestSchema } from "@/lib/types";

/** Node runtime, matching the other routes that share the Gemini client. */
export const runtime = "nodejs";

/**
 * Answers a question about an already-analysed document. The client resends
 * the clauses, so the server holds no per-user state between requests.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    enforceSameOrigin(request.headers);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw unsupportedMediaType("Expected application/json.");
    }

    enforceRateLimit(clientIpFromHeaders(request.headers));

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 300_000) {
      throw payloadTooLarge("Request is too large.");
    }

    const parsed = askRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid request.");
    }

    const { question, clauses, perspective } = parsed.data;
    // The question is user input and the clauses are document-derived: sanitise both.
    const safeQuestion = maskPii(sanitiseDocumentText(question).text).text;
    const safeClauses = clauses.map((clause) => ({
      id: clause.id,
      text: maskPii(sanitiseDocumentText(clause.text).text).text,
    }));

    const answer = await answerQuestion(safeQuestion, safeClauses, perspective);
    return NextResponse.json(answer);
  } catch (error) {
    const { status, body } = toSafeError(error);
    return NextResponse.json(body, { status });
  }
}
