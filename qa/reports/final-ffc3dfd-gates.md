# QA formal gates: PR #49 rc/m4-t3-capped @ ffc3dfdeafd8448f870b70b0b731288fa56e53fd (candidate B, capped)
Run 2026-10-19 05:43-06:10 CEST. Fresh worktree /tmp/qa-rc/ffc3dfd, own deps (npm ci exit 0). Methodology as in precheck-pr44-4ccb9fd.md and acw1-900s-check.md.
Scripts: reports/final-ffc3dfd-l10.script.ts (L10/first purchase, seeds 1-200 and 201-300), reports/acw1-900s-check.script.ts (unchanged), Economy bot snapshot qa/m4bot-snapshot-2026-10-19 (hashes 0d622fbf/20253fe6/3445dfab/89116ece match) with ALIGN=1 M4=1, copied into the worktree temporarily and removed afterwards.

## 0. Intake checks
| check | result |
|---|---|
| diff --stat 0ee8831..ffc3dfd | only src/ui/tracks-explainer.ts (13 lines) and tests/m4-exp1-explainer.test.ts (25 lines): UI-only, CONFIRMED |
| data/economy.csv sha256 | b48be8a4f920...f857 (vendor copy also b48be8a4) MATCH |
| maxLevel (balance.json) | 30 MATCH; m4.enabled = 1 |
| 93bbc27, 7ab3d3d, a399d27, 1d10311 ancestors of HEAD | all yes |

## 1. AC7 pacing and regression
| suite | result |
|---|---|
| tsc --noEmit | exit 0 PASS |
| npm test (sync-economy --check + vitest) | 86 files, 975/975 PASS (includes pacing, pacing-guards, pacing-m2/m2b, m4a-pacing, p4, pacing-acw1 now on the 16-min gate) |
| test:slow | 16 pass, 1 skipped (17), exit 0. Skipped: D-CEO-04 L30+ workers step (skipIf maxLevel <= 30), N/A on B by ruling |
Note: the 2 reds from the 4ccb9fd precheck (pacing-acw1, p4) are green here; the test now encodes D-CEO-06 (16 min) and D-HOP-09 targets. Unit total is 975 vs 862/864 on 4ccb9fd (loader/explainer tests added).

## 2. D-CEO-04 L10 gate (VAR_DEFAULT, M4 on)
| metric | no workers | workers | threshold | result |
|---|---|---|---|---|
| L10 P95, seeds 1-200 | 12.017 min | 12.078 min | <= 12.1 | PASS (margins 5 s / 1.3 s) |
| fastest L10, 1-200 | 7.867 | 8.322 | >= 7.8 | PASS |
| L10 P95, 201-300 | 11.810 | 11.807 | <= 12 | PASS |
| fastest L10, 201-300 | 8.127 | 8.763 | >= 8 | PASS |
| two-bot (QA bot.ts/bot-m2.ts vs Economy ALIGN=1) | per-seed L10 identical 200/200 + 100/100 | identical 200/200 + 100/100 | ±20% | PASS (0%) |
| first purchase, deterministic bot | 200/200 + 100/100, max 15 s | | <= 30 s | PASS |
Info: variance-bot first purchase >30 s on 40/200 (max 57.8 s) and 11/100 (max 65.3 s); not the gated metric, same basis as precheck. L20 P95 workers 1556.4 s (1-200); L30 workers 200/200, median 49.64 min.
All numbers are identical to the 4ccb9fd precheck, as expected (no sim/balance change).

## 3. D-CEO-06 acw1 (casual model, M4 on, no cap, inclusive <=)
| seeds | F10 <= 960 s | threshold | median F18 | threshold | result |
|---|---|---|---|---|---|
| 1-200 | 196/200 = 98.0% | >= 95% | 25.0 min | <= 40 | PASS |
| 201-299 | 96/99 = 97.0% | >= 95% | 25.0 min | <= 40 | PASS |
Info: <=900 s 91.0% / 90.9%; exactly-900 seeds 16 + 7 (same seed lists as before); T=1200 identical; 0 off-grid times.

## 4. N/A by ruling (D-CEO-09 B)
L30+ step gate, farm 50 / track 55 checks.

## Verdict
All gates run PASS on ffc3dfd. Delta from 0ee8831 is UI-only, so the Saves lane carries over (seenTracksExplainer reruns still owed by Saves QA). Risk: workers L10 P95 margin on 1-200 is 1.3 s.
