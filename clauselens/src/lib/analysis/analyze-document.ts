import { chunkIntoClauses } from "../chunking";
import { sanitiseDocumentText } from "../injection-guard";
import { classifyClauses } from "../gemini/classify-clauses";
import { buildLawyerChecklist } from "../gemini/answer-question";
import { severityFor } from "../risk-scoring";
import { TtlCache, cacheKey } from "../cache";
import { badRequest } from "../errors";
import type {
  AnalyzedClause,
  ClauseAnalysis,
  ClauseChunk,
  DocumentAnalysis,
  Perspective,
} from "../types";

const MAX_CLAUSES = 60;
const analysisCache = new TtlCache<DocumentAnalysis>();

/**
 * Dependencies are injected so the orchestrator can be tested without network
 * access. Production callers use the defaults; tests pass stubs.
 */
export interface AnalyzeDeps {
  classify: typeof classifyClauses;
  checklist: typeof buildLawyerChecklist;
}

const defaultDeps: AnalyzeDeps = {
  classify: classifyClauses,
  checklist: buildLawyerChecklist,
};

/**
 * Full pipeline: sanitise untrusted text, split into clauses, classify in
 * batches, then score severity locally against the user's perspective.
 */
export async function analyzeDocument(
  rawText: string,
  perspective: Perspective,
  deps: AnalyzeDeps = defaultDeps,
): Promise<DocumentAnalysis> {
  const key = cacheKey(perspective, rawText);
  const cached = analysisCache.get(key);
  if (cached) return cached;

  const { text } = sanitiseDocumentText(rawText);
  const allChunks = chunkIntoClauses(text);
  if (allChunks.length === 0) {
    throw badRequest("No readable clauses were found. Check that the text pasted correctly.");
  }

  const truncated = allChunks.length > MAX_CLAUSES;
  const chunks = truncated ? allChunks.slice(0, MAX_CLAUSES) : allChunks;

  const analyses = await deps.classify(chunks, perspective);
  const clauses = joinAnalyses(chunks, analyses, perspective);
  const redFlags = clauses
    .filter((clause) => clause.severity === "high")
    .sort((a, b) => b.analysis.burdenScore - a.analysis.burdenScore);

  const concerns = redFlags.flatMap((clause) => clause.analysis.concerns).slice(0, 12);
  const lawyerChecklist = await deps.checklist(concerns, perspective);

  const result: DocumentAnalysis = { perspective, clauses, redFlags, lawyerChecklist, truncated };
  analysisCache.set(key, result);
  return result;
}

function joinAnalyses(
  chunks: readonly ClauseChunk[],
  analyses: ReadonlyMap<string, ClauseAnalysis>,
  perspective: Perspective,
): AnalyzedClause[] {
  const joined: AnalyzedClause[] = [];
  for (const chunk of chunks) {
    const analysis = analyses.get(chunk.id);
    if (!analysis) continue;
    joined.push({ ...chunk, analysis, severity: severityFor(analysis, perspective) });
  }
  return joined;
}
