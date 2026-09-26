# ClauseLens

Legal documents are dense, complex, and difficult to navigate without professional help. ClauseLens is an AI-powered assistant that makes contracts accessible by explaining them in plain English.

ClauseLens directly addresses the challenge of making legal documents more approachable by:
- simplifying complex legal documents
- highlighting important clauses, obligations and risks
- answering questions based on provided legal documents
- generating summaries and actionable checklists
- helping users prepare questions for a legal professional

**ClauseLens provides information and assistance to help you understand a document; it does not replace professional legal advice.**

---

## The Differentiator: Role-Aware Analysis

The same clause is a risk for one party and a protection for the other. ClauseLens asks who you are before it tells you what the contract means, scoring severity from your perspective.

**Example: An Indemnity Clause**
*Clause*: "The freelancer agrees to indemnify and hold the client harmless against any claims, damages, or liabilities arising out of the freelancer's work."

If you analyze this as a **Freelancer**:
- Base weight (1.2) × Perspective penalty (1.6) = **High severity (Score: 9.6)**

If you analyze this as a **Client**:
- Base weight (1.2) × Perspective protection (0.7) = **Low severity (Score: 4.2)**

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
- Configurable models: `src/lib/gemini/client.ts` routes classification and synthesis to `gemini-2.0-flash`.

### Security
- The `GEMINI_API_KEY` never leaves the server (`src/lib/gemini/client.ts`).
- Prompt-injection defence neutralises known patterns (`src/lib/injection-guard.ts`).
- PDF and DOCX uploads validate magic bytes, strictly limit size to 5MB, and pass through the injection guard (`src/app/api/extract/route.ts`).
- See [`SECURITY.md`](SECURITY.md) for full details on headers and mitigation.

### Efficiency
- Batched classification: `src/lib/gemini/classify-clauses.ts` runs 10 clauses per prompt concurrently.
- Severity scoring is calculated locally without a model call (`src/lib/risk-scoring.ts`).

### Testing
- 64 tests across 10 files cover chunking, validation, scoring, extraction, injection guard, and orchestration.
- `npm run test` executes the Vitest suite offline via stubbed model responses.

### Accessibility
- Fully keyboard-accessible controls, `<label>` bindings, and `aria-live` regions for async results (`src/app/page.tsx`).

---

## Assumptions

- **Supported file types**: Text pasting, PDFs, and DOCX files. Extraction happens on the server via `pdf-parse` and `mammoth` respectively, eliminating the need to send entire files directly to the Gemini Files API.
- **English-only**: Clause numbering heuristics target common-law and standard English conventions.
- **60-clause cap**: Analysis is capped at 60 clauses to bound latency. Truncation is explicitly reported to the user.
- **Ephemeral State**: In-process caching bounds memory footprint. No document text is persisted to a database or disk.

## Scope limit

ClauseLens is strictly an information tool. The interface permanently displays a disclaimer stating that it does not provide legal advice, and the model is instructed never to predict court rulings or advise a user on whether to sign a document.
