import { z } from "zod";
import { clauseAnalysisSchema, type ClauseAnalysis, type ClauseChunk, type Perspective } from "../types";
import { generateStructured, MODELS } from "./client";
import { classificationSystemPrompt, classificationUserPrompt } from "./prompts";
import { clauseBatchResponseSchema } from "./schemas";

import { runWithConcurrency } from "../concurrency";

const clauseBatchSchema = z.object({ clauses: z.array(clauseAnalysisSchema) });

/**
 * Classifies every chunk from the given perspective and returns the analyses
 * keyed by clause id. Batches run concurrently (up to 3 in flight). 
 * One failed batch fails the whole call, because a partially analysed contract 
 * would understate its risk.
 */
export async function classifyClauses(
  chunks: readonly ClauseChunk[],
  perspective: Perspective,
): Promise<Map<string, ClauseAnalysis>> {
  const batches = toDynamicBatches(chunks);
  const results = await runWithConcurrency(batches, 3, (batch) => classifyBatch(batch, perspective));

  // Build a lookup map from the returned analyses
  const lookup = new Map<string, ClauseAnalysis>();
  for (const batch of results) {
    for (const analysis of batch) {
      lookup.set(analysis.id, analysis);
    }
  }

  // Populate the final Map by iterating through chunks to preserve the original clause order
  const analysesById = new Map<string, ClauseAnalysis>();
  for (const chunk of chunks) {
    const analysis = lookup.get(chunk.id);
    if (analysis) {
      analysesById.set(chunk.id, analysis);
    }
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

function toDynamicBatches(chunks: readonly ClauseChunk[]): ClauseChunk[][] {
  const batches: ClauseChunk[][] = [];
  let currentBatch: ClauseChunk[] = [];
  let currentTokens = 0;

  for (const chunk of chunks) {
    const chunkTokens = Math.ceil(chunk.text.length / 4);
    
    // If adding this chunk would exceed limits (and the batch is not empty)
    if (currentBatch.length > 0 && (currentBatch.length >= 20 || currentTokens + chunkTokens > 8000)) {
      batches.push(currentBatch);
      currentBatch = [];
      currentTokens = 0;
    }
    
    currentBatch.push(chunk);
    currentTokens += chunkTokens;
  }
  
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  
  return batches;
}
