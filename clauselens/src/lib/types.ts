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

export const perspectiveSchema = z.enum(PERSPECTIVES);
export type Perspective = z.infer<typeof perspectiveSchema>;

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

export const clauseCategorySchema = z.enum(CLAUSE_CATEGORIES);
export type ClauseCategory = z.infer<typeof clauseCategorySchema>;

export const SEVERITIES = ["low", "medium", "high"] as const;
export const severitySchema = z.enum(SEVERITIES);
export type Severity = z.infer<typeof severitySchema>;

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
export type ClauseAnalysis = z.infer<typeof clauseAnalysisSchema>;

/** A clause chunk joined with its analysis and locally computed severity. */
export interface AnalyzedClause extends ClauseChunk {
  analysis: ClauseAnalysis;
  severity: Severity;
}

export interface DocumentAnalysis {
  perspective: Perspective;
  clauses: AnalyzedClause[];
  redFlags: AnalyzedClause[];
  lawyerChecklist: string[];
  truncated: boolean;
}

export const analyzeRequestSchema = z.object({
  text: z.string().min(50, "Document is too short to analyse.").max(120_000),
  perspective: perspectiveSchema,
});
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const askRequestSchema = z.object({
  question: z.string().min(3).max(500),
  perspective: perspectiveSchema,
  clauses: z
    .array(z.object({ id: z.string(), index: z.number().int(), text: z.string().max(8_000) }))
    .min(1)
    .max(60),
});
export type AskRequest = z.infer<typeof askRequestSchema>;

export const askAnswerSchema = z.object({
  answer: z.string(),
  citedClauseIds: z.array(z.string()),
  answerable: z.boolean(),
});
export type AskAnswer = z.infer<typeof askAnswerSchema>;
