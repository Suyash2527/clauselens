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
    const plain = scoreClause(analysis({ burdenScore: 4 }), "freelancer");
    const concerned = scoreClause(analysis({ burdenScore: 4, concerns: ["uncapped", "survives termination"] }), "freelancer");
    expect(concerned).toBeGreaterThan(plain);
  });

  it("caps the score at 10", () => {
    const extreme = analysis({ burdenScore: 10, concerns: ["a", "b", "c"] });
    expect(scoreClause(extreme, "freelancer")).toBeLessThanOrEqual(10);
  });

  it("keeps clauses that do not affect the user below the medium threshold", () => {
    expect(scoreClause(analysis({ affectsUser: false, burdenScore: 9 }), "freelancer")).toBeLessThan(5);
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

  it("marks a high-burden landlord obligation as high", () => {
    expect(severityFor(analysis({ category: "obligation", burdenScore: 9 }), "landlord")).toBe("high");
  });

  it("distinguishes burdened vs protected parties at high burden scores", () => {
    // A highly burdensome indemnity (burdenScore 8) with concerns
    const highRiskClause = analysis({ category: "indemnity", burdenScore: 8, concerns: ["No cap on liability"] });
    // The burdened party (freelancer) should land in 'high' severity
    expect(severityFor(highRiskClause, "freelancer")).toBe("high");
    // The protected party (client) should NOT land in 'high' severity
    expect(severityFor(highRiskClause, "client")).not.toBe("high");
  });

  it("allows a protected party to reach high severity at extreme burden", () => {
    // An extreme indemnity clause with multiple concerns
    const extremeClause = analysis({
      category: "indemnity",
      burdenScore: 10,
      concerns: ["Unlimited liability", "Unilateral", "No exclusions"]
    });
    // Even as the protected party (client), the math must allow it to reach High
    expect(severityFor(extremeClause, "client")).toBe("high");
  });
});
