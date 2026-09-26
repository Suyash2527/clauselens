import { describe, expect, it, vi } from "vitest";
import { analyzeDocument, type AnalyzeDeps } from "@/lib/analysis/analyze-document";
import { AppError } from "@/lib/errors";
import type { ClauseAnalysis, ClauseChunk, Perspective } from "@/lib/types";

/**
 * The Gemini calls are injected, so the whole pipeline is exercised offline and
 * in CI. No network, no API key, deterministic assertions.
 */
function stubDeps(overrides: Partial<AnalyzeDeps> = {}): AnalyzeDeps {
  return {
    classify: vi.fn(async (chunks: readonly ClauseChunk[], _perspective: Perspective) => {
      const map = new Map<string, ClauseAnalysis>();
      for (const chunk of chunks) {
        map.set(chunk.id, {
          id: chunk.id,
          category: "indemnity",
          plainSummary: `Summary of clause ${chunk.index}.`,
          affectsUser: true,
          burdenScore: 8,
          concerns: ["Liability is not capped."],
          questionForLawyer: "Can this liability be capped?",
        });
      }
      return map;
    }),
    ...overrides,
  };
}

const CONTRACT = `1. SERVICES
The contractor shall deliver the design work described in the statement of work.

2. INDEMNITY
The contractor shall indemnify the client against all losses arising from the work.`;

describe("analyzeDocument", () => {
  it("returns one analysed clause per numbered clause, in document order", async () => {
    const result = await analyzeDocument(CONTRACT, "freelancer", stubDeps());
    expect(result.clauses).toHaveLength(2);
    expect(result.clauses[0]?.analysis.plainSummary).toContain("clause 1");
  });

  it("scores heavy indemnity clauses as red flags for the freelancer", async () => {
    const result = await analyzeDocument(CONTRACT, "freelancer", stubDeps());
    expect(result.redFlags.length).toBeGreaterThan(0);
  });

  it("produces fewer red flags for the protected client on the same text", async () => {
    // The model scores burden per perspective: heavy for the indemnifier, light for the indemnified.
    const base = stubDeps().classify;
    const classify: AnalyzeDeps["classify"] = async (chunks, perspective) => {
      const map = await base(chunks, perspective);
      if (perspective === "client") for (const a of map.values()) a.burdenScore = 3;
      return map;
    };
    const asFreelancer = await analyzeDocument(CONTRACT, "freelancer", stubDeps());
    const asClient = await analyzeDocument(CONTRACT, "client", stubDeps({ classify }));
    expect(asClient.redFlags.length).toBeLessThan(asFreelancer.redFlags.length);
  });

  it("throws an AppError when the text has no recognisable clauses", async () => {
    await expect(analyzeDocument("....", "tenant", stubDeps())).rejects.toBeInstanceOf(AppError);
  });

  it("drops clauses the model failed to return rather than emitting undefined entries", async () => {
    const deps = stubDeps({ classify: vi.fn(async () => new Map<string, ClauseAnalysis>()) });
    const result = await analyzeDocument(CONTRACT, "tenant", deps);
    expect(result.clauses).toEqual([]);
  });

  it("completes the analysis when there are no questions", async () => {
    const deps = stubDeps({
      classify: vi.fn(async (chunks: readonly ClauseChunk[]) => {
        const map = new Map<string, ClauseAnalysis>();
        for (const chunk of chunks) {
          map.set(chunk.id, {
            id: chunk.id,
            category: "other",
            plainSummary: "ok",
            affectsUser: false,
            burdenScore: 2,
            concerns: [],
            questionForLawyer: null,
          });
        }
        return map;
      }),
    });
    const result = await analyzeDocument(CONTRACT + " unique failure test", "freelancer", deps);
    expect(result.lawyerChecklist).toEqual([]);
    expect(result.clauses.length).toBeGreaterThan(0);
  });

  it("serves a repeat request from cache without calling the model again", async () => {
    const deps = stubDeps();
    const unique = `${CONTRACT}\n\n3. NOTICE\nNotices shall be sent to the registered address.`;
    await analyzeDocument(unique, "tenant", deps);
    await analyzeDocument(unique, "tenant", deps);
    expect(deps.classify).toHaveBeenCalledTimes(1);
  });

  it("builds a lawyer checklist locally, sorted by severity, capped at 10, with no duplicates", async () => {
    const deps = stubDeps({
      classify: vi.fn(async (chunks: readonly ClauseChunk[]) => {
        const map = new Map<string, ClauseAnalysis>();
        // We will generate 15 chunks, and map them to questions.
        // Some will have duplicates. Some will have higher severity.
        for (const chunk of chunks) {
          const index = chunk.index;
          let questionForLawyer = `Question ${index}?`;
          let burdenScore = 5;
          if (index === 1) burdenScore = 9; // High
          if (index === 2) burdenScore = 7; // Medium
          if (index === 3) questionForLawyer = "Duplicate question?";
          if (index === 4) questionForLawyer = "Duplicate question? "; // Should be deduped
          if (index > 12) questionForLawyer = ""; // No question

          map.set(chunk.id, {
            id: chunk.id,
            category: "other",
            plainSummary: "ok",
            affectsUser: true,
            burdenScore,
            concerns: [],
            questionForLawyer: questionForLawyer || null,
          });
        }
        return map;
      }),
    });
    const longText = Array.from({ length: 15 }, (_, i) => `${i + 1}. CLAUSE\nThis is a long enough string to be recognized as a valid clause text by the chunking engine, which requires a minimum length to avoid returning empty clauses. ${i}.`).join("\n\n");
    const result = await analyzeDocument(longText, "freelancer", deps);
    
    // Check duplicates removed
    const lower = result.lawyerChecklist.map((q) => q.toLowerCase());
    expect(lower.filter((q) => q.includes("duplicate")).length).toBe(1);

    // Check sorted by severity
    expect(result.lawyerChecklist[0]).toBe("Question 1?"); // Highest burden
    
    // Check capped at 10
    expect(result.lawyerChecklist.length).toBeLessThanOrEqual(10);

    // Only one model call
    expect(deps.classify).toHaveBeenCalledTimes(1);
  });
});
