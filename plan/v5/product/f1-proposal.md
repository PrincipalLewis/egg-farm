# F1 mid-game stall: proposal (Economy, draft 2026-10-16; due Mon Oct 19, HoP approval Tue, merge by Wed Oct 21)
Status: **DRAFT, not merged.** Candidate file: `product/economy.f1.csv`. Base = `current` (P1q+P3) + `M2_CURRENT` (Workers v1.1 + P4) = `economy.csv`.
⚠ **Farm costs are PM Farm Upgrades' domain.** The recommended lever changes `farm_cost` from L6 up and needs their sign-off. `w4_tier_cost` (= 0.5 × farm_cost at the tier level) follows automatically from L18. PM Workers should note this; no worker parameter changes.
Session 2 player notes: none yet (`playtest/player-notes/` only has session 1). Re-check before Mon.
Scripts: `product/sim/m2_validation/f1_levers.py` (variants, AC checks via `pt1_resim.m1/m2`, per-level table), `f1_stall.py`. Outputs: `f1_rec_check.md`, `f1_levels_out.md`. 30 seeds; seller15, casual and cheapest; workers on, managed, 120 min. `economy_sim.py`, `economy.csv` and `game/` are unchanged.

## Diagnosis
`f1-midgame-stall.md`: P1q halved order sizes, but time per level and $/s didn't move. Progress is limited by egg supply × price. Income grows roughly linearly per level (hens +5/level × price +5%/level: $13→64/s over L5–14). Farm cost grows ×1.35/level (448→6678). So time per level climbs from 45 s at L5 to 90–150 s at L12–14 (seller15), and to 165 s for cheapest. L9 is long for every model because the 800-coin Hawker is unlocked and bought there.

## Levers (seller15 time spent at each level, median s; casual and cheapest are in the script output)
| variant | formula-expressible today? | first buy s | L10 min (s/casual/cheap) | s/level L5…L14 seller15 | max gap between purchases to L18 (s) | max × prev after L18 (s/c/ch) | L18 min |
|---|---|---|---|---|---|---|---|
| current | yes | 15 | 10.0/11.3/11.2 | 45 45 45 90 75 60 90 105 90 150 | 150/160/150 | 1.22/1.31/**2.60** | 28.2 |
| A egg_rate 0.24 (global) | yes | 15 | 8.8/9.7/9.8 | 45 45 30 75 60 45 75 90 75 135 | 120 | 1.27/1.27/2.62 | 24.0 |
| A hens_per 7 (global) | yes | 15 | 8.2/9.3/9.2 | 45 30 45 60 60 45 60 90 60 105 | 105 | 1.25/1.20/2.71 | 21.5 |
| A hens + floor(0.25F²) | new param | 15 | 8.8/9.7/10.0 | 45 45 30 75 45 45 60 75 45 90 | 90 | 1.22/1.17/2.60 | 19.8 |
| B f_growth 1.30 (global) | yes | 15 | 8.8/9.7/9.5 | 45 30 45 75 45 60 45 75 60 90 | 90 | 2.20/2.25/2.17 | 19.2 |
| B f_base 80, f_growth 1.32 | yes | 15 | 7.8/9.0/8.8 | 30 45 45 60 45 45 60 75 60 90 | 90 | 2.00/1.80/1.44 | 18.2 |
| B growth ×1.25 on L6–14 only | new param | 15 | 9.2/10.3/10.2 | 45 45 45 75 45 45 60 45 75 60 | 80 | 2.00/**2.25**/1.56 | 19.0 |
| **B rec: ×1.25 on L6–14, ×1.45 on L15–20, ×1.35 after** | new param | **15** | **9.2/10.3/10.2** | **45 45 45 75 45 45 60 45 75 60** | **90/80/90** | **1.47/1.45/1.54** | 20.5 |
Lever A at any strength (egg_rate 0.22–0.30, hens_per 6–8, quadratic hens) never gets L12–14 into 45–75 s without pushing L10 below 9 min ±20%. Supply growth is linear and cost growth is exponential, so the gap returns. A global B either leaves L13–14 at 90 s or gives a >2× step after L18.

## AC checks (`pt1_resim` m1/m2, 30 seeds)
| variant | AC7 seller15 L@10m/L@30m | cheapest | AC7-soft casual F10≤15m / F18≤45m | AC-W1 F10≤15m s/c/casual | F18 med min | W4 (≤6) | W4b (≤8) | W5 Manage/15m | $/s first 2 min |
|---|---|---|---|---|---|---|---|---|---|
| current | 10/18 | 9/17 | 30/30 / 30/30 | 30/30/30 | 28.2/31.2/29.0 | 5.5 | 7.5 | 5.62 | 2.11 |
| A hens+0.25F² | 12/21 | 10/20 | 30/30 / 30/30 | 30/30/30 | 19.8/22.0/20.7 | 2.8 | 3.5 | 5.75 | 2.11 |
| A egg_rate 0.24 | 11/19 | 10/18 | 30/30 / 30/30 | 30/30/30 | 24.0/26.5/24.7 | 4.8 | 6.2 | 5.75 | 2.18 |
| B L6–14 only | 11/21 | 10/20 | 30/30 / 30/30 | 30/30/30 | 19.0/22.0/20.0 | 3.5 | 3.5 | 5.75 | 2.11 |
| **B rec** | **11/20** | 10/19 | 30/30 / 30/30 | 30/30/30 | 20.5/22.8/21.3 | 5.5 | 5.0 | 5.75 | 2.11 |

## Recommendation: Lever B, two-segment farm cost growth
Farm cost growth ×1.25 on L6–14 (softened segment), then ×1.45 on L15–20 (catch-up), then ×1.35. Costs from L20 on end up 23% below today's. HoP constraints with seller15:
- L10 at 9.2 min, inside 9 ±20%.
- First upgrade at 15 s.
- Longest gap between purchases before L18 is 90 s, under 3 min.
- L5–14 times are 45–75 s. Casual runs 40–80 s; cheapest runs 30–90 s, with 5 of 10 levels outside the band (its Collection/Farm alternation; today it runs 30–165 s).
- No level after L18 is more than 2× the previous one: 1.54× at most, and cheapest improves from today's 2.60×.
- AC7 10/18, AC7-soft and AC-W1/W4/W4b/W5 all pass.

Costs:
- The game reaches L18 at 20.5 min instead of 28.2 min, which is faster overall.
- L15–18 steps rise to 60–165 s, which is still under 3 min.
- Lever A (more supply) is not recommended. It can't flatten L12–14, and it changes demand and offline values on every row.

### Required formulas.ts / sync-economy change (Engineering)
`farmCost` is pure `floor(baseCost × costGrowth^F)` today and can't express this. Add an optional param:
```ts
farm: { ...; costGrowthSegments?: { from: number; to: number; growth: number }[] }  // levels inclusive, non-overlapping
export const farmCost = (F, p) => { let v = p.farm.baseCost, n = clampL(F, p);
  for (const s of p.farm.costGrowthSegments ?? []) { const k = Math.max(0, Math.min(clampL(F, p), s.to) - s.from + 1); v *= s.growth ** k; n -= k; }
  return Math.floor(v * p.farm.costGrowth ** n); };
```
Values: `costGrowthSegments: [{from:6,to:14,growth:1.25},{from:15,to:20,growth:1.45}]`, costGrowth 1.35, baseCost 100. This is the same pow form as the sim (`SegEco.fcost`). sync-economy has to either fit the segments (detect where row-to-row growth changes) or read them from a config constant and verify every row. Engineering should check the float floor on all 31 rows; the sim's values are in the CSV. Absent = today's behaviour.

## Exact CSV changes (`economy.f1.csv` vs `economy.csv`; every other cell is identical, and the sim reproduces economy.csv byte for byte)
| L | farm_cost old→new | w4_tier_cost old→new |
|---|---|---|
| 6 | 605→560 | |
| 7 | 817→700 | |
| 8 | 1103→875 | |
| 9 | 1489→1094 | |
| 10 | 2010→1368 | |
| 11 | 2714→1710 | |
| 12 | 3664→2138 | |
| 13 | 4946→2672 | |
| 14 | 6678→3340 | |
| 15 | 9015→4844 | |
| 16 | 12171→7024 | |
| 17 | 16431→10185 | |
| 18 | 22182→14768 | 11091→7384 |
| 19 | 29946→21414 | 14973→10707 |
| 20 | 40427→31050 | 14973→10707 |
| 21 | 54576→41918 | 27288→20959 |
| 22 | 73678→56589 | 36839→28294 |
| 23 | 99466→76395 | 36839→28294 |
| 24 | 134279→103134 | 67139→51567 |
| 25 | 181277→139230 | 67139→51567 |
| 26 | 244724→187961 | 67139→51567 |
| 27 | 330378→253748 | 67139→51567 |
| 28 | 446010→342560 | 67139→51567 |
| 29 | 602114→462456 | 67139→51567 |
| 30 | 812854→624316 | 67139→51567 |
That is 25 farm_cost cells and 13 w4_tier_cost cells, 38 in total. The flat w4_tier_cost values on L20, L23 and L25–30 repeat the previous tier's cost, as they do today.

## QA targets (economy.f1.csv build, seller15 script: Sell every 15 s, 1 tap/s, cheapest-first only where stated)
Time spent at each Farm level (from reaching L to reaching L+1), sim median. The ±20% band is widened to the 15 s Sell cadence (a level can only end on a Sell).
| L | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|
| expected s | 45 | 45 | 45 | 75 | 45 | 45 | 60 | 45 | 75 | 60 |
| band s | 36–60 | 36–60 | 36–60 | 60–90 | 36–60 | 36–60 | 45–75 | 36–60 | 60–90 | 45–75 |
- **Reach L10:** 555 s (9.2 min). Band 444–666 s. Casual 620 s, cheapest 615 s.
- **First upgrade:** 15 s (casual 20 s). Must be under 30 s.
- **Longest wait without an affordable purchase, L0–18:** at most 90 s, hard limit 180 s.
- **L18–25:** no level more than 2× the previous; worst step ≤6 min (seller15), ≤8 min (cheapest).
- **Income/s at L5–14 (seller15):** 13.19, 17.08, 20.73, 25.57, 29.53, 33.63, 39.72, 44.74, 52.40, 58.25, with the same ±20% band.
- **AC7 (re-baselined):** Farm level at 30:00 = **L20** (seller15, no workers; band L18–22; all 30 seeds L20). With workers on: L21 seller15, L20 casual, L19 cheapest (all inside).
- **L30 (seller15, no workers):** reached at **196.5 min**, band 180–300 min (all 30 seeds). With workers on, L30 is at 78 min (current 100 min). The band only holds for the no-workers measure; see §Acceptance bands.

## Open
1. PM Farm Upgrades sign-off on the cost curve, including the L15–20 catch-up.
2. Engineering estimate for `costGrowthSegments` (sync fit or config + verify), which has to land by Wed Oct 21.
3. Session 2 notes, if they arrive before Mon.
4. Product call on whether reaching L18 7.7 min sooner is acceptable; AC7 is a floor, so it passes.

## Engineering handoff (update 2026-10-16)
Engineering built the segmented cost curve on `f1/cost-segments` at ce7d59a (off by default). Wednesday's handoff is `economy.f1.csv` plus this block in `data/economy-config.json`:
```json
"farmCostGrowthSegments": [{"from": 6, "to": 14, "growth": 1.25}, {"from": 15, "to": 20, "growth": 1.45}]
```
Ranges include both ends, `from` must be at least 1, and levels outside the segments use ×1.35. sync-economy checks every CSV row against these values; Engineering has confirmed all 31 rows match. If review changes the segments, tell Engineering and regenerate the CSV.

## Acceptance bands (Head of Product, 2026-10-16)
- AC7: the level reached at 30:00 must be L18 to L22, target L20 (30 seeds).
- L30: reached in 180 to 300 min (seller15, 30 seeds); a reachable ceiling, not a goal. PM Farm Upgrades measured F1 at 196.5 min; my run reproduces it (below).
- Also bundled (Head of Product, 2026-10-16): constant columns guard_heartbeat_s=2 and guard_stale_s=6 (single-tab guard, product/single-tab-guard.md), added to economy.f1.csv and written by the sim.

### Results (2026-10-16, `f1_levers.bands()` + `afford()`, 30 seeds; output `sim/m2_validation/f1_bands_out.md`; old outputs unchanged)
| measure | model | current | F1 | band | current / F1 |
|---|---|---|---|---|---|
| L@30:00, M1 no workers | seller15 | L18 | **L20** | L18–22 | PASS / PASS (target hit) |
| | casual | L17 | L19 | | FAIL / PASS |
| | cheapest | L17 | L19 | | FAIL / PASS |
| L@30:00, workers on, managed | seller15 / casual / cheapest | L18 / L18 / L17 | L21 / L20 / L19 | | F1 all PASS; current cheapest FAIL |
| L30 min, M1 no workers | seller15 | 243.8 | **196.5** | 180–300 | PASS / PASS |
| L30 min, workers on | seller15 | 100.0 | 78.2 | 180–300 | FAIL / FAIL |
Read: F1 passes the new AC7 for every policy and the L30 band on the no-workers basis (the one PM Farm Upgrades used). With workers on, L30 comes far sooner in **both** builds (100 vs 78 min). That's a property of Workers, not F1. **Head of Product to confirm the L30 band means M1, no workers.** Otherwise today's build fails it too.

## PM Workers condition: managed/unmanaged income at F21 (2026-10-16)
Definition (decisions.md, Workers v1.1): `inc21` = income/s while at F21 (`income_at_level`), managed ÷ unmanaged per seed, median; active cohorts = seller15, cheapest. `f1_levers.f21()`, 30 seeds.
| model | current | F1 (share 0.5) | F1 share 0.6 | F1 share 0.8 | F1 share 1.0 |
|---|---|---|---|---|---|
| seller15 | 1.67 | **1.25 FAIL** | 1.20 FAIL | 1.25 | 1.32 |
| cheapest | 1.89 | **1.49 FAIL** | 1.55 | 1.66 | 1.59 |
| casual (info) | 2.76 | 2.47 | 2.31 | 2.45 | 2.46 |
**Result: FAIL under F1, and PM Workers' fallback (share 0.6) does not fix it** (seller15 1.20). Raising the share as far as 1.0 still doesn't work, so the Grader price isn't the lever.
**Cause: a timing artefact of measuring at F21.** Under F1 the last worker (Grader T1 at F18) is hired at 21.8 min and F21 starts at 30 min, about 8 min later. An unmanaged Grader is then still Working or Tired (50% at 5 min, asleep at 10 min). Today the gap is 30 → 41 min, so it's already asleep. Managed $/s at F21 is unchanged (315 vs 315); unmanaged rises 188 → 251. One level later the gap is back:
| model | ratio at F21 / F22 / F23 / F24, current | F1 |
|---|---|---|
| seller15 | 1.67 / 2.20 / 2.35 / 2.64 | 1.25 / **2.05** / 2.37 / 2.56 |
| cheapest | 1.89 / 2.26 / 2.35 / 2.67 | 1.49 / **2.29** / 2.35 / 2.63 |
**Ask for PM Workers (decision, not changed here):** keep w4 share 0.5 and either (a) measure the metric over F22–F24 (or at a fixed ≥10 min after the last hire), where F1 is at least 2.05, or (b) accept 1.25 at F21. No worker or CSV change was made.

### Metric v2 (PM Workers, 2026-10-16): managed/unmanaged income averaged over F22–24 ≥ 1.5, every model, Grader share 0.5
Per seed: mean of the F22, F23 and F24 ratios (`income_at_level` managed ÷ unmanaged); median over 30 seeds. Runs are 4 h so slow reaches F24 (30/30 seeds in every cell). `f1_levers.f2224()`, output `sim/m2_validation/f1_f2224_out.md`.
| model | current F22–24 (F22/F23/F24) | F1 F22–24 (F22/F23/F24) | current / F1 |
|---|---|---|---|
| seller15 | 2.39 (2.20/2.35/2.64) | 2.33 (2.05/2.37/2.56) | PASS / PASS |
| cheapest | 2.43 (2.26/2.35/2.67) | 2.42 (2.29/2.35/2.63) | PASS / PASS |
| casual | 3.55 (3.18/3.46/4.03) | 3.57 (3.24/3.49/3.92) | PASS / PASS |
| slow | 3.85 (3.44/3.80/4.32) | 3.98 (3.53/3.83/4.58) | PASS / PASS |
**Result: PASS for all four models under F1** at Grader share 0.5. The lowest is seller15 at 2.33; the lowest single level is seller15 F22 at 2.05. No Grader share change is needed.

## S2-3a: empty queue after the offline break (economy side, 2026-10-16)
Sources: playtest/triage/2026-10-16-session2.md, market/s2-3a-proposal.md (A + C approved for rc1, B deferred to F1). Script `sim/m2_validation/s2_3a.py`, output `s2_3a_out.md`.
**Diagnosis:**
- **Offline accrual vs demand.** Demand runs only about 1.22× supply on every row (L10: 13.4 vs 11.0 eggs/s, spare 2.4/s). 1,300 eggs is about 9 min of spare demand at L10 (16 min at L5). A full 2 h grant (19,800 eggs at L10) is about 139 min. So after a break the game is stock-bound: every arrival can be filled at once.
- **Arrivals on return.** The arrival timer resumes (no reset to `first_customer_s`), so the first customer comes in ≤1 interval (≤3 s at L10). There's no economy delay.
- **Queue reset.** None. The queue is frozen while offline, and that's by design.
- **Why it looks dead.** Market Hand (every 1 s) serves each arrival within ≤1 s, so a card is visible about **22% of the time at L10** (14–24% across L5–18). C alone doesn't change that (7–21%).
**Option B (Market Hand serves only customers waiting ≥ N s; sim = W1 `defer`):**
| L | today | A 1.5 s dwell | A+C | B 2 s alone | A+C+B 2 s | A+C+B 3 s |
|---|---|---|---|---|---|---|
| 5 | 14% | 51% | 51% | 65% | 97% | 99% |
| 10 | 22% | 70% | 56% | 88% | 99% | 99% |
| 14 | 22% | 80% | 80% | 96% | 99% | 99% |
| 18 | 24% | 90% | 88% | 99% | 99% | 99% |
**Cost of B in normal play: zero.** For all three models at min wait 0, 2 and 3 s, F10/F18/F25, total income, lost % and $/s at F21 are identical. Active play is supply-bound, so customers have already waited longer than 3 s before eggs reach them. On return it delays each sale by ≤2 s (patience 30 s), so no customers are lost.
**Numeric options for PM Market to co-own:**
1. **B: `market_hand_min_wait_s = 2`** (recommended for F1). It gives a card on screen 88–99% of the time at L10–18 with no pacing cost, and meets MK-21 (≥40%) on its own. With A+C it's 97–99%.
2. B at 3 s: adds nothing over 2 s at L10+ and only helps L5 by 2 points. Not needed.
3. *(Deeper "nothing to do" issue, for Head of Product/CEO only, not recommended for F1)*: the 2 h grant is 139 min of spare demand at L10. To keep the clear time ≤15 min, offline_cap_s would have to drop to about 13 min, or offline_rate to about 0.027. Either way it reverses the CEO-approved 0.25 / 2 h. Listed for the numbers only.

## Early grind → money balloon (2026-10-16)
Metric: income/s at level L ÷ next Farm cost (‰ per s; seconds to afford in brackets), seller15, workers on, managed, 30 seeds (`afford()`):
| L | 1 | 2 | 3 | 5 | 6 | 8 | 10 | 12 | 13 | 14 | 15 | 17 | 20 | 25 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| current | 13.1 [76] | 14.3 [70] | 22.8 [44] | 21.8 [46] | 20.9 [48] | 17.1 [59] | 13.2 [76] | 10.0 [100] | 8.4 [120] | 7.1 [141] | 6.0 [166] | 4.1 [242] | 4.6 [218] | 3.2 [311] |
| F1 | 13.1 [76] | 14.3 [70] | 22.8 [44] | 23.6 [42] | 24.4 [41] | 23.4 [43] | 19.7 [51] | 16.8 [60] | 15.7 [64] | 12.0 [83] | 9.5 [106] | 5.9 [168] | 5.7 [174] | 4.1 [246] |
(casual and cheapest follow the same shape; full table in f1_bands_out.md.)
- **Online, F1 does not create a balloon.** The ratio never rises after L6 in either build. F1 holds L3–L13 at 41–64 s per level instead of a steady slide to 141 s, which removes the L10–14 grind. The early slow part (L1–2, 70–76 s) comes before F1's range and is unchanged.
- **The balloon is offline money.** The 1,300 eggs held were worth about $1,950 at L10 (0.7× the next Farm cost today, 1.1× under F1). A full 2 h grant at L10 is $29.7k, which is 10.9× the next Farm cost today and **17.4× under F1**. So F1 makes the post-break balloon about 1.6× bigger in Farm-cost terms.
- **Mitigation (proposal, needs CEO/HoP because it touches the approved offline values):** offline_rate 0.25 → 0.15 under F1 brings the L10 2 h grant back to about 10.4× the next Farm cost, close to today's 10.9×. Online pacing isn't affected, since offline isn't simulated in AC runs. Alternative: leave offline alone and accept it, because the grant is capped at 2 h either way. My recommendation is to ship F1 without the offline change and recheck in session 3, because the playtest break was far shorter than 2 h (1,300 eggs ≈ 8 min of offline at L10).

## Product decisions (Head of Product, 2026-10-16)
1. The L30 band of 180-300 min is measured without workers for the rc1 gate (F1 is 196.5 min, a pass). A band with workers (78 min today) gets reset in the M4 three-track model.
2. Managed vs unmanaged income must be at least 1.5, averaged over F22-24. PM Workers updates the AC.
3. Approved: `market_hand_min_wait_s=2` is bundled into F1 as a constant column.
4. F1 ships without the offline cut. Recheck the 17.4x offline grant in session 3; cutting 0.25 to 0.15 is the CEO's call.
F1's numbers are approved, on condition that `product/economy.csv` and `game/data/economy.csv` are updated in the same change and the `check-economy-copy` result is posted before Wednesday's merge.
- 5. Market Hand turns (Head of Product, 2026-10-16): option (b) chosen. A turn is held, with no wage charged, until a customer has waited at least market_hand_min_wait_s. The empty-basket turn is unchanged for F1. AC: no wage is charged on a held turn. In the sim this is w1 hold_until_servable, set from the CSV column.

## P1-L16: "Sell all spread my eggs, no order completed, every card pays $0.00" (Head of Product P1, 2026-10-16)
Report: L16, 28 eggs in hand, 85 hens, Collect +28, 4 customers wanting 106/116/138/85. Script `sim/m2_validation/f1_p1l16.py`, output `f1_p1l16_out.md` (30 seeds). economy.csv, economy.f1.csv and game/ are unchanged (read-only git checks).

**1. Demand/supply, L10–20.** Mean order ÷ interval vs eggs_per_sec.
- **Analytic:** 1.20–1.23 at every level in both economy.csv and economy.f1.csv. F1 only changes costs, and the demand factors 0.8/1.6 average 1.2× supply by construction. A Working Hawker (×1.25 order size) raises it to about 1.5.
- **Sim, F1 build:**

| model | d/s L10 / L14 / L16 / L20 | fully filled share of customers |
|---|---|---|
| seller15, no workers | 1.19 / 1.15 / 1.23 / 1.22 | 93 / 88 / 81 / 82 %; **no partial leavers**: every miss was an arrival turned away by a full queue |
| seller15, workers | 1.51 / 1.45 / 1.50 / 1.52 | 43 / 71 / 60 / 66 % |
| casual, no workers | about 0.88 | 85–100 % |
| casual, workers | about 1.1 | 93–100 % |

  An engaged seller who sells every 15 s completes what they serve. Misses come from a full queue, not from spreading eggs.

**2. Vadim was on a pre-P1q order table.** At L16, P1q (economy.csv, F1, and data/economy.csv on every branch since b652cb0, including 16176a3) gives 30–60 eggs, or 38–75 with the Hawker. That can't produce 85, 106, 116 or 138. The pre-P1q M1-R1 table gives 60–120, or **75–150 with the Hawker**, which matches all four. The `m3-pt1` and `m2-rc1-play` tags predate P1q. Triage records the session-2 label as "m3-rc0+16176a3", but that build's balance.json (interval 2.2 s at L16, k = 37.4) can only make 30–60 orders, ×1.25 with the Hawker. **Either a pre-P1q build or tab was running, or the label is wrong.** Engineering should check the save or build in session 3.

**3. Sell all doesn't spread.** `game/src/sim/actions.ts:32` fills front to back and stops when the basket is empty. `sellTo` (`actions.ts:11–19`) sells min(basket, remaining) to each customer, as the spec and sim do. With 28 eggs against 106 at the front, the front customer got a 28-egg partial and the others got nothing. **The "pays $0.00" comes from the UI:** `game/src/ui/app.ts:383` prints `pays fmtMoney(k × price)` with k = min(basket, remaining), so every card shows $0.00 once the basket is empty. F2's "never $0.00" rule (`ui/orders.ts:57`) covers only the Sell all button. This is not a build bug in Sell all. The copy and rule gap goes to PM Market and Art & UX: show the full order value, or "need N more eggs", when the basket is empty.

**4. Fix candidates. Demand/supply is above 0.8 at every level, so I tested smaller orders with price compensation, on top of F1.**

| variant | analytic d/s | seller15 fully filled L10–20 (no workers / workers) | no workers: L@30, seller15/casual/cheapest | L30 min, seller15, no workers | seller15 s/level L5–14 (workers) | casual F10 / F18 min (workers) | F22–24 ratio, min model |
|---|---|---|---|---|---|---|---|
| F1 | 1.22 | 81–93 % / 43–71 % | 20 / 19 / 19 PASS | 196.5 PASS | 45–75 PASS | 10.3 / 21.3 | 2.33 PASS |
| S1 orders ×2/3 (0.53/1.07) | 0.82 | 100 / 100 | 19 / **16 FAIL** / 18 | 242.8 | 45–105 FAIL | 15.2 / 30.3 | 3.00 |
| S2 orders ×2/3 + price 1.25 + 0.0625F | 0.82 | 100 / 100 | 20 / 18 / 19 PASS | 194.5 PASS | **30**–75 FAIL (L9, L10 at 30 s) | 12.3 / 24.3 | 2.92 |
| S3 orders ×0.75 (0.6/1.2) + price 1.10 + 0.06F | 0.91 | 100 / 89–100 | 20 / 18 / 19 PASS (casual 26/30 seeds) | 188.0 PASS | **30**–75 FAIL | 12.3 / 24.0 | 2.61 |

- Below 1.0, income becomes demand-limited, so the price has to rise by about 1/(d/s).
- Casual players get slower: F10 is +19% in S2 and S3, and casual L30 falls outside 180–300.
- Seller15 with workers becomes too fast at L9–10 (30 s per level).
- No candidate passes every band without further tuning.
- **complete_bonus_share = 0.05 sanity check** (sim patch only, workers on; the no-workers runs didn't apply the bonus, so they show no change): on F1 it moves seller15 F18 from 20.5 to 19.8 min and adds 1–4 points of full fills. On S3, F18 goes from 18.5 to 17.8. Small and safe, but it doesn't fix completion.

**Recommendation: no F1 CSV change.** economy.f1.csv stays as it is, so no economy.f1-v1.csv backup was needed.
- On today's P1q table an engaged player already completes 81–93% of customers with no partial leavers. The report's order sizes only fit a pre-P1q table.
- Fixes:
  - (a) Engineering confirms which build session 2 ran.
  - (b) PM Market and Art & UX fix the "$0.00" card label when the basket is empty.
  - (c) If session 3, on a confirmed P1q build, still shows uncompletable orders with the Hawker, bring S3 into F2. S3 is orders ×0.75 with price 1.10 + 0.06F; it needs L9–10 and casual retuned first.

## Item F1-GAP: the 3.25 min (casual 3.7) purchase gap (Economy, 2026-10-16)
Scripts: `sim/m2_validation/f1_gapfix.py` (canonical `economy_sim.run`, F1 segments, 30 seeds, no workers) and `sim/m4/f1_gap.py` (CSV-driven cross-check). Output: `sim/m2_validation/f1_gapfix_out.md` and `f1_gapfix_f2224_out.md`.

**Where it is.** The gap is inside the rc1 range (no workers, Farm L0–30, the first 30 min), so it needs an F1 fix.

| model | gap closed inside 30:00, median / worst seed | where |
|---|---|---|
| seller15 | **195 s / 195 s** (every seed the same) | After the Farm **L19** buy at 23:30, the player saves for the **L19→20 Farm cost (row 19, $21,414)**, which is bought at 26:45 |
| casual | **200 s / 220 s** | After the **Collection 15** buy at Farm **L18** (~25:40), the player saves for the **L18→19 Farm cost (row 18, $14,768)** |

- The 3.25 / 3.7 min figures included a gap that is still open at 30:00. Measured to the purchase that closes it:
  - seller15: Collection 16 at F20 (28:15) → Farm L21 at 32:30, **255 s**.
  - casual: F19 → F20, up to 300 s.
- These gaps run past the 30-minute window and belong to the late curve. That curve is slow by design: the L30 band is 180–300 min, and steps over 3 min are expected from about L20 (farm/feature-spec.md).

**Fix (candidate `economy.f1-gapfix.csv`):** cut **row 18 farm_cost by 25%** (14,768 → **11,076**) and **row 19 by 15%** (21,414 → **18,201**). `w4_tier_cost` follows at 0.5× (7,384 and 10,707). No other cells change, and `economy.f1.csv` is untouched.

| band | F1 | gapfix |
|---|---|---|
| Purchase gap inside 30:00, seller15 | 195 s | **165 s** |
| Purchase gap inside 30:00, casual (median / worst) | 200 / 220 s | **160 / 180 s** (CSV sim: 160 / 200 s) |
| Purchase gap inside 30:00, cheapest-first | 165 s | 165 s |
| AC7: level at 30:00 (seller15) | L20 (20–20) | **L20 (20–20)**, PASS |
| AC7: level at 30:00 (casual / cheapest) | L19 / L19 | L19 / L20 |
| Time to L30 (seller15, band 180–300) | 196.5 min | **195.3 min**, PASS (casual 289.0, cheapest 215.8) |
| L5–14 time per level | 30–75 s | unchanged (rows 5–14 untouched), PASS |
| First upgrade | 15 s | 15 s, PASS |
| F22–24 managed/unmanaged ratio, lowest model | seller15 2.33 | **seller15 2.27** (F22 1.90), casual 3.60, cheapest 2.40, slow 3.88: PASS |

- **Smaller options tested:**
  - Cutting row 19 alone by 15% fixes seller15 (165 s) but leaves casual at 200–220 s.
  - Cutting row 18 by only 10% doesn't help casual: casual then skips the Collection buy and waits on the same Farm cost.
- **Not fixed:** the late-curve gap straddling 30:00 (255 s for seller15). Closing it would need cuts to rows 20+ and would push into the L30 band. I recommend leaving it.

## Item F1-CHOICE: "I only ever upgrade Farm" (Vadim, rc1-pt1) (Economy, 2026-10-16)
**Setup:** `sim/f1choice/f1_choice.py`, a CSV-driven sim on `economy.f1.csv` (F1-GAP folded in), 30 seeds.
- Bot: PM Farm Upgrades' Collection-aware best-ROI buyer with a 3-buy look-ahead, adapted to the rc1 set: Farm and Collection, plus W1/W2/W3 hires and Grader tiers when workers are on.
- Shares are of purchases made before L20.

**Measured: share of purchases before L20**

| mode | model | bot | Farm | Collection | workers | Grader | **non-Farm** | L@30 | t(L10) |
|---|---|---|---|---|---|---|---|---|---|
| no workers (rc1 gate) | seller15 | greedy | 57% | 43% | — | — | **43%** | 20 | 8.2 min |
| no workers | casual | greedy | 56% | 44% | — | — | **44%** | 19 | 10.3 min |
| workers | seller15 | greedy | 56% | 39% | 0% | 6% | **44%** | 21 | 8.2 min |
| workers | casual | greedy | 54% | 38% | 3% | 5% | **46%** | 21 | 10.3 min |
| no workers | seller15 | AC7 rule | 57% | 43% | — | — | 43% | 20 | 8.5 min |
| no workers | seller15 | **Farm only** | 100% | — | — | — | 0% | **13** | **14.2 min** |
| no workers | casual | Farm only | 100% | — | — | — | 0% | 13 | 14.7 min |

**Findings:**
- **The data already makes a non-Farm buy best ~43–46% of the time, above the 30% target.** Collection (+12% egg price per level, plus eggs per tap) is the best next buy in about 4 of every 10 decisions.
- **Only buying Farm is much slower:** L13 instead of L20 at 30:00, L10 at 14.2 min instead of 8.2 min (+73%), first buy at 75 s instead of 15 s, and gaps up to 4.75 min.
- So Vadim's "nothing else is worth buying" is a perception issue, not an economy one. The Collection row most likely doesn't show its price effect.
  - Hand-off: Art & UX / PM Farm Upgrades should show "+12% price" and the payback on the Collection button.
  - The next-goal hint should point at Collection when it is the better buy.
- **Gating:** in rc1, Collection is not gated by Farm (`game-rc1-ui/src/sim/actions.ts`, maxLevel only), so this is not structural. Workers unlock at F3/F7/F8 and the Grader at F18+, but they are secondary: 0–3% and 5–6% of buys.

**Collection levers, checked independently (no Farm cost change):**

| lever | non-Farm share (s15 / casual) | L@30 s15 / casual | max gap ≤30:00, s15 / casual | L10 s15 | L5–14 s/level |
|---|---|---|---|---|---|
| F1 as is | 43% / 44% | 20 / 19 | 180 / 180 s | 8.2 | 45–75 |
| Collection growth ×1.5 | 46% / 47% | 20 / 19 | 165 / **220 s** | 8.0 | 30–60 |
| Collection growth ×1.45 | 49% / 50% | 21 / 19 | **210 / 200 s** | 7.8 | 30–60 |
| bonus 0.15 per level | 43% / 43% | 21 / 20 | **225 / 220 s** | 7.8 | 30–60 |

- Every lever adds at most +6 points of share, and each one breaks the 3-min gap and the L5–14 45 s floor.
- **Recommendation: no data change.** `economy.f1-choice.csv` is an unchanged copy of `economy.f1.csv`, so there is no costGrowthSegments impact. Fix the UI and hint instead.
- **Status of PM Farm Upgrades' 2–3 candidate CSVs:** not yet in `product/farm/` at the time of writing. Only `f1_nonfarm.py` is there. Verify them against these bands when they land.
