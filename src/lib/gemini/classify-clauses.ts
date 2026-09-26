import { z } from "zod";
import { clauseAnalysisSchema, type ClauseAnalysis, type ClauseChunk, type Perspective } from "../types";
import { generateStructured, MODELS } from "./client";
import { classificationSystemPrompt, classificationUserPrompt } from "./prompts";
import { clauseBatchResponseSchema } from "./schemas";

/**
 * Clauses are classified in batches rather than one call per clause. A 40-clause
 * lease costs 4 requests instead of 40 — the single largest efficiency win in
 * the pipeline, and it keeps latency roughly flat as documents grow.
 */
const BATCH_SIZE = 10;

const clauseBatchSchema = z.object({ clauses: z.array(clauseAnalysisSchema) });

/**
 * Classifies every chunk from the given perspective and returns the analyses
 * keyed by clause id. Batches run in parallel; one failed batch fails the whole
 * call, because a partially analysed contract would understate its risk.
 */
export async function classifyClauses(
  chunks: readonly ClauseChunk[],
  perspective: Perspective,
): Promise<Map<string, ClauseAnalysis>> {
  const batches = toBatches(chunks, BATCH_SIZE);
  const results = await Promise.all(batches.map((batch) => classifyBatch(batch, perspective)));

  const analysesById = new Map<string, ClauseAnalysis>();
  for (const batch of results) {
    for (const analysis of batch) analysesById.set(analysis.id, analysis);
  }
  return analysesById;
}

async function classifyBatch(
  batch: readonly ClauseChunk[],
  perspective: Perspective,
): Promise<ClauseAnalysis[]> {
  const { clauses } = await generateStructured({
    logLabel: "gemini.classify",
    model: MODELS.fast,
    contents: classificationUserPrompt(batch.map(({ id, text }) => ({ id, text }))),
    systemInstruction: classificationSystemPrompt(perspective),
    responseSchema: clauseBatchResponseSchema,
    validator: clauseBatchSchema,
    temperature: 0.2,
  });
  // Drop hallucinated ids so a bad batch degrades gracefully instead of corrupting output.
  const knownIds = new Set(batch.map((chunk) => chunk.id));
  return clauses.filter((analysis) => knownIds.has(analysis.id));
}

function toBatches<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}
