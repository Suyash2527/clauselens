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
  tenant: { penalty: 1.5, termination: 1.4, auto_renewal: 1.3, payment: 1.2, obligation: 1.2 },
  landlord: { payment: 1.3, obligation: 1.1, termination: 1.1, penalty: 0.8 },
  employee: { non_compete: 1.6, confidentiality: 1.2, termination: 1.4, intellectual_property: 1.3 },
  employer: { confidentiality: 1.2, intellectual_property: 1.2, non_compete: 0.8 },
  freelancer: { indemnity: 1.6, liability: 1.5, payment: 1.4, intellectual_property: 1.3 },
  client: { intellectual_property: 1.3, confidentiality: 1.2, indemnity: 0.7, liability: 0.8 },
};

/** Categories that are inherently consequential regardless of perspective. */
const BASE_WEIGHTS: Partial<Record<ClauseCategory, number>> = {
  indemnity: 1.2,
  liability: 1.2,
  non_compete: 1.2,
  auto_renewal: 1.1,
  dispute_resolution: 1.1,
};

const HIGH_THRESHOLD = 8;
const MEDIUM_THRESHOLD = 4;

export function weightFor(perspective: Perspective, category: ClauseCategory): number {
  const base = BASE_WEIGHTS[category] ?? 1;
  const perspectiveWeight = PERSPECTIVE_WEIGHTS[perspective][category] ?? 1;
  return base * perspectiveWeight;
}

export function scoreClause(analysis: ClauseAnalysis, perspective: Perspective): number {
  if (!analysis.affectsUser) return Math.min(analysis.burdenScore, MEDIUM_THRESHOLD - 1);
  const weight = weightFor(perspective, analysis.category);
  const weighted = analysis.burdenScore * weight;
  const concernBonus = Math.min(analysis.concerns.length, 3) * 0.4 * weight;
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
