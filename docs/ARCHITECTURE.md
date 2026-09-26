# Architecture

## Layers

```
src/app/         HTTP + UI. Route handlers validate and delegate; components render.
src/components/  Presentational React. No data fetching logic beyond calling the two routes.
src/lib/         All business logic. Imports nothing from React or Next.
src/lib/gemini/  The only place that talks to Google GenAI.
tests/           Vitest, running entirely offline against stubbed model calls.
```

The rule that shapes everything: **`src/lib/` never imports React, and components never import
`src/lib/gemini/`.** That keeps the model layer server-only and the logic layer testable.

## Request walkthrough — `POST /api/analyze`

1. **Rate limit** (`rate-limit.ts`) — per-IP fixed window, checked before any work.
2. **Size check** — `content-length` is rejected above 300 KB before the body is read.
3. **Validation** (`types.ts`) — Zod parses `{ text, perspective }`; failure returns a 400 with the
   first issue message.
4. **Extract** (for files) — if `POST /api/extract` is called, PDF/DOCX buffers are parsed locally in-memory into raw text before analysis begins.
5. **Cache probe** (`cache.ts`) — `sha256(perspective + text)`. A hit returns immediately with zero
   model calls.
6. **Sanitise** (`injection-guard.ts`) — injection patterns neutralised, fence escapes collapsed.
6. **Chunk** (`chunking.ts`) — split on blank lines, merge unnumbered continuations into the
   preceding clause, split oversized clauses on sentence boundaries. Character offsets into the
   normalised text are preserved so the UI can show exact source.
7. **Cap** — at most 60 clauses; `truncated: true` is returned rather than silently dropping text.
8. **Classify** (`gemini/classify-clauses.ts`) — clauses are batched up to 20 per call (or ~8000 tokens) and the batches run
   concurrently (max 3 in flight). Each call passes `responseSchema`; the reply is validated with Zod and filtered
   against the known clause ids.
9. **Score** (`risk-scoring.ts`) — pure local computation. `burdenScore × roleWeight(category)`
   plus a concern bonus, thresholded into low / medium / high.
10. **Synthesise** (`analyze-document.ts`) — questions for a lawyer from the analyzed clauses are collected locally, deduplicated, sorted by severity, and capped at 10 to form the lawyer checklist.
11. **Cache and return** the `DocumentAnalysis`.

## Request walkthrough — `POST /api/ask`

Same guards, then: sanitise both the question and the supplied clauses, call Gemini with the
clauses as the only grounding, and return `{ answer, citedClauseIds, answerable }`. When the
document does not contain the answer, `answerable` is false and the model says so rather than
inventing one.

## Why severity is computed outside the model

Asking a model for a severity label makes the most important output in the app non-deterministic
and untestable, and hides the role logic inside a prompt. Instead the model supplies observations —
category, raw burden, concerns — and `risk-scoring.ts` applies an explicit weighting table. The
consequence is that `tests/risk-scoring.test.ts` can assert the central product claim directly:
*the same clause scores higher for the burdened party than for the protected one.*

## Why classification is batched

Per-clause calls make cost and latency scale linearly with document length. Batching up to 20 clauses
or ~8000 tokens per call cuts a 40-clause lease from 40 requests down to 2. Running those concurrently
(capped at 3 in flight) keeps wall-clock time flat and limits memory spikes as documents grow. The
batching logic is handled dynamically in `classify-clauses.ts`.

## Extension points

- **Document OCR** — extend the `extract` pipeline to handle image-based PDFs, either via a local worker or by delegating to the Gemini Files API.
- **Clause retrieval for long documents** — swap the "send all clauses" approach in `/api/ask` for
  `gemini-embedding-001` top-k retrieval. The route's contract stays identical.
- **Shared cache / limiter** — `TtlCache` and the limiter are small interfaces; a Redis-backed
  implementation drops in without touching callers.
- **More perspectives** — add to `PERSPECTIVES` and the weighting table. The type system will point
  at every place that needs updating.
