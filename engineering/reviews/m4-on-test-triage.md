# M4-on test triage, rc/m4-on-tests-2 (stacked on #41 rc/m4-default-on @ 90a9c84): FINAL

Decision: D-CEO-20261019-01 (M4 ships ON). Branch = 90a9c84 + 94e373f (rc0 script fixes) + c3811f7 (Saves, 5 save tests) + this triage. **No src/, data/ or balance changes; flag untouched.**

## Counts
| run | unit | slow (14) |
|---|---|---|
| 90a9c84 (QA) | 62 failed / 851 | 7 failed |
| + c3811f7 (Saves) | 55 failed / 851 | 7 failed |
| this branch | **9 failed / 854** (all balance/AC7 bot) | **7 failed** (all balance/AC7 bot) |

851 -> 854 tests: +1 M4-on fresh-save picker case, +2 M4-on golden cases.

## Per-test table (a = expectation-only, fixed; b = balance/AC7 bot, NOT patched, for HoP; c = save suspect; d = other real bug)
| file | test | cause | cat | fix / owner |
|---|---|---|---|---|
| tests/hidden-tab.test.ts | 671 s throttled; offline cap (2h); emits offline_grant | expOffline used the AC11 Farm formula; M4 on pays from the CSV offline table at Hens L (src/sim/offline.ts:7-11, M4A-4) | a | tests/helpers.ts expOffline made M4-aware (table at H, Hens milestone mult) |
| tests/hidden-tab.test.ts | 10 parity cases (1 s frames, cumulative budget, C-AC36 x6, pending grant, killed tab, M1 59 s, hide < 60 s) | Only diff is v6BackupId: each fresh M4 farm gets its own random id (src/game.ts:75, M4-22), so two independent setup() farms never match | a | view() drops v6BackupId (identity, not game state) |
| tests/hidden-time.test.ts | 671 s, onShown, pagehide, B1 x2, m2 .bak | same expOffline cause | a | helper fix |
| tests/hidden-time.test.ts | M1: 59 s hide | same v6BackupId cause | a | view() drops v6BackupId |
| tests/resume.test.ts | hidden time counts as offline only when closed | expOffline cause (M4 228 vs AC11 225) | a | helper fix |
| tests/onboarding.test.ts | debugBackdateSave offline grant | hard-coded AC11 formula | a | uses expOffline (M4A-4) |
| tests/offline-modal.test.ts (2), tests/save.test.ts 'not granted twice', tests/tab-guard-tg.test.ts TG-5 | welcome-back grant | Seed is an unmarked v6 (`save(kv, initialState(b))`), which boots under flag-off rules until the tracks commit (src/game.ts:57-64, ADR M4-14..17), so the grant is AC11. Broke only after the helper change; caught and fixed in this branch | a | new helper expOfflineV6 (flag-off grant for unmarked v6) |
| tests/m4a-flag-off.test.ts | balance.m4.enabled ships 0 | flag now ships 1 (D-CEO-20261019-01) | a | asserts 1; file kept as explicit forced-flag-off parity test |
| tests/m4a-tracks.test.ts | ships 0; eggs/s+price follow Farm/Collection | used shipped balance as 'off' | a | asserts 1; flag-off case on explicit `off` build |
| tests/m4a-tracks.test.ts | M4A-8 coop capacity | flag-off comparison used shipped balance | a | `off` build |
| tests/m4a-sync.test.ts | flag kept off | flag ships on | a | nb.m4.enabled toBe(1) |
| tests/m4a-save-migrate.test.ts | flag off: v6 loads unchanged | shipped balance used as off | a | `off` build |
| tests/m4a-offline-csv.test.ts | flag off unchanged (AC11) | shipped balance used as off | a | `off` build |
| tests/m4a-tracks-ui.test.ts | HENS/VALUE only with flag on | shipped balance used as off | a | forced-off balance inline |
| tests/m4a-pick-hysteresis.test.ts | fresh save: Collection 55.6 s beats Farm 111.9 s | flag-off paybacks pinned; M4-on fresh save = HENS 120 s < VALUE 134.6 < COLL 150.6 < FARM 177.3 | a | kept as forced-off case + new M4-on structural case (hint = best payback, highlight in FARM_ROWS, next-goal agrees). FYI HoP: the M4 fresh-save hint is Hens |
| tests/next-goal.test.ts | AC5 x6 | AC5 cheapest-first is the flag-off picker; M4 on uses best payback incl. HENS/VALUE (M4A-18, covered in m4a-tracks-ui) | a | file pinned to explicit forced-flag-off build |
| tests/market.test.ts | MK-12 price after farm upgrade | expected eggPriceCents (flag-off price); M4 price comes from the tracks (M4A-5) | a | salePriceCents at sale time |
| tests/tick.test.ts | AC4 sale credits | same | a | salePriceCents |
| tests/workers.test.ts | Grader tier multipliers | same (base price) | a | salePriceCents x tier |
| tests/sellall-label-grader.test.ts | absolute payout pinned (129 c) | 129 = flag-off F3/C1 price | a | pin on forced-off build + same rounding rule on M4-on price |
| tests/s2-3a.test.ts | MK-17/21 before ~15% | no-dwell baseline at F12/H0 is ~37% with M4 on (lower production, so more cards wait); after >= 40% still holds on M4 | a | 'before' repro on forced-off build; M4: after >= before and >= 40% |
| engineering/golden/flagoff-golden.a01faea.test.ts | storage bytes, sim trace | ran on shipped balance (now on) | a | forced enabled 0; pins unchanged and pass |
| tests/hidden-save-paths.test.ts N2 quota retry | (see Saves section) | test artifact | c | test artifact, fixed by Saves (c3811f7) |
| tests/idb-mirror.test.ts x2 | (see Saves section) | test artifact | c | test artifact, fixed by Saves (c3811f7) |
| tests/save-majors-2959ba0.test.ts BUG-2 precheck | (see Saves section) | test artifact | c | test artifact, fixed by Saves (c3811f7) |
| tests/save.test.ts AC8 round-trip | (see Saves section) | test artifact | c | test artifact, fixed by Saves (c3811f7) |
| tests/m4a-saveseq-carry.test.ts x2 | (see Saves section) | test artifact | c | test artifact, fixed by Saves (c3811f7) |
| tests/pacing.test.ts | >= 9 upgrades by 5 min | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: 7) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/pacing.test.ts | Farm L10 within 8-12 min | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: Infinity) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/pacing.test.ts | AC7 Farm level at 30:00 in band | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: 7 vs >= 18) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/pacing-acw1.test.ts | >= 95% reach F10 in 15 min | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: 0%) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/pacing-m2.test.ts | AC-W2 managed <= +1 min | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: 14.5) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/pacing-m2.test.ts | AC-W4 F18->F25 <= 6 min | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: Infinity) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/pacing-m2b.test.ts | AC-W3 unmanaged F25 | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: Infinity) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/pacing-m2b.test.ts | AC-W6 Coop Hand >= 4 min | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: NaN) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/p4.test.ts | W4/W4b/Manage vs Economy re-sim | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: Infinity) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/ac7-worst-seed.slow.test.ts | F1 variance bot L18-25 | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: L18 not completed) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/ac7-worst-seed.slow.test.ts | F1 fixed bot L18-25 | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: L18 not completed) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/seller-variance.slow.test.ts | m1 per-seed reach exact (Python parity) | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: seed 1 L1 135 s vs 105) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/seller-variance.slow.test.ts | m2 per-seed L@30 | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: differs) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/seller-variance.slow.test.ts | m1 AC7 quantiles | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: L@30 P5 6 vs 20) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/seller-variance.slow.test.ts | m2 AC7 quantiles | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: L@30 P5 6 vs 20) | b | HoP retune / CEO-Product AC7 bot decision; untouched |
| tests/seller-variance.slow.test.ts | AC7 band 6dca24cd | AC7/pacing bot never buys Hens/Value (tests/bot.ts has no buyTrack); with M4 on production follows Hens L0, so the bot stalls around F6-7 (got: m1 P5 6 vs >= 18) | b | HoP retune / CEO-Product AC7 bot decision; untouched |

## Changed tests and goldens in #42 (D-CEO-20261019-03)
Diff vs base 90a9c84 at 06171c7. No src/ or data/ changes.

| file | reason |
|---|---|
| engineering/golden/flagoff-golden.a01faea.test.ts | now forces m4.enabled=0 explicitly; old pins unchanged and passing |
| engineering/golden/m4on-golden.90a9c84.test.ts | NEW M4-on golden on the shipped balance (trace 403ca889 + 4 storage pins), generated twice, identical |
| scripts/rc0-browser.mjs | 94e373f: Farm-row selectors (data-kind/data-track=farm) + `$…[BT]` regex for the M4 price |
| tests/helpers.ts | expOffline reads the M4 CSV offline table at the Hens level (M4A-4); new expOfflineV6 for unmarked v6 seeds (flag-off grant, ADR M4-14..17) |
| tests/hidden-save-paths.test.ts | Saves c3811f7: N2 quota-retry case runs on tracksOff(b) (fresh M4 farm is marked at creation, game.ts:75) |
| tests/hidden-tab.test.ts | view() drops the per-farm random v6BackupId (M4-22); offline numbers via the M4-aware helper |
| tests/hidden-time.test.ts | same as hidden-tab |
| tests/idb-mirror.test.ts | Saves c3811f7: seeds a marked save (mirror paused for an unmarked v6 until the commit) |
| tests/m4a-flag-off.test.ts | asserts the flag ships 1; flag-off parity stays forced-off |
| tests/m4a-offline-csv.test.ts | flag-off case uses an explicit forced-off balance |
| tests/m4a-pick-hysteresis.test.ts | fresh-save case kept forced-off (55.6/111.9 pins) + new M4-on structural case (no numbers pinned) |
| tests/m4a-save-migrate.test.ts | flag-off case uses an explicit forced-off balance |
| tests/m4a-saveseq-carry.test.ts | Saves c3811f7: flag-off cases use the shipped balance with enabled 0 |
| tests/m4a-sync.test.ts | the sync-generated m4 block keeps enabled 1 (D-CEO-20261019-01) |
| tests/m4a-tracks-ui.test.ts | the 'HENS hidden when flag off' check uses a forced-off balance |
| tests/m4a-tracks.test.ts | asserts the flag ships 1; flag-off cases (eggs/s, price, buyTrack no-op, M4A-8 base) use `off` |
| tests/market.test.ts | MK-12 expects the M4 track price at sale time (salePriceCents, M4A-5) |
| tests/next-goal.test.ts | AC5 cheapest-first picker pinned to forced flag off; M4-on pick is covered by m4a-tracks-ui (M4A-18) |
| tests/offline-modal.test.ts | unmarked v6 seed: expects the flag-off grant (expOfflineV6) |
| tests/onboarding.test.ts | debugBackdateSave grant via the M4-aware expOffline |
| tests/s2-3a.test.ts | 'before ~15%' repro on forced-off; M4: after >= 40% and after >= before (threshold unchanged) |
| tests/save-majors-2959ba0.test.ts | Saves c3811f7: seeds a marked save; BUG-2 assertions unchanged |
| tests/save.test.ts | Saves c3811f7: AC8 adds the marker when m4On; 'not granted twice' uses expOfflineV6 |
| tests/sellall-label-grader.test.ts | 129 c absolute pin on forced-off + same rounding rule on the M4 price |
| tests/tab-guard-tg.test.ts | TG-5: unmarked v6 seed, flag-off grant (expOfflineV6) |
| tests/tick.test.ts | AC4 expects the M4 track price (salePriceCents) |
| tests/workers.test.ts | Grader sale expects track price x tier (salePriceCents) |

## D-HOP-2026-10-19-01 bot change

Change (separate commit): tests/bot-m4.ts `pickBuy`, used by tests/bot.ts (runBot) and tests/bot-m2.ts (runM2). With M4 on, seller15 picks Farm/Hens/Egg value by the game's own payback rule (src/ui/tracks-ui.ts:53 highlightPick -> src/econ/best-buy.ts bestPaybackAmong, the Farm-tab highlight); Collection keeps the 50 % rule against the picked row's cost. The cheapest model takes the cheapest affordable of C/F/H/V. Flag off = the old rule, byte for byte. Pure function of state: deterministic. No thresholds, assertions, src/ or data/ touched.

Goldens: flag-off golden unchanged (f90d1678 + storage pins pass). M4-on golden sim trace 403ca889… -> **9173492e41ac06cbe3c077bcbadc464ad5ce681646eb4b9619b640ff40a31f6b** (runBot is part of the trace), regenerated twice, identical. M4-on storage pins unchanged.

### The 16 tests, before / after
| file | test | before (06171c7) | after | status |
|---|---|---|---|---|
| tests/pacing.test.ts | >= 9 upgrades by 5 min | FAIL: median 7 | PASS: 13 | PASS |
| tests/pacing.test.ts | Farm L10 within 8-12 min | FAIL: never (Infinity) | FAIL: 12.5 min (gate <= 12) | balance, goes into HoP's 03:30 retune |
| tests/pacing.test.ts | AC7 Farm level at 30:00 in band | FAIL: F7 (band >= 18) | PASS: F20 | PASS |
| tests/pacing-acw1.test.ts | >= 95% reach F10 in 15 min; F18 median <= 40; Python parity ±20% | FAIL: pass10 0% | FAIL: pass10 1%, medF10 17.33 min (Python 10.33), medF18 28.33 (Python 21.33) | balance, goes into HoP's 03:30 retune (the Python reference also has no M4 tracks) |
| tests/pacing-m2.test.ts | AC-W2 managed <= +1 min vs M1 | FAIL: +14.5 min | PASS | PASS |
| tests/pacing-m2.test.ts | AC-W4 F18->F25 <= 6 min, F25 <= 70 | FAIL: Infinity | PASS | PASS |
| tests/pacing-m2b.test.ts | AC-W3 unmanaged F25 faster | FAIL: Infinity | PASS | PASS |
| tests/pacing-m2b.test.ts | AC-W6 Coop Hand >= 4 min | FAIL: NaN | PASS | PASS |
| tests/p4.test.ts | W4 ~4.5 / W4b ~5.25 / Manage ~6.88 (±0.3 min / ±10%) | FAIL: Infinity | FAIL: W4 2.75, W4b 3.25 (off by 1.75 min), Manage 6.75/15 min | balance, goes into HoP's 03:30 retune (Economy P4 re-sim targets are pre-M4) |
| tests/ac7-worst-seed.slow.test.ts | F1 variance bot L18-25 P95 <= 390 / worst <= 480 | FAIL: L18 not completed | PASS: P95 229.1 s, worst 246.2 s; t20 P95 1736 s (warn > 1740, 4 s margin) | PASS |
| tests/ac7-worst-seed.slow.test.ts | F1 fixed bot <= 360 | FAIL: L18 not completed | PASS: 180 s | PASS |
| tests/seller-variance.slow.test.ts | m1 per-seed reach exact vs Python, 100 seeds | FAIL: seed 1 L1 135 s vs 105 | FAIL: seed 1 differs (Python fixtures have no tracks) | balance, goes into HoP's 03:30 retune / needs Python fixture regeneration with the M4 bot (fixture owner) |
| tests/seller-variance.slow.test.ts | m2 per-seed L@30 equal vs Python | FAIL | FAIL: same cause | balance, goes into HoP's 03:30 retune / Python fixtures |
| tests/seller-variance.slow.test.ts | m1 AC7 quantiles match Python | FAIL: L@30 P5 6 vs 20 | FAIL: L@30 P5 18 vs 20 | balance, goes into HoP's 03:30 retune |
| tests/seller-variance.slow.test.ts | m2 AC7 quantiles match Python | FAIL: L@30 P5 6 vs 20 | FAIL: t18 P5 off by 8.5% vs Python (limit 2%) | balance, goes into HoP's 03:30 retune |
| tests/seller-variance.slow.test.ts | AC7 band 6dca24cd (hard band) | FAIL: m1 P5 6 vs >= 18 | PASS | PASS |

**Result: 10 of 16 now pass; 6 still fail (unit: pacing L10, acw1, p4; slow: seller-variance m1/m2 parity, m1/m2 quantiles): balance, goes into HoP's 03:30 retune.**

**New failure caused by the bot change (was passing):** tests/pacing.test.ts 'cheapest-first Farm level >= 70% of seller15 at 10 and 30 min': cheapest F4 vs seller15 F6 at 10 min (needs >= 4.2). Assertion untouched. Under M4 the cheapest bot spreads coins over C/H/V, so its Farm level lags. Listed for HoP with the retune (balance, goes into HoP's 03:30 retune); alternatively HoP defines the cheapest model's M4 rule.

### AC7 L10 / L30+ (100 seeds, VAR_DEFAULT, Economy's horizons and metric definitions, computed with this branch's bots)
| metric | no workers (60 min) | workers (2 h) | Economy scratch/m4-ac7-bot | agreement |
|---|---|---|---|---|
| L10 P95 (gate <= 12 min) | **15.33 min: FAIL** | **15.09 min: FAIL** | 15.31 / 15.09 | +0.1 % / 0.0 % (HoQA ±20 %: PASS) |
| L10 fastest (>= 8) | 11.17 | 11.51 | 11.17 / 11.51 | identical |
| Farm L@30 P5/P50/P95 (band nw 18-22, w 20-24) | 18/19/19 (P5 on floor) | 20/20/21 (P5 on floor) | 18/19/19, 20/20/21 | identical |
| t18 P50 (L18 sanity 19.8 ±10 %, non-gating) | 25.89 min | 23.94 min | 25.89 / 23.94 | identical |
| L18-25 var P95 / worst; fixed | n/a | 229.1 / 246.2 s; 180 s | 229.1 / 246.2; 180 | identical |
| L30 (max level) reached | 0/100 in 60 min (median max level F24) | 100/100; t30 P50 50.18 / P95 51.93 min | n/a | |

The two bots use the same rule, so they agree to within 0.1 %. L10 P95 is not a repo test (Economy's gates.py from data/pacing-targets.json); it fails by ~3.1-3.3 min: balance, goes into HoP's 03:30 retune.

## Handoff for Art & UX: new-save hint with M4 on
With M4 on, a new save's next-goal hint points to **Hens** (payback 120 s) instead of Collection (150.6 s). HoP provisionally accepted it *if it follows the cheapest next-goal rule*. **It does not.** With M4 on the pick is best payback, not cheapest:
- src/ui/next-goal.ts:57: `bp = m4On(b) ? bestPaybackAmong(s, b, pool...)`; :59 the cheapest rule (`cheapest`, defined :31) is only the fallback when payback gives nothing (flag off).
- The hint is the DualPicker `hint` (src/ui/pick-hysteresis.ts:32 allScorer, best payback over every option); src/ui/pick-hysteresis.ts:88 replaces the hint with the highlight whenever the hint's pick is a Farm-tab row, so on a new save hint = highlight = HENS.
- Under the cheapest rule a new save would show Collection ($10 vs Hens $36).
Art & UX: please check the hint against the Farm-tab highlight (they are designed to match). HoP must re-decide, because the acceptance condition is not met.

## D-HOP-2026-10-19-02 bot change (replaces -01) + HoE follow-ups

**c163fb9 (-01) vs D-HOP-02:** Farm/Hens/Egg value via highlightPick: yes. Collection through the pick: **no** (kept the 50 % rule). Workers through the pick: **no** (runM2 hired workers first by QA order). Wait rule: **no** (an unaffordable pick could still buy Collection; the variance cheap-first roll also bought Collection outside the pick). Cadence/seeds unchanged: yes. Cheapest bot (D-HOP-03): yes. Economy's scratch/m4-ac7-bot follows the -01 shape too, so per HoE it was NOT ported.

**Change (8308417):** tests/bot-m4.ts `pickM4All`: with M4 on, seller15 buys only the game's pick, `bestPaybackAmong` (src/econ/best-buy.ts:151) over every offered purchasable it can buy (runBot: Farm, Hens, Egg value, Collection; runM2 adds the workers in use, W1-W4), with the highlightPick call shape (src/ui/tracks-ui.ts:53: affordable keys first, else all). Wait rule: if the pick is unaffordable, nothing is bought that check-in; the variance cheap-first roll is not applied with M4 on. Flag off = old rule. Cheapest bot unchanged (D-HOP-03). M4-on golden sim trace 9173492e… -> **723b91ab311be9bf403e7bd5a8f7363bc85234287354c4dedf94a45613faa817** (2 runs identical); flag-off golden unchanged.

**seller-variance Python parity forced flag-off (32ebe43, own commit, revertable):** traces, per-seed and quantile cases run with m4.enabled 0 (the fixtures model the pre-M4 bot); the AC7 band case runs on the shipped M4-on balance. Fixtures untouched (Economy).

**First purchase (969d7a9, tests/ac7-first-purchase.test.ts):** new save, seeds 1-200, M4 on: deterministic bot max **15 s** (gating, <= 30 s: PASS). Variance bot reported only: 40/200 seeds over 30 s (max 57.8 s), **identical with M4 forced off**, so it measures the bot's random check-in cadence, not the game.

### The 16 tests (before = 06171c7, -01 = c163fb9, now = -02 + follow-ups)
| test | before | -01 | now |
|---|---|---|---|
| pacing >= 9 upgrades by 5 min | FAIL 7 | PASS 13 | PASS 13 |
| pacing Farm L10 8-12 min | FAIL never | FAIL 12.5 | **FAIL 13.0 min**: balance, goes into HoP's 03:30 retune |
| pacing Farm level at 30:00 in band | FAIL F7 | PASS F20 | PASS F19 |
| pacing-acw1 | FAIL 0 % | FAIL 1 % | **FAIL 1 %, medF10 18.0 (Py 10.33), medF18 29.67 (Py 21.33)**: balance, goes into HoP's 03:30 retune |
| pacing-m2 AC-W2 | FAIL +14.5 | PASS | PASS |
| pacing-m2 AC-W4 | FAIL Inf | PASS | PASS |
| pacing-m2b AC-W3 | FAIL Inf | PASS | PASS |
| pacing-m2b AC-W6 | FAIL NaN | PASS | PASS |
| p4 W4/W4b/Manage | FAIL Inf | FAIL 2.75/3.25/6.75 | **FAIL 3.0/3.25/6.63 (targets 4.5/5.25/6.88)**: balance, goes into HoP's 03:30 retune |
| ac7-worst-seed variance | FAIL L18 n/c | PASS 229.1/246.2 s | PASS 239.2/268.1 s (t20 P95 1763 s > 1740 warn, non-gating) |
| ac7-worst-seed fixed | FAIL | PASS 180 s | PASS 180 s |
| seller-variance m1 per-seed (Python) | FAIL | FAIL | PASS (flag-off parity) |
| seller-variance m2 per-seed (Python) | FAIL | FAIL | PASS (flag-off parity) |
| seller-variance m1 quantiles | FAIL P5 6 | FAIL P5 18 | PASS (flag-off parity) |
| seller-variance m2 quantiles | FAIL P5 6 | FAIL t18 8.5 % | PASS (flag-off parity) |
| seller-variance AC7 band (M4 on) | FAIL P5 6 | PASS | PASS |
Also: pacing 'cheapest >= 70 % of seller15' (newly failing under -01) PASSES again (seller15 F5 at 10 min, cheapest F4).

### AC7, seeds 1-200, VAR_DEFAULT (60 min no workers / 2 h workers)
| metric | no workers | workers | Economy (100 seeds, -01-shape bot) |
|---|---|---|---|
| L10 P95 (gate <= 12) | **15.65 min FAIL** (seeds 1-100: 15.40) | **15.38 min FAIL** (1-100: 15.38) | 15.31 / 15.09 |
| agreement with Economy (HoQA ±20 %) | +2.2 % | +1.9 % | PASS |
| L10 fastest (>= 8) | 11.45 | 11.23 | 11.17 / 11.51 |
| Farm L@30 P5/P50/P95 | 18/19/19 | 20/20/21 | same |
| t18 P50 | 26.19 | 24.04 | 25.89 / 23.94 |
| L30 reached | 0/200 in 60 min (median max F24) | 200/200; t30 P50 52.91 / P95 54.31 min | n/a |

### CCR Minors (06171c7 review)
- m1 (1a24902): literal 100 c in tick/workers/sellall M4-on expectations.
- m2 (427573a): MK-12 now sells before and after a Farm upgrade at H5/V5: 220 c -> 242 c (Balanced tier 1).
- m3 (5889947): M4-on N2 refusal case; verified by removing `this.state.tracksV7 === 1` from src/game.ts:232 locally (test failed), then restored (no src diff).
- n1 (beb7a8a): offline-modal g2 uses expOfflineV6(120). n2, n3 not done (n2 acceptable per CCR; n3 pre-existing rc0 flake).

### Gates now
tsc clean; unit **855/858** (3 fail: pacing L10, pacing-acw1, p4 = balance, goes into HoP's 03:30 retune); slow **14/14**; goldens 4/4.

## Golden hashes (sha256)
| golden | old (flag-off, a01faea; still pinned in the forced-off test) | M4-on (new, engineering/golden/m4on-golden.90a9c84.test.ts) |
|---|---|---|
| sim trace (GOLDEN1) | f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544 | 403ca889bb02121e764c402cb2c408b0aebf0bed43ca14d187ea62bbeafa7974 |
| m1-rc2-v4-12min | b69c5783ba5b54dd663b56b898e2595cca59c6e03fc692b515af993634224ee9 | b1e07c13a21b6059ececdc898a4ddfe03b5286ea9133a4def6ae25992ec139dc |
| m2-rc1-v5-12min | 2ac7070d0c5e7ea2d8fcdd1642732cf44871fe9c5b126d1b5873fcd8244f3a00 | a425f0135a78b44615468a81fc99f955032e046a6003a9c180b973d51d346297 |
| m2-rc1-v5-40min | 4fd4675956da96efa92f5eb48d979f132ad628c1e76e616076eb041ae311b431 | 48b1fa43497a912c700461ddd4a2cf0abe59ba685977e7841c012ce8f7e6f1ef |
| m2-rc1-v5-40min-edge | 652d1b266de55a11ecc4faef9816eca0cfb803da3c7a7c14af85f88e4bb9f0bb | 78b97634d0bbc3b4a174751917ad573889ec57bc22cc3163deb4c6fec0e4a4bc |

M4-on golden: same harness on the shipped balance, plus buyTrack hens/eggValue in the 10 Hz trace, with track levels kept in the trace. Generated twice, identical hashes.

## Balance list for HoP (category b, not patched): 9 unit + 7 slow
Every one is driven by the AC7/pacing bots (tests/bot.ts and the vendored Python parity) never buying Hens/Value. The AC7 bot change sits with CEO/Product; a retune or bot update has to land before these can go green.

## BUG list for Saves
None. All 5 save suspects are test artifacts, fixed by Saves in c3811f7 (verified on this base: the 5 files pass). No category-d bugs found.

## Gates (vitest --poolOptions.forks.minForks=1 --poolOptions.forks.maxForks=2)
- tsc --noEmit: clean
- unit: 845 passed / 9 failed / 854 (the 9 = balance list)
- test:slow: vendor pins OK; 7 passed / 7 failed (the 7 = balance list)
- golden: 4/4
- build:qa OK; rc0-browser chromium (flock .browser-test-2.lock, load ~8.9): **249/249 passed**, incl. the 4 rows fixed in 94e373f

## rc0 script fixes (94e373f, kept)
| item | cause | fix |
|---|---|---|
| s2money strict-mode (S2-4a) | `#uRow .btn.buy` matches FARM/HENS/VALUE | `#uRow .btn.buy[data-kind=farm]` |
| S2-10 sheet | first Buy / first `.lv` were a track | `[data-kind=farm]`, `#uRow [data-track=farm] .lv` |
| SellAll Grader 2 label @390/@1280 | regex required `$…T`; M4 price gives `$362.4B` | `/\$[\d.]+[BT]/` |

## Saves: c3811f7 test changes (M4-on artifacts)

Commit c3811f750bfb53a565c9b547966abead074ff4dc on local branch test/m4on-saves-artifacts (off rc/m4-on-tests @94e373f, not pushed). It rewrites 7 test cases and unskips none. Lines are in the test file at c3811f7. Src refs were re-read at 94e373f with `git show 94e373f:<file>`.

| status | test file:line | test name | reason (one line) | backing src (94e373f) |
|---|---|---|---|---|
| test artifact, fixed by Saves (c3811f7) | tests/hidden-save-paths.test.ts:29 | saveWithQuotaRetry, N2 quota retry (own aborted v6 record removed, then retried): retry writes the snapshot | With M4 on, a fresh Game gets the marker at creation, so N2 correctly refuses to remove the backup. The fix runs on `tracksOff(b)`, the aborted-session balance. | src/game.ts:75 (M4-22 fresh-farm commit); src/game.ts:232 (N2 refuses when `tracksV7 === 1`) |
| test artifact, fixed by Saves (c3811f7) | tests/idb-mirror.test.ts:78 | Game mirrors every save (load-time save and immediate purchase save) with the exact localStorage bytes | An unmarked v6 seed loads as a pending tracks migration, and the mirror is paused until the commit. The fix seeds a marked save (`tracksV7: 1`, `v6BackupId`). | src/game.ts:60, :64 (mirror paused); src/game.ts:218 (resumes only after the commit) |
| test artifact, fixed by Saves (c3811f7) | tests/idb-mirror.test.ts:85 | purchase lost from localStorage (kill before flush) is recovered from the IndexedDB copy on the next boot | Same cause: no IndexedDB write before the commit, so there is no copy to recover. The fix seeds a marked save. | src/game.ts:60, :64; src/game.ts:218 |
| test artifact, fixed by Saves (c3811f7) | tests/save-majors-2959ba0.test.ts:50 | newer copy only in IndexedDB: the mirror write checks in its transaction, never puts, and stops the Game | The "normal mirror write" precheck was `undefined` because the mirror is paused for an unmarked v6. The fix seeds a marked save. The BUG-2 assertions are unchanged. | src/game.ts:60, :64; src/game.ts:218 |
| test artifact, fixed by Saves (c3811f7) | tests/save.test.ts:11 | AC8 round-trips coins, coop, basket, levels | Under M4 on, load() of an unmarked v6 returns the pending-migration descriptor (tracksMigrated, v6State, v6Keys, preTracksRaw). The fix adds the marker only when `m4On(b)`. | src/save/save.ts:106; src/save/save.ts:207 |
| test artifact, fixed by Saves (c3811f7) | tests/m4a-saveseq-carry.test.ts:15 | M4-build-off save seq 5 -> flag-off save -> reload: the newest copy wins | A flag-off-only test asserts `m4On(b) === false` against the shipped balance (now enabled 1). The fix uses the shipped balance with `m4.enabled: 0`, not markM4BuildOff. | src/config/formulas.ts:137 (`m4On`); src/config/balance.json:164 (`enabled: 1`). No game.ts/save.ts defect. |
| test artifact, fixed by Saves (c3811f7) | tests/m4a-saveseq-carry.test.ts:33 | flag-off save with no prior saveSeq keeps main bytes (no saveSeq) | Same: with M4 on, save() writes saveSeq, which is expected. The fix runs on the flag-off build. | src/config/formulas.ts:137; src/config/balance.json:164 |

Verification: the 5 files pass 47/47 and tsc is clean at c3811f7. No real save bug was found, so no fix branch off main was made. Correction to the earlier status note: the fresh-farm commit is at src/game.ts:75, not :76.

### Design note (IDB mirror pause)
While the IDB mirror is paused pre-commit (pending tracks migration, src/game.ts:60/:64 until :218), the newer-in-IDB check at src/game.ts:256 is skipped. The localStorage newer-copy checks still run, and there are no IDB writes in that window, so nothing can overwrite a newer IDB copy; the check resumes with the mirror after the commit.

