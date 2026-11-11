# QA recheck — money merge on main @ 4aadcbf
Date: 2026-10-16 (CEST), ~13:45–14:35. Clean clone from GitHub (`gh repo clone PrincipalLewis/egg-farm`) at /workspace/qa-mm/a/game (origin/main = 4aadcbf, no force); 20f6bd0 comparison clone /workspace/qa-mm/b/game; rc1-ui (2490c79) at /workspace/qa-mm/ui/game. Nothing pushed. qa/m3-scripts/combined used read-only (not run as a whole: it clones from the workspace repo into /tmp). Logs: `money-merge-4aadcbf/`.

## Verdict: PASS-with-known-issues
The merge is clean: 4aadcbf differs from the QA-passed 20f6bd0 only in README.md, docs/readme/*.png and the `preview` npm script (`git diff 20f6bd0 4aadcbf -- src public data scripts tests index.html vite.config.ts` is empty). No regression vs 20f6bd0. Two open defects must be closed before the rc1 tag (QA-MONEY-1, S2-REL-1 below).

| # | Check | Result |
|---|---|---|
| 1 | data/economy.csv vs product/economy.csv, cell by cell (BOM/CRLF normalised, csv parse) | PASS — 32 rows, 1472 cells, 0 differences, row widths equal. data/economy.csv byte-identical to 20f6bd0's. check-economy-copy: "matches (32 lines)" |
| 2 | Unit suite | PASS — clean (no ../product): 373 passed + 2 skipped (375); with product/economy.csv: 374 + 1 skip; with full product/ (sim present) economy.test.ts 68/68 → 375/375. Same 375 as 20f6bd0 |
| 3a | sync --check | PASS — "balance.json up to date with economy.csv" |
| 3b | npm run build (release) | PASS — check-release-build: m3-rc1-pre+4aadcbf ok, no eggfarmUi |
| 3c | Release globals only eggfarmExportTelemetry | **FAIL (known S2-REL-1, not a regression)** — C/F/W all expose `eggfarmExportTelemetry, eggfarm, eggfarmOrderList` (bundle has `window.eggfarm=` and `window.eggfarmOrderList=`). Identical at 20f6bd0 (combined-20f6bd0/globals-*). The fix lives on rc1-ui (2490c79), which is not merged into main. Engineering's "only eggfarmExportTelemetry in all 3 engines" does not hold for 4aadcbf |
| 4a | rc0-browser | PASS — Chromium 56/56, WebKit 56/56, Firefox 56/56 (1st Firefox run 16/24: b6 click timeout then preview server died, box load ~76; rerun clean) |
| 4b | Wage labels vs economy.csv | Code: PASS s2-8-wage-aa66bdb.ts (rc1-ui formatter × 4aadcbf ui.rates()) 15/15. Browser exact wage 60 s/10 min: Chromium 4/4, Firefox 4/4, WebKit not run (server failed to start twice, box overload). Browser hire-card label (s2-8-wage-browser): N/A at 4aadcbf — label UI is rc1-ui only (all rows null) |
| 4c | Save v6 / wageFracCents | PASS — C/F/W 7/7; save-migrations 9/9 |
| 4d | Offline | Code offline-code.ts 17/17 PASS. Browser offline-clock: Chromium 6/6; Firefox 5/6 (cap/1 h ratio off by 0.37% vs ±0.2% tolerance, page-load seconds, under load; rerun blocked by server start failure); WebKit blocked (timeout/server). Treat as infra, recheck when the box is quiet |
| 4e | Pacing | f1-pacing (info, current economy) byte-identical to combined-20f6bd0: L30 at 243.8 min, AC7 L18 at 30:00; no change |
| 5 | Fast Collect 20× Chromium | see QA-MONEY-1 |

## Unit count 375 vs rc1-ui 381+2
Different branch scope, not lost coverage. origin/m3/rc1-ui = 2490c79 (rc1-pt1), 35 commits not in main. vs 4aadcbf it adds tests/rc1-ui.test.ts (+261 lines), p1-oct16.test.ts, fixtures, and lacks s2-3a / s2-8-10 / s2-money tests (money work isn't on that branch). Money tests are all present at 4aadcbf (unchanged from 20f6bd0). The rc1-ui tests will arrive with the rc1-ui merge; QA will expect a count > 381 then (union of both). The 1–2 skips are environment-gated: economy-copy (needs ../product) and "fixture is fresh vs live reference sim" (needs ../../product/sim/economy_sim.py).

## QA-MONEY-1 — Fast Collect "10 taps → 5 collects" flaky (Medium, owner Engineering, fix before rc1 tag)
`ONLY=fastcollect node scripts/rc0-browser.mjs chromium`, 20 runs each, sequential:
| SHA | fail | counts seen |
|---|---|---|
| 4aadcbf | 16/20 (80%) | got 6 ×16, got 5 ×4 |
| 20f6bd0 | 8/20 (40%) | got 6 ×8, got 5 ×12 |
Only the `#collect, coop 23` case fails; the 500-egg cases always pass. Code is identical on both SHAs, so the rate difference is box load (load avg 60–76), not the merge.
Root cause (probe `fastcollect-probe-4aadcbf.log`, logs each collect event): one tap = one collect event, never more. The coop keeps producing (~1.5 eggs/s at farmLevel 0) during the ~700 ms burst, so after the 5th collect empties it, a later tap picks up 1 regenerated egg → a 6th collect with eggs > 0. With 50 ms gaps: 5,5,5,5,3,0,0,0,0,1. No tap bypasses any rate limit; the test's expectation `ceil(23/5)=5` ignores production, and slower taps under load leave more time to refill. Correct game behaviour, wrong oracle.
Fix suggestion: freeze production for the case (or assert collects ≤ taps and Σeggs ≤ 23 + produced), then 20/20 on Chromium under load.
Repro: clean clone 4aadcbf, `npm ci && npm run build:qa`, run the command above 20×; grep "coop 23".

## Other open
- S2-REL-1: release exposes `window.eggfarm` and `window.eggfarmOrderList` (see 3c). Must be closed on main before rc1 tag (comes with the rc1-ui merge; QA will recheck globals there).
- To rerun when the box is quiet: WebKit exact-wage, Firefox/WebKit offline-clock.
