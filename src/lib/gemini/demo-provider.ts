import type { GenerateContentParameters, GoogleGenAI, Schema } from "@google/genai";
import { CLAUSE_CATEGORIES } from "../types";

const CLAUSE_ID_TAG = /\[([^\]]+)\]/g;

/**
 * Stand-in for the Gemini client when no API key is configured, so reviewers
 * can run the full flow offline. It picks a canned reply by inspecting which
 * top-level property the request's `responseSchema` declares, which keeps it
 * in step with the real calls without knowing which module made them.
 */
export function getDemoClient(): GoogleGenAI {
  return {
    models: {
      generateContent: async (request: GenerateContentParameters) => {
        const schema = request.config?.responseSchema as Schema | undefined;
        let rawJson = "{}";

        if (schema?.properties?.clauses) {
          rawJson = JSON.stringify({ clauses: demoClauses(String(request.contents || "")) });
        } else if (schema?.properties?.answer) {
          rawJson = JSON.stringify({
            answer: "This is a deterministic sample answer generated in demo mode.",
            citedClauseIds: [],
            answerable: true,
          });

        } else if (schema?.properties?.text) {
          rawJson = JSON.stringify({
            text: "This is sample extracted text from a demo document. In a real environment, Gemini would parse the actual PDF.",
          });
        }

        return { text: rawJson };
      },
    },
  } as unknown as GoogleGenAI;
}

/** Echoes back one analysis per `[id]` tag in the classification prompt. */
function demoClauses(prompt: string) {
  const ids = [...prompt.matchAll(CLAUSE_ID_TAG)].flatMap((match) => (match[1] ? [match[1]] : []));
  if (ids.length === 0) ids.push("chunk-1");

  return ids.map((id, index) => ({
    id,
    category: CLAUSE_CATEGORIES[index % CLAUSE_CATEGORIES.length],
    plainSummary: "This is a deterministic sample summary for demo mode. It explains the clause simply.",
    affectsUser: true,
    burdenScore: index % 3 === 0 ? 8 : 2,
    concerns: index % 3 === 0 ? ["Sample risk identified in demo mode"] : [],
    questionForLawyer: index % 3 === 0 ? "What are the exact terms?" : null,
  }));
}
