import { NextResponse } from "next/server";
import { askRequestSchema } from "@/lib/types";
import { answerQuestion } from "@/lib/gemini/answer-question";
import { sanitiseDocumentText } from "@/lib/injection-guard";
import { clientKey, enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, toSafeError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    enforceRateLimit(clientKey(request.headers));

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
