import { z } from "zod";
import { getGenAI, MODELS } from "./client";
import { clauseBatchResponseSchema } from "./schemas";
import { classificationSystemPrompt, classificationUserPrompt } from "./prompts";
import { clauseAnalysisSchema, type ClauseChunk, type Perspective } from "../types";
import { upstreamFailure } from "../errors";

/**
 * Clauses are classified in batches rather than one call per clause. A 40-clause
 * lease costs 4 requests instead of 40 — the single largest efficiency win in
 * the pipeline, and it keeps latency roughly flat as documents grow.
 */
const BATCH_SIZE = 10;

const batchSchema = z.object({ clauses: z.array(clauseAnalysisSchema) });

export async function classifyClauses(
  chunks: readonly ClauseChunk[],
  perspective: Perspective,
): Promise<Map<string, z.infer<typeof clauseAnalysisSchema>>> {
  const batches = toBatches(chunks, BATCH_SIZE);
  const results = await Promise.all(batches.map((batch) => classifyBatch(batch, perspective)));

  const byId = new Map<string, z.infer<typeof clauseAnalysisSchema>>();
  for (const batch of results) {
    for (const analysis of batch) byId.set(analysis.id, analysis);
  }
  return byId;
}

async function classifyBatch(
  batch: readonly ClauseChunk[],
  perspective: Perspective,
): Promise<z.infer<typeof clauseAnalysisSchema>[]> {
  const ai = getGenAI();
  let raw: string;
  try {
    const response = await ai.models.generateContent({
      model: MODELS.fast,
      contents: classificationUserPrompt(batch.map(({ id, text }) => ({ id, text }))),
      config: {
        systemInstruction: classificationSystemPrompt(perspective),
        responseMimeType: "application/json",
        responseSchema: clauseBatchResponseSchema,
        temperature: 0.2,
      },
    });
    raw = response.text ?? "";
  } catch (error) {
    console.error("[gemini.classify]", error);
    throw upstreamFailure();
  }

  const parsed = batchSchema.safeParse(safeJsonParse(raw));
  if (!parsed.success) {
    console.error("[gemini.classify] schema mismatch", parsed.error.issues);
    throw upstreamFailure();
  }
  // Drop hallucinated ids so a bad batch degrades gracefully instead of corrupting output.
  const known = new Set(batch.map((c) => c.id));
  return parsed.data.clauses.filter((c) => known.has(c.id));
}

function toBatches<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

export function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
