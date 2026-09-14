# ClauseLens

**Vertical: AI for Legal Assistance & Access**

ClauseLens reads a rental, employment, or freelance agreement and explains it clause by clause in
plain English — weighted from *your* side of the deal. It flags what needs attention, shows the
original wording behind every explanation, answers questions grounded only in the document, and
produces a list of questions to take to a real lawyer.

It explains documents. It does not give legal advice.

---

## The idea in one line

The same clause is a risk for one party and a protection for the other, so ClauseLens asks who you
are before it tells you what the contract means.

An uncapped indemnity is severe for a freelancer and benign for the client it protects. A
two-month notice period is a burden on a tenant and a convenience for a landlord. Most document
summarisers ignore this and produce a neutral précis that helps nobody. ClauseLens makes the
user's role the axis the entire analysis turns on.

## Approach and logic

```
paste text
   ↓
sanitise           strip instruction-like text from untrusted document content
   ↓
chunk              split into clause-sized spans, keeping character offsets for citation
   ↓
classify           batched Gemini calls with a strict responseSchema (10 clauses per call)
   ↓
score              severity computed in application code, weighted by the user's role
   ↓
synthesise         red flags + questions for a lawyer
   ↓
ask                follow-up Q&A grounded in the clauses, with clause citations
```

Two decisions carry most of the design:

**Severity is computed locally, not asked of the model.** The model returns a raw burden score and
a category; `src/lib/risk-scoring.ts` applies a role-weighting table to produce the final severity.
This makes the perspective logic deterministic, unit-testable, and auditable — a reviewer can read
the table and see exactly why a verdict changed.

**Every model call is schema-constrained.** `responseSchema` is passed on all three call sites, and
the reply is then validated again with Zod. There is no free-text parsing anywhere in the codebase.

## How the solution works

| Step | Entry point |
|---|---|
| Input validation | `src/lib/types.ts` — Zod schemas for every request and model response |
| Injection defence | `src/lib/injection-guard.ts` |
| Clause splitting | `src/lib/chunking.ts` |
| Gemini calls | `src/lib/gemini/` — client, prompts, response schemas, two call modules |
| Orchestration | `src/lib/analysis/analyze-document.ts` |
| Role weighting | `src/lib/risk-scoring.ts` |
| HTTP surface | `src/app/api/analyze/route.ts`, `src/app/api/ask/route.ts` |
| Interface | `src/app/page.tsx`, `src/components/` |

Detailed request walkthrough: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Google GenAI usage

Built entirely on Google's generative AI stack via the `@google/genai` SDK.

| Purpose | Model | Config |
|---|---|---|
| Clause classification | `gemini-2.0-flash` | `responseSchema`, temperature 0.2, batched 10 per call |
| Document Q&A | `gemini-2.0-flash` | `responseSchema`, temperature 0.3 |
| Lawyer checklist | `gemini-2.0-flash` | `responseSchema`, temperature 0.4 |

Model names are configurable via environment variables (`src/lib/gemini/client.ts`).

## Running it

```bash
npm install
cp .env.example .env.local     # add your Google AI Studio key
npm run dev                    # http://localhost:3000
npm run verify                 # typecheck + lint + tests
```

`GEMINI_API_KEY` is read only in `src/lib/gemini/client.ts`, which is imported exclusively by
server modules. It is never prefixed with `NEXT_PUBLIC_` and never reaches the browser bundle.

---

## How this submission addresses the evaluation criteria

### Code quality
- TypeScript `strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; zero `any`
  (enforced as an ESLint error).
- Business logic lives in `src/lib/` and imports nothing from React. Route handlers are thin —
  validate, rate-limit, delegate.
- One responsibility per module; ESLint warns above 200 lines per file.
- Dependencies are injected into the orchestrator (`AnalyzeDeps`) so the pipeline is testable
  without network access.

### Security
- All model calls are server-side; the API key never enters client code.
- Prompt-injection defence on all untrusted text, with layered mitigation: pattern neutralisation
  (`injection-guard.ts`), explicit `<document_content>` fencing, and a system instruction stating
  that document content is data rather than instructions.
- Zod validation on every request body and every model response.
- Per-IP rate limiting on both routes before any work is done.
- Errors are wrapped in `AppError`; provider messages and stack traces never reach the client.
- Security headers set in `next.config.ts`. Full notes: [`SECURITY.md`](SECURITY.md).

### Efficiency
- Batched classification: a 40-clause lease costs 4 model calls, not 40.
- Content-addressed LRU+TTL cache keyed by `sha256(perspective + document)`; the raw text is never
  used as a key.
- Batches run concurrently via `Promise.all`; clause count is capped so cost stays bounded.
- Severity scoring is pure local computation — no model call.

### Testing
- Vitest suite covering chunking, injection defence, role-weighted scoring, rate limiting,
  validation schemas, caching, and the full orchestration pipeline.
- The Gemini layer is stubbed, so the suite runs offline with no API key.
- GitHub Actions runs `typecheck`, `lint`, and `test` on every push (`.github/workflows/ci.yml`).

### Accessibility
- Semantic landmarks, a skip link, and a labelled heading hierarchy.
- Every control has an associated `<label>`; the role selector carries `aria-describedby`.
- Async results are announced through `role="status"` / `aria-live="polite"` regions.
- Risk is conveyed by text as well as colour — the badge reads "Needs attention", not just red.
- Visible 3px focus rings, full keyboard operability, `prefers-reduced-motion` and
  `prefers-color-scheme` both honoured.
- All text/background pairs meet WCAG AA contrast in both themes.

---

## Assumptions

- Users paste text. PDF upload via the Gemini Files API is a natural extension but was left out to
  keep the repository small and the dependency surface minimal.
- Documents are in English; the clause-numbering heuristics target Indian and common-law
  agreement conventions (`1.`, `(a)`, `Section 4`, `WHEREAS`).
- Analysis is capped at 60 clauses per document to bound cost and latency; truncation is reported
  to the user rather than hidden.
- The cache is in-process, which suits a single-instance deployment. A multi-instance deployment
  would swap `TtlCache` for a shared store behind the same interface.
- No document text is persisted. Nothing is written to disk or to a database.

## Scope limit

ClauseLens is an information tool. It is instructed — in the system prompt and enforced in the
interface — never to advise whether to sign, never to predict how a court would rule, and to say
plainly when the document does not answer a question. The disclaimer is permanent and cannot be
dismissed.
