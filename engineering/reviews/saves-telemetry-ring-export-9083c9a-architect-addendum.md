# #113 Saves telemetry ring/export (F-2): Architect delta addendum at 9083c9a (merge-forward onto rc f8036e8f)

Date: 2026-11-05 ~23:56 CET · Lane: architect · Prior: saves-telemetry-ring-export-560b4d4-architect.md (PASS, 0 blocking, CONDITIONAL YES)

## Verdict: PASS (delta). Prior APPROVE carries to exact 9083c9a77ab831962ba7b7055d3abe2b550a9b31
This is not merge approval. The hosted gate and QA's report append are still required at this head.

## Identity
- origin pull/113/head = 9083c9a. PR #113 is open, not draft, base rc/v5 @ f8036e8f0826ca76fcc0ee13092d575533d4969b (current rc tip, re-read 23:54 CET). 6 files, +102/−9.
- Parents: 560b4d437f06df1e399d3f91c7af850b2b1e2bb5 (the head of my prior review) and f8036e8f (rc after #105 income-ref). Old merge-base 844f8e15.
- Author/committer: Saves & Persistence, 23:48 CET. Message: "Merge remote-tracking branch 'origin/rc/v5' into fix/saves-telemetry-ring-export".

## Delta / preservation
- 9083c9a tree ebac9001 == `git merge-tree --write-tree 560b4d43 f8036e8f`. It is a clean merge with no manual resolution.
- The PR patch f8036e8f..9083c9a is identical to the reviewed 844f8e15..560b4d4 (ignoring index lines and hunk headers). The F-2 patch is unchanged.
  - Files: src/telemetry/telemetry.ts; tests/telemetry-ring-export.test.ts (+76); reader fixes in export-global, telemetry-m3, telemetry, zg-telemetry-annotate tests.
- Invariants unchanged from 560b4d4:
  - Ring stored as `{v, events}`.
  - v-less or bare array → events tagged `legacy:true`.
  - exportJSON/snapshotJSON carry `schema_version`.
  - TELEMETRY_SCHEMA_VERSION '0.6.2'.
  - SAVE_VERSION 6 (save.ts:7).
  - No schema.ts/save.ts/balance.json changes.

## Compatibility with rc's #105 income-ref (844f8e15..f8036e8f: formulas, m5-rules, game.ts, m5-fields, actions, income-ref.ts, timers, test)
- No file overlap with #113. income-ref adds no telemetry emitters (no telemetry reference in sim/income-ref.ts).
- The game.ts change is in offline catch-up (resetIncomeRef when flag-on). `this.telemetry.poll()` is untouched.
- Telemetry stays always-on and has no m4 flag. The ring shape change is orthogonal to the tapCoins/income-ref flag.
- income-ref state does not touch the `eggfarm.telemetry` KV key and does not bump SAVE_VERSION.
- Per QA-D-1105-RCMOVE (4), no full local re-run is needed because #113 does not overlap #105's 8 files.

## Independent evidence (worktree /workspace/wt-arch-review113-9083c9a, clean before and after, Node v20.19.2, lane-run architect, flock + nice 10, maxWorkers=1)
- npm ci 0, tsc 0.
- Focused: **21 files / 385 tests pass**. Files: telemetry-ring-export, telemetry, telemetry-m3, telemetry-schema, export-global, zg-telemetry-annotate, bbv2-telemetry, v5-income-ref, all tests/save*.test.ts, v5-f2-m5-fields, v5-f3-config, m4a-flag-off, release-bundle, release-html, goldens flagoff a01faea + m4on 90a9c84.
- build + build:html EXIT 0. check-release-build: window global writes only eggfarmExportTelemetry; eggfarm* identifiers eggfarmRecovery, eggfarmTabGuard, eggfarmExportTelemetry.
- The Saves author's 102/102 claim was not used as evidence.
- Logs + SHA256SUMS: scratch/architect/review113-9083c9a/.

## Hosted (read-only, exact head_sha 9083c9a, last read 23:54 CET)
- **gate run 42124631940: IN PROGRESS. No SUCCESS cited.**
- pacing-x1 shards (run 42124631915): IN PROGRESS.
- K10 monitor: completed success 23:51:32 CET (known-red, non-required, not counted).
- release-globals is skipped by design on non-rc PRs (QA ruling 23:42).

## QA status (read-only)
- qa/m3-recheck/f2-560b4d4.md: QA PASS at the OLD head 560b4d4.
- QA-D-1105-RCMOVE (23:47) requires, after the merge-forward:
  1. Clean diff and merge-tree (met).
  2. Architect delta PASS (this note).
  3. Hosted gate + pacing shards SUCCESS at 9083c9a (pending).
  4. QA append to the report with head and run ids (not present yet).

## Remaining holds
- Hosted gate SUCCESS at exactly 9083c9a, plus pacing shards (aggregate FAIL only on row 904).
- QA append for 9083c9a.
- rc/v5 must still be f8036e8f at merge. If rc moves, merge-forward and re-gate.
- HoQA merge go.
- No code/PR post/Ready/push/merge/messages done. No publishing authority.
