import { Type } from "@google/genai";
import { CLAUSE_CATEGORIES } from "../types";

/**
 * Response schemas passed to Gemini as `responseSchema`. Constraining the model
 * to JSON at the API level removes the whole class of brittle string parsing
 * and means a malformed reply fails fast rather than silently degrading.
 */

export const clauseBatchResponseSchema = {
  type: Type.OBJECT,
  properties: {
    clauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "The clause id exactly as given." },
          category: { type: Type.STRING, enum: [...CLAUSE_CATEGORIES] },
          plainSummary: {
            type: Type.STRING,
            description: "One or two sentences, plain English, no legal jargon.",
          },
          affectsUser: {
            type: Type.BOOLEAN,
            description: "True if the clause imposes a duty or risk on the stated role.",
          },
          burdenScore: {
            type: Type.NUMBER,
            description: "0-10. How heavily this clause burdens the stated role.",
          },
          concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
          questionForLawyer: { type: Type.STRING, nullable: true },
        },
        required: [
          "id",
          "category",
          "plainSummary",
          "affectsUser",
          "burdenScore",
          "concerns",
          "questionForLawyer",
        ],
      },
    },
  },
  required: ["clauses"],
} as const;

export const askResponseSchema = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    citedClauseIds: { type: Type.ARRAY, items: { type: Type.STRING } },
    answerable: {
      type: Type.BOOLEAN,
      description: "False when the document does not contain the answer.",
    },
  },
  required: ["answer", "citedClauseIds", "answerable"],
} as const;

export const checklistResponseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["questions"],
} as const;
