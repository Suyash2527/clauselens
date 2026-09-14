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
4. **Cache probe** (`cache.ts`) — `sha256(perspective + text)`. A hit returns immediately with zero
   model calls.
5. **Sanitise** (`injection-guard.ts`) — injection patterns neutralised, fence escapes collapsed.
6. **Chunk** (`chunking.ts`) — split on blank lines, merge unnumbered continuations into the
   preceding clause, split oversized clauses on sentence boundaries. Character offsets into the
   normalised text are preserved so the UI can show exact source.
7. **Cap** — at most 60 clauses; `truncated: true` is returned rather than silently dropping text.
8. **Classify** (`gemini/classify-clauses.ts`) — clauses are batched 10 per call and the batches run
   concurrently. Each call passes `responseSchema`; the reply is validated with Zod and filtered
   against the known clause ids.
9. **Score** (`risk-scoring.ts`) — pure local computation. `burdenScore × roleWeight(category)`
   plus a concern bonus, thresholded into low / medium / high.
10. **Synthesise** (`gemini/answer-question.ts`) — concerns from the high-severity clauses become
    questions for a lawyer. A failure here returns an empty checklist rather than failing the
    analysis.
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

Per-clause calls make cost and latency scale linearly with document length. Batching ten clauses
per call cuts a 40-clause lease from 40 requests to 4, and running those four concurrently keeps
wall-clock time roughly flat as documents grow. The batch size is a single constant in
`classify-clauses.ts`.

## Extension points

- **PDF input** — add a Files API upload step ahead of step 5; nothing downstream changes.
- **Clause retrieval for long documents** — swap the "send all clauses" approach in `/api/ask` for
  `gemini-embedding-001` top-k retrieval. The route's contract stays identical.
- **Shared cache / limiter** — `TtlCache` and the limiter are small interfaces; a Redis-backed
  implementation drops in without touching callers.
- **More perspectives** — add to `PERSPECTIVES` and the weighting table. The type system will point
  at every place that needs updating.
