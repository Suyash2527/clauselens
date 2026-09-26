import { z } from "zod";

/**
 * The user's side of the agreement. Risk is always scored *relative to this
 * role* — an uncapped indemnity is severe for a freelancer and benign for the
 * client who benefits from it. This is the core of the app's context-awareness.
 */
export const PERSPECTIVES = [
  "tenant",
  "landlord",
  "employee",
  "employer",
  "freelancer",
  "client",
] as const;

const perspectiveSchema = z.enum(PERSPECTIVES);
/** One of `PERSPECTIVES`. */
export type Perspective = z.infer<typeof perspectiveSchema>;

/**
 * Fixed taxonomy the model must classify into. Kept closed so risk weights can
 * be assigned per category and the model cannot invent new ones.
 */
export const CLAUSE_CATEGORIES = [
  "payment",
  "termination",
  "auto_renewal",
  "penalty",
  "indemnity",
  "liability",
  "confidentiality",
  "non_compete",
  "dispute_resolution",
  "intellectual_property",
  "obligation",
  "other",
] as const;

const clauseCategorySchema = z.enum(CLAUSE_CATEGORIES);
/** One of `CLAUSE_CATEGORIES`. */
export type ClauseCategory = z.infer<typeof clauseCategorySchema>;

/** Derived locally by `severityFor`, never taken from the model. */
export type Severity = "low" | "medium" | "high";

/** A raw span of the source document, before any model call. */
export interface ClauseChunk {
  id: string;
  /** 1-based position in the document, used for stable citation. */
  index: number;
  text: string;
  /** Character offsets into the original text, so the UI can highlight source. */
  startOffset: number;
  endOffset: number;
}

/** The model's structured verdict on a single clause. */
export const clauseAnalysisSchema = z.object({
  id: z.string(),
  category: clauseCategorySchema,
  plainSummary: z.string().min(1).max(600),
  affectsUser: z.boolean(),
  /** 0-10, model-assigned burden on the chosen perspective. */
  burdenScore: z.number().min(0).max(10),
  concerns: z.array(z.string().max(300)).max(5),
  questionForLawyer: z.string().max(300).nullable(),
});
/** Validated model output for one clause. */
export type ClauseAnalysis = z.infer<typeof clauseAnalysisSchema>;

/** A clause chunk joined with its analysis and locally computed severity. */
export interface AnalyzedClause extends ClauseChunk {
  analysis: ClauseAnalysis;
  severity: Severity;
}

/** Response body of `POST /api/analyze`; also the cached unit of work. */
export interface DocumentAnalysis {
  perspective: Perspective;
  clauses: AnalyzedClause[];
  redFlags: AnalyzedClause[];
  lawyerChecklist: string[];
  /** True when the document exceeded the clause limit and only the start was analysed. */
  truncated: boolean;
}

/** Request body of `POST /api/analyze`. The size ceiling bounds model cost per request. */
export const analyzeRequestSchema = z.object({
  text: z.string().min(50, "Document is too short to analyse.").max(120_000),
  perspective: perspectiveSchema,
});

/**
 * Request body of `POST /api/ask`. Clauses travel with the question so the
 * server stays stateless; the caps stop a client using it as a free proxy.
 */
export const askRequestSchema = z.object({
  question: z.string().min(3).max(500),
  perspective: perspectiveSchema,
  clauses: z
    .array(z.object({ id: z.string(), index: z.number().int(), text: z.string().max(8_000) }))
    .min(1)
    .max(60),
});

/** Validated model reply to a question, returned by `POST /api/ask`. */
export const askAnswerSchema = z.object({
  answer: z.string(),
  citedClauseIds: z.array(z.string()),
  answerable: z.boolean(),
});
/** See `askAnswerSchema`. */
export type AskAnswer = z.infer<typeof askAnswerSchema>;
