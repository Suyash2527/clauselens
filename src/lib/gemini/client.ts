import { GoogleGenAI } from "@google/genai";
import { getDemoClient } from "./demo-provider";

/**
 * Single place where the Gemini client is constructed. Nothing outside this
 * module reads GEMINI_API_KEY, and no client component imports this file — the
 * key exists only in the server runtime.
 */
let cached: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("DEMO MODE ON: GEMINI_API_KEY is absent. Using deterministic fixture responses.");
    cached = getDemoClient();
    return cached;
  }
  cached = new GoogleGenAI({ apiKey });
  return cached;
}

export const MODELS = {
  /** High-throughput pass used for per-clause classification. */
  fast: process.env.GEMINI_FAST_MODEL ?? "gemini-1.5-flash",
  /** Used for synthesis and document-grounded question answering. */
  deep: process.env.GEMINI_DEEP_MODEL ?? "gemini-1.5-flash",
} as const;

/** Test seam — drops the memoised client so env changes take effect. */
export function resetGenAIClient(): void {
  cached = null;
}
