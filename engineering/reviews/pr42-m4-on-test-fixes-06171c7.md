# CCR review — PR #42 (M4-on test/golden/doc fixes) @ 06171c7, base rc/m4-default-on 90a9c84 (#41)

Verdict: **PASS for this PR (no Blocker/Major in the diff)** — no rewritten test hides a real M4-on bug found. Release caveat (not this PR's diff): 16 AC7/pacing tests stay red on M4-on (disclosed, untouched). Read-only: detached worktree /tmp/w42 (removed); mutations restored, tree clean. 2026-10-19 ~00:55 UTC+2.

## (1) Scope
- `git diff -M 90a9c84 06171c7`: 29 files, only tests/, scripts/rc0-browser.mjs, engineering/golden/, engineering/reviews, status.md. No src/ or data/ files, no renames, no mode 120000 (symlinks).

## (2) Changed tests — independent values (computed from base src)
- M4-on sale price at H0/V0 = trackPriceCents = 100 c for every F (F does not enter at V=0); flag-off F1/C0 105, F24/C5 352.
- Offline (M4 on, H0): 600 s -> 228 eggs, 3600 s -> 1368; flag-off (eps 1.5 x 0.25): 600 s -> 225, 120 s -> 45; M4 120 s -> 45.
- rc0 Sell all Grader 2 at 181.2B eggs: 181.2e9 x 100 c x 2.0 = $362.4B (observed label "$362.4B") -> the [BT] widening (rc0-browser.mjs:646) is correct.
- expOfflineV6 for unmarked v6 seeds: correct per src/game.ts:58-63 (unmarked v6 boots tracksOff until commit). Mutation (drop `b = this.b = tracksOff(b)`) -> 4 fail in offline-modal/save/tab-guard-tg: non-vacuous.
- Marked seeds in idb-mirror / save-majors: correct (M4-24 pauses the mirror for unmarked v6). Mutation (don't pause) -> 7 fail in tests/m4a-v3-backup.test.ts, so pause behaviour stays covered.
- forced-off variants (next-goal, m4a-tracks, m4a-offline-csv, m4a-save-migrate, m4a-saveseq-carry, m4a-flag-off, flagoff golden, tracks-ui, pick-hysteresis 55.6/111.9): pure flag-off parity, values unchanged; correct.
- view() dropping v6BackupId (hidden-tab/hidden-time): v6BackupId is a random per-farm id (game.ts:75); not gameplay state; OK.
- s2-3a: pre-M4 "<25%" moved to forced-off; M4-on keeps >=40% for 5 seeds plus new after>=before. No widened tolerance.
- Price mutation (salePriceCents -> eggPriceCents under M4): caught by m4on golden (2) and m4a-tracks (4); NOT by market/tick/workers/sellall (see m1).

## (3) Golden
- m4on-golden.90a9c84: regenerated from base src: trace 403ca889bb02… and 4 storage pins match the file; identical across 2 runs (deterministic). Trace includes buyTrack + applyOffline; consistent with M4-on (price/offline mutations move it).
- flagoff golden forced-off still f90d1678 + its storage pins.

## (4) Gates @ 06171c7
- tsc OK.
- vitest: 845/854 passed; 9 fail = pacing.test (3), pacing-acw1, pacing-m2 (2), pacing-m2b (2), p4 — exactly the triage "b" list (bot has no buyTrack).
- test:slow: vendor pins OK; 7/14, 7 fail = ac7-worst-seed (2), seller-variance (5), exactly the triage list.
- golden: 4/4 (M4-on + forced-off).
- build + build:html: all check-release-build ok (m3-rc1-pre+06171c7).
- check-globals PORT unset (shipped = M4 on): Chromium 3/3 PASS.
- rc0 Chromium: 248/249; the 1 fail (B2 L5 toast 1280, toast measured hidden) is in an unchanged section and passed 2/2 on isolated reruns -> load flake.
- Author's 249/249 rc0 roughly reproduced; author's 9/7 failures reproduced exactly.

## Findings
- R (release, not this PR): 16 AC7/pacing tests red with M4 on; cause = tests/bot.ts and Python parity bots never buyTrack. Product/HoP decision; M4-on pacing is therefore unverified by any gate. Don't tag a release on green-looking CI without this.
- m1 (minor) tests/tick.test.ts:34, tests/workers.test.ts:75, tests/sellall-label-grader.test.ts:42: expected value computed with src salePriceCents itself (self-referential); a broken M4 price passes them. Pin 100 c (or trackPriceCents with literal inputs) instead.
- m2 (minor) tests/market.test.ts:81-84 MK-12: `salePriceCents(s) === salePriceCents({...s, farmLevel:1})` with s.farmLevel already 1 is a tautology, and at V=0 F never affects price, so "price at sale time after farm upgrade" is no longer tested on M4. Use V>0 where balancedMult/gradeMult depend on F.
- m3 (minor) tests/hidden-save-paths.test.ts:32: N2 path moved to tracksOff (correct), but nothing now asserts N2 REFUSES on a committed v7 farm: deleting `this.state.tracksV7 === 1` from src/game.ts:232 passes all tests. Add an M4-on refuse case.
- n1 tests/offline-modal.test.ts:18: g2 is still an unmarked v6 (flag-off) load, so expected should be expOfflineV6(120); passes only because both are 45 at 120 s.
- n2 tests/m4a-pick-hysteresis.test.ts:109: M4-on case pins no numbers (structural only); acceptable, weaker.
- n3 rc0 B2 toast 1280 flaky under load (pre-existing).
