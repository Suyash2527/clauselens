import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig } from "@google/genai";
import type { z } from "zod";
import { upstreamFailure } from "../errors";
import { getDemoClient } from "./demo-provider";

/**
 * Single place where the Gemini client is constructed. Nothing outside this
 * module reads GEMINI_API_KEY, and no client component imports this file — the
 * key exists only in the server runtime.
 */
let memoisedClient: GoogleGenAI | null = null;

/**
 * Returns the process-wide Gemini client. Without an API key it falls back to
 * the deterministic demo client, so the app runs end to end with no secrets.
 */
export function getGenAI(): GoogleGenAI {
  if (memoisedClient) return memoisedClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("DEMO MODE ON: GEMINI_API_KEY is absent. Using deterministic fixture responses.");
    memoisedClient = getDemoClient();
    return memoisedClient;
  }
  memoisedClient = new GoogleGenAI({ apiKey });
  return memoisedClient;
}

/**
 * Two tiers so cost tracks the task: bulk classification runs on the cheapest
 * model, while tasks that reason across the whole document use a stronger one.
 * Both are overridable per deployment without a code change.
 */
export const MODELS = {
  /** High-throughput pass used for per-clause classification. */
  fast: process.env.GEMINI_FAST_MODEL ?? "gemini-2.5-flash-lite",
  /** Used for synthesis and document-grounded question answering. */
  deep: process.env.GEMINI_DEEP_MODEL ?? "gemini-2.5-flash",
} as const;

/** Everything that varies between the app's structured Gemini calls. */
export interface StructuredRequest<T> {
  /** Prefix for server logs, e.g. "gemini.classify". */
  logLabel: string;
  model: string;
  contents: ContentListUnion;
  systemInstruction: string;
  /** Constrains the model to JSON of this shape at the API level. */
  responseSchema: GenerateContentConfig["responseSchema"];
  /** Re-validates the reply locally; the API-level schema is not trusted alone. */
  validator: z.ZodType<T, z.ZodTypeDef, unknown>;
  temperature: number;
}

/**
 * Runs one JSON-mode Gemini call and returns the validated payload.
 *
 * Both schemas are required parameters so no call site can skip either layer.
 * Any failure — transport, unparseable JSON, or a shape mismatch — is logged
 * here and surfaced as the generic `upstreamFailure`, never as provider text.
 */
export async function generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
  let raw: string;
  try {
    const response = await getGenAI().models.generateContent({
      model: request.model,
      contents: request.contents,
      config: {
        systemInstruction: request.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: request.responseSchema,
        temperature: request.temperature,
      },
    });
    raw = response.text ?? "";
  } catch (error) {
    console.error(`[${request.logLabel}]`, error);
    throw upstreamFailure();
  }

  const parsed = request.validator.safeParse(parseJsonOrNull(raw));
  if (!parsed.success) {
    console.error(`[${request.logLabel}] schema mismatch`, parsed.error.issues);
    throw upstreamFailure();
  }
  return parsed.data;
}

/** Malformed JSON becomes `null`, which the Zod validator then rejects. */
function parseJsonOrNull(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
