# CCR review — PR #44 T3 retune @ 4ccb9fd, base rc/m4-on-tests-2 cb57f17

Verdict: **CHANGES REQUESTED** — Blocker 0 · Major 2 · Minor 2 · Nit 2. Data, sync and the D-CEO-04 encoding are correct; the blockers to merge are a committed scratch harness and the still-red acw1/p4 gates (escalation needed, not a loosening).
Read-only: detached worktree /tmp/w44 (fresh npm ci; box node_modules were gone). ~03:52 UTC+2.

## (1) Data / sync
- Diff: data/economy.csv, src/config/balance.json, vendor copy + SOURCE/SHA256SUMS, tests, golden pin, status. No other src/ change; no symlinks/renames.
- sha256 data/economy.csv = vendor/economy-sim/economy.f1-m4cols.csv = product/economy.csv = product/economy.f1-m4cols.csv = b48be8a4f920…f857 (exact). LF only (0 CR, base 0 CR); .gitattributes unchanged (`*.csv text eol=lf`, vendor -text).
- CSV vs base: only hens_cost and egg_value_cost, L0-L11 (12 cells each), both strictly increasing; all 31 rows otherwise identical. balance.json diff = exactly those 24 values.
- `sync-economy --check`: up to date; full re-sync rewrites balance.json byte-identical (status clean).
- check-economy-copy --strict (product dir = studio product/): 4 vendored files + economy.csv match, b48be8a4.
- Money: costs are integer dollars -> cents x100, smaller than before; no big-number paths touched. Offline columns unchanged (eggs/s, max_2h) -> offline earnings unchanged.

## (2) tests/ac7-dceo-04.slow.test.ts vs decisions.md:51 (studio /workspace/egg-farm-studio/decisions.md; product/decisions.md:232 mirrors it)
- L10 P95 <= 12.1 on seeds 1-200 both paths (nw runBot seller15 variance 3600 s; w runM2 seller15 variance 7200 s), fastest >= 7.8: encoded exactly, shipped M4-on balance.
- Seeds 201-300 strict original gates: L10 P95 <= 12.0 / fastest >= 8.0, AC7 band nw 18-22 / w 20-24, variance targets (distinct >= 50, P95 != P50, spread 3-15 %, 15 of 30), L18-25 worst-seed guards (variance + fixed): encoded, same constants as the original suites.
- Observed (test log, and independently from the zz-t3 dump): 1-200 nw P95 12.02 / fastest 7.87, w 12.08 / 8.32; 201-300 nw 11.81 / 8.13, w 11.81 / 8.76; L@30 nw 19/20, w 21/22.
- Bound sensitivity: margins are 0.02-0.08 min on the 1-200 P95/fastest, so a bound 0.1 tighter (12.0 / 7.9) fails; comparator directions are correct. Not executed as separate mutation runs (each ~5 min; deadline) — arithmetic from the logged values.

## (3) No other loosening
- Untouched: data/pacing-targets.json, tests/pacing-guards.ts, pacing*.test.ts, p4.test.ts, bots, scripts. The ac7-worst-seed / seller-variance / economy / cost-segments edits only add T3 to sha allowlists (same guards and band constants as F1); no band, eps or tolerance constant changed.
- acw1 and p4 still assert their original values and still FAIL on T3 (see M2).

## (4) cost-segments / m4a-tracks
- cost-segments: allowlist = 2 full sha256 values (6dca24cd…, b48be8a4…), still checks farm_cost and every w* cost per level vs the CSV: narrow.
- m4a-tracks TR-1: reads on.m4.eggValue.costs[0] / hens.costs[0] (shipped balance.json from data), x100; adds an at-cost buy case. Correct, not product/.

## Golden
- Regenerated twice: M4-on a54c9cf9d6a4c967… both runs (matches pin); storage pins unchanged; flag-off f90d1678 unchanged.

## Gates @ 4ccb9fd
- tsc OK.
- vitest: 862/864; FAIL p4 (W4/W4b/Manage) and pacing-acw1 (>=95% F10 in 15 min / F18 median / parity). zz-t3 ran 768 s.
- test:slow: 16 passed, 1 skipped (D-CEO-04 L30+, maxLevel 30); seller-variance, worst-seed, D-CEO-04 gates green.
- golden 4/4 x2. build + build:html: check-release-build ok. check-economy-copy --strict: ok.
- check-globals PORT unset: Chromium 3/3. rc0 Chromium: 249/249.

## Findings
- M1 (Major) tests/zz-t3.test.ts:1-15: scratch harness committed; runs in `npm test` (768 s, doubling the unit suite), asserts nothing, writes /tmp/t3b.json. Delete it.
- M2 (Major) tests/pacing-acw1.test.ts, tests/p4.test.ts: original gates still fail on T3. D-CEO-04 says "all other gates unchanged" and HoE (status 02:44) ruled pass unchanged or escalate to HoP; needs that escalation/ruling before merge (no loosening found).
- m1 (Minor) tests/ac7-dceo-04.slow.test.ts:46: L30+ step-ratio gate (P95 <= 2.00, worst <= 2.25) is skipIf(maxLevel <= 30) and never runs on this SHA; the two-bot ±20% condition isn't encoded either. CEO gate partly unverified; needs explicit HoE/CEO ack.
- m2 (Minor) tests/ac7-worst-seed.slow.test.ts:31,37 and tests/cost-segments.test.ts:22 titles still say "F1 6dca24cd only"; misleading now T3 is guarded.
- n1: test header cites decisions.md:49-52 (studio root file); OK, but product/decisions.md:232 is the HoP record — cite both.
- n2: dceo-04 mutation sensitivity checked from logged values, not separate runs.
