import { NextResponse } from "next/server";
import { badRequest, toSafeError } from "@/lib/errors";
import { answerQuestion } from "@/lib/gemini/answer-question";
import { sanitiseDocumentText } from "@/lib/injection-guard";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { askRequestSchema } from "@/lib/types";

/** Node runtime, matching the other routes that share the Gemini client. */
export const runtime = "nodejs";

/**
 * Answers a question about an already-analysed document. The client resends
 * the clauses, so the server holds no per-user state between requests.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    enforceRateLimit(clientIpFromHeaders(request.headers));

    const parsed = askRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid request.");
    }

    const { question, clauses, perspective } = parsed.data;
    // The question is user input and the clauses are document-derived: sanitise both.
    const safeQuestion = sanitiseDocumentText(question).text;
    const safeClauses = clauses.map((clause) => ({
      id: clause.id,
      text: sanitiseDocumentText(clause.text).text,
    }));

    const answer = await answerQuestion(safeQuestion, safeClauses, perspective);
    return NextResponse.json(answer);
  } catch (error) {
    const { status, body } = toSafeError(error);
    return NextResponse.json(body, { status });
  }
}
