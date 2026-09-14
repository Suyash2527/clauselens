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
    checklist: vi.fn(async () => ["Can the indemnity be capped at fees paid?"]),
    ...overrides,
  };
}

const CONTRACT = `1. SERVICES
The contractor shall deliver the design work described in the statement of work.

2. INDEMNITY
The contractor shall indemnify the client against all losses arising from the work.`;

describe("analyzeDocument", () => {
  it("returns one analysed clause per chunk", async () => {
    const result = await analyzeDocument(CONTRACT, "freelancer", stubDeps());
    expect(result.clauses).toHaveLength(2);
    expect(result.clauses[0]?.analysis.plainSummary).toContain("clause 1");
  });

  it("scores heavy indemnity clauses as red flags for the freelancer", async () => {
    const result = await analyzeDocument(CONTRACT, "freelancer", stubDeps());
    expect(result.redFlags.length).toBeGreaterThan(0);
  });

  it("produces fewer red flags for the protected client on the same text", async () => {
    const asFreelancer = await analyzeDocument(CONTRACT, "freelancer", stubDeps());
    const asClient = await analyzeDocument(CONTRACT, "client", stubDeps());
    expect(asClient.redFlags.length).toBeLessThan(asFreelancer.redFlags.length);
  });

  it("rejects input with no recognisable clauses", async () => {
    await expect(analyzeDocument("....", "tenant", stubDeps())).rejects.toBeInstanceOf(AppError);
  });

  it("drops clauses the model failed to return rather than emitting undefined entries", async () => {
    const deps = stubDeps({ classify: vi.fn(async () => new Map<string, ClauseAnalysis>()) });
    const result = await analyzeDocument(CONTRACT, "tenant", deps);
    expect(result.clauses).toEqual([]);
  });

  it("survives a checklist failure without failing the analysis", async () => {
    const deps = stubDeps({ checklist: vi.fn(async () => []) });
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
});
