import { askAnswerSchema, type AskAnswer, type Perspective } from "../types";
import { generateStructured, MODELS } from "./client";
import { askSystemPrompt, askUserPrompt } from "./prompts";
import { askResponseSchema } from "./schemas";

/**
 * Answers a free-form question using only the supplied clauses. The caller is
 * responsible for sanitising both the question and the clause text first.
 */
export async function answerQuestion(
  question: string,
  clauses: ReadonlyArray<{ id: string; text: string }>,
  perspective: Perspective,
): Promise<AskAnswer> {
  return generateStructured({
    logLabel: "gemini.ask",
    model: MODELS.deep,
    contents: askUserPrompt(question, clauses),
    systemInstruction: askSystemPrompt(perspective),
    responseSchema: askResponseSchema,
    validator: askAnswerSchema,
    temperature: 0.3,
  });
}

