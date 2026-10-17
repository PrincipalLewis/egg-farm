# M4-on test triage, rc/m4-on-tests from 90a9c84: WIP (STOPPED, release parked)

Status: **WIP, stopped at 14:53 CEST on instruction (release parked).** No test changes made yet; only the rc0 script fixes are done. No BUG confirmed so far (none triaged far enough to confirm or rule out).

Baseline at 90a9c84 (M4 on), vitest 2 forks: unit **62 failed / 851**, slow **7 failed / 14**. Matches QA report qa/m3-recheck/rc-90a9c84.md.

## Done: rc0 Minor script fixes (scripts/rc0-browser.mjs, not re-run in a browser)
| item | cause | fix |
|---|---|---|
| s2money strict-mode (S2-4a) | `#uRow .btn.buy` matches FARM/HENS/VALUE | selector `#uRow .btn.buy[data-kind=farm]` |
| S2-10 sheet | clicked first Buy (a track), read first `.lv` | `[data-kind=farm]` button, `#uRow [data-track=farm] .lv` |
| SellAll Grader 2 label fits @390 | regex required `$…T`, M4 price gives `$362.4B` | regex `/\$[\d.]+[BT]/` (fit checks unchanged) |
| SellAll Grader 2 label fits @1280 | same | same |

## Preliminary notes (not confirmed)
- Expectation-only, likely (a): m4a-flag-off / m4a-tracks 'ships 0', m4a-sync 'flag kept off', flag-off golden (engineering/golden/flagoff-golden.a01faea.test.ts), next-goal HENS/VALUE sets, offline 1350→1368 rate, hidden-tab/hidden-time flag-off offline rate (QA browser run confirms M4 rate × elapsed exact), tick/market/workers/sellall price changes.
- Likely AC7-bot, held: pacing.test.ts, pacing-acw1, pacing-m2, pacing-m2b, p4, ac7-worst-seed.slow, seller-variance.slow (bot buys only Farm/Collection; stalls ~L6–7 at 30:00).
- **Need inspection before calling (a) (possible save-path issue):** hidden-save-paths quota-retry (expected migration record removed, found present), idb-mirror (mirror not written: `[]` length 0), save-majors-2959ba0 BUG-2 (`undefined`), save.test AC8 round-trip (extra fields, probably M4 track fields), m4a-saveseq-carry flag-off cases.

## Not yet triaged: all failures below

| file | test | first error |
|---|---|---|
| tests/hidden-save-paths.test.ts | save() while hidden persists the hide snapshot on every path saveWithQuotaRetry, N2 quota retry (own aborted v6 record removed, then retried): retry writes the snapshot | AssertionError: expected '{"migrationId":"a1b2c3d4e5f60718","ra…' to be null |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) 671 s repro, throttled 60 s frames: <= 60 s simulated while hidden, then frozen; full 671 s paid via offline | AssertionError: expected 254 to be 2684 // Object.is equality |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) 671 s repro with 1 s frames (timer not throttled) gives the same result | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) budget is cumulative across frame gaps (never more than 60 s total) | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) C-AC36: hidden 60 s === close at hide + reload after 60 s | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) C-AC36: hidden 61 s === close at hide + reload after 61 s | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) C-AC36: hidden 671 s === close at hide + reload after 671 s | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) C-AC36: hidden 3600 s === close at hide + reload after 3600 s | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) C-AC36: hidden 7200 s === close at hide + reload after 7200 s | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) C-AC36: hidden 20000 s === close at hide + reload after 20000 s | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) C-AC36 with a pending grant left open: settled into the Basket first, like a reload | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) a tab killed while hidden reloads exactly like one closed at the hide (hidden saves write the hide snapshot) | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) M1: 59 s hide with no frames === 59 s visible (no lost credit) | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) hide < 60 s keeps the online sim (no grant), events released on return | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) offline cap applies (2h) like a reload | AssertionError: expected 2700 to be 28800 // Object.is equality |
| tests/hidden-tab.test.ts | S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md) emits offline_grant on return | AssertionError: expected [ { type: 'offline_grant', …(2) } ] to deeply equal [ { type: 'offline_grant', …(2) } |
| tests/hidden-time.test.ts | accountHiddenPeriod: one entry point, exactly once per hidden period (keyed by periodId) 671 s: offline-grant result, listener fires once; replay is a no-op returning null | AssertionError: expected { startAt: 1792152030000, …(9) } to match object { startAt: 1792152030000, …(7) } |
| tests/hidden-time.test.ts | accountHiddenPeriod: one entry point, exactly once per hidden period (keyed by periodId) Game.onShown goes through the entry point (listener sees it) and returns its eggs | AssertionError: expected 254 to be 2684 // Object.is equality |
| tests/hidden-time.test.ts | accountHiddenPeriod: one entry point, exactly once per hidden period (keyed by periodId) pagehide + visibilitychange together (repeated hidden events, then repeated visible): one result | AssertionError: expected 254 to be 2684 // Object.is equality |
| tests/hidden-time.test.ts | accountHiddenPeriod: one entry point, exactly once per hidden period (keyed by periodId) B1: hide→show→hide in the same ms: second period accounts; never stuck hidden | AssertionError: expected 45 to be 480 // Object.is equality |
| tests/hidden-time.test.ts | accountHiddenPeriod: one entry point, exactly once per hidden period (keyed by periodId) B1: clock goes back onto a used startAt ms: new periodId, never stuck | AssertionError: expected 45 to be 480 // Object.is equality |
| tests/hidden-time.test.ts | accountHiddenPeriod: one entry point, exactly once per hidden period (keyed by periodId) M1: 59 s hide with no frames credits full online sim (matches 59 s visible) | AssertionError: expected { coinsCents: +0, …(20) } to deeply equal { coinsCents: +0, …(20) } |
| tests/hidden-time.test.ts | m2: hidden online sim counts toward .bak playedMs 60 s of kept hidden play enables .bak after a recovery that disabled it | AssertionError: expected 22 to be 240 // Object.is equality |
| tests/idb-mirror.test.ts | D2 IndexedDB mirror Game mirrors every save (load-time save and immediate purchase save) with the exact localStorage bytes | AssertionError: expected [] to have a length of 1 but got +0 |
| tests/idb-mirror.test.ts | D2 IndexedDB mirror purchase lost from localStorage (kill before flush) is recovered from the IndexedDB copy on the next boot | AssertionError: expected +0 to be 1 // Object.is equality |
| tests/m4a-flag-off.test.ts | M4-A flag off = main balance.m4.enabled ships 0 | AssertionError: expected 1 to be +0 // Object.is equality |
| tests/m4a-offline-csv.test.ts | M4A-4 offline grant from data < offlineMinSeconds => 0; flag off unchanged (AC11 formula) | AssertionError: expected 1368 to be 1350 // Object.is equality |
| tests/m4a-pick-hysteresis.test.ts | DualPicker: highlight = Farm-tab rows, hint = every option (UC7) fresh save: Collection (55.6 s) beats Farm bundle (111.9 s); hint shows Collection | AssertionError: expected 150.6410256410256 to be close to 55.6, received difference is 95.04102564102561, but  |
| tests/m4a-save-migrate.test.ts | M4 on: old saves migrate without loss flag off: v6 loads unchanged (no tracks, no marker) | AssertionError: expected 1 to be undefined |
| tests/m4a-saveseq-carry.test.ts | B1: saveSeq carries forward from an M4-build-off copy into flag-off saves M4-build-off save seq 5 -> flag-off save -> reload: the newest copy wins | AssertionError: expected true to be false // Object.is equality |
| tests/m4a-saveseq-carry.test.ts | B1: saveSeq carries forward from an M4-build-off copy into flag-off saves flag-off save with no prior saveSeq keeps main bytes (no saveSeq) | AssertionError: expected 1 to be +0 // Object.is equality |
| tests/m4a-sync.test.ts | sync-economy M4 columns balance.json m4 block is exactly what the CSVs generate (flag kept off) | AssertionError: expected 1 to be +0 // Object.is equality |
| tests/m4a-tracks-ui.test.ts | M4A-18 highlight = best payback (HoP 15:29) + next-goal next-goal: GOAL_ORDER; HENS/VALUE only with the flag on, never capped/MAX; flag on uses the same best-payback pick | AssertionError: expected [ 'FARM', 'HENS', 'VALUE', 'COLL' ] to not include 'HENS' |
| tests/m4a-tracks.test.ts | M4-A flag off (default) = pre-M4 game ships with enabled = 0 | AssertionError: expected 1 to be +0 // Object.is equality |
| tests/m4a-tracks.test.ts | M4-A flag off (default) = pre-M4 game eggs/s and price follow Farm/Collection; buyTrack is a no-op | AssertionError: expected 21 to be 8 // Object.is equality |
| tests/m4a-tracks.test.ts | TR-3 / production / price M4A-8 coop capacity x Hens coop mult at H10/20/30 only (boundaries 9/10/11, 19/20, 29/30); Farm drives the base | AssertionError: expected 1300 to be 650 // Object.is equality |
| tests/market.test.ts | market spec MK-* MK-12 / Q3 price at sale time after farm upgrade; queued N unchanged | AssertionError: expected 500 to be 525 // Object.is equality |
| tests/next-goal.test.ts | next-goal selection (AC5) start state: Collection L1, no income -> dash (QA note 1) | AssertionError: expected { Object (key, state, ...) } to match object { Object (key, state, ...) } |
| tests/next-goal.test.ts | next-goal selection (AC5) Ready picks the cheapest affordable; coins = cost counts | AssertionError: expected 'HENS' to be 'COLL' // Object.is equality |
| tests/next-goal.test.ts | next-goal selection (AC5) hired workers never appear; Grader appears as W4 at its tier level | AssertionError: expected [ 'FARM', 'HENS', 'VALUE', …(2) ] to deeply equal [ 'FARM', 'COLL', 'W4' ] |
| tests/next-goal.test.ts | next-goal selection (AC5) tie-break FARM > COLL > W1 when costs are equal (crafted balance) | AssertionError: expected 'HENS' to be 'FARM' // Object.is equality |
| tests/next-goal.test.ts | next-goal selection (AC5) Done when nothing is left | AssertionError: expected { Object (key, state, ...) } to match object { state: 'done', …(2) } |
| tests/next-goal.test.ts | next-goal anti-flicker hold a purchase updates immediately | AssertionError: expected 'Hens L1' to match /^Collection L2/ |
| tests/onboarding.test.ts | debug hooks debugBackdateSave produces an offline grant on next load | AssertionError: expected 1368 to be 1350 // Object.is equality |
| tests/p4.test.ts | P4 build numbers vs Economy re-sim W4 ~4.5, W4b ~5.25, Manage ~6.88 / 15 min (20 seeds vs Economy 100; +-0.3 min / +-10%) | AssertionError: expected Infinity to be less than or equal to 0.3 |
| tests/pacing-acw1.test.ts | AC-W1 casual (100 seeds, slow) >= 95% reach F10 within 15 min, F18 median <= 40 min, parity with Python (±20% medians, ±5 pts pass rate) | AssertionError: expected 0 to be greater than or equal to 95 |
| tests/pacing-m2.test.ts | M2 pacing: managed workers AC-W2: seller15 managed at most +1 min slower than M1 at F10 and F18 | AssertionError: expected 14.5 to be less than or equal to 1.000000001 |
| tests/pacing-m2.test.ts | M2 pacing: managed workers AC-W4: seller15 managed steps F18->F25 <= 6 min, F25 <= 70 min | AssertionError: expected Infinity to be less than or equal to 6.000000001 |
| tests/pacing-m2b.test.ts | M2 pacing: unmanaged + slow tapper AC-W3: unmanaged F25 faster than no workers (seller15, cheapest); F10/F18 within +0.8 min hire cost | AssertionError: expected Infinity to be less than Infinity |
| tests/pacing-m2b.test.ts | M2 pacing: unmanaged + slow tapper AC-W6: slow tapper with Coop Hand beats no Coop Hand by >= 4 min at F18 and >= 15% F21 income | AssertionError: expected NaN to be greater than or equal to 4 |
| tests/pacing.test.ts | AC7 pacing bot on the real sim >= 9 upgrades by 5 min | AssertionError: expected 7 to be greater than or equal to 9 |
| tests/pacing.test.ts | AC7 pacing bot on the real sim Farm L10 reached within 8-12 min | AssertionError: expected Infinity to be less than or equal to 12 |
| tests/pacing.test.ts | AC7 pacing bot on the real sim AC7 (decisions.md:47): Farm level at 30:00 within the targets band | AssertionError: expected 7 to be greater than or equal to 18 |
| tests/resume.test.ts | wall-clock resume hidden time counts as offline only when the tab is then closed (last save -> next load) | AssertionError: expected 228 to be 225 // Object.is equality |
| tests/s2-3a.test.ts | MK-17/21 visibility re-run (L12, 1,500 eggs, Market Hand Working) before: ~15% visible; after: >= 40% over 60 s for several seeds | AssertionError: expected 0.37083333333333335 to be less than 0.25 |
| tests/save-majors-2959ba0.test.ts | BUG-2: a live tab re-checks for a newer save before every write newer copy only in IndexedDB: the mirror write checks in its transaction, never puts, and stops the Game | AssertionError: expected 'undefined' to be 'string' // Object.is equality |
| tests/save.test.ts | save/load + migrations AC8 round-trips coins, coop, basket, levels | AssertionError: expected { version: 6, savedAt: 123, …(5) } to deeply equal { version: 6, savedAt: 123, …(1) } |
| tests/sellall-label-grader.test.ts | Sell all label = actual sellAll money delta absolute payout pinned: per-order round(k x 129 x 1.5), not round of the total | AssertionError: expected { eggs: 21, cents: 3150 } to deeply equal { eggs: 21, cents: 4065 } |
| tests/tick.test.ts | actions AC4 sale credits sold x price, partial fill | AssertionError: expected { coinsCents: 400, coop: +0, …(17) } to match object { basket: +0, coinsCents: 420, … |
| tests/workers.test.ts | M2 workers (m2-proposal v1.1) Grader: tier multipliers, cost floor(0.5 x farmCost(F)), half bonus Tired, asleep keeps 15% (v1.1) | AssertionError: expected 600 to be 2112 // Object.is equality |
| engineering/golden/flagoff-golden.a01faea.test.ts | golden storage bytes | AssertionError: m1-rc2-v4-12min: expected 'b1e07c13a21b6059ececdc898a4ddfe03b528…' to be 'b69c5783ba5b54dd663b |
| engineering/golden/flagoff-golden.a01faea.test.ts | golden sim trace | AssertionError: expected 'bb9ea1585453478ba01134bf0e9a6bafc037b…' to be 'f90d1678c260e1b64c8d1de2afcdaf7608186 |
| tests/ac7-worst-seed.slow.test.ts | AC7 worst-seed guards, workers variance bot (data/economy.csv 6dca24cd) F1 variance bot: L18-25 slowest-level P95/worst within bounds; P95 time-to-L20 warn (F1 6dca24cd only; skipped on pre-F1 57d964d5) | Error: L18 not completed: extend the run horizon |
| tests/ac7-worst-seed.slow.test.ts | AC7 worst-seed guards, workers variance bot (data/economy.csv 6dca24cd) F1 fixed bot: every seed's slowest L18-25 level <= l18_25_step_p95_max_s (F1 6dca24cd only; skipped on pre-F1 57d964d5) | Error: L18 not completed: extend the run horizon |
| tests/seller-variance.slow.test.ts | old deterministic bot (variance off) = Python var=None m1: per-seed reach times exact, 100 seeds | AssertionError: seed 1: expected { '0': +0, '1': 135, '2': 270, …(7) } to deeply equal { '0': +0, '1': 105, '2 |
| tests/seller-variance.slow.test.ts | old deterministic bot (variance off) = Python var=None m2: per-seed level at 30:00 equal, every reach time within 15 s, 100 seeds | AssertionError: seed 1: expected [ '0', '1', '2', '3', '4', '5', …(3) ] to deeply equal [ '0', '1', '2', '3',  |
| tests/seller-variance.slow.test.ts | m1 variance bot vs Python, 100 seeds (distribution) AC7 quantiles match; proposal targets 1-2 hold | AssertionError: L@30 P5: expected 6 to be 20 // Object.is equality |
| tests/seller-variance.slow.test.ts | m2 variance bot vs Python, 100 seeds (distribution) AC7 quantiles match; proposal targets 1-2 hold | AssertionError: L@30 P5: expected 6 to be 20 // Object.is equality |
| tests/seller-variance.slow.test.ts | AC7 band, variance bot (data/economy.csv 6dca24cd) band per CSV sha 6dca24cd (F1: hard band) | AssertionError: m1 L@30 P5: expected 6 to be greater than or equal to 18 |

## Not done
- Golden regeneration, all test edits, final gates.
- Commit identity: no written Head-of-Engineering rule found in engineering/*.md or CONTRIBUTING (only the rc commit author), so used Senior Software Architect.
