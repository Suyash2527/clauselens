import type { GoogleGenAI } from "@google/genai";
import { CLAUSE_CATEGORIES } from "../types";

export function getDemoClient(): GoogleGenAI {
  return {
    models: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generateContent: async (request: any) => {
        const schema = request.config?.responseSchema;
        let rawJson = "{}";

        if (schema?.properties?.clauses) {
          // Classification batch
          const contents = request.contents || "";
          const ids: string[] = [];
          const regex = /\[([^\]]+)\]/g;
          let match;
          while ((match = regex.exec(contents)) !== null) {
            if (match[1]) ids.push(match[1]);
          }
          if (ids.length === 0) ids.push("chunk-1");

          const clauses = ids.map((id, index) => ({
            id,
            category: CLAUSE_CATEGORIES[index % CLAUSE_CATEGORIES.length],
            plainSummary: "This is a deterministic sample summary for demo mode. It explains the clause simply.",
            affectsUser: true,
            burdenScore: 5,
            concerns: index % 2 === 0 ? ["Sample risk identified in demo mode"] : [],
            questionForLawyer: index % 3 === 0 ? "What are the exact terms?" : null
          }));
          rawJson = JSON.stringify({ clauses });
        } else if (schema?.properties?.answer) {
          // Ask
          rawJson = JSON.stringify({
            answer: "This is a deterministic sample answer generated in demo mode.",
            citedClauseIds: [],
            answerable: true
          });
        } else if (schema?.properties?.questions) {
          // Checklist
          rawJson = JSON.stringify({
            questions: [
              "Are there hidden penalties in this sample document?",
              "What is the exact process for early termination?",
              "Who is liable if the property is damaged by a third party?"
            ]
          });
        } else if (schema?.properties?.text) {
          // Extract text
          rawJson = JSON.stringify({
            text: "This is sample extracted text from a demo document. In a real environment, Gemini would parse the actual PDF."
          });
        }
        
        return { text: rawJson };
      }
    }
  } as unknown as GoogleGenAI;
}
