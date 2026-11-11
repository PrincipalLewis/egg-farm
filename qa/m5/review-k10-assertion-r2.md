# HoQA review r2 — D-HOP-52 K10 assertion patch (QA-D-1105-K10R2)
Reviewed 2026-11-05 21:00–21:10 CET (Europe/Belgrade). Reviewer: Head of QA. Follows QA-D-1105-K10ASSERT (r1, m5/review-k10-assertion.md). No Claude review.

## Verdict
**APPROVE (assertion only).** All four r1 required changes are done and independently verified. The patch may go to the normal merge path (HoE sha → Vadim's own go); no push/PR/merge by QA.
**K10 remains RED.** The only candidate (K002 aeaeadee vs reference 18f2016f) FAILS. This approves the test, not any candidate. A green K10 counts only after a B4-passing CSV runs through this exact test and HoQA reviews that run.

## Hashes verified
- r2 patch 3bfd301b80265c006168fd840ef6f00ac1ebfb64880fb9ba2a021cbaa5a81e79 ✔; note HOQA-REVIEW-r2.md d099970f…a169 ✔; addendum c4df9fb3…0bb3 ✔.
- Economy result k10-full200-K002.result.json eda8e3a7…fa9fc ✔; summary 462d0620…31f4 ✔.
- git-backed gate log npm-test-gitbacked.log 0f4ac1af…d4d ✔; exit file 9a271f2a…86aa ✔ (content `0`).

## r1 → r2 diff (scope)
Same 4 files as r1 plus new `tests/mulberry32.ts`. Changes vs r1: shared helper; `k10-breeds-offset.ts` imports it for the sim RNG in place of the L118 inline copy (same formula; 9/9 `k10-breeds-offset.test.ts` parity tests pass); evidence fields (targetTwoNoisePp, decisionTargetPp, marginal, verdict, bootstrap metadata); golden + verdict-path tests; K10 line/expect text. Nothing unrelated.

## Required changes — status
1. **Shared hashed-seed mulberry32** — DONE. `tests/mulberry32.ts` = `(seed*2654435761+99)>>>0` init, byte-identical algorithm to the 518de304 inline copies; `k10-b4-evidence.ts` calls `mulberry32(1)`; no `state=1`. (Non-blocking: `tests/bot-m5.ts` L37 still has its own inline copy; fold onto the helper in a later cleanup, not this patch.)
2. **Golden-value test** — DONE. Asserts exact SD 1.130034042628836 on input a=[0..4], b=[1,2,4,4,10]. **Genuinely computed**: my independent Python reimplementation of the hashed mulberry32 + paired bootstrap (qa/m5/evidence/k10r2/golden-indep.py, plain left-to-right summation) gives 1.130034042628836 exactly. The test calls b4Evidence, so changing the seed, the helper or the median/SD rule breaks it.
3. **Pinned metadata** — DONE. `evidence.bootstrap` = {mulberry32, tests/mulberry32.ts, seed 1, resamples 4000, paired, sharedIndexVector, lower-nearest-rank, population, roundBeforeCompare false}, deep-equal asserted.
4. **Target / verdict / MARGINAL** — DONE. Pass = margin > noise AND > SD (+ Present-only `<=`); 2× noise only in `targetTwoNoise`; exact strings `PASS`, `PASS (below 2x target)`, `FAIL`, `MARGINAL` (|margin−SD| ≤ 5% SD, checked first); decisionTargetPp 0.58 recorded; K10 test also fails on `marginal`. Each path tested.

## Run by HoQA (isolated `git archive 518de304` + r2, qa/m5/evidence/k10r2/wt)
- `git apply --check` + apply OK.
- Focused vitest (forks, maxWorkers 2): k10-b4-evidence 3/3 + k10-breeds-offset 9/9 = **12/12 PASS**. `tsc --noEmit` (src+tests): **exit 0**.
- **Full 200-seed K10 on the K002 pair** (lane hoqa-k10r2, pid 933211, 21:00:58–21:07:23 CET, 384.8 s; log saved incrementally): vitest exit 1, **FAIL** as expected. Reproduced:
  - marginPp **0.013299186386817041**
  - medianNoisePp **0.3051276817964492**
  - bootstrapSdPp **0.44940532079541834**
  - targetTwoNoisePp **0.6102553635928984**, decisionTargetPp 0.58
  - verdict FAIL, pass false, marginal false, n 200; display g1max 63.74 | no-breeds 63.75 | Present-only 63.75; csv aeaeadee, ref 18f2016f
  - My result JSON sha256 **eda8e3a74d676d9b330b587d065b2d6c10e2b2146669372fd6faa69524afa9fc** = byte-identical to Economy's (per-seed rows included).

## Full QA TS gate (Economy, verified by HoQA from the artifacts)
Checkout /workspace/scratch-econ-k10assert-r2-git: HEAD 518de304 (checked), working tree = exactly the 2 modified + 3 new r2 files, each `cmp`-identical to my applied r2 copy. Log tail: **Test Files 144 passed (144); Tests 2029 passed | 1 skipped (2030)**; 0 FAIL lines; exit file 0. The r1-era archive-only failures (pacing-x1-ac7, telemetry-m3, verify) did not recur. I did not re-run `npm test` myself (by instruction). The slow `test:k10` suite is not part of `npm test`; it is covered by my run above.

## Not run
`npm run build`; HoQA's own `npm test` (Economy's git-backed run accepted after verification); any green candidate (none exists).
