# D-HOP-22: unread economy.csv columns (farm_ms_price_mult and the rest). Proposal only

Senior Software Architect, 2026-10-19 (UTC+2). Base: main dd223f5 (tag m4b-dd223f5). No implementation in this branch.

## Finding (verified)
`farm_ms_price_mult` is read by nothing. `rg -w farm_ms_price_mult src scripts tests` finds no hits on main, and none on the
#45 L30+ code (rc/m4-t3-l30plus) either. HoP's D-HOP-22 note is correct: candidate (a) and (b) produce the same balance.json.

Method: I used a **perturbation test**, not grep, because sync reads several column families by prefix (`tc_*`, `hens_ms<n>_*`,
`egg_grade<n>_*`, `balanced<n>_*`) and the per-row verify loop enumerates every key. For each column, I changed its value on
every row (x3+7 for ints, x1.37+0.01 otherwise), then ran the committed `buildBalance`:
- If the output changed, sync emits the column.
- If it threw, the column is verified against the formulas.
- If neither happened, **nothing in sync reads it**. And since the game reads only balance.json, the game doesn't read it either.

| CSV | columns | emitted | verified (throws) | **unread** |
|---|---|---|---|---|
| main data/economy.csv (b48be8a4, 31 rows) | 125 | 85 | 21 | **18** |
| HoP candidate b.csv (84bd0b70, 56 rows) on #45 code | 133 | 85 | 22 | **25** |

**Unread on main (18):** guard_heartbeat_s, guard_stale_s, market_hand_min_wait_s, charge_regen_s, charge_cap,
refill_threshold_pct, combo_window_s, combo_boost_s, focus_premium, rest_recovery_mult, start_charges, nudge_rearm_farm,
nudge_max_dismissals, w2_asleep_collect_share, nudge_coopfull_share, nudge_coopfull_window_s, nudge_coopfull_min_farm,
leave_attended_window_s.
- Of these, only tests/staging-f1-m4cols.test.ts mentions any (as staging-file assertions).
- The plain `focus_premium` column is unread. balance.json's `m4.tc.focus_premium` (0.1) comes from the separate `tc_focus_premium` column, and no src code reads either key by name.
- Several of the 18 (charges, combo, rest, nudges, leave window) describe features that the game implements with
  hard-coded or balance.json hand-set values, or doesn't implement at all. Whether each should be wired or dropped is Product's call.

**Added by the L30+ candidate (7 more):** farm_ms_price_mult, feed_mill_price_mult, auto_collect_every_s,
contracts_manual_bonus, farm_max_level, hv_extra_second_markup, start_coop_eggs.
- farm_ms_price_mult in b.csv: 1 for L0-34, then x1.10 at L35, 1.265 at L40, 1.3915 at L45, ... (cumulative steps at F35/40/45/50).
- feed_mill_price_mult: x1.10 from L35. auto_collect_every_s: 2 from L40. contracts_manual_bonus: 0.05 from L45.
  These are **features that don't exist in code** (Feed Mill, auto-collect, contracts).
- farm_max_level / hv_extra_second_markup duplicate economy-config.json (farmMaxLevel 50, hvExtraSecondLevelMult 1.1).
  They are documentation only.
- start_coop_eggs (10 on every row) is **not** read by state.ts or anywhere else. Economy's earlier note said it was, and that's wrong.
  The game's starting coop comes from initialState.

## farm_ms_price_mult: wire or drop. **Recommendation: drop it (from the shipping CSV) now; re-propose as a spec'd feature.**
What wiring would mean:
- Where: `farmPriceCents(F)` (formulas.ts) feeds `eggPriceCents` flag-off and `trackPriceCents` M4-on, and the price stack
  is (1+baseStep*V)(1+levelBonus*V) x grade x Balanced.
- A per-Farm-level price multiplier would go in as `farm.priceMultByFarm[F]`, emitted by sync for rows 0..farmMaxLevel
  (same pattern as coopCapacityTable). It would multiply in **both** price paths before the single half-up rounding.
- Consequences:
  - It's a new economy mechanic (a price jump on reaching F35/40/45/50). It moves L35+ pacing, the step ratio (HoP measured
    the F45/F50 bottlenecks on the assumption that it was live), every M4-on golden that reaches L35, and the flag-off path
    if applied there.
  - It also needs UI: a milestone toast or "price x1.10" hint (next-goal / tracks-ui), and save-neutral handling (no state).
  - It's not a tooling change. It needs a spec (product), a src change (HoE OK), new goldens and a fresh L30+ measurement.

Why drop:
1. All accepted L30+ evidence (D-HOP-21/22, the b candidate P95 1.974 / worst 2.171) was measured with the column inert.
   Wiring it changes the measured candidate after acceptance.
2. HoP has already withdrawn the "milestone driver" explanation (D-HOP-22). The real L34-49 bottleneck is Collection purchases.
3. A shipped CSV column that suggests a mechanic the game lacks is misleading for Economy and QA. That's exactly how this
   was missed.
- If Product wants Farm milestones, they should come back as a spec'd feature with their own column name, wiring and tests,
  in a release that re-measures L30+.

Same treatment proposed for feed_mill_price_mult, auto_collect_every_s, contracts_manual_bonus (unimplemented features).
Either drop them from the shipping CSV, or keep them in a product-side design CSV that isn't vendored.

## Proposed CI check: sync-economy fails on unknown columns
In `scripts/sync-economy.ts` (tooling; runs in `npm test`, `npm run build` and `sync --check`):
- `READ_COLS`: the explicit set sync consumes (INT_COLS + the fitted/verified columns + M4_COLS + the regexes already in
  `isM4Col`: `^tc_`, `^hens_ms\d`, `^egg_grade\d`, `^balanced\d`, worker `^w\d_`).
- `DOC_ONLY_COLS`: an allowlist in `data/economy-config.json` (`docOnlyColumns: [{ name, reason, owner }]`). Initially:
  farm_max_level (mirrors farmMaxLevel), hv_extra_second_markup (mirrors hvExtraSecondLevelMult), start_coop_eggs (documents
  initialState), plus whichever of the 18 above Product decides to keep as documentation, each with a reason.
- Rule: any header not in READ_COLS ∪ DOC_ONLY_COLS makes `parseEconomyCsv` throw
  `sync-economy: economy.csv column <c> is not read by the game or sync and not in economy-config.docOnlyColumns`.
  CI then fails before any balance.json is written.
- Also fail if a DOC_ONLY column disagrees with its config mirror (farm_max_level != farmMaxLevel; hv_extra_second_markup + 1
  != hvExtraSecondLevelMult), so the documentation can't drift.
- Tests (tests/sync-columns.test.ts):
  1. The live CSV passes.
  2. Adding a column `foo` throws with that message.
  3. Adding it to docOnlyColumns passes.
  4. A perturbation guard: for every READ_COLS column, changing it changes the output or throws (the method above), so
     READ_COLS can't silently go stale.
- Rollout: the 18 currently unread columns must be decided first (drop, wire, or allowlist with a reason). Otherwise the
  check fails on main. Suggest landing the check with those 18 allowlisted as `reason: "legacy, pending D-HOP-22 review"`,
  and a follow-up that empties that bucket.

## Decisions needed
- HoP/Economy: drop farm_ms_price_mult, feed_mill_price_mult, auto_collect_every_s, contracts_manual_bonus from the
  shipping CSV (recommended), or spec them.
- Product: keep, wire or drop for each of the 18 legacy unread columns.
- HoE: OK for the CI check (tooling only, no runtime change).
