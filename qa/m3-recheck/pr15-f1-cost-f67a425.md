# PR #15 F1 cost segments @ f67a425: QA verdict
Date 2026-10-17 01:05 CEST. Worktree /tmp/pr15wt (base main 7944010; merge-base = main tip). Nothing pushed/merged.

## Verdict: PASS (runtime inert, safe to merge). Two Minor test findings below; fix before the F1 data merge.
3-engine browser gates complete: globals + rc0 PASS in Chromium, Firefox, and WebKit (see Addendum 02:45).

## Diff (6 files, +134/-10)
- formulas.ts: optional `farm.costGrowthSegments`; farmCost keeps the pre-F1 expression when absent/empty; validateCostGrowthSegments.
- balance.ts: validates segments; sync-economy reads new data/economy-config.json (`farmCostGrowthSegments: []`).
- tests/cost-segments.test.ts (new). balance.json NOT changed.

## Is it inert at runtime? Yes
- balance.json unchanged and has no costGrowthSegments; config is empty, so farmCost takes the old `floor(100*1.35^L)` path. Test 1 confirms all 31 farm_cost rows equal economy.csv. Players see no cost change.
- The release bundle differs from main's (new dormant code ships: hash 8f85a557… vs 62c9fb22… after build ID is stripped). There's no behaviour change, but it is not byte-identical.
- The F1 and F1-GAP cuts are NOT live. That needs Features' econ/f1-cost-overrides (per-level override support), as the PR states.

## Spec check
- Segments ×1.25 L6–14, ×1.45 L15–20, ×1.35 after, base 100 = f1-proposal.md:33/54/109. The values match: L5 448, L6 560, L14 3340, L15 4844, L20 31050, L21 41918.
- F1-GAP (f1-proposal.md:235+): L18 14768×0.75 = 11076, L19 21414×0.85 = 18201. These match economy.f1.csv, economy.f1-m4cols.csv and m4a-spec.md:82. w4 5538/9100 matches balance-changelog.md:5.

## Gates
| gate | result |
|---|---|
| tsc --noEmit | PASS (0) |
| npm run build (check-economy-copy, sync --check, tsc, vite, check-release-build) | PASS; build ID m3-rc1-pre+f67a425 ok, no QA hooks, globals ok |
| build:qa | PASS |
| vitest (2 workers) | 473 passed, 1 failed, 2 skipped, 2 files failed (see F-1 and the golden failure below) |
| golden load error | engineering/golden/flagoff-golden.a01faea.test.ts: "Failed to load url ../src/config/balance". The import is wrong relative to engineering/golden/. It fails identically on main 7944010 and is exactly what PR #14 fixes ("golden: fix flagoff-golden relative paths"). Pre-existing, not caused by #15 |
| release-globals-browser (check-globals) chromium | PASS, EXIT 0 (refused-boot [] and release globals [eggfarmExportTelemetry]), run twice (lock 2 and lock 1) |
| rc0-browser chromium (dist-qa) | 197/197 PASS, EXIT 0 |
| release-globals / rc0 firefox, webkit | PASS EXIT 0 both engines (globals allowlist; rc0 197/197) |
| build ID | m3-rc1-pre+f67a425 in dist and dist-qa bundles and in check-release-build. Not read from the live page (not exposed in the DOM or telemetry export I tried) |
Author's /tmp/f1g-chk/cg4.log is Chromium only, so it does not cover 3 engines.

## Findings
- **F-1 Minor (test hygiene; CI break): cost-segments test depends on a file outside the game repo.** It reads `../../product/economy.f1.csv` or ECONOMY_F1_CSV.
  - Repro: fresh worktree of f67a425, `npx vitest run tests/cost-segments.test.ts`. Result: "economy.f1.csv not found". So the "476/476 except golden" claim only holds inside /workspace/egg-farm-studio/game; a clean clone or CI gets 2 failures.
  - With ECONOMY_F1_CSV=product/economy.f1.csv: 7/7 pass.
  - Fix: vendor the CSV into the repo (e.g. data/staging), or skip when absent.
- **F-2 Minor: the test pins a superseded data file.** economy.f1.SUPERSEDED.md: L23–29 farm_cost in economy.f1.csv is superseded by economy.f1-m4cols.csv (M3 taper), and the Oct 21 merge uses m4cols only. The test asserts pure-segment values at L23–29.
  - Repro: ECONOMY_F1_CSV=product/economy.f1-m4cols.csv gives "L23: expected 68756 to be 76395".
  - The F1 data PR will need the per-level overrides to cover L23–29 too, not just L18/L19.

## Not run
- Live in-page build-ID read. Visual/screens (no UI change).

## Evidence
qa/m3-recheck/pr15-evidence/: tsc.log, build.log, build-main.log, build-qa.log, vitest.log, seg-economy.f1*.log, L2-globals-chromium.log, L2-rc0-chromium.log, globals-{chromium,firefox,webkit}.log, rc0-{chromium,firefox,webkit}.log, exits.txt.

## Addendum 01:40 CEST
- rc0 chromium on the main lock: exit 0 (second run; lock-2 run was 197/197).
- Firefox/WebKit globals + rc0: still queued behind other agents on .browser-test.lock. Background loop continues; exits append to pr15-evidence/exits.txt (source /tmp/pr15-ev/exits.txt).

## Addendum 02:45 CEST — Firefox / WebKit complete
Build ID verified: m3-rc1-pre+f67a425. Worktree /tmp/pr15wt.

| gate | chromium | firefox | webkit |
|---|---|---|---|
| release-globals-browser | PASS exit 0 (also lock2) | PASS exit 0 | PASS exit 0 |
| rc0-browser (dist-qa) | 197/197 PASS exit 0 (also lock2) | 197/197 PASS exit 0 | 197/197 PASS exit 0 |

**Browser verdict: PASS (3 engines).** Prior Minor findings F-1 / F-2 unchanged (test hygiene; fix before F1 data merge). Overall: PASS (runtime inert, safe to merge) with those two Minors.
Exits: `qa/m3-recheck/pr15-evidence/exits.txt` (source `/tmp/pr15-ev/exits.txt`).
