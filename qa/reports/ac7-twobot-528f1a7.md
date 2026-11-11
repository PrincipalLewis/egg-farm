# QA: AC7 two-bot check at 528f1a7 (PR #42), seeds 1-200, VAR_DEFAULT, current CSV, M4 on
Run 2026-10-19 01:55-02:10 CEST, worktree qa/wt-ac7-pr42-528f1a7 (own node_modules via npm ci; the shared game/node_modules symlink target had disappeared).

## Snapshot
qa/m4bot-snapshot-2026-10-19/: m4all.ts 20253fe6, bots.ts 0d622fbf, m4buy.ts 3445dfab, run.test.ts 89116ece. All 4 match.

## Important: Economy's bot is D-HOP-02 only with ALIGN=1
bots.ts:34 `const all = m4On(b) && process.env.ALIGN === '1'`. With ALIGN unset it falls back to m4buy.ts pickM4, which is the -01 shape: the 50% Collection rule, the cheap-first roll, and workers hired first. run.test.ts also defaults M4 off unless M4=1. Runs: `ALIGN=1 M4=1 NSEEDS=200`.

## Results (Economy ALIGN=1 vs QA tests/bot.ts / bot-m2.ts)
| metric | Economy | QA | diff |
|---|---|---|---|
| workers L10 P95 | 15.38 | 15.38 | 0 |
| workers L20 P95 | 1762.8 s | 1762.8 s | 0 |
| workers L30 | 200/200, med 52.91 | 200/200, med 52.91 | 0 |
| workers per-seed reach maps | identical 200/200 | | |
| no-workers L10 P95 | 15.35 | 15.65 | -1.9% (within ±20%, but not identical) |
| no-workers per-seed reach maps | 181/200 identical | | |
| no-workers L10 times | 197/200 identical; seeds 85, 100, 118: Economy 766.5/733.1/658.3 s, QA = none (Infinity) | | |
For reference, ALIGN unset (old -01 Economy bot): nw 15.38, w 15.34, L30 median 50.08; 0/200 seeds identical. Not valid for D-HOP-02.

## Root cause: a QA/Engineering bot recording bug, not a pick difference
Every one of the 19 differing seeds differs by one missing reach entry in QA's map. All other level times are equal, and L(n) and L(n+1) carry the same timestamp in Economy's map (for example seed 85, L9 and L10 both at 766.5 s). So the purchase sequences are identical. There is no divergent purchase. The difference is in how the levels are recorded.

tests/bot.ts:40 (unchanged since base 90a9c84:41):
`s = buy(s, model, b, k => { const farm = s.farmLevel + (k === 'f' ? 1 : 0); ... if (k === 'f') reach.set(farm, t); }, chf);`
The callback reads the outer `s`, which isn't reassigned until buy() returns. When two Farm levels are bought in one check-in, both are logged as start+1, so the second level is dropped. If that level is L10, L10 counts as never reached (Infinity), which inflates P95. The same stale value feeds `buys[].farm`, so farmReachedS and farmAt are affected too (used by pacing.test.ts and others). bot-m2.ts and Economy's bots.ts record `s.farmLevel` after apply, which is correct, so the workers path is unaffected.
Fix (tests-only): log from inside buy() after `s = next`, for example pass `s.farmLevel` to the callback, or use reach.set(next.farmLevel, t).

## Which bot is right
- Pick and buy logic: identical. Both use pickM4All (bestPaybackAmong with the highlightPick shape over affordable-else-all keys, plus the wait rule; Collection and workers go through the pick). Both follow D-HOP-02 / highlightPick. Economy's does so only with ALIGN=1.
- Measurement: Economy's no-workers numbers are correct. QA's tests/bot.ts under-records multi-level check-ins.
- Corrected no-workers L10 P95: 15.35 min on seeds 1-200 and 15.20 on seeds 1-100. That's still a FAIL against 12. This corrects my ac7-pr42-528f1a7.md (15.65 / 15.40) and Engineering's claim.

## Gate
Two-bot agreement within ±20%: PASS (max 1.9%). Identical bots (Product): NOT YET. It needs the tests/bot.ts:40 fix, and Economy runs must set ALIGN=1. Rerun the identity check after the fix.
