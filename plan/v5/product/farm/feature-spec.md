# Farm Upgrades — Feature Spec · M1 · v0.5 (M1-R1 + P1q/P3; F1 package pending merge Wed Oct 21) · 2026-10-16 · PM, Farm Upgrades
Status: v0.4. Economy M1-R1 plus playtest fix P1q + P3 (HoP approved and merged into economy.csv 2026-10-15 23:41; old table economy.pre-p1q.csv). HoP decisions of 2026-10-15 applied (§9). Canonical numbers belong to Head of Product (`product/economy.md` / `economy.csv`); nothing here changes them. Proposals are in §9.

## 1. Goals
- The Farm level is the progression spine. Each level raises production, storage, price and market size.
- Target cadence (AC7). **Until the F1 merge:** seller15 Farm L10 at 10 min (8–12), L18 at 30 min (24–36); cheapest-first ≥70% of seller15. **Effective with the F1 CSV merge (Wed Oct 21; HoP decision 2026-10-16 02:18, decisions.md):** AC7 = Farm level reached at 30:00 by seller15, across 30 seeds. Pass band L18–L22, target L20. This replaces "L18 at 24–36 min". L30 band: 180–300 min for seller15 across 30 seeds (HoP decision 2026-10-16); L30 stays a reachable ceiling, not a goal. F1 gives 196.5 min (pass). AC7-soft: casual player L10 ≤15 min and L18 ≤45 min in ≥80% of seeds. Role-spec metric: no stretch >3 min without an affordable purchase (role-spec metric).
- Coop visual tiers at L5/10/20 give visible milestones.

## 2. Rules (canonical M1-R1 + P1q/P3; source of truth `product/economy.csv`, formulas in economy.md)
F = current Farm level, C = Collection level, 0..30. Cost is the price of going from F to F+1.
| Stat | Formula (M1-R1 + P1q/P3) | F0 | F10 | F20 |
|---|---|---|---|---|
| Upgrade cost | floor(100 × 1.35^F) | 100 | 2,010 | 40,427 |
| Hens | 5 + 5F (eggs/sec = 0.2 × hens, except F0 = 1.5 eggs/s "starter nest", P3) | 5 | 55 | 105 |
| Coop capacity | 50 + 50F | 50 | 550 | 1,050 |
| Egg price | (1.00 + 0.05F) × (1 + 0.12C), rounded once to cents | 1.00 | 1.50 × Coll. bonus | 2.00 × Coll. bonus |
| Customer interval (P1q: half) | round(0.5 × max(3, 10 × 0.95^F), 2) s (1.5 s floor from F24) | 5.0 | 3.0 | 1.79 |
| Demand (P1q: half-size orders) | uniform int [ceil(0.4k), ceil(0.8k)], k = eggs/sec × **base** (un-halved) interval; with half the interval, demand stays ≈1.2× production | 6–12 | 27–53 | 31–61 |
| Max customer queue (P1q) | min(10, 6 + floor(F/5)): 6 at F0–4, 7 at F5–9, 8 at F10–14, 9 at F15–19, 10 at F20–30 | 6 | 8 | 10 |
| Max level | 30, then the button shows "MAX" | | | |
Purchase: enabled only when coins ≥ cost. It deducts exactly the cost and applies all of L+1's stats immediately (AC5). Customers already in the queue keep the demand they arrived with. New spawns use the new level's interval and demand. **A level-up does not reset the customer timer** (decided); the new interval applies from the next timer restart. The new queue slot (F5, F10, F15, F20) is available from the next spawn.

## 3. Visual milestones
| Farm L | Coop sprite tier |
|---|---|
| 0–4 | Tier 1 (starter coop) |
| 5–9 | Tier 2 |
| 10–19 | Tier 3 |
| 20–30 | Tier 4 |
On-screen hens = min(hens, 12). At a tier change: short celebration (sprite swap + burst, ≤1.5 s, non-blocking) and a toast **"Coop upgraded!"**, shown above any open sheet or right after it closes (S2-1, HoP answer; Art & UX layout-spec §4.7). On reload, the tier is derived from the saved level, with no replayed celebration. Art & UX own the assets.

## 4. UX
- Farm tab, one row: "Farm level F → F+1", cost, and current→next for hens, coop cap, egg price (Farm part; charged price also includes the Collection bonus), customers (interval + order size, queue size).
- **Next-level preview (HoP condition 3; Art & UX own the Farm row preview; confirmed by Art & UX 2026-10-16, layout-spec §4.6b and m3-customer-queue-spec §6):**
  - **Queue steps (S2-3b):** at F4→5, F9→10, F14→15 and F19→20 the preview leads with **"+1 customer (max N)"** (HoP S2-3b answer), where N = queue_max at the next level (7/8/9/10). Rationale: only a few cards are drawn plus a "+N waiting" chip, so a bare "+1 customer slot" would not be visible. When the upgrade lands, the +N chip **pulses once** (scale 1 → 1.12 → 1, 600 ms). With reduced motion on, it shows a colour flash instead.
  - **F1 reward (S2-1):** the F4→5, F9→10 and F19→20 previews show a **"New coop look"** line above the queue line (coop tiers at F5/F10/F20; assets art-ux/assets/coop-l5/l10/l20.svg).
  - At other levels the usual order applies (hens, coop, price, faster customers).
- **Queue display:** 6–10 waiting customers are shown per art-ux/m3-customer-queue-spec.md: 4 cards at 375 px plus a tappable "+N waiting" chip. Card churn at F24+ (an arrival every 1.5 s) is **pending with Art & UX and Engineering**.
- Disabled state shows the cost in muted colour plus a **time-to-afford hint** (P4 approved): estimate = (cost − coins) / income rate, income rate = steady-state `incomePerSec(state, balance)` (**changed 2026-10-16, rc1-upgrade-clarity-spec.md v0.3 §2(f): the rolling 60 s income no longer drives the ETA**). Format and rounding are defined in F7. Updates at least once per second.
- At L30: "MAX", no cost, no button.
- Next-tier preview: "Coop upgrade at L5/10/20" label on the row.

## 5. Acceptance criteria (Farm-specific, on top of core AC5/AC6/AC7)
- F1 Costs and stats for L0–30 equal economy.csv. Buying at L29 → L30 and then the row shows MAX. No purchase is possible at L30.
- F2 A purchase applies the hens/rate, cap, price, interval and demand of the new level within the same tick. The coop's contents are kept when the cap rises.
- F3 The sprite tier matches §3 for every L, including after reload. The celebration plays once per first reach.
- F4 Queued customers keep their original demand after an upgrade. New spawns use the new level's range.
- F5 Double-tap or rapid taps never buy twice unless coins ≥ the sum of both costs. Coins are never negative.
- F7 The time-to-afford hint is hidden when coins ≥ cost or at MAX, and is within ±10% of the actual time to afford under steady income (QA scripted bot). Rounding (agreed with Art & UX 2026-10-15): the estimate in seconds is **rounded to the nearest second (half-up) in all ranges** before formatting, never ceil/floor; larger units are derived from that rounded value. Display format: under 10 min, minutes and seconds ('~1 min 5 s', '~45 s'); 10–60 min, whole minutes rounded to nearest; 60 min and over, hours and minutes ('~1 h 5 min'); steady-state income ≤ 0 shows '—' (was: no income in the last 60 s; changed 2026-10-16, see rc1-upgrade-clarity-spec.md §2(f)). Layout in art-ux layout-spec.md §4.6b.
- F8 queue_max = min(10, 6 + floor(F/5)) and matches economy.csv: 6 at F4, 7 at F5, 8 at F10, 9 at F15, 10 at F20 and F30. It never shrinks. After buying F5/F10/F15/F20, one more customer can join at the next spawn. At F4→5, F9→10, F14→15 and F19→20 the Farm row preview shows "+1 customer (max N)" (N = next-level queue_max, 7/8/9/10). The F4→5, F9→10 and F19→20 previews show a "New coop look" line above it. The tier toast reads "Coop upgraded!". On purchase, the "+N waiting" chip pulses once (scale 1→1.12→1, 600 ms), or colour-flashes with reduced motion on (S2-3b, S2-1; Art & UX confirmed; layout-spec §4.6b, queue spec v1.2 §6).
- F6 The offline modal uses the saved Farm level (AC11). A purchase made after collecting offline eggs does not change the eggs already granted.

## 6. Edge cases
Coins exactly = cost (enabled; leaves 0). Float rounding: coins at 2 dp half-up, cost is an integer, compare after rounding. Save mid-purchase: the save must be atomic with the level change (AC8). Clock rollback: does not affect the Farm level. F30 with coins left over: coins are only for Collection. Egg price changes on both Farm and Collection purchases (queued customers pay the price at sale time). Queue full at a level-up: no extra spawn.

## 7b. Sim findings, F1 package (candidate `product/economy.f1.csv`; merge Wed Oct 21) — `sim_results_f1.txt`, `levels_f1.txt`, `l30m_f1.txt`, review `f1-farm-review.md`
F1: farm_cost growth ×1.25 on L6–14, ×1.45 on L15–20, ×1.35 after (w4_tier_cost follows). §2's cost formula becomes segmented at the merge.
- **AC7 (new definition), level at 30:00, seeds 0–29** (current → F1):

| Scenario | current | F1 |
|---|---|---|
| seller15 (gating) | L18 ×30 (30/30 in band) | **L20 ×30 (30/30, on target)** |
| sells every 20 s | L18 ×30 | L20 ×30 |
| demand −25% | L17 ×15, L18 ×15 (15/30) | L20 ×30 |
| casual worst case (Poisson + 20 s + −25%) | L17 ×30 (0/30) | L18 ×5, L19 ×25 (30/30) |
| cheapest-first | L17 ×30 | L19 ×30 |

- **Times, p50 min (final → F1):** seller15 L5 4.8→4.8, L10 9.2→8.5, L15 17.5→13.2, L18 27.2→19.8, L20 37.2→26.8, L25 90.0→71.5, L30 243.8→196.5 (−19%).
- **Mid-game:** L12–15 steps go from 90–150 s to 45–75 s. The first step over 3 min moves from L17→18 to L18→19, and from L16 to L18 for casual and cheapest.
- **Coop looks:** F5 4.8 min, F10 8.5, F20 26.8 (was 37.2).
- **F7 hint:** median error 9.7% (was 10.8%).
- **Late curve:** costs from L20 are 23% lower, so the Workers multipliers in late-curve-for-workers.md drop about 23%. Refresh at merge.
- **L30:** no numeric L30 band exists in core-loop-spec, economy.md, qa/balance-report.md or decisions.md (checked 2026-10-16). The only rule is "L30 is a reachable ceiling, not a goal" (HoP, 2026-10-15). **Band set by HoP 2026-10-16: 180–300 min (seller15, 30 seeds).** F1 196.5 min and current 243.8 min both pass.

## 7a. Sim findings, final table (M1-R1 + P1q + P3) — `sim_results_final.txt` (canonical economy.csv after merge); P1q-only check in `sim_results_p1q.txt`, review in `p1q-farm-review.md`
200 seeds, 40-min horizon; long run 50 seeds × 6 h. p50 minutes, M1-R1 → P1q only → final (P1q+P3).
| Scenario | L5 | L10 | L15 | L18 | L20 | L25 | L30 |
|---|---|---|---|---|---|---|---|
| seller15 | 5.5→5.5→**4.8** | 10.0→10.0→**9.2** | 18.2→18.2→17.5 | 28.0→28.0→27.2 | 38.0→38.0→37.2 | 90.8→90.8→90.0 | 244.5→244.5→243.8 |
| cheapest | 7.0→7.0→6.0 | 11.8→11.8→10.8 | 20.8→20.8→19.8 | 31.5→31.5→30.5 | n/r | | |
| active (1 s) | 5.3→5.3→4.5 | 9.7→9.7→8.9 | 17.8→17.8→17.1 | 27.6→27.6→26.9 | 37.4→37.4→36.7 | | |
| Poisson | 5.8→5.5→4.8 | 10.5→10.2→9.5 | 19.0→18.5→17.8 | 29.0→28.2→27.5 | 39.0→38.0→37.2 | | |
| 0.5 / 0.25 tap/s | 5.5/5.8→…→4.8/4.8 | 10.0/10.2→…→9.2/9.2 | | 28.0/28.2→…→27.2/27.5 | | | |
| casual (20 s) | 5.7→5.7→4.7 | 10.3→10.3→9.3 | 18.3→18.3→17.7 | 28.3→28.3→27.3 | 39.0→38.3→37.3 | | |
| demand −25% | 6.2→6.2→5.2 | 11.2→11.2→10.2 (max 11.0) | 20.2→20.2→19.2 | 31.2→31.0→30.0 | n/r | | |
| demand +25% | 5.5→5.5→4.8 | 10.0→10.0→9.2 | 18.2→18.2→17.5 | 28.0→28.0→27.2 | 38.0→38.0→37.2 | | |
| worst combo (AC7-soft) | 7.0→6.7→5.7 | 13.3→12.3→11.3 (max 14.0) | 24.7→22.3→21.3 | 39.0→35.0→34.0 | n/r | | |
- AC7 holds: seller15 is at **L10 at 10 min and L18 at 30 min** (L10 reached at 9.2, L11 at 10.25; L18 at 27.2, L19 at 31.0). Cheapest-first follows the same pattern.
- **The coop Tier 2 look (F5) now lands at 4.8 min** for seller15 and 4.5–4.8 for active, Poisson, slow-tap and casual players. The worst-combo player gets it at 5.7. Tier 3 (F10) at 9.2 min, Tier 4 (F20) at 37.2 min.
- P3 shifts everything by a constant ~0.7–1.0 min (a faster start at F0 only). P1q mainly helps players who sell in bursts. The late curve is unchanged (steps over 3 min from F17→18, F30 at ≈244 min). Progress is still limited by production (≈17% of customers lost to a full queue).
- F7 hint error on the final table: seller15 median 10.8%, active 3.7%, casual 18.6% (M1-R1: 11.2 / 3.7 / 23.3). It doesn't get noisier, and the QA oracle stays the steady-income bot.

## 7. Sim findings (M1-R1, pre-P1q; superseded by §7a) — `farm_stress_sim.py` v3, reads `product/economy.csv`; results `sim_results_v3.txt`
Mechanics match `product/sim/economy_sim.py` and AC7: 0.1 s ticks, real queue (3/4/5), 30 s patience, arrival into a full queue lost, partial fills stay queued, price × Collection bonus, half-up coins. 200 seeds, 40-min horizon; long run 50 seeds × 6 h for L25/L30. Cells: Farm level reached, p50 minutes (p10–p90); n/r = not reached by 40 min.
| Scenario | L5 | L10 | L15 | L18 | L20 | L25 | L30 |
|---|---|---|---|---|---|---|---|
| Baseline seller15 (tap 1/s, Sell all every 15 s) | 5.5 | 10.0 (10.0–10.2) | 18.2 | 28.0 | 38.0 | 90.8 | 244.5 |
| Cheapest-first | 7.0 | 11.8 | 20.8 | 31.5 | n/r | — | — |
| Active seller (every 1 s) | 5.3 | 9.7 | 17.8 | 27.6 | 37.4 | — | — |
| Poisson arrivals | 5.8 | 10.5 (10.2–11.2, max 13.0) | 19.0 | 29.0 | 39.0 | — | — |
| 0.5 tap/s | 5.5 | 10.0 | 18.2 | 28.0 | 38.0 | — | — |
| 0.25 tap/s | 5.8 | 10.2 | 18.5 | 28.2 | 38.0 | — | — |
| Casual seller (every 20 s) | 5.7 | 10.3 | 18.3 | 28.3 | 39.0 | — | — |
| Demand −25% | 6.2 | 11.2 (11.0–11.5, max 12.0) | 20.2 | 31.2 | n/r | — | — |
| Demand +25% | 5.5 | 10.0 | 18.2 | 28.0 | 38.0 | — | — |
| Worst combo (Poisson + every 20 s + −25%) | 7.0 | 13.3 (12.3–14.7, max 16.7) | 24.7 | 39.0 (p90 n/r) | n/r | — | — |
- **AC7 passes on M1-R1:** L10 10.0 min, L18 28.0 min. Cheapest-first F@10 min = 8 (80%) on the canonical sim. This sim gives cheapest-first L10 at 11.8 min.
- **Reconciles with QA (R1-1):** at demand −25%, L10 has median 11.2 min, matching QA exactly. My max is 12.0 vs QA's 11.5 because I ran 200 seeds against QA's 20; p90 is 11.5. Only 1/200 seeds hit the 12-min edge (counts as pass at ≤12.0), so the margin is thin, as QA said. Other matches: −25% L18 31.2 vs QA 31.2, Poisson L10 10.5 vs 10.5, seller15 28.0 vs 28.0.
- **What changed from v1:** M1-R1 is production-limited (demand ≈1.2× production). At normal demand the basket ends near 0 and about 17% of customers are lost to a full queue, by design. At −25% demand it becomes demand-limited again: 0% lost and about 3.1k eggs left in the basket (QA R1-2). Tap rate barely matters down to 0.25/s (L10 +0.2 min), because eggs-per-tap far exceeds production. Collection now matters through its +12% price bonus (C≈16 at 40 min).
- **Casual players:** the worst combo is the AC7-soft model. At p50, L10 at 13.3 ≤ 15 and L18 at 39.0 ≤ 45 pass. With a 60-min horizon (200 seeds): L10 ≤15 min in 94.5% of seeds and L18 ≤45 min in 100% (median 39.0). **AC7-soft passes** (target ≥80%).
- **Stalls (long run, seller15):** steps over 3 min from about F17→18 (255 s), then F20 375 s, F23 690 s, F25 735 s, F27 1,695 s, F29 2,550 s, F30 2,250 s. The steps alternate because Collection buys land between Farm buys. L30 at ≈4.1 h, versus ≈3.4 h on v1. Accepted for M1; late game goes to Workers (late-curve-for-workers.md).
- Superseded (v1 formulas: farm cost 25×1.35^L, price +0.10L, demand 3+L..8+2L, 1 s selling): **v1** `sim_results.txt`, **v1 + queue rule** `sim_results_v2.txt`, script `farm_stress_sim_v1.py`. The v1 numbers in earlier messages and status entries (L10 9.0 min, −25% L10 12.0 min, L30 ≈206 min, "demand-bound, tap rate irrelevant") are **v1, not M1-R1**.

## 8. Questions (all closed 2026-10-15 by Head of Product)
1. L30 is a reachable ceiling, not a goal. The M1 target is about L10 in 10 min with healthy progress after.
2. Collection is the early bottleneck at L0–5, which is fine.
3. Basket stays unlimited.
4. A level-up does not reset customer timers.

## 9. Decisions on proposals (Head of Product, 2026-10-15)
- P1 (flatten late costs) **rejected** for M1: keep ×1.35. M2 Workers carry the late game (see late-curve-for-workers.md).
- P2 (queue grows with Farm level) **approved**, originally as 3 / 4 from L10 / 5 from L20. **Superseded 2026-10-15 by P1q:** queue_max = min(10, 6 + floor(F/5)), half-size orders, half interval (floor 1.5 s). Farm signed off with four conditions, all accepted by HoP: (1) the new queue rule, (2) the queue display fits at 375 px (4 cards + "+N waiting"; churn at F24+ pending), (3) the preview leads with "+1 customer slot", (4) the F7 oracle stays the steady-income bot.
- P3 **approved**: demand-variance and Poisson runs go into QA balance checks (handoff to QA; scenarios in farm_stress_sim.py).
- P4 **approved**: time-to-afford hint on the Farm row (§4, F7).
