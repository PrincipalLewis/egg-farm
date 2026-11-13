# V5SCAP delta check — PR #82 (v5 F3 config) @ 2facc3ffefb74556263327c6be5014535a3cd22d (+ head move to 48b6857)

**Reviewer:** QA Engineer, Saves & Release Verification · 2026-10-30 08:35–08:45 CET · baseline: pr82-b0b5c7c.md (BASELINE, superseded head)
Evidence: `pr82-2facc3f/` (SHA256SUMS). Scratch worktree qa/scratch/wt-pr82-2facc3f (own npm ci, lane-run saves-qa) removed.

## Verdict
- **@2facc3f: PASS.** One Minor (test gap on the upper bound) and two Nits, none blocking.
- **The head moved while I was checking:** at 08:41 CET `gh pr view 82` = **48b6857993f0a08b24ed26924448b66a55743feb** (08:38 CET, merges rc/v5 **6bcc194** = #80 squash-merged at 08:35 CET, plus #88). Base is now `rc/v5`. I delta-checked it (§8): only #88's 2 test files come in, tsc 0, targeted 240/240. **The PASS carries to 48b6857 on two conditions:** (1) CI run 41021364051 on 48b6857 goes green (in_progress at 08:42); (2) the body adds 48b6857 to the Post-CCR delta and a gate line for it (Minor M2).

## 1. Head / state / CI
- 2facc3f: OPEN, Ready, MERGEABLE/CLEAN (base then `feat/v5-f1c-effects`).
- CI **41019019230**: pull_request, headSha **2facc3f** ✔, **completed / success** (gate success, release-globals skipped), 08:15–08:32 CET.
- CI on 48b6857: 41021364051 in_progress (41021362800 cancelled = superseded duplicate).

## 2. Delta b0b5c7c → 2facc3f (first-parent: 665bfba, 36c67de, dda39fc, f4648e1, 2facc3f)
`git diff b0b5c7c 2facc3f` = 3 files: src/config/m5-rules.ts (+2/−1), tests/v5-f3-config.test.ts, tests/v5-f1c-effects.test.ts (2 title lines from #80's 5dd36d1). No unexplained production change.
- **665bfba:** tests/v5-f3-config.test.ts only (+6). `SAVE_SCHEMA_FILE = /save\/m5-fields\.ts$/` and `SAVE_SCHEMA_OK = /^(?:export const (?:BROODY_NEST_MAX_CENTS|BROODY_SLOTS) = [0-9.e]+;\s*)+$/`, checked on the stripped, trimmed whole line. Test-only ✔. Matches D-HOE-20261030-01.
- **36c67de:** m5-rules.ts guard `!(Number.isFinite(x) && x >= 0)` → "must be a finite number >= 0"; upper `<= 0.35` unchanged. Test [Pause-§6]: 0 and 0.35 pass; −0.25, NaN and Infinity fail through validateBalance (generic leaf check); −0.25, NaN and ±Infinity fail through validateM5 directly with the guard's own message; 0.4 fails. ✔ as claimed. Matches D-HOE-20261030-02 ("relax to >= 0, still rejects negative and non-finite, plus a test for 0").

## 3. Merge trees (01-delta.txt, 03-remerge-diffs.txt)
| Merge | Tree | Result |
|---|---|---|
| dda39fc (rc/v5 2fa7318) | d78a97f5 = p1 36c67de | ✔ identical to the side it was on. rc/v5 2fa7318 tree = 02e7ede tree (924223), already contained via #80. Remerge conflicts (game.ts imports/attendedNow/focusMs, tick.ts) all resolved to the branch side = #80's already-passed attendedNow() version (keeps the anyM5FlagOn guard inside attendedNow) |
| f4648e1 (#80 5dd36d1) | 817e693e, a real merge | no conflicts; brings exactly 5dd36d1's 2 title lines |
| 2facc3f (#80 174286e) | 817e693e = p1 f4648e1 | ✔ identical; 174286e tree = 5dd36d1 tree (088814e5) |

## 4. Allowlist tightness (mutations, f3 files, 77 tests)
| Mutant | Result |
|---|---|
| A1 new `export const BROODY_EXTRA_MAX = 7;` in m5-fields.ts | **killed**: `save/m5-fields.ts:18 7` |
| A2 allowlisted name `export const BROODY_SLOTS = 12;` in sim/timers.ts | **killed**: `sim/timers.ts:14 12` (file restriction works) |
| A3 `BROODY_SLOTS = 12 + 3` (expression on the allowlisted line) | **killed** (1e15, 12, 3 all flagged: whole-line match) |
| A4 bare `1.5` elsewhere in m5-fields.ts | **killed**: `save/m5-fields.ts:21 1.5` |
Tight: whole-line, two names, that one file only.

## 5. Guard boundaries
QA probe at 2facc3f (15-probe.log, validateM5 and validateBalance):
- 0, −0, Number.MIN_VALUE, 0.25 and 0.35 **pass**. −0 behaves as 0 (`-0 >= 0`), which [0, 0.35] allows. MIN_VALUE is a finite value in range, so it passes as specified.
- −MIN_VALUE, −0.25, NaN and ±Infinity **fail** ("finite number >= 0"; validateBalance's leaf check says "invalid").
- 0.3500001, 0.35+EPSILON, 0.36 and 0.4 **fail** ("<= 0.35").
The code matches D-HOE-20261030-02.

| Mutant | Result |
|---|---|
| R1 `>= 0` → `> 0` | **killed** ([Pause-§6]) |
| R2 drop `Number.isFinite` | **killed** ([Pause-§6] validateM5(Infinity) message regex) |
| R3 upper `<= 0.35` → `<= 0.36` | **SURVIVED** (77/77) |
| R4 upper `<= 0.35` → `<= 0.3500001` | **SURVIVED** (77/77) |
| R5 upper `<= 0.35` → `< 0.35` | **killed** |

## 6. Baseline mutations re-run (7/7 killed; K4 re-pointed to the new guard)
K1 flag value any → killed (1) · K2 absent flag → 1 → killed (1) · K3 MAPPED_COLS drop → killed (2) · K4 drop lower guard → killed (1, [Pause-§6]) · K5 bound 0.4 → killed (2) · P1 isPaused no flag gate → killed (4) · P2 raw paused read → killed (4, incl. [QA-10]). tsc 0 for every mutant; each reverted, tree clean (30-mutrun.log).

## 7. Body: trace + Post-CCR delta
- **Trace (12 rows):** every row resolves to a passing test in my vitest JSON (12-vitest.json, 46 f3 tests, 0 failed; 13-trace-resolve.txt, 13-titles-seam-paused.txt). The [Pause-§6] row and the new D-HOE-20261030-01 row are present.
- **Post-CCR delta (CCR commit ecf8297):** `git log --first-parent ecf8297..2facc3f` = 11 commits (348cdde, 9c6bff6, 84df247, bba6c79, 10d1e28, b0b5c7c, 665bfba, 36c67de, dda39fc, f4648e1, 2facc3f). The body lists exactly these, in order, no gaps ✔. It does **not** list 48b6857 (M2).
- **Gate lines** cite 2facc3f (tsc 0, 13 files 209/209, build, check-globals) and CI 41019019230 ✔.
- **Rule 22:** the 48b6857 body now says "no Claude review" (was "manual CCR review, no Claude"). That fixes the wording issue I flagged on #80.

## 8. Head move → 48b6857 (07-head-moved-48b6857.txt)
- Parents 2facc3f + rc/v5 6bcc194. `git diff 2facc3f 48b6857` = tests/bot-m5.test.ts and tests/fixtures/economy-b48be8a4.csv only. Both blobs are identical to rc/v5 6bcc194 (= #88, which I passed at ce88448).
- The remerge shows one add/add conflict in tests/v5-f1c-effects.test.ts `B()`. It resolved to #82's side (#82's existing flags-merge helper, already in its 19 files). #82 vs rc/v5 is still the same 19 files.
- tsc 0; targeted 14 files **240/240** at 48b6857 (40-head-48b6857-*.log).

## 9. Runs @2facc3f (maxWorkers=2)
npm ci 0 · tsc 0 · targeted, the 13 body-cited files plus m41-p1-live-income: **14 files, 240/240** (the body's 209 = 13 files; +31 from m41-p1) · full suite **127 files, 1724 passed, 1 skipped (1725)**, exit 0. The baseline's [F3-no-literal] failure is gone.

## 10. Pause-spec 0 contradiction — still OPEN for PM Workers
product/workers/m5-worker-pause-spec.md (mtime 07:24 CET) still says `rest_recovery_mult` in **(0, 0.35]** at L164 and L218. L204 and AC-P17 (L341) use the value 0. The code follows D-HOE-20261030-02 ([0, 0.35]). The same (0, 0.35] range is also in qa/m5/test-plan-pause-resume.md L65 (and q13-saves-lane-rows.md L194). Owners: PM Workers for the spec, Saves QA/HoQA for the plan row. I found no correction recorded.

## Findings
- **Minor M1:** the upper bound is pinned only at 0.4. Mutants `<= 0.36` and `<= 0.3500001` survive, and pause QA plan L65 has a case "config 0.36 → rejected". Repro: in m5-rules.ts change `<= 0.35` to `<= 0.36`, then `npx vitest run tests/v5-f3-config.test.ts` → all pass. Fix: add 0.36 (or 0.35 + ε) to the [Pause-§6] reject list. The code itself is correct (probe).
- **Minor M2 (48b6857 only):** the body's Post-CCR delta and gate lines stop at 2facc3f; add 48b6857 (rc/v5 6bcc194 restack, #88 test files only) and its gate/CI line.
- **Nit N1:** the trace row "D-HOP-2026-10-29-05" quotes the title in shortened form (the real title adds "(Rule 2 chip cut flag, …)"). The D-HOE-20261030-01 row points at a test whose title carries no D-HOE id.
- **Nit N2:** body sections "Stacked on #80 … diff shows only e743462, 60ca5e4, c5b0371" and "Goldens and gates (local, HEAD c5b0371)" are stale now that #80 is merged and the base is rc/v5.
- **Open (not a #82 defect):** the pause-spec range contradiction (§10).

## Checks not run
- CI on 48b6857 (pending).
- Full suite at 48b6857 (only #88's 2 test files differ from 2facc3f; targeted run 240/240).
- Build, check-globals, goldens and rc0 by me (the author's local results plus the CI gate cover build and globals at 2facc3f).
- No mutation-only re-run at 48b6857 (no src/ change).

## Related (#87, re-checked for this report)
- #87 CI run **41019583114**: headSha 14894bd, **completed / success** (gate success 08:21–08:37 CET; release-globals skipped).
- At 08:41 CET #87 is mergeState **DIRTY**: after #80 merged (6bcc194), `git merge-tree` shows conflicts in src/sim/actions.ts, src/sim/payout.ts and src/sim/tick.ts (the SaleCtx overlap I predicted). #87 needs a re-merge and a QA recheck of the sale-ctx resolution before it can merge.

## Addendum 08:56 CET — conditions for 48b6857: CONFIRMED
1. **Head:** at 08:56 CET the PR head is still **48b6857993f0a08b24ed26924448b66a55743feb**. It is OPEN, Ready, MERGEABLE, mergeState **CLEAN**.
2. **CI:** the gate run is **41021364051** (yes, the one I named): headSha 48b6857, **completed / success**. gate ran 08:38:59–08:55:00 CET (16m01s); release-globals skipped, as it always is on a non-rc PR. The CANCELLED entries are run **41021362800**, same SHA and same event (`pull_request`), created one second earlier (08:38:54) and cancelled at 08:38:56 before doing any work. ci.yml's `concurrency` group is keyed on the PR number, so the newer duplicate trigger for the same push cancelled the older run. It was superseded, not a failure. Its cancelled release-globals job is what showed as "fail" in `gh pr checks` earlier; that run no longer appears in the check list (08-ci-48b6857.txt).
3. **Body (08:56, pr-body-0856.md):** the Post-CCR delta now lists `48b6857` (rc/v5 6bcc194 merge, only #88's 2 test files). It has a "Gates at 48b6857" section and the CI line "run 41021364051 success". The stale "stacked on #80" and "c5b0371 gates" text is replaced by "Base: rc/v5 (6bcc194)". **M2 and N2 are closed.** M1 (no test at 0.36) and N1 stay open; both are non-blocking.
