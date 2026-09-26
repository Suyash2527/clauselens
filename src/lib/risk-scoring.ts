import type { ClauseAnalysis, ClauseCategory, Perspective, Severity } from "./types";

/*
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
const MAX_SCORE = 10;

/** Concerns add weight, but only the first few count so a verbose model cannot inflate scores. */
const MAX_CONCERNS_COUNTED = 3;
const SCORE_PER_CONCERN = 0.4;

/**
 * Combined multiplier for a category as seen from one side of the agreement.
 *
 * Perspective weights below 1 are protective: they assume the clause runs in
 * this party's favour (the landlord levies the penalty, the client is the one
 * indemnified). That assumption is only safe while the model agrees. As the
 * burden score climbs above the medium threshold the discount fades linearly
 * to neutral, so a clause the model says bites this party is not scored as
 * one that protects them. Weights of 1 or more are never faded.
 */
export function weightFor(perspective: Perspective, category: ClauseCategory, burdenScore = 0): number {
  const base = BASE_WEIGHTS[category] ?? 1;
  const perspectiveWeight = PERSPECTIVE_WEIGHTS[perspective][category] ?? 1;
  if (perspectiveWeight >= 1) return base * perspectiveWeight;
  const bite = clamp((burdenScore - MEDIUM_THRESHOLD) / (MAX_SCORE - MEDIUM_THRESHOLD), 0, 1);
  return base * (perspectiveWeight + (1 - perspectiveWeight) * bite);
}

/**
 * Numeric risk on a 0-10 scale. A clause that places nothing on the user is
 * capped just below medium, whatever the model's burden score says.
 */
export function scoreClause(analysis: ClauseAnalysis, perspective: Perspective): number {
  if (!analysis.affectsUser) return Math.min(analysis.burdenScore, MEDIUM_THRESHOLD - 1);
  const weight = weightFor(perspective, analysis.category, analysis.burdenScore);
  const weighted = analysis.burdenScore * weight;
  const concernBonus = Math.min(analysis.concerns.length, MAX_CONCERNS_COUNTED) * SCORE_PER_CONCERN * weight;
  return clamp(weighted + concernBonus, 0, MAX_SCORE);
}

/** Buckets the numeric score into the three levels the UI shows. */
export function severityFor(analysis: ClauseAnalysis, perspective: Perspective): Severity {
  const score = scoreClause(analysis, perspective);
  if (score >= HIGH_THRESHOLD) return "high";
  if (score >= MEDIUM_THRESHOLD) return "medium";
  return "low";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
