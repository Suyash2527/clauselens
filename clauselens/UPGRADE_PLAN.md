# ClauseLens → 99.5+ Upgrade Plan (for the IDE agent)

> This is the existing **Next.js 15 + `@google/genai`** ClauseLens project. **Do not rewrite it or switch frameworks.** Upgrade it in place, following the phases below in order.
> Target: beat NyayaLens AI (99.25) on Hack2skill PromptWars — "AI for Legal Assistance & Access".
> Rubric: Code Quality, Security, Efficiency, Testing, Accessibility, Problem Alignment, and Google services usage.
> Constraints: public repo < 10 MB, single branch `main`, max 3 attempts, Google GenAI only.

---

## Current state vs competitor

| Area | ClauseLens now | NyayaLens (99.25) | Action |
|---|---|---|---|
| Gemini SDK | ✅ new `@google/genai`, `responseSchema` + Zod | ❌ old SDK | Keep; upgrade model to `gemini-2.5-flash` |
| Unique idea | ✅ role-weighted, deterministic risk scoring | ❌ neutral | **Make this the headline** |
| Repo size | ✅ ~0.7 MB | ✅ | Keep |
| CI | ✅ typecheck, lint, test | ❌ none | Add coverage, build, audit, e2e |
| Tests | ~69 cases, lib only, no coverage gate | ~92 cases incl. components, API, a11y | Go to 160+ with a 90% coverage gate |
| Security headers | nosniff, XFO, referrer, permissions | Helmet + strict CSP + HSTS | Add CSP, HSTS, COOP/CORP |
| Accessibility | basic `aria-live`, `lang="en"` | WCAG 2.2 AA, skip link, 3 languages, voice, reading levels | Add all of these |
| Features | analyze, ask, extract, lawyer questions | 7 modules | Add Compare, Action Kit, Brief export, Legal-aid, Options |
| Docs | ARCHITECTURE, SECURITY, BUILD-BRIEF | + threat model, a11y audit, prompts | Add 5 docs |
| README | good narrative | evaluation matrix with numbers | Add matrix + badges |
| Hygiene | stray `results*.txt`, `distributions.txt`, `run-analysis.js` | clean | Delete |

---

## Phase 0 — Cleanup (do first)

1. Delete `results.txt`, `results2.txt`, `results3.txt`, `distributions.txt`, `run-analysis.js` and `docs/BUILD-BRIEF.md`. Delete this plan file too, before the final push.
2. Make sure `.env.local` is never committed (it is gitignored — keep it that way). `.env.example` must list every variable with no real values.
3. `git init -b main` if needed, one branch only.
4. Add `LICENSE` (MIT), `CONTRIBUTING.md`, `.editorconfig`, and `.github/dependabot.yml`.
5. In `src/lib/gemini/client.ts`: set the default model to `gemini-2.5-flash` (env-overridable) and the fallback to `gemini-2.5-flash-lite`. Add a 25s timeout, plus 2 retries with exponential backoff and jitter on 429/5xx.

## Phase 1 — Code Quality

- `tsconfig.json`: add `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- `eslint.config.mjs`: use `typescript-eslint` `strictTypeChecked`, and add `eslint-plugin-jsx-a11y`, `eslint-plugin-security` and `eslint-plugin-react-hooks`. Rules: `complexity: 10`, `max-lines: 250`, `max-lines-per-function: 40`, `no-console: error` (except in the logger), `@typescript-eslint/no-explicit-any: error`. Run lint with `--max-warnings 0`.
- Add `"format:check": "prettier --check ."` and run it in CI.
- Every exported function gets TSDoc. Keep routes thin and put the logic in `src/lib`.
- Add `src/lib/env.ts`: validate env with Zod at startup and fail fast.
- Add `src/lib/logger.ts`: structured JSON logs (`severity`, `requestId`, `route`, `status`, `latencyMs`, `cacheHit`), **never** document text or questions. Use the Cloud Logging-compatible format.

## Phase 2 — Security

1. **CSP + HSTS** in `next.config.ts` (use a nonce via `src/middleware.ts` if Next needs inline scripts):
   ```
   default-src 'self'; script-src 'self' 'nonce-{N}' 'strict-dynamic'; style-src 'self' 'unsafe-inline';
   img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none';
   base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
   ```
   Also add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin`. Allow `microphone=(self)` only if voice input is added.
2. **Request limits:** reject bodies over 1 MB JSON / 5 MB uploads. Reject text over 200k characters. Return 413/415 with the safe error shape.
3. **Upload validation by magic bytes** in `src/lib/extract/mime.ts`: `%PDF-`, `PK\x03\x04` for DOCX, and UTF-8 for text. Reject extension spoofing and encrypted PDFs.
4. **PII masking** (`src/lib/pii-mask.ts`) before any Gemini call: Aadhaar, PAN, Indian phone, email, bank account/IFSC.
5. **Grounding verifier** (`src/lib/grounding.ts`): every model-cited quote must exist in the source (exact, or after whitespace/punctuation normalization). Drop unverified claims, and abstain when the grounded ratio is below 0.7.
6. **Prompt injection:** keep `injection-guard.ts`. Also wrap the document in `<<<DOCUMENT_START>>>…<<<DOCUMENT_END>>>` delimiters, strip delimiter look-alikes from input, and add an adversarial fixture test.
7. **Same-origin check** on `/api/*` (the `Origin` header must match `ALLOWED_ORIGINS` exactly; no suffix matching).
8. Add `npm audit --audit-level=high` in CI.
9. Write `docs/threat-model.md`: a STRIDE table, with each threat mapped to its mitigation and the file that implements it.

## Phase 3 — Efficiency

- Keep deterministic chunking + local role scoring (highlight it in the README as "AI only where needed").
- Cache: key it by SHA-256 of (normalized text + role + task + promptVersion), with 1h TTL, and expose the hit rate at `/api/health`.
- Run batched classification with bounded concurrency (3 in parallel), and use `countTokens` to size chunks.
- Stream analysis results to the UI (a streamed route response), so clause cards appear progressively.
- `next/dynamic` lazy-load for Compare, Brief and Q&A panels. Add `size-limit`, with first-load JS ≤ 120 KB gz enforced in CI.
- Add `/api/health` returning `{ status, version, uptime, cache: { size, hitRate } }`.
- Write `docs/performance.md` with bundle size, Lighthouse scores (target ≥ 95 all) and cache stats.

## Phase 4 — Problem Alignment (new features; keep the role-based idea central)

Keep **"Who are you in this deal?"** (tenant/landlord, employee/employer, freelancer/client) as the axis for every feature.

1. **Reading levels + languages:** Simple / Standard / Detailed, in English / हिन्दी / मराठी (Gemini output in the target language; mark each block with a `lang` attribute).
2. **Compare versions** (`/api/compare`): align clauses deterministically (Jaccard similarity), diff them, then ask Gemini only for materiality **from the user's role**, e.g. "this change hurts you as tenant".
3. **Action Kit:** extract obligations per party and a timeline of key dates. Resolve absolute and relative dates ("within 30 days of") deterministically. Offer `.ics` calendar export.
4. **Options & sample wording:** for each red-flag clause, give Negotiate / Clarify / Seek counsel options with a polite message the user can send to the other party.
5. **Missing-clause detector:** a deterministic checklist per document type (e.g. a rent agreement with no deposit-refund timeline, notice period or maintenance clause).
6. **Lawyer Prep Brief export:** accessible HTML, plain text and a print stylesheet (→ PDF).
7. **Legal Boundary Guard:**
   - Detect advice-seeking questions ("should I sign", "can I sue", "will I win") in English, Hindi and Marathi.
   - Answer those with informational framing.
   - Add a post-filter that blocks imperatives ("you must", "this is illegal").
   - Always show NALSA **15100**, DLSA and Tele-Law signposting.
8. **"Try a sample" button:** loads a fixture so judges can test without uploading.
9. **Demo/mock provider:** the app and all tests work with no `GEMINI_API_KEY`, using deterministic fixtures.

## Phase 5 — Accessibility (WCAG 2.2 AA)

- Add a skip link, landmarks (`header`/`nav`/`main`/`footer`), one `h1` per view and a correct heading order.
- Visible focus ring (≥ 3:1 contrast), full keyboard operation, roving tabindex on the clause/risk list, and modals that trap focus, close on `Esc` and return focus.
- Risk shown by **text + icon + pattern** (never color alone). Contrast ≥ 4.5:1 in light and dark themes.
- `aria-live` announcer for results and errors, `aria-busy` while loading, `role="alert"` for errors, and fields linked to errors via `aria-describedby`.
- Targets ≥ 24×24px. Respect `prefers-reduced-motion` and `prefers-color-scheme`. Layout reflows at 200% zoom.
- Read-aloud (Web Speech API) and voice question input, each with a visible toggle.
- Dyslexia-friendly font toggle and high-contrast toggle, saved in `localStorage` wrapped in try/catch.
- Write `docs/accessibility-audit.md`: list every WCAG 2.2 AA criterion with pass/NA status and its evidence (test name or file).

## Phase 6 — Testing (target 160+ tests, ≥ 90% coverage enforced)

Install `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `axe-core` (or `vitest-axe`), `@vitest/coverage-v8` and `@playwright/test`.

`vitest.config.ts`:
```ts
test: {
  environment: 'node',
  environmentMatchGlobs: [['tests/components/**', 'jsdom']],
  include: ['tests/**/*.test.{ts,tsx}'],
  setupFiles: ['tests/setup.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov', 'json-summary', 'html'],
    include: ['src/**'],
    exclude: ['src/app/layout.tsx', '**/*.d.ts'],
    thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
  },
}
```

Add these tests:

| New suite | Minimum cases |
|---|---|
| API routes (`/api/analyze`, `/ask`, `/extract`, `/compare`, `/health`): 200, 400, 413, 415, 429, origin reject, headers | 25 |
| Components (every component: render, keyboard, loading/error states, aria) | 25 |
| axe a11y on every view (0 violations) | 6 |
| Grounding verifier | 12 |
| PII masking | 10 |
| Advice detector + imperative filter (en/hi/mr) | 15 |
| Dates + `.ics` | 12 |
| Compare/diff | 10 |
| Magic bytes / spoofing | 8 |
| Prompt-injection adversarial fixture end to end with mock provider | 5 |
| Gemini client retry/timeout (mocked) | 6 |
| Playwright E2E: sample → analyze → switch role → ask with citation → export brief → keyboard-only run | 6 |

Write `docs/testing.md`: the test pyramid, commands and the coverage table (paste the real numbers).

## Phase 7 — Google services (show breadth)

| Service | Use |
|---|---|
| Gemini 2.5 Flash via `@google/genai` | structured output, `systemInstruction`, safety settings, `countTokens` |
| **Cloud Run** | deploy the Next.js app (`output: 'standalone'`, multi-stage Dockerfile, non-root user, `HEALTHCHECK`) |
| **Secret Manager** | `GEMINI_API_KEY` injected into Cloud Run |
| **Cloud Logging** | structured JSON logs from `logger.ts` |
| **Firestore** (optional, opt-in) | save a shareable Lawyer Brief with a 24h TTL, never the full document; `firestore.rules` deny by default, plus rules tests |
| **Cloud Text-to-Speech** (optional) | Hindi/Marathi read-aloud fallback |

Write `docs/google-services.md` explaining each service and the files that use it.

## Phase 8 — CI (`.github/workflows/ci.yml`)

Steps: `npm ci` → `lint` → `format:check` → `typecheck` → `test:coverage` → `build` → `size` → `npm audit --audit-level=high` → Playwright E2E. Upload the coverage artifact. Add `permissions: contents: read`.

## Phase 9 — README (add at the top, keep the existing narrative below)

- Badges: CI, coverage %, TypeScript strict, WCAG 2.2 AA, Gemini 2.5, Cloud Run.
- Live demo link + "works without API key (demo mode)".
- **Evaluation Matrix** table: each criterion → concrete evidence (file path + measured number).
- Section "Why role-aware beats neutral summaries", with a real example showing the same clause for tenant vs landlord.
- A Mermaid architecture diagram, plus links to every `/docs` file.
- **Only real numbers** — copy them from the coverage, size-limit and Lighthouse output.

## Final checklist before each submission attempt

- [ ] `npm ci && npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build && npm run test:e2e` all green
- [ ] ≥ 160 tests, coverage ≥ 90%, README numbers match
- [ ] 0 `any`, 0 `@ts-ignore`, 0 `console.log` outside the logger
- [ ] No secrets in git history; repo < 10 MB; only `main`
- [ ] Stray files and this plan deleted
- [ ] `curl -I` shows CSP, HSTS, nosniff, XFO, COOP
- [ ] axe 0 violations, keyboard-only walkthrough done, Lighthouse ≥ 95
- [ ] Demo mode works without a key; the live Cloud Run URL works
- [ ] Disclaimer + NALSA 15100 visible on every page
