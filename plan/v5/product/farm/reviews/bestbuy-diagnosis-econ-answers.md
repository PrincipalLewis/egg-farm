# ★ Best buy diagnosis: Economy answers to Q-E1..Q-E5 · Economy/Balance Designer · 2026-10-24 17:45 CEST
Re: `product/farm/bestbuy-scoring-diagnosis.md` v0.1 (PM Farm Upgrades, 17:25). **Paper only.** No code, PRs or commits. `product/economy.csv` is untouched (sha256 c7bb783f…). **Scope: likely M5.1, pending HoP.** Nothing here changes an M5.0 gate.

**Labels.** **SCRATCH** = a sim I ran for this note. **MODEL** = closed form from the CSV and code. **ESTIMATE** = judgement or arithmetic I didn't simulate. **PMFU** = a number taken from the diagnosis repro (`product/farm/bestbuy-diag/*-out.txt`), not re-run by me.

**My runs (SCRATCH, not gate runs):**
- `scratch/bb-econ/seeds_t10.ts` → `scratch/bb-econ/seeds_t10-out.txt`. A copy of PMFU's `seeds.ts` with L10 timing added. It runs against `scratch/bb-econ/bb-5d9efa6/`, a private copy of `/workspace/scratch/bb-5d9efa6`. That copy's `src/econ/best-buy.ts`, `income.ts` and `ui/pick-hysteresis.ts` are byte-identical to `product/critic/wt-5d9efa6` (RC1 5d9efa6), and `tests/bot-m4.ts` keeps PMFU's 2-line hook. Seeds 1–200, T = 1500 s. Mode `a` = PMFU's Option A rules applied to the bot.
  - **Validation:** baseline seller15 + VAR (no workers) gives fastest L10 **7.87** min and P95 **12.02** min. Workers + VAR gives P95 **12.08**. These are exactly the T3 figures recorded in D-HOP-2026-10-19-06 and -07.
- `scratch/bb-econ/qe4_depth.py`: a depth-3 vs depth-4 model on the T3 L30+ CSV (Q-E4).

---

## Q-E1: Are the ~20–25 zero-gain Collection buys a deliberate coin sink? Retune or re-baseline?
**Answer: not deliberate by design, but the calibration depends on them. Recommendation: re-baseline in M5.1 under a CEO amendment, not a cost retune.**

**Intent (it was never meant as a sink):**
- `product/economy.md:26` designs Collection as a real value row: "+12%/level plus taps; steep growth stops a cheapest-first player over-buying it."
- `m4a-spec.md:111-113,142` (M4A-5/7/15, a QA gate fix, 2026-10-16) moved the +12% to Egg value. That left Collection with eggs/tap only. `collection_price_bonus` still holds 0.12×C in the CSV, but the code ignores it with M4 on (`decisions.md:74`, `tracks.ts:6`). No document re-justifies the Collection rows as a sink after that.
- I flagged the result earlier as dead spend. `research/v2-slices/economy.md` §1.2 row 5: Σ`collection_cost`[0..22] = $825,265 of $3.01M L0–30 spend = **27%** (MODEL, CSV rows 0–29 for farm/hens/egg_value plus collection 0–22).

**Why it still matters:**
- T3 was fitted with the bot buying Collection through `highlightPick` (D-HOP-2026-10-19-02 and -04: "Economy's bot routes Collection and workers via highlightPick too").
- The CEO's L10 window was cleared by a hair *with* those buys (D-HOP-06: fastest 7.87 vs floor 7.8; P95 12.02/12.08 vs 12.1).
- **New finding (SCRATCH, `seeds_t10-out.txt`): Option A in the bot breaks D-CEO-20261019-04's L10 floor.**

| Bot (seeds 1–200) | L10 fastest / P50 / P95 / max (min), current | Option A in the bot | Gate (D-CEO-04) |
|---|---|---|---|
| seller15 + VAR, no workers (`runBot`) | 7.87 / 10.46 / 12.02 / 13.77 | **7.50** / 8.39 / 9.38 / 10.31 | fastest ≥ 7.8 → **FAIL** |
| workers + VAR (`runM2`) | 8.32 / 10.40 / 12.08 / 13.44 | **7.56** / 8.44 / 9.21 / 10.12 | fastest ≥ 7.8 → **FAIL** |
| seller15 fixed (`runBot`) | 9.00 / 9.75 / 10.50 / 10.75 | 7.25 / 7.50 / 7.75 / 7.75 | all seeds < 7.8 |

- Option A still buys 3.0–4.0 Collection levels per seed where the model gain is > 0 (early, before the Coop Hand), so the rule self-corrects when Collection binds.
- Σ`collection_cost`[0..9] is only $1,811. But that is spent while income is $5–70/s, which is why L10 moves by about 2 min.

**Retune vs re-baseline:**
1. **A retune is blocked and also self-defeating.**
   - Blocked: L0–30 is frozen. D-CEO-15/16: play through F30 byte-identical to main; E-G7 is checked cell-wise against b48be8a4 = c7bb783f on kept columns (`decisions.md:336,348,351`). Any cost change on rows 0–30 needs a new CEO ruling.
   - Wrong rows: +15–20% on L10–30 does nothing for the L10 window, which is set by L0–9. Rows 0–9 would need raising too, which is the exact cliff fight D-HOP-04/05/06 lost.
   - Self-defeating (ESTIMATE): scaling costs by k scales every wait by about k at the same income. A's slowest-level P95 of 3:22 × 1.18 ≈ 3:58, and L28–30 worst 2:54 × 1.18 ≈ 3:25. That pushes BB-9 (≤ 180 s) back over and turns a hidden sink into visible waiting, the opposite of what the Critic and Vadim complained about.
2. **Re-baseline (recommended)** in the M5.1 BBv2 change, packaged as one CEO amendment:
   - (a) a new L10 window centred on the A bot. SCRATCH: P50 8.4, P95 9.2–9.4, fastest 7.5. A window of, for example, 7.0–10.0 min. This is the CEO's own D-HOP-07 follow-up ("revisit the window").
   - (b) Re-centre the non-gating L18 sanity (`pacing-targets.json` `l18_minutes_sanity` 19.8 → ≈17.3–18.3; PMFU runBot 17:15, my runM2 18:15).
   - (c) The AC7 L30-at-30-min band 18–22 stays. A gives L21 (PMFU).
   - (d) `ac7_w_t20_p95_warn_s` re-centred (PMFU: t20 P95 25:56 → 22:59).
   - (e) New AC7 hashes.
   - Context: M5.0's active stack already moves L30 29–35% sooner on the active path (`research/v2-slices/economy.md` §0 item 4). A ~17% faster ★ path is the same direction and doesn't need costs to "pay it back".
3. **M5.0:** take the XS ★-only stopgap or Part A UI-only (PMFU §7). AC7 hashes stay byte-identical and nothing in the freeze moves. Note the known gap: the bot then over-states ★-follower time to L10/L30 by about 17–20%.

## Q-E2: Will M5.0's tap coins (A1) and streak give Collection real modelled value?
**Answer: no. No M5.0 mechanic reads Collection level.** Collection's only real value is coop throughput for a player who isn't tapping. Today's model hides that behind a 1 tap/s assumption, and **Part A would expose it.**

**M5.0 is Collection-blind (spec trace):**
- **A1 tap coins** = `floor((refCents × 300 + 5000) / 10000)` per credited tap, "whether or not the coop has eggs" (`collection/m5-streak-tap-coins-spec.md:34,42,99`). refCents comes from I_ss / the trailing 60 s of passive sales (§4.1a, `:147-157`). There is no `eggs_per_tap` term.
- **Streak:** (1 + s) on sale price, s ≤ 0.28. "Price only: laying, eggs per tap, coop cap and offline are unaffected" (`:33,62`).
- **Golden egg:** `baseScaled` = E (production eggs/s) × price (`m5-golden-egg-spec.md:228`).
- **Broody:** 0.05 × reference income (`m5-broody-hen-spec.md:38`).
- **Sweep:** lay ×1.15, capped by coop.
- So the diagnosis edge case "coins scaled by eggs per tap" doesn't exist in the approved specs, and Collection stays at gain 0 under `assumeWorking` in M5.0.

**Collection's real (unmodelled) value (MODEL):**
- The Coop Hand moves `min(coop, eggs_per_tap[C])` every `w2_every_s` = 2 s (4 s Tired) (`src/sim/tick.ts:76,84-86` @5d9efa6). That's 2.5·(1+C) eggs/s Working.
- Laying is `eggs_per_sec`[H] = H+1.
- For a 0-tap player the hand binds when C < 0.4(H+1) − 1:

| H | 20 | 25 | 28 | 30 |
|---|---|---|---|---|
| C needed, Working | 8 | 10 | 11 | **12** |
| C needed, during Sweep ×1.15 | 9 | 11 | 13 | **14** |
| C needed, Tired | 16 | 20 | 23 | **24** |

- `income.ts:26-37` models collect as `eggs_per_tap × 1.5` (1 tap/s + hand). That passes production at every reachable state, so gain = 0 (C1).
- **Risk of Part A as written (MODEL/ESTIMATE):** an idle ★-follower stops buying Collection once 1.5 × (5 + 5C) ≥ H+1, i.e. about C4 at H30. Their real collect is then 12.5 eggs/s against 31 laid, so they would sell **about 40% of their production at L30**.
  - Today's bug hides this, because everyone buys C22–23.
  - The AC7 bots tap about 1/s, so no gate would catch it.
  - PMFU's probe (no taps, from C10) already shows a mild case: C10 hand = 27.5 eggs/s < 29–31 laid at H28–30.

**Recommendation (M5.1, with BBv2):**
- Make Collection meaningful honestly: `best_roi` models collect at **0 player taps once a Coop Hand is hired**, i.e. collect = `eggs_per_tap[C]` / `w2_every_s` with `assumeWorking`. Before the hire, keep 1 tap/s.
- This matches HoP's M5 rule that reference income is passive income only.
- Proposed tunable: `bb_assumed_taps_per_s_with_w2` = 0.
- Effect (ESTIMATE): Collection becomes meaningful only while the hand can't keep up. That's about 8 extra levels to C12 by H30, Σ`collection_cost`[4..11] ≈ $4.6K, which is negligible pacing.
- Re-measure on the A bot when the rule lands.
- Leave Tired out of the model, as `assumeWorking` does today. Refill is the fix for Tired.

## Q-E3: L29→L30 "$624K, 3:44 from an empty bank": retune, or a 240 s exception?
**Answer: neither. The premise is off by one row.**

**The real L29→L30 step (MODEL):**
- **L29→L30 costs `farm_cost`[29] = $323,719**, not $624,316. The cost of buying F→F+1 is `farmCost(F)` = `costTable[F]` (`src/econ/best-buy.ts:47`, `src/config/formulas.ts:53-55` @5d9efa6). PMFU's own `dump-out.txt` t=2250 shows "F29 … FARM $323,719".
- At $2,781/s (dump, F29) that's **116 s = 1:56** from an empty bank. The step is ×1.35 over L28→29 ($239,792), not ×1.93. This matches the Critic's measured L29 ~1:55.
- **The 3:48 L29 gap in the ★ run is the zero-gain Collection buy**, not Farm: C22 costs $309,485 = 111 s, plus Farm's 116 s ≈ 3:47.

**BB-9 under Part A (PMFU, not re-run by me):**
- L29 2:09 and L28 1:39 from the Critic save.
- runM2 + VAR L28–30 worst **2:54**; fixed **2:00**.
- All ≤ 180 s. **BB-9 needs no exception.** Delete the "known exception, pending Q-E3" clause.

**Where $624,316 really sits:**
- Row 30 = the **L30→L31** price, paid only if L30+ ships (M4 `maxLevel` 30 never offers it).
- At about $2.78K/s that's 224 s ≈ 3:44, ×1.93, against the L30+ gates (E-G4 / `gap_*_max_s` 240), not BB-9. On T3 it sits inside the already-failing, parked L30+ reshape (E-G4 baseline 305 s median; `research/v2-slices/economy.md` §7).
- **Lever for that reshape (ESTIMATE):** by D-CEO-15's definition ("byte-exact = play through F30"), `farm_cost`[30] doesn't affect play through F30. But E-G7 is cell-wise and HoP explicitly restored main's L30 row (`decisions.md:336`). So changing it needs a HoP/CEO ruling. Raise it with the L30+ reshape, not here.

## Q-E4: With L30+ per-row cap offsets, can the first income-bearing buy come more than 3 buys after a Farm level?
**Answer: no. The worst case is the very next buy (depth 2, counting Farm as 1). Keep `bb_depth` = 3. Neither depth 4 nor an unlock term is needed.**

**The T3 offsets (verified):**
- T3 CSV `scratch/m4-retune/handoff-T3j/ev/N0b_C150.csv` (c249723c…, the L31+ source of the T3 splice). `hens_cap_over_farm` = `egg_value_cap_over_farm` = 3 on rows ≤ 39, 4 on rows 40–42, 5 on rows 43–55. This matches S2.
- Track max is 55 (`trackMaxLevel` = cost rows − 1); farm max is 50 (`economy-config.json`).
- Cap = min(55, F + offset[F]) (`handoff-T3j/src/config/formulas.ts:130-133`).

**Proof (MODEL):**
- Offsets never decrease, so each Farm buy raises both caps by 1 + Δoffset ≥ 1 until 55. At F49 the cap goes 54 → 55.
- Egg value's unit price (1 + 0.05V)(1 + 0.12V) × grade × Balanced (`formulas.ts` `trackPriceCents`; `egg_value_base_step` 0.05, `egg_value_level_bonus` 0.12) is strictly rising in V. Grade and Balanced multipliers never fall. Each V step is +40–90¢ at L30+, so cent rounding can't zero it.
- So **Farm → Egg value** always has gain > 0, about +$57–89/s against Farm's −$0.0125/s wage. Offsets above 2 *add* headroom, which makes tracks *less* often capped. They never push income further out.

**Concrete trace (`qe4_depth.py`):**
- At **F39/H42/V42** (both at cap, the 3→4 offset jump), Farm is the only option, gain −$0.013/s. After Farm the cap is 44: Hens $126,542 → +$36.5/s, Value $258,971 → +$57.2/s.
- Farm's bundle payback is 14,876 s at depth 3 and 11,970 s at depth 4. Depth 4 sees the 2nd extra level, but Farm is the only candidate, so the pick is the same.
- Same at F42/H45/V45 (4→5 jump) and F49/H54/V54.

**Exhaustive check (MODEL):**
- 1,029 states: F29–49 × H, V ∈ [cap−6, cap].
- Worst first income-bearing depth after Farm = **2**.
- The depth-3 and depth-4 picks **differ in 0 states**.
- Same result on the T3j harness CSV 84bd0b70.
- **Limits:** the Grader is omitted (a uniform ×`w4_price_mult`), Collection is held at C23 (non-binding), and workers are all hired. A worker, Grader tier or Balanced step only adds income-bearing options.

**Side effects:**
- C5 (the L28–29 ∞-tie) exists only because M4 caps tracks at `maxLevel` 30. With L30+ track max 55, Value always has headroom after Farm, so the ∞-tie disappears.
- BBv2-3 is still needed for M4/M5.0 data.

## Q-E5: Keep Part B (effective payback), or drop it and apply Part A to the bot?
**Answer: drop Part B (set `bb_eta_weight` = 0, or keep it out of the spec). Apply Part A through the shared source (BBv2-6) to both the UI and the AC7 bot, in M5.1, together with the Q-E1 re-baseline and the Q-E2 collect fix.**

**Bot of record:**
- D-HOP-2026-10-19-02 says both pacing bots (`tests/bot.ts`, the AC7 bot) buy whatever the game's own `highlightPick` / `bestPaybackAmong` picks, with no separate bot ROI. The bot is defined as a ★ follower, and the AC7 bands, T3 L10 window, L18–25 guards and two-bot ±20% agreement are all measured on it.
- Any change to the UI picker that leaves the bot alone breaks that definition. That's acceptable only as a short M5.0 stopgap.

**What B buys (PMFU, ESTIMATE on top):**
- About 40 s on L10→L30 from the Critic save (32:03 → 31:21) and 27 s on runM2 P50 t30 (41:01 → 40:34). That's about 1–2%, with the same longest gaps.
- B pushes L18 further outside the sanity band (17:15 → 16:30).
- It adds a tunable (`bb_eta_weight`), replaces M4A-18's affordable-first clause and changes picks *between meaningful rows*. That's more pick churn, more hash and gate deltas, and more test rewrites (M4A-41 interactions) than A.
- Most of its value overlaps with BBv2-4's countdown display, which A already has.

**What A in the bot costs:**
- Every AC7 hash changes, and L0–30 play diverges from main. That collides with the D-CEO-15/16 freeze and D-CEO-04's L10 floor (Q-E1 table).
- It must therefore ride with a CEO amendment, not a HoP ruling alone. Same for B: B doesn't avoid this, it adds to it.

**Plan:**
1. **M5.0:** the ★-only XS stopgap or Part A UI-only, with no bot change. Optionally add the four telemetry events to measure real `zero_gain_purchase` / `dead_zone`.
2. **M5.1:** Part A plus the Q-E2 collect fix in `best-buy.ts` / `pick-hysteresis.ts`, shared by the UI and `tests/bot-m4.ts` `pickM4All`. Economy then re-runs AC7, the L10 window, L18 sanity, the L18–25 guards, M4A-40, TR-5 and two-bot agreement on the new bot. The CEO approves the re-baseline (Q-E1), and new hashes are published.
3. **Revisit B only if** M5.1 telemetry shows `dead_zone` waits where a better row is ≤ 10–20 s away. Keep `bb_switch_ratio` 0.9 and `bb_depth` 3 (Q-E4).

---
**For HoP (PMFU to route):**
- (1) Q-E1/Q-E5 need a **CEO amendment** (L10 window and L0–30 play freeze) before any bot-side change. Part A UI-only or the ★ stopgap don't.
- (2) BB-9's Q-E3 exception clause can be deleted.
- (3) UC17 (Q-H2): Collection still has zero gain at the start, with or without the Q-E2 collect fix (no Coop Hand, 1 tap/s: collect 5 eggs/s vs 1.5 laid, so it doesn't bind at L0). UC17's "Collection first" stops holding either way. Retiring it is consistent with Economy's view.
