# Saves QA: #103 merge-result verification @ daee4c1 (TASK saves-qa/schema-daee4c1)

Date: 2026-11-05 22:16-22:22 CET. This is QA evidence plus a recommendation for HoE/HoQA. Nothing merged, pushed or tagged. Formal evidence cites **daee4c1** only; the 5d8c88b preview was not used.

## Recommendation: **PASS. The #103 merge result is clean, F-1 still holds, and the zero-gain suites are green.** No blockers in scope. F-2 (RC-cut blocker, follow-up branch) and F-3 (before G-8 sign-off) were not re-judged.

## Identity (identity-env.txt)
- Tip **daee4c1aa5bc2d179f2edf70da761f0b4585c812** ("Merge branch 'rc/v5' into feat/saves-v5-telemetry-schema"). The remote branch head (fetched read-only) matches it. Tested in a clean clone under qa/scratch/schema-daee-2216/gitc (status 0 lines).
- Parents: 0674e14445a9c37dca09fc06931411ce9327c15c (the F-1 fix) + **7452679a19dbc0c0bfca848d9ebb4f17d885ad52** (remote rc/v5 head, #104). Merge-base with rc/v5 is 7452679: the branch contains all of rc/v5 and contains 0674e14.
- Tree 56b27d04 equals `git merge-tree --write-tree 0674e14 7452679`, so this is a **clean merge with no manual resolution**.
- F-1 fix is intact: `balance.ts` blob **2420e186** and `schema.ts` blob **e1a5e5dc** are the same as at 0674e14. tests/fixtures are unchanged vs 0674e14.
- No bundle for daee4c1 exists under scratch/bundles/ (none checked).
- rc/v5 delta since the 0674e14 pass: #99 30df38c (zero-gain follow-up) and #104 (p8-slim UI). The diff vs rc/v5 is 8 files: the #103 content.

## Results
| # | check | result | log (evidence/schema-daee4c1/) |
|---|---|---|---|
| 2 | Zero-gain suites (all tests/zg-*.test.ts plus every default-suite file whose text matches zero-gain / zeroGain / zero_gain / zg) | **PASS 168/168, 13 files.** The 8 zg files: zg-ui 34, zg-matrix 16, zg-verdict 21, zg-followup 6, zg-telemetry-annotate 2, zg-ac13-sim 2, zg-flagoff-dom 1, zg-ui-onestrip 1. The 5 other matching files: bot-m5 24, m41-p2-ui-minors 32, v5-f1a-fields 10, v5-m5load-pause-sanitize 10, v5-f3-qa-seam 9. (tests/zg-fixtures.ts is a helper, not a suite.) No *.slow / *.k10 file matches. | vitest-zg-daee4c1.txt |
| 3a | F-1 4-file set (k10-breeds-offset, verify incl. VER-1h N-5, telemetry-m3, pacing-x1-ac7) | **PASS 86/86** (same as 0674e14; c7937c9 was 83/86) | vitest-f1-4files-daee4c1.txt |
| 3b | telemetry-schema (+ telemetry, export-global) | **PASS 50/50** (57/57 across the 3 files) | vitest-telemetry-schema-daee4c1.txt |
| 3c | validateBalance contract: missing bbv2 validates (flag 0 or absent; both pinned fixtures k10 9a73bd8a and VER-1h 883d1b0d); present ≤0 rejected for all 4 keys; partial block, flag on without a block, `{}`, `null`, 1.5 and string values rejected | **PASS 30/30** | validateBalance-contract-daee4c1.txt |
| + | Items (1)-(6) + G-8 size, independent probe | **PASS 20/20**; base 155374 / buy-spam 175905 chars | indep-items1-6-daee4c1.txt |
| + | G-8 runtime probe (C1a/b/c, DZ, ZG) | PASS | g8-runtime-daee4c1.txt |
| + | Full default vitest suite on the merge result | **PASS 2111 passed, 1 skipped (2112), 147/147 files** | vitest-full-daee4c1.txt |

## Environment
Node v24.22.1. Every vitest run used flock .vitest-eng.lock, nice -n 10, 1 fork, and ran via lane-run.sh saves-qa. Start load was ≤ 3.41 (LOCK+START/END lines in each log; load-pre.txt). The lock was released at 22:21:58.

## Not run
- *.slow and *.k10 config suites: none match zero-gain, and they are out of scope.
- G-8 static probe: schema.ts is unchanged, see the c7937c9 report.
- Browser/server: not needed.
