import type { ClauseAnalysis, ClauseCategory, Perspective, Severity } from "./types";

/**
 * Severity is computed in application code, not asked of the model.
 *
 * Two reasons: it is deterministic and therefore testable, and it keeps the
 * perspective rule auditable — a reviewer can read this table and see exactly
 * why an indemnity clause is weighted heavily for a freelancer and lightly for
 * the client who is protected by it.
 */

/** Category weight per perspective. 1.0 is neutral; above 1 raises severity. */
const PERSPECTIVE_WEIGHTS: Record<Perspective, Partial<Record<ClauseCategory, number>>> = {
  tenant: { penalty: 1.3, termination: 1.2, auto_renewal: 1.2, payment: 1.1, obligation: 1.1 },
  landlord: { payment: 1.2, obligation: 1.1, termination: 1.1, penalty: 0.8 },
  employee: { non_compete: 1.4, confidentiality: 1.1, termination: 1.2, intellectual_property: 1.2 },
  employer: { confidentiality: 1.2, intellectual_property: 1.2, non_compete: 0.8 },
  freelancer: { indemnity: 1.4, liability: 1.3, payment: 1.2, intellectual_property: 1.2 },
  client: { intellectual_property: 1.2, confidentiality: 1.1, indemnity: 0.8, liability: 0.8 },
};

/** Categories that are inherently consequential regardless of perspective. */
const BASE_WEIGHTS: Partial<Record<ClauseCategory, number>> = {
  indemnity: 1.2,
  liability: 1.2,
  non_compete: 1.2,
  auto_renewal: 1.1,
  dispute_resolution: 1.1,
};

const HIGH_THRESHOLD = 7;
const MEDIUM_THRESHOLD = 4;

export function weightFor(perspective: Perspective, category: ClauseCategory): number {
  const base = BASE_WEIGHTS[category] ?? 1;
  const perspectiveWeight = PERSPECTIVE_WEIGHTS[perspective][category] ?? 1;
  return base * perspectiveWeight;
}

export function scoreClause(analysis: ClauseAnalysis, perspective: Perspective): number {
  if (!analysis.affectsUser) return Math.min(analysis.burdenScore, MEDIUM_THRESHOLD - 1);
  const weighted = analysis.burdenScore * weightFor(perspective, analysis.category);
  const concernBonus = Math.min(analysis.concerns.length, 3) * 0.4;
  return clamp(weighted + concernBonus, 0, 10);
}

export function severityFor(analysis: ClauseAnalysis, perspective: Perspective): Severity {
  const score = scoreClause(analysis, perspective);
  if (score >= HIGH_THRESHOLD) return "high";
  if (score >= MEDIUM_THRESHOLD) return "medium";
  return "low";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
