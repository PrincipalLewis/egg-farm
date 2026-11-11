# HoQA review — D-HOP-52 K10 assertion patch (QA-D-1105-K10ASSERT)
Reviewed 2026-11-05 ~20:30–20:50 CET (Europe/Belgrade). Reviewer: Head of QA. No Claude review.

## Verdict
**APPROVE WITH CHANGES (assertion logic accepted; not yet mergeable).** The draft implements the D-HOP-52 pass bar correctly and fail-closed. Before merge: (1) pin the bootstrap convention as below and reuse the repo's mulberry32 helper; (2) one full modified 200-seed K10 run on the red pair must reproduce FAIL with Economy's numbers (margin 0.0133, noise 0.3051, SD 0.449441); (3) the full QA TS gate must pass with the patch.
**K10 status is unchanged: RED.** Candidate aeaeadee (cap 0.27) vs reference 18f2016f (cap 0.28) is a reproducible red case, not a green cut claim. No green K10 counts until HoQA reviews that run.

## Verified
1. Patch sha256 = 4c13759d7cfa6d8fad0b93136c9318b97a1307f85cdb00d87ad2717cb74ffeee ✔. Candidate/reference CSV sha256 aeaeadee…eaa9 / 18f2016f…9369 ✔ (match RESULT.md).
2. Merged K10 at rc/v5 518de304 (`git show 518de304:tests/k10-breeds-offset.ts` L318, `.k10.test.ts` L23-24): `pass: premium.g1max <= premium.noBreeds && premium.g1max <= premium.presentOnly`; expects use `toBeLessThanOrEqual`. Non-strict `<=`, no noise or bootstrap assertion ✔. (So the merged test would PASS a 0.0133 pp margin that D-HOP-52 fails — the patch is needed.)
3. Draft requirements (read in applied source):
   - margin > median same-candidate paired-path noise (`median |a_i-b_i|`) AND margin > 1 paired-bootstrap SD — strict `>` both ✔ (equality fails, tested).
   - Present-only protection kept: `pass = evidence.pass && g1max <= presentOnly` plus its own expect ✔ (legacy `<=` on 2-dp display medians; acceptable, unchanged from merged).
   - ≥2× noise recorded separately as `targetTwoNoise`, not part of `pass` ✔.
   - Candidate cap read from CSV must be 0.27; mandatory `K10_REF_CSV` must be 0.28; constant column; reference must equal candidate except that column ✔. bc_* columns mandatory (no defaults); forced-settle rejected as cut evidence ✔.
   - seeds 1-200, T 12000 enforced (throws otherwise) ✔; both sha256 emitted; per-seed paired rows (unrounded) in `perSeed` and K10_OUT ✔; 200/200 paired-row completeness check ✔.
4. Review notes (non-blocking unless stated):
   - Margin uses lower nearest-rank median (index 99 of 200) on captured rows, while the display premium uses `q(v,.5)`. Fine as long as both the evidence and the RESULT.md analysis use the same rule — they do (Economy states nearest-rank). Keep it documented in the file header.
   - Bootstrap PRNG is seeded `state=1` directly, whereas repo helpers (`tests/k10-breeds-offset.ts:118`, `tests/bot-m5.ts:37`) hash the seed (`seed*2654435761+99`). **Change:** import/reuse one shared mulberry32 helper instead of a third inline copy (same algorithm; outputs will change slightly, so re-record the red SD after the change).
   - `stats-red.log` in Economy's folder shows an earlier failing run of a standalone stats script (line 4 assertion); the vitest version (vitest-review.log) and my own run pass. Stale log, not a defect in the patch as submitted.

## Ran (by HoQA)
- Isolated checkout: `git archive 518de304` of /workspace/egg-farm-studio/game into qa/m5/evidence/k10assert/wt (no git metadata, no live tree touched). `git apply --check` OK, then applied.
- Isolated vitest regression `tests/k10-b4-evidence.test.ts`, pool forks, maxWorkers 2 (vitest 2.1.9, node 24.22.1): **1/1 PASS** (log qa/m5/evidence/k10assert/vitest.log).
- `tsc --noEmit -p .` (include src+tests, strict): **exit 0** (tsc.log).

## Not run
- **Full modified 200-seed K10 (`npm run test:k10` with K10_CSV=K002 candidate, K10_REF_CSV=reference):** started via lane-run (lane hoqa-k10assert, pid 804536, 20:32:47 CET) but the process disappeared with no exit line after a box VM fork/restore (dmesg "crng reseeded due to virtual machine fork"). NO RESULT — counts as not run. Must be re-run.
- Original quick suite (`npm test`), full QA TS gate, build: not run.
- Economy's numbers (SD 0.433765 Python / 0.449441 mulberry32) were not independently recomputed by me.

## Ruling A — target vs hard gate
D-HOP-2026-10-30-52 (product/decisions.md L2159), verbatim: "The **target** is g1max@0.27 ≥0.58 pp below no-breeds (2× median path noise) on the final post-L10 CSV. The **pass bar** is more than the median noise on that CSV, plus a paired-bootstrap difference greater than 1 SD." The text names two different things and calls only the second the pass bar. D-HOP-53 says K10 "must be green on the D-HOP-52 bar", i.e. the pass bar.
**Ruling: correct — ≥2× noise is a recorded TARGET, not a hard gate.** The hard gate is margin > median noise AND margin > 1 bootstrap SD (both strict). The output must record the target result, and a pass that misses the target must be flagged as "PASS (below 2× target)" in the K10 line and the gate report so HoP sees it. Also record the fixed 0.58 pp figure next to the computed 2× noise (0.6102 on this CSV), because the decision quotes both. Changing the target into a gate is HoP's call, not QA's.

## Ruling B — bootstrap RNG convention
**Ruling: mulberry32 (TS, in-test) is canonical.** Reasons: (1) K10 is a TS vitest test of record run in CI; every TS sim/bot RNG in the repo is mulberry32 (k10-breeds-offset.ts L70/L118, bot-m5.ts L37). The only MT19937 in TS is `tests/py-random.ts`, which exists only to replay a Python reference stream for seller variance. (2) A Python convention would make the gate depend on an out-of-repo analysis script (analyze-final.py) to reproduce, so it would not be self-contained. (3) The legacy MT19937 SD came from an Economy scratch trace, not a merged gate.
**Can the choice flip a verdict?** Yes, but only in a narrow band. The two SDs differ by 0.0157 pp (~3.6%) here, so any margin between them, or within normal Monte-Carlo error of the SD (~1–4% at 4000 resamples), passes or fails depending on the RNG. It does not change this candidate's verdict (margin 0.0133 ≪ both SDs, and it also fails the noise bar).
**The convention must be pinned in the test itself:** algorithm mulberry32 (shared repo helper), seed 1, 4000 resamples, one shared index vector per resample for both arms, lower nearest-rank median, population SD, no rounding before comparison. All of these must be emitted in `evidence.bootstrap` and asserted by a golden-value unit test (fixed small input → exact SD) so a silent change breaks CI. Also, if `marginPp` is within 5% of `bootstrapSdPp` (either side), the run is MARGINAL: it needs a HoQA look before it counts, whichever way it lands. No re-running with other seeds to fish for a pass. Python MT19937 numbers can be shown as a cross-check, never as the verdict.

## Required before a green K10 can count
Implement the B changes → re-record red: full 200-seed K10 on the K002 pair FAILS → full QA TS gate with the patch → HoE sha → a passing candidate CSV run through the same test → HoQA review of that run.
