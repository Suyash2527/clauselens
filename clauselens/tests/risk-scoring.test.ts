import { describe, expect, it } from "vitest";
import { scoreClause, severityFor, weightFor } from "@/lib/risk-scoring";
import type { ClauseAnalysis } from "@/lib/types";

function analysis(overrides: Partial<ClauseAnalysis> = {}): ClauseAnalysis {
  return {
    id: "c1",
    category: "indemnity",
    plainSummary: "You cover all losses the client suffers.",
    affectsUser: true,
    burdenScore: 6,
    concerns: [],
    questionForLawyer: null,
    ...overrides,
  };
}

describe("weightFor", () => {
  it("weighs indemnity far more heavily for the freelancer than the client", () => {
    expect(weightFor("freelancer", "indemnity")).toBeGreaterThan(weightFor("client", "indemnity"));
  });

  it("weighs non-competes more heavily for the employee than the employer", () => {
    expect(weightFor("employee", "non_compete")).toBeGreaterThan(weightFor("employer", "non_compete"));
  });

  it("falls back to a neutral weight for unmapped combinations", () => {
    expect(weightFor("landlord", "other")).toBe(1);
  });
});

describe("scoreClause", () => {
  it("produces the same clause a higher score for the burdened party", () => {
    const clause = analysis();
    expect(scoreClause(clause, "freelancer")).toBeGreaterThan(scoreClause(clause, "client"));
  });

  it("raises the score as the number of concerns grows", () => {
    const plain = scoreClause(analysis(), "freelancer");
    const concerned = scoreClause(analysis({ concerns: ["uncapped", "survives termination"] }), "freelancer");
    expect(concerned).toBeGreaterThan(plain);
  });

  it("caps the score at 10", () => {
    const extreme = analysis({ burdenScore: 10, concerns: ["a", "b", "c"] });
    expect(scoreClause(extreme, "freelancer")).toBeLessThanOrEqual(10);
  });

  it("keeps clauses that do not affect the user below the medium threshold", () => {
    expect(scoreClause(analysis({ affectsUser: false, burdenScore: 9 }), "freelancer")).toBeLessThan(4);
  });
});

describe("severityFor", () => {
  it("marks a heavy indemnity as high for a freelancer", () => {
    expect(severityFor(analysis({ burdenScore: 7 }), "freelancer")).toBe("high");
  });

  it("marks the same clause lower for the protected client", () => {
    expect(severityFor(analysis({ burdenScore: 7 }), "client")).not.toBe("high");
  });

  it("treats a trivial clause as routine", () => {
    expect(severityFor(analysis({ category: "other", burdenScore: 1 }), "tenant")).toBe("low");
  });
});
