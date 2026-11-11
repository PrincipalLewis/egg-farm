# QA advisory pre-check (NOT the formal gate): PR #44 @ 4ccb9fde8251b371c6ee6444b735990e488e2aae (T3 RC)
Run 2026-10-19 03:20-04:05 CEST. Fresh worktree qa/wt-precheck-pr44 with its own deps (npm ci).

## 1. Config
- m4.enabled = 1. maxLevel = 30.
- Shipped data/economy.csv sha256 is b48be8a4f920...f857 (match). `sync-economy --check`: "balance.json up to date with economy.csv".
- vendor/economy-sim/economy.f1-m4cols.csv is also b48be8a4. data/staging/economy.f1-m4cols.csv is still 6dca24cd. That's informational (staging copy).

## 2. Suites
- Unit: 862/864 pass, 2 red: tests/pacing-acw1.test.ts (AC-W1 casual), tests/p4.test.ts (W4/W4b/Manage vs Economy). Engineering claimed 861/863. The red count and names match, but the total is +1 test in my run. Cause not established.
- Slow: 16 pass, 1 skipped (17). Skipped: D-CEO-04 "L30+ workers path step ratio" (skipIf maxLevel <= 30).
- Goldens: 4/4 pass.
- rc0 (build:qa, then rc0-browser.mjs under flock .browser-test.lock, lane 1): 249/249 pass.

## 3. Two-bot identity (tests/bot.ts + bot-m2.ts vs Economy snapshot, ALIGN=1 M4=1, VAR_DEFAULT)
Per-seed reach maps are identical: no workers 200/200 (1-200) and 100/100 (201-300); workers 200/200 and 100/100. All metrics below are equal for both bots, so the agreement is 0% (±20% gate PASS).

## 4. D-CEO-20261019-04 grading
| metric | no workers | workers | gate | result |
|---|---|---|---|---|
| L10 P95, seeds 1-200 | 12.017 min | 12.078 min | <=12.1 | PASS (margins 5 s / 1.3 s) |
| fastest L10, 1-200 | 7.867 | 8.322 | >=7.8 | PASS |
| L10 P95, 201-300 | 11.810 | 11.807 | <=12 strict | PASS |
| fastest L10, 201-300 | 8.127 | 8.763 | >=8 strict | PASS |
| two-bot agreement | 0% | 0% | ±20% | PASS |
| first purchase, deterministic bot, 1-200 | 200/200, max 15 s | | <=30 s | PASS |
Engineering's claims (12.02/12.08, 7.87; 11.81, 8.13) match exactly.
Info: L20 P95 is 1941.4 s with no workers and 1556.4 s with workers (1-200). With workers it's under the 1740 s warning, so it clears. L30 with workers: 200/200, median 49.64 min (201-300: 100/100, 49.63). No workers: 0 reach L30 (max F25).

## 5. pacing-acw1 (casual, 100 seeds 0-99, share reaching F10 <=15 min)
M4 on 91%, M4 off 100% (Engineering claimed 91 vs 100: match). The 95% threshold FAILS with M4 on.

## 6. L30+
The step test is skipped (ac7-dceo-04.slow.test.ts:47 `skipIf(b.maxLevel <= 30)`), and maxLevel = 30. Confirmed. It can't be evaluated until the L30+ pack lands.

## Advisory verdict
Every D-CEO-04 numeric gate passes on both paths, with thin margins on 1-200 P95 (workers is 1.3 s under 12.1). Open reds: acw1 (91% < 95%) and p4. Those need a ruling before the formal gate. The +1 unit-test count difference is minor, and I'll recheck it at the formal gate.
