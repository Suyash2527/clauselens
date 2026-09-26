import type { ClauseAnalysis } from "./types";

/**
 * Returns true if the chunk appears to be non-substantive and can bypass Gemini.
 */
export function isNonSubstantive(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // Page numbers
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(trimmed)) return true;
  if (/^\d+$/.test(trimmed)) return true;

  // Signature / witness blocks
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("signed") ||
    lower.startsWith("witness") ||
    lower.startsWith("date:") ||
    lower.startsWith("name:")
  ) {
    return true;
  }

  // Headings (under 40 characters) or no verb
  // A crude verb check: assume a clause with no words ending in 's', 'ed', 'ing' might lack a verb,
  // but let's just use the length and lack of punctuation for headings.
  if (trimmed.length < 40 && !/[.!?:]/.test(trimmed)) {
    return true;
  }

  // Party address blocks (common pattern: starts with Address: or looks like a short multi-line string with no verbs)
  if (lower.startsWith("address:") || lower.startsWith("registered office:")) {
    return true;
  }

  return false;
}

export function createPrefilteredClause(
  id: string,
): ClauseAnalysis {
  return {
    id,
    category: "other",
    affectsUser: false,
    burdenScore: 0,
    plainSummary: "Administrative or structural text.",
    concerns: [],
    questionForLawyer: null,
  };
}
