import { GoogleGenAI } from "@google/genai";

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
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  cached = new GoogleGenAI({ apiKey });
  return cached;
}

export const MODELS = {
  /** High-throughput pass used for per-clause classification. */
  fast: process.env.GEMINI_FAST_MODEL ?? "gemini-2.0-flash",
  /** Used for synthesis and document-grounded question answering. */
  deep: process.env.GEMINI_DEEP_MODEL ?? "gemini-2.0-flash",
} as const;

/** Test seam — drops the memoised client so env changes take effect. */
export function resetGenAIClient(): void {
  cached = null;
}
