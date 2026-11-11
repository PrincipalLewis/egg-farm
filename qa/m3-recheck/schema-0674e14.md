# Saves QA: F-1 re-verify @ 0674e14 (TASK saves-qa/schema-0674e14, QA-D-1105-SCHEMA, PR #103)

Date: 2026-11-05 22:07-22:1x CET. QA evidence and a recommendation only; HoQ issues the verdict. Nothing pushed, merged or tagged. The engineer worktree was only read (HEAD 0674e14, status clean).

## Recommendation: **PASS on F-1, so #103 can merge on F-1** (per D-HOE-20261105-39). F-2 and F-3 were not re-judged here.

## Tested identity
- Tip: **0674e14445a9c37dca09fc06931411ce9327c15c**, one commit on top of c7937c9 ("validate bbv2 only when the block or bestBuyV2 is on"). Tested in a clean `git clone` + checkout under scratch/schema-0674-2207/gitc (status 0 lines). The engineer worktree HEAD is the same SHA, also clean.
- Diff vs c7937c9: `src/config/balance.ts` (+10/-3) and `tests/telemetry-schema.test.ts` (+26/-1) only.
- `schema.ts` blob **e1a5e5dc** (unchanged from c7937c9). `balance.ts` blob e47dfa8e → **2420e186**.

## Results
| # | check | result | evidence |
|---|---|---|---|
| 1 | The 4 previously failing files (k10-breeds-offset, pacing-x1-ac7, telemetry-m3, verify incl. VER-1h N-5) | **PASS 86/86** (c7937c9 83/86; 518de30 86/86). k10 9/9, verify 56/56, pacing 11/11, telemetry-m3 10/10; nothing skipped. | vitest-4files-0674e14.txt |
| 2 | telemetry-schema.test.ts in full (+ telemetry, export-global) | **PASS 50/50** (47 + 3 new F-1 tests); 57/57 across all 3 files. G-8 base 155374, buy-spam 175905. | vitest-telemetry-schema-0674e14.txt |
| 3a | HoQ unit test: a missing bbv2 block validates when bestBuyV2 is off or absent | **PASS.** The test is present (telemetry-schema.test.ts, "[F-1][QA-D-1105-SCHEMA] missing telemetry.bbv2 still validates…"; bestBuyV2 0 and absent, plus the shipping block) and passes. | test read + vitest |
| 3b | HoQ unit test: a present value ≤0 is still rejected (0 and -1) | **PASS.** The test is present for shown_min_gap_s 0 and -1 and passes. | test read + vitest |
| 3c | Contract checked independently with `validateBalance` | **PASS 30/30.** Both sha-pinned fixtures validate: k10 balance-9a73bd8a and VER-1h balance-883d1b0d (no bbv2, bestBuyV2=0, sha256 re-asserted). k10 fixture + bestBuyV2=1 fails. No block + bestBuyV2=1 fails. No block + flag 0 or absent passes. All 4 keys at 0 and at -1 fail with "must be > 0". A partial block (each of the 4 keys missing, flag 0 and 1) fails. `{}` and `null` fail. cap 1.5 fails ("integer"). A string value fails. Shipping balance passes. | validateBalance-contract-0674e14.txt |
| 4 | No sha-pinned fixtures rewritten | **PASS.** `git diff --stat` on tests/fixtures is empty both vs c7937c9 and vs rc/v5 518de304. | identity-env.txt |
| 5 | F-2 / F-3 | **Not re-judged.** D-HOE-20261105-39 is at egg-farm-studio/engineering/decisions.md L557-562 (file sha1 e6b28ed9…): F-2 is an RC-cut blocker, not a #103 merge blocker, with a named follow-up branch; F-3 must be settled before G-8 sign-off. status.md L1420 (sha1 4838b67c…) names the branch **`fix/saves-telemetry-ring-export`**, not `feat/…` as the task wrote; ETA ~12–24 h. That branch does not exist locally yet, so the follow-up is **engineer-reported, not verified**. | grep in decisions/status |
| + | G-8 runtime probe on 0674e14 (`schema.ts` unchanged) | G8V PASS | g8-runtime-0674e14.txt |

## Observations (no severity, informational)
- `bestBuyV2: true` (a boolean rather than 1) with no block throws `balance.m4.flags.bestBuyV2 invalid` from the existing generic check. That is not new behaviour.
- With a present block, the ≤0 errors still fire first because the check now runs before `check(b,'')`, as the code comment intends.

## Environment
Node v24.22.1. Both vitest runs held flock .vitest-eng.lock, used nice -n 10 and 1 fork, and ran via lane-run.sh saves-qa. Start load was 2.49 and 3.12 (≤ 11; LOCK+START/END lines are in each log; load-pre.txt).

## Not run
- The full default suite (the task asked for the F-1 files + telemetry-schema).
- *.slow and k10-config suites.
- G-8 static probe (`schema.ts` is unchanged; see the c7937c9 report).
- Browser/server (not needed).

## Addendum (22:12 CET steering, HoQA qa-103-f1-rerun; write scope is now qa/m3-recheck/ only)
| check | result | evidence |
|---|---|---|
| bundle scratch/bundles/feat-saves-v5-telemetry-schema-0674e14.bundle sha256 | **962ac7eba1ce4fb6c6036c5eb154c4d0848a64e1986250373cb2ea3c7baf9656 = expected.** `git bundle verify` OK. Head: refs/heads/feat/saves-v5-telemetry-schema = 0674e14445a9…; prerequisites 65a7443, 518de304. | below |
| remote branch head (`git ls-remote origin`, read-only) | **feat/saves-v5-telemetry-schema = 0674e14445a9c37dca09fc06931411ce9327c15c: match.** | below |
| remote rc/v5 | **Moved to 30df38c0a0bd** (#99 "zero-gain follow-up": src/ui/app.ts, tests/zg-followup.test.ts, tests/zg-telemetry-annotate.test.ts, tests/m41-p2-ui-minors.test.ts). It descends from 518de30, and `git merge-tree` of 0674e14 + 30df38c is **clean** (no conflicts). The merged result was **NOT tested**. Advisory: #99 touches zero-gain telemetry in app.ts, so HoQ may want the zg-* tests run on the merge result before or at merge. | |
| new F-1 unit tests fail without the fix (mutation: c7937c9 balance.ts on the 0674e14 tests, scratch copy) | **Both HoQ tests FAIL as expected:** "missing bbv2 validates" (old code throws) and "present ≤0 rejected" (old order gives the generic "invalid" error first for -1). The 3rd test (flag on / partial) still passes, which is expected because the old code always required the block. 2 failed / 4 passed / 44 skipped (-t F-1). | vitest-mutation-oldbalance-0674e14.txt |
| items (1)–(6) + G-8 size, no regression (independent probe on 0674e14) | **PASS 20/20**; base 155374 / buy-spam 175905 (UTF-8 155376 / 175907) | indep-items1-6-0674e14.txt |
| G8V runtime | PASS | g8-runtime-0674e14.txt |
| telemetry-schema | 50/50 (≥ 47) | vitest-telemetry-schema-0674e14.txt |
| 4-file set | 86/86 | vitest-4files-0674e14.txt |

**Final: PASS (F-1).** F-2 and F-3 are out of scope. READINESS.md was not updated: my earlier edit, made before this steering arrived, was reverted from its scratch backup, so the file is byte-identical to its pre-task state (sha256 40b1f270…).
