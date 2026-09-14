import { getGenAI, MODELS } from "./client";
import { askResponseSchema, checklistResponseSchema } from "./schemas";
import { askSystemPrompt, askUserPrompt, checklistSystemPrompt } from "./prompts";
import { safeJsonParse } from "./classify-clauses";
import { askAnswerSchema, type AskAnswer, type Perspective } from "../types";
import { upstreamFailure } from "../errors";
import { z } from "zod";

export async function answerQuestion(
  question: string,
  clauses: ReadonlyArray<{ id: string; text: string }>,
  perspective: Perspective,
): Promise<AskAnswer> {
  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: MODELS.deep,
      contents: askUserPrompt(question, clauses),
      config: {
        systemInstruction: askSystemPrompt(perspective),
        responseMimeType: "application/json",
        responseSchema: askResponseSchema,
        temperature: 0.3,
      },
    });
    const parsed = askAnswerSchema.safeParse(safeJsonParse(response.text ?? ""));
    if (!parsed.success) throw upstreamFailure();
    return parsed.data;
  } catch (error) {
    console.error("[gemini.ask]", error);
    throw upstreamFailure();
  }
}

const checklistSchema = z.object({ questions: z.array(z.string()) });

/** Turns the concerns found during analysis into questions for a real lawyer. */
export async function buildLawyerChecklist(
  concerns: readonly string[],
  perspective: Perspective,
): Promise<string[]> {
  if (concerns.length === 0) return [];
  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: MODELS.deep,
      contents: `Concerns found in the document:\n${concerns.map((c) => `- ${c}`).join("\n")}`,
      config: {
        systemInstruction: checklistSystemPrompt(perspective),
        responseMimeType: "application/json",
        responseSchema: checklistResponseSchema,
        temperature: 0.4,
      },
    });
    const parsed = checklistSchema.safeParse(safeJsonParse(response.text ?? ""));
    return parsed.success ? parsed.data.questions.slice(0, 7) : [];
  } catch (error) {
    // A missing checklist should not fail the whole analysis.
    console.error("[gemini.checklist]", error);
    return [];
  }
}
