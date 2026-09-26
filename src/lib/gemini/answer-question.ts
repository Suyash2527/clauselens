import { z } from "zod";
import { askAnswerSchema, type AskAnswer, type Perspective } from "../types";
import { generateStructured, MODELS } from "./client";
import { askSystemPrompt, askUserPrompt, checklistSystemPrompt, checklistUserPrompt } from "./prompts";
import { askResponseSchema, checklistResponseSchema } from "./schemas";

/** The prompt asks for three to seven; the cap holds even if the model overshoots. */
const MAX_CHECKLIST_QUESTIONS = 7;

const checklistSchema = z.object({ questions: z.array(z.string()) });

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

/**
 * Turns the concerns found during analysis into questions for a real lawyer.
 * The checklist is supplementary, so any failure yields an empty list rather
 * than failing the analysis it accompanies.
 */
export async function buildLawyerChecklist(
  concerns: readonly string[],
  perspective: Perspective,
): Promise<string[]> {
  if (concerns.length === 0) return [];
  try {
    const { questions } = await generateStructured({
      logLabel: "gemini.checklist",
      model: MODELS.deep,
      contents: checklistUserPrompt(concerns),
      systemInstruction: checklistSystemPrompt(perspective),
      responseSchema: checklistResponseSchema,
      validator: checklistSchema,
      temperature: 0.4,
    });
    return questions.slice(0, MAX_CHECKLIST_QUESTIONS);
  } catch {
    // Already logged by generateStructured.
    return [];
  }
}
