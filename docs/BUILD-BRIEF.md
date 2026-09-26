# Build brief — for Antigravity, then Claude Code

Give this file to the agent as its working spec. It exists so the agent extends the scaffold
instead of re-architecting it.

## Non-negotiable constraints

1. **No file over 200 lines.** When one grows, extract a module.
2. **`src/lib/` never imports React or `next/*`.** Components never import `src/lib/gemini/*`.
3. **TypeScript strict. Zero `any`.** ESLint treats `any` as an error.
4. **Every Gemini call passes `responseSchema` and is re-validated with Zod.** No free-text parsing.
5. **Every new `src/lib/` module ships with a test in `tests/`.** Model calls are stubbed, never live.
6. **`npm run verify` must pass** (typecheck + lint + test) before any commit.
7. **Repo stays under 10 MB, public, single branch.** No `node_modules`, no build output, no
   screenshots over a few hundred KB.

## Phase 1 — Antigravity (make it run)

- `npm install`, add the key to `.env.local`, confirm `npm run dev` serves the page.
- Wire up anything left stubbed and fix type errors surfaced by `npm run typecheck`.
- Test end-to-end with three real documents: a rental agreement, an employment offer, and a
  freelance SOW. Run each from both sides (tenant *and* landlord) and confirm the severities
  actually differ — that is the core claim of the product.
- Tune `PERSPECTIVE_WEIGHTS` in `risk-scoring.ts` against what you observe. Update
  `tests/risk-scoring.test.ts` to match.
- Optional, only if time allows: PDF upload via the Gemini Files API, inserted before the sanitise
  step. Skip it rather than half-finish it.

## Phase 2 — Claude Code (make it win)

Hand over the working repo with this instruction set:

- Restructure any file that drifted past 200 lines; extract duplicated logic into `src/lib/`.
- Delete dead code, unused imports, and commented-out experiments.
- Add JSDoc to every exported function explaining *why*, not what.
- Raise `src/lib/` test coverage; add cases for the failure paths (malformed model output, empty
  document, rate-limit boundary, oversized clause).
- Verify accessibility by hand: tab through the entire page, confirm focus is always visible,
  confirm the results region is announced, run axe and fix everything it reports.
- Re-read `README.md` end to end and correct anything that no longer matches the code. A README
  that claims something the code does not do is the single worst finding a reviewer can make.
- Final gate: `npm run verify` clean, `npm run build` clean, repo under 10 MB.

## Pre-submission checklist

- [ ] Repository is public, `main` only, no other branches
- [ ] `du -sh .` under 10 MB with `node_modules` and `.next` absent
- [ ] `.env` is not committed; `.env.example` is
- [ ] `npm ci && npm run verify && npm run build` passes from a clean clone
- [ ] CI badge green on the latest commit
- [ ] README vertical, approach, how-it-works, and assumptions sections all accurate
- [ ] Disclaimer visible on first paint, not behind a dismiss button
