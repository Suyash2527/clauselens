import { describe, expect, it } from "vitest";
import { analyzeRequestSchema, askRequestSchema, clauseAnalysisSchema } from "@/lib/types";

describe("analyzeRequestSchema", () => {
  const valid = { text: "x".repeat(200), perspective: "tenant" };

  it("accepts a well-formed request", () => {
    expect(analyzeRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a document that is too short to be meaningful", () => {
    expect(analyzeRequestSchema.safeParse({ ...valid, text: "too short" }).success).toBe(false);
  });

  it("rejects a document beyond the size ceiling", () => {
    expect(analyzeRequestSchema.safeParse({ ...valid, text: "x".repeat(120_001) }).success).toBe(false);
  });

  it("rejects an unknown perspective", () => {
    expect(analyzeRequestSchema.safeParse({ ...valid, perspective: "judge" }).success).toBe(false);
  });
});

describe("askRequestSchema", () => {
  const clause = { id: "c1", index: 1, text: "Rent is due on the fifth." };

  it("accepts a question with clause context", () => {
    const result = askRequestSchema.safeParse({
      question: "When is rent due?",
      perspective: "tenant",
      clauses: [clause],
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one clause for grounding", () => {
    const result = askRequestSchema.safeParse({
      question: "When is rent due?",
      perspective: "tenant",
      clauses: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("clauseAnalysisSchema", () => {
  it("rejects a burden score outside 0-10", () => {
    const result = clauseAnalysisSchema.safeParse({
      id: "c1",
      category: "payment",
      plainSummary: "Rent is due monthly.",
      affectsUser: true,
      burdenScore: 42,
      concerns: [],
      questionForLawyer: null,
    });
    expect(result.success).toBe(false);
  });
});
