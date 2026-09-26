# ClauseLens

Legal documents are dense, complex, and difficult to navigate without professional help. ClauseLens is an AI-powered assistant that makes contracts accessible by explaining them in plain English.

ClauseLens directly addresses the challenge of making legal documents more approachable by:
- simplifying complex legal documents
- highlighting important clauses, obligations and risks
- answering questions based on provided legal documents
- generating summaries and actionable checklists
- helping users prepare questions for a legal professional

**ClauseLens explains documents. It does not give legal advice.**

---

## The Differentiator: Role-Aware Analysis

The same clause is a risk for one party and a protection for the other. ClauseLens asks who you are before it tells you what the contract means, scoring severity from your perspective.

**Example: An Indemnity Clause**
*Clause*: "The freelancer agrees to indemnify and hold the client harmless against any claims, damages, or liabilities arising out of the freelancer's work."
*Raw Burden Score*: 8 (with 1 concern: "No cap on liability")

If you analyze this as a **Freelancer**:
- Base weight (1.2) × Perspective penalty (1.6) = Weight of 1.92
- (Score 8 × 1.92) + (Concern bonus 0.4 × 1.92) = **High severity (Score: 10.0)** (clamped)

If you analyze this as a **Client**:
- Base weight (1.2) × Perspective protection (0.7) = Weight of 0.84
- (Score 8 × 0.84) + (Concern bonus 0.4 × 0.84) = **Medium severity (Score: 7.1)**

This single mechanism ensures the analysis is actually useful to the person reading it, rather than producing a neutral summary that helps nobody.

---

## Run it in 30 seconds

```bash
npm install
npm run dev
```

**ClauseLens includes a full Demo Mode.** It will run perfectly with deterministic fixture responses without an API key, allowing you to test the interface, file uploads, and pipeline locally right away. To use live Gemini responses, copy `.env.example` to `.env.local` and add your `GEMINI_API_KEY`.

---

## How it works

```
upload (PDF/DOCX)
   ↓
extract            extract raw text from file buffer in memory
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

---

## Evaluation Criteria

### Code Quality
- TypeScript `strict` with zero `any` usage.
- Business logic is isolated in `src/lib/` without React imports. Route handlers delegate all work.
- Configurable models: `src/lib/gemini/client.ts` routes classification to `gemini-2.5-flash-lite` and synthesis to `gemini-2.5-flash`.

### Security
- The `GEMINI_API_KEY` never leaves the server (`src/lib/gemini/client.ts`).
- Prompt-injection defence neutralises known patterns (`src/lib/injection-guard.ts`).
- File uploads validate magic bytes and are strictly limited to 5MB (`src/app/api/extract/route.ts`).
- All incoming requests and model responses are validated using strictly defined Zod schemas.
- A fixed-window per-IP rate limiter guards all routes before any processing or model calls.
- Strict transport security headers are enforced in `next.config.ts`, including `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, and a `Content-Security-Policy-Report-Only`.
- See [`SECURITY.md`](SECURITY.md) for full details on headers, mitigation, and dependency advisories.

### Efficiency
- Batched classification: `src/lib/gemini/classify-clauses.ts` runs 10 clauses per prompt concurrently.
- Severity scoring is calculated locally without a model call (`src/lib/risk-scoring.ts`).

### Testing
- 64 tests across 10 files cover chunking, validation, scoring, extraction, injection guard, and orchestration.
- The Vitest suite runs offline with no API key via demo mode stubs (`npm run test`).
- GitHub Actions automatically runs `typecheck`, `lint`, and `test` on every push.

### Accessibility
- Semantic landmarks, a skip link, and a labelled heading hierarchy.
- Every control has an associated `<label>`; the role selector carries `aria-describedby`.
- Async results are announced through `role="status"` / `aria-live="polite"` regions.
- Risk is conveyed by text as well as colour — the badge reads "Needs attention", not just red.
- Visible 3px focus rings, full keyboard operability, `prefers-reduced-motion` and `prefers-color-scheme` both honoured.
- All text/background pairs meet WCAG AA contrast in both themes.

---

## Assumptions

- **Supported file types**: Text pasting, PDFs, and DOCX files. PDF extraction sends the file to Gemini via `inlineData`. DOCX uses `mammoth` locally to extract text.
- **English-only**: Clause numbering heuristics target common-law and standard English conventions.
- **60-clause cap**: Analysis is capped at 60 clauses to bound latency. Truncation is explicitly reported to the user.
- **Ephemeral State**: In-process caching bounds memory footprint. No document text is persisted to a database or disk.

## Scope limit

ClauseLens is strictly an information tool. The interface permanently displays a disclaimer stating that it does not provide legal advice, and the model is instructed never to predict court rulings or advise a user on whether to sign a document.
