# M2 Workers economy validation · Economy/Balance Designer · 2026-10-15
Input: product/workers/m2-proposal.md v0.1 (not edited). economy.csv and M1 output are unchanged: CSV md5 4d547dea…, and `run()` is untouched.
Sim: `product/sim/economy_sim.py` → `run_m2()`, plus `M2_SPEC` (v0.1 as written) and `M2_REC` (recommended set below).
Implemented from the proposal:
- W1–W4 costs and unlocks (§2).
- Energy (−1% per 6 s), Working ≥ 50%, Tired, Asleep (§3), with every Tired/Asleep effect. Sleeping workers charge no fee or wage.
- New options: W1 `defer` (serves only customers who have waited ≥ N s), `idle_gate`, `wage_per_f_min`, W4 `w4_asleep_keep`, and `price_mult` {F: ×} (a per-Farm-level price multiplier).
- Workers are online only. Offline stays 25% × eggs/s with a 2 h cap; workers don't work, drain or get paid offline (§4).
Bots:
- They hire any affordable unlocked worker or Grader tier before the M1 buy rule.
- **managed:** at each of its own Sell visits the player taps Manage on the lowest worker at ≤ 50% energy (30 s cooldown).
- **unmanaged:** never manages. A worker is Working for 5 min, Tired for 5 min, then Asleep.
Runs: 100 seeds, 2 h, three models (seller15, cheapest, casual = Poisson + sell every 20 s + demand ×0.75).
- "income ×M1 @F21" = per-seed coins/s while at F21, divided by M1 for the same seed (median).
- Raw tables: `product/sim/m2_validation/m2table_v01.md` … `_v4.md`. Scripts are in the same folder.

## 1. Reconciliation with PM Workers' check (their run(): 20 seeds, no W2/W4, W3 active from F1)
| scenario | PM: casual F10/F18/F20 | ours (100 seeds) | PM: seller15 F10/F18/F25 | ours |
|---|---|---|---|---|
| M1 | 13.7 / 39.5 / 55.2 | 13.7 / 39.3 / 55.0 | 10.0 / 28.0 / 90.8 | 10.0 / 28.0 / 90.8 |
| W1 (F1, $40, 10%, no defer) | 12.7 / 36.0 / 48.3 | 12.7 / 35.7 / 47.7 | 11.0 / 31.0 / 100.2 | 11.0 / 31.0 / 100.2 |
| W1 + W3 (+25%) | 12.2 / 32.2 / 43.0 | 13.0 / 33.0 / 44.0 (W3 bought at F5 for $400, per spec) | 11.0 / 31.0 / 100.2 | 11.8 / 31.5 / 100.8 |
Matches. The only gap is W3 timing: the spec says F5/$400, while their check gave the bonus from F1 for free.

## 2. W1 defer rule (and fee) does not fix the 15 s seller
W1 + W3, managed:
| W1 variant | seller15 F10 / F18 / F25 | cheapest F10 / F18 / F25 | casual F10 / F18 / F25 | fees paid (seller15) |
|---|---|---|---|---|
| none (M1) | 10.0 / 28.0 / 90.8 | 11.8 / 31.5 / 109.8 | 13.7 / 39.3 / n/r | 0 |
| fee 10%, defer 0 s | 11.8 / 31.5 / 100.8 | 13.2 / 35.0 / n/r | 13.0 / 33.0 / 102.3 | 87,014 |
| fee 10%, defer 5 s (v0.1) | 11.8 / 31.5 / 100.8 | 13.2 / 35.0 / n/r | 12.7 / 32.7 / 101.0 | 87,014 |
| fee 10%, defer 10 s | 11.5 / 31.5 / 100.5 | 13.2 / 35.0 / n/r | 13.0 / 32.3 / 99.7 | 87,055 |
| fee 10%, defer 15 s | 11.5 / 31.5 / 100.5 | 13.0 / 35.0 / n/r | 13.0 / 33.7 / 107.0 | 86,653 |
| fee 5%, defer 5 s | 11.2 / 30.2 / 96.0 | 12.8 / 33.5 / 115.8 | 12.3 / 31.7 / 97.0 | 44,553 |
| fee 20%, defer 5 s | 12.5 / 34.8 / 111.8 | 14.2 / 38.5 / n/r | 13.7 / 35.3 / 110.3 | 164,551 |
| fee 0%, defer 5 s | 10.8 / 28.8 / 91.5 | 12.5 / 32.2 / 110.5 | 12.2 / 30.7 / 93.2 | 0 |
| fee 10%, idle-gate 20 s | 10.8 / 28.8 / 91.5 | 12.5 / 32.2 / 110.5 | 13.0 / 34.0 / 111.8 | 0 |
| **no fee, wage $0.25 × F/min** | **10.8 / 28.8 / 91.5** | **12.5 / 32.2 / 110.8** | **12.0 / 30.3 / 93.0** | 0 (wages ~$600) |
- **Why defer fails:** demand is about 1.2× supply, so after each player Sell all the basket is empty and customers stay queued part-filled. W1 then sells every newly tapped egg to customers who have already waited far longer than N s. Fees barely change, whatever N is up to 15 s.
- **Idle-gate 20 s** stops the fee for the 15 s seller, but it also stops W1 for the casual player (who sells every 20 s), which removes the casual benefit.
- **A flat wage fixes it:** no slowdown from fees for the 15 s seller, and the best casual result.
- The +0.8 min left on seller15's F10 is the hire costs (W1 $40 + W3), not the wage. Fees and wage both at 0 give the same 10.8.
- W3 (+25% demand) adds nothing for production-limited players. Lost customers go 16% → 32% (all full-queue), which is harmless to income but visible. That's a Market PM call (queue +1).

## 3. Egg Grader (W4) vs the ×2 income by F21 target
W4 alone, managed:
| tiers (F: ×) | tier cost | seller15 F20 / F25, max step F18→25 | ×M1 @F21 (seller / cheapest / casual) |
|---|---|---|---|
| none | — | 38.0 / 90.8, 14.8 min | 1.00 |
| v0.1: 18:1.25, 20:1.6, 21:2.0, 23:2.8, 24:4.0 | 0.5 × Farm | 37.9 / 70.5, 8.2 min | **1.80 / 1.86 / 1.82: misses ×2** |
| v0.1 | 0.25 × Farm | 37.0 / 64.2, 6.5 | 1.84 / 1.89 / 1.86 |
| **B: 18:1.5, 19:2.0, 21:2.5, 22:3.0, 24:4.0** | **0.5 × Farm** | **37.2 / 61.8, 5.8** | **2.25 / 2.29 / 2.25** |
| B | 0.25 × Farm | 35.5 / 57.0, 5.0 | 2.25 / 2.33 / 2.30 |
| C: 18:1.5, 19:2, 20:2.5, 21:3, 22:4, 24:6 | 0.5 × Farm | 37.2 / 57.8, 5.0 | 2.71 / 2.74 / 2.69 |
| free per-F price_mult with the v0.1 tiers (upper bound) | 0 | 36.0 / 58.2, 5.8 | 1.93 |
- v0.1 misses ×2 at F21: the ×2.0 tier unlocks *at* F21 and has to be bought, so part of the F21 time runs at ×1.6. Tiers B move ×2 to F19.
- **No tier set gets steps ≤ 3 min to F25** (AC-W4). Tier set B's worst step is 5.8 min, and even ×6 at F24 gives 4–5 min.

## 4. Recommended set (`M2_REC`), 100 seeds, 2 h
| ID | Unlock | Hire | Running cost | Managed effect | Tired | Asleep |
|---|---|---|---|---|---|---|
| W1 Market Hand | **F3** (was F1) | $40 | **wage $0.25 × Farm L / min, no % fee, no defer** (was 10% + 5 s) | serves every 1 s | every 3 s | stops; no wage |
| W2 Coop Hand | **F10** (was F3) | $150 | $0.5 × F / min | collects every 2 s | every 4 s | stops |
| W3 Hawker | **F8, $800** (was F5, $400) | — | — | demand ×1.25 | ×1.10 | ×1.0 |
| W4 Egg Grader | **F18 / 19 / 21 / 22 / 24** | 0.5 × Farm cost at the tier level | — | **×1.5 / 2.0 / 2.5 / 3.0 / 4.0** | half bonus | **keeps 25% of bonus** (was ×1.0) |
Energy, manage cooldown and the Tired threshold stay as in v0.1. Offline stays 25% / 2 h; workers do nothing offline.
| model | scenario | F10 | F18 | F20 | F25 | F10 ≤ 15 m | ×M1 @F21 | max step F18→25 | lost % |
|---|---|---|---|---|---|---|---|---|---|
| seller15 | M1 | 10.0 | 28.0 | 38.0 | 90.8 | 100% | 1.00 | 14.8 | 16 |
| seller15 | REC managed | 10.8 | 29.0 | 38.2 | 62.8 | 100% | 2.38 | 6.0 | 32 |
| seller15 | REC unmanaged | 10.8 | 28.8 | 38.8 | 83.8 | 100% | 1.33 | 11.2 | 17 |
| cheapest | M1 | 11.8 | 31.5 | 46.0 | 109.8 | 100% | 1.00 | 22.2 | 16 |
| cheapest | REC managed | 12.2 | 32.2 | 43.8 | 70.5 | 100% | 2.37 | 7.8 | 32 |
| cheapest | REC unmanaged | 12.2 | 32.2 | 45.5 | 96.5 | 100% | 1.34 | 16.8 | 17 |
| casual | M1 | 13.7 | 39.3 | 55.0 | n/r in 2 h | 95% | 1.00 | — | 25 |
| casual | REC managed | 12.3 | 30.7 | 40.0 | 64.7 | 98% | 3.46 | 5.7 | 9 |
| casual | REC unmanaged | 12.3 | 37.0 | 54.0 | 119 (2/100 reach) | 98% | 1.34 | — | 25 |
Asleep Grader keeping 0% / 25% / 50% of its bonus (unmanaged seller15 F25): 104.2 / **83.8** / 73.8 min. At 0%, unmanaged is worse than no workers (104.2 vs 90.8), which fails AC-W3. At 25% it passes for all three models.

## 5. Acceptance criteria check (REC)
| AC | Result |
|---|---|
| AC-W1 casual managed: F10 ≤ 15 m in ≥ 95%, F18 median ≤ 40 | PASS: 98%, 30.7 min |
| AC-W2 seller15 managed no slower than M1 (±0.5 min) | **F10 +0.8, F18 +1.0: misses by 0.3–0.5 min** (hire costs). Proposal: loosen to +1 min at F10/F18. The trade is F25 90.8 → 62.8 |
| AC-W3 unmanaged never worse than none | PASS with Grader asleep keeping 25% (F25: seller 83.8 < 90.8, cheapest 96.5 < 109.8). F10/F18 within +0.8 min (hire cost) |
| AC-W4 steps ≤ 3 min to F25, F25 ≤ 70 m | F25 62.8 PASS. Steps ≤ 3 min **not reachable** (worst 6.0). Proposal: steps ≤ 6 min |
| ×2 income by F21 | PASS: ×2.37–3.46 (v0.1 tiers: ×1.80–1.86, FAIL) |

## 6. Open points for PM Workers / Head of Product
1. Swap W1's 10% fee for a flat wage. A fee on a production-limited economy is pure loss for active players, and no defer value fixes it.
2. W3 doubles full-queue losses for active players (16 → 32%). Either queue +1 while a Hawker is hired (Market PM), or show those losses as "sold out".
3. W2 has no pacing value for the 1-tap/s bots. Its value is for absent/idle players and needs a slower-tapper model (not run).
4. AC-W2 tolerance and AC-W4 step target need the decisions above.

---
## 7. Follow-up (2026-10-15, spec v0.2 = M2_REC): Hawker queue slot and slow tapper
Sim additions in `run_m2()` (M1 `run()` untouched; economy.csv md5 unchanged):
- `w3.queue_bonus` with `queue_mode` = `uncapped` (min(5, 3+⌊F/10⌋) + 1, so up to 6) or `capped` (min(5, 3+⌊F/10⌋ + 1)). Applies while the Hawker is Working or Tired.
- `lost_full` counter (customers lost to a full queue).
- `taps=(period, n)`: n taps at 1/s at the start of each period.
- New model `SLOW`.
100 seeds, 2 h. Scripts and raw tables: `sim/m2_validation/m2val5.py`, `m2val6.py`, `m2table_v5.md`, `m2table_v6.md`.

**Slow tapper model (`SLOW`):** opens the game every 30 s, taps Collect 5 times in a burst, presses Sell all, then puts the phone down. That's ~0.17 taps/s, and the buy rule is the same as the 15s seller's. Why this model:
- Casual mobile play is short check-ins, not steady tapping, so a burst pattern is closer to real play than a flat 0.3 taps/s. It also stresses what the Coop Hand fixes: from about F2 the coop cap (50 + 50F, which fills in ~50 s) and taps of 5 + 5C mean 5 taps per visit can't keep the coop empty. Production is lost at the cap, and coins come in bursts.
- 30 s visits sit between the casual player (20 s) and the patience limit (30 s). Demand is full and arrivals are fixed, so the result isolates tapping rather than mixing in the casual player's demand penalty.
- It should be checked against telemetry once playtests run.

### 7.1 Hawker +1 queue slot vs M2_REC (median of 100 seeds)
| model | scenario | F10 / F18 / F25 (min) | ×M1 @F21 | lost % | of which full queue % | partial % |
|---|---|---|---|---|---|---|
| seller15 | M1 | 10.0 / 28.0 / 90.8 | 1.00 | 16 | 16 | 0.1 |
| seller15 | M2_REC | 10.8 / 29.0 / 62.8 | 2.38 | 32 | 32 | 0.9 |
| seller15 | + queue +1 uncapped | 10.8 / 29.0 / 62.8 | 2.38 | 30 | 30 | 6.5 |
| seller15 | + queue +1 capped at 5 | 10.8 / 29.0 / 62.8 | 2.38 | 31 | 31 | 4.5 |
| cheapest | M2_REC | 12.2 / 32.2 / 70.5 | 2.37 | 32 | 32 | 1.1 |
| cheapest | + queue +1 uncapped | 12.2 / 32.2 / 70.5 | 2.37 | 30 | 30 | 7.4 |
| cheapest | + queue +1 capped | 12.2 / 32.2 / 70.5 | 2.37 | 30 | 30 | 5.3 |
| casual | M2_REC | 12.3 / 30.7 / 64.7 | 3.46 | 9 | 9 | 0.0 |
| casual | + queue +1 uncapped | 12.3 / 30.7 / 64.3 | 3.46 | 9 | 9 | 0.1 |
| casual | + queue +1 capped | 12.3 / 30.7 / 64.3 | 3.46 | 9 | 9 | 0.1 |
| slow | M2_REC | 12.5 / 30.5 / 64.5 | 3.51 | 32 | 32 | 1.0 |
| slow | + queue +1 uncapped | 12.5 / 30.5 / 64.5 | 3.51 | 30 | 30 | 6.2 |
| slow | + queue +1 capped | 12.5 / 30.5 / 64.5 | 3.51 | 31 | 31 | 4.0 |
- **The extra slot has no pacing value.** Pace changes by ≤ 0.4 min and F21 income doesn't change. Lost customers drop only 1–2 points.
- Why: with the Hawker, demand is about 1.2 × 1.25 = 1.5× production. The extra customer finds an empty basket, so most full-queue losses become part-served leavers instead (partial 1% → 4–7%).
- The 32% loss for active players is spare demand, not lost income.
- Recommendation: **don't add the slot for economy reasons.** If Market PM wants it for feel, use the capped variant (it never goes above 5). Either way, show the losses as "sold out" rather than "lost".
- An alternative that addresses the cause: make the Hawker +15% instead of +25% for players already production-limited. That isn't modelled; the casual player relies on the +25%.

### 7.2 Coop Hand (W2) value: slow tapper vs the others
| model | scenario | F10 / F18 / F25 (min) | ×M1 @F21 | max step F18→25 | lost % | Farm @2 h |
|---|---|---|---|---|---|---|
| slow | M1 (no workers) | 12.5 / 36.5 / n/r | 1.00 | — | 44 | 24 |
| slow | **M2_REC** | **12.5 / 30.5 / 64.5** | **3.51** | 6.0 | 32 | 30 |
| slow | REC without Coop Hand | 12.5 / 36.5 / 86.0 | 2.33 | 8.5 | 48 | 28 |
| slow | Coop Hand only | 12.5 / 36.5 / n/r | 1.00 | — | 44 | 24 |
| slow | REC unmanaged | 12.5 / 35.0 / n/r | 1.34 | — | 44 | 24 |
| seller15 | REC / without Coop Hand | 10.8 / 29.0 / 62.8 vs 10.8 / 28.8 / 62.5 | 2.38 vs 2.41 | 6.0 vs 5.8 | 32 | 30 |
| cheapest | REC / without Coop Hand | 12.2 / 32.2 / 70.5 vs 12.2 / 32.0 / 70.2 | 2.37 vs 2.38 | | 32 | 30 |
| casual | REC / without Coop Hand | 12.3 / 30.7 / 64.7 vs 12.3 / 30.7 / 64.3 | 3.46 vs 3.45 | | 9 | 30 |
- **For the slow tapper, the Coop Hand is the second most valuable worker:** F18 is 6.0 min earlier (36.5 → 30.5), F25 is 21.5 min earlier (86.0 → 64.5), and F21 income goes ×2.33 → ×3.51 (+51%).
- For the 1 tap/s bots it's worth about 0 (±0.3 min, wage cost included), as expected.
- **It only pays together with the Market Hand.** Coop Hand alone = M1 for the slow tapper: the extra eggs pile up because a player who sells every 30 s is held back by the queue (44% lost).
- **F10 doesn't move** because the Coop Hand unlocks at F10.
- Unlock-level test, slow tapper F10 / F18 / F25 (min):

| Coop Hand unlock | slow | seller15 | casual |
|---|---|---|---|
| F3 | 12.0 / 30.5 / 64.5 | 11.0 / 29.2 / 63.0 | 12.7 / 31.0 / 65.0 |
| F5 | 12.0 / 30.5 / 64.0 | 11.0 / 29.0 / 62.8 | 12.7 / 30.7 / 64.7 |
| **F7** | **12.0 / 30.5 / 64.5** | **10.8 / 29.0 / 62.8** | **12.3 / 30.7 / 64.7** |
| F10 (v0.2) | 12.5 / 30.5 / 64.5 | 10.8 / 29.0 / 62.8 | 12.3 / 30.7 / 64.7 |

  F7 gives the slow tapper −0.5 min to F10 at no cost to the other models. F3–F5 cost seller15 and casual 0.2–0.4 min, because the hire competes with early Farm buys.

### 7.3 Recommendations (v0.2 → v0.3)
1. **Coop Hand: unlock at F7** (was F10), $150, wage unchanged. Present it as the worker for players who aren't tapping constantly. Hint at it when coop-cap waste builds up: show the "Full!" state plus a "hire a Coop Hand" tip after N seconds at the cap.
2. **Hawker queue slot: no economic need.** Optional and cosmetic, capped at 5 if added. Fix the lost-customer perception in the UI instead (Market PM, Art & UX).
3. AC addition (for PM Workers): **AC-W6.** With the slow tapper, M2_REC managed beats "REC without Coop Hand" by ≥ 4 min at F18 and by ≥ 15% on F21 income. Today: 6.0 min and +51%.
4. Unmanaged workers are still never worse than none for the slow tapper (F18 35.0 vs 36.5).

---
## 8. QA-RC2-1 tick order + v0.3 energy re-run (2026-10-15)
### 8.1 QA-RC2-1 (Head of Product ruling): timeouts/leavers before arrivals
`run()` and `run_m2()` now handle timeouts and leavers before arrivals within each tick, as the build does. **economy.csv is unchanged** (md5 4d547dea… before and after).
AC7 parity, 20 seeds:
| model | first upgrade | upgrades @5 min | L10 | L18 | partial % (median) |
|---|---|---|---|---|---|
| build | 15 s | 10 | 10.0 | 28.0 | — |
| seller15, old order | 15 s | 10 | 10.0 | 28.0 | 0.9 |
| **seller15, new order** | **15 s** | **10** | **10.0** | **28.0** | 1.2 |
| cheapest, old order | 15 s | 9 | 11.8 | 31.5 (2 h run) | 1.3 |
| **cheapest, new order** | **15 s** | **9** | **11.8** | **31.5** | 1.8 |
Full parity with the build. The only change is that a few more customers are logged as part-served instead of lost (a freed slot is refilled in the same tick). All §8.2 runs use the new order. The M2 v1.0 ruling (no Hawker queue slot) is assumed.

### 8.2 Energy: old (10 min drain, Tired < 50%) vs new Art & UX (15 min drain, Tired < 30%, Asleep 0%, 30 s cooldown, **Manage all** at ≥ 3 workers)
Config `M2_V03` = M2_REC with the Coop Hand at F7. `M2_V03_E2` = the same with the new energy values.
**Management assumption:** at each of its own Sell visits (seller15/cheapest every 15 s, casual 20 s, slow 30 s), the player taps Manage when any worker is at or below the Tired threshold, and the 30 s cooldown has passed. With Manage all (≥ 3 workers) one tap refills every worker. Otherwise it refills the lowest one. That's an attentive player who reacts as soon as a bar shows Tired; the "unmanaged" case is the lower bound.
100 seeds, 2 h. Raw tables: `sim/m2_validation/m2table_v7.md`, `m2table_v8.md`.
| model | scenario | F10 / F18 / F25 (min) | ×M1 @F21 | max step F18→25 | Manage actions / 10 min | refills per worker / 10 min |
|---|---|---|---|---|---|---|
| seller15 | M1 | 10.0 / 28.0 / 90.8 | 1.00 | 14.8 | — | — |
| seller15 | old energy managed | 10.8 / 29.0 / 62.8 | 2.38 | 6.0 | 6.67 | 1.87 |
| seller15 | **new, Manage all** | 10.8 / 29.0 / 62.2 | 2.39 | 5.8 | 0.83 | 0.93 |
| seller15 | new, no Manage all | 10.8 / 29.0 / 62.5 | 2.41 | 5.8 | 3.17 | 3.55 |
| seller15 | old unmanaged | 10.8 / 28.8 / 83.8 | 1.33 | 11.2 | 0 | — |
| seller15 | new unmanaged | 10.8 / 28.8 / 80.5 | 1.51 | 11.2 | 0 | — |
| cheapest | M1 | 11.8 / 31.5 / 109.8 | 1.00 | 22.2 | | |
| cheapest | new, Manage all | 12.2 / 32.2 / 70.5 | 2.37 | 7.8 | 0.83 | 0.95 |
| cheapest | new unmanaged | 12.2 / 32.2 / 93.5 | 1.39 | 16.8 | | |
| casual | M1 | 13.7 / 39.3 / n/r | 1.00 | — | | |
| casual | new, Manage all | 12.3 / 30.7 / 64.0 | 3.45 | 5.7 | 0.83 | 0.95 |
| casual | old unmanaged | 12.3 / 37.0 / n/r (2/100 reach L25) | 1.33 | — | | |
| casual | new unmanaged | 12.3 / 34.7 / 118.0 (82/100 reach) | 1.34 | 17.7 | | |
| slow | M1 | 12.5 / 36.5 / n/r | 1.00 | — | | |
| slow | new, Manage all | 12.0 / 30.5 / 63.5 | 3.47 | 6.0 | 0.83 | 0.94 |
| slow | new, Manage all, no Coop Hand | 12.5 / 36.5 / 85.5 | 2.40 | 8.5 | | |
| slow | new unmanaged | 12.0 / 34.0 / 119.0 (91/100 reach) | 1.33 | 18.5 | | |
- New energy + Manage all: managed pacing is the same or slightly better (≤ 0.6 min), with **8× fewer manage actions** (6.7 → 0.83 per 10 min).
- **Unmanaged got stronger.** With 15 min until Asleep and Working until 30%, each fresh hire works for ~10.5 min instead of 5, and with keep-25% the late multipliers matter more.

### 8.3 Active vs idle (CEO rule: active play out-earns idle)
| model | energy | managed/unmanaged income @F21 | L25 managed vs unmanaged | gap |
|---|---|---|---|---|
| seller15 | old | 1.78 | 62.8 vs 83.8 | 21.0 min |
| seller15 | **new** | **1.59** | 62.2 vs 80.5 | **18.2 min** |
| cheapest | old / new | 1.77 / 1.70 | 70.5 vs 96.5 / 93.5 | 26.0 / 23.0 |
| casual | old / new | 2.60 / 2.57 | 64.7 vs n/r / 118.0 | — / 54.0 |
| slow | old / new | 2.60 / 2.61 | 64.5 vs n/r / 119.0 | — / 55.5 |
**Flag:** for the 15s seller the managed/unmanaged gap shrinks by ~11% in income (1.78 → 1.59) and by 2.8 min at L25. Active still out-earns idle everywhere, but the margin is lower.
Counter-tune, Grader asleep keep (new energy, unmanaged):
| keep | seller15 L25 (M1 90.8) | ratio @F21 | L25 gap | cheapest L25 (M1 109.8) | ratio | casual / slow ratio |
|---|---|---|---|---|---|---|
| 0.25 (v0.3) | 80.5 | 1.59 | 18.2 | 93.5 | 1.70 | 2.57 / 2.61 |
| **0.15** | **86.0** | **1.67** | **23.8** | **100.8** | **1.86** | 2.84 / 2.88 |
| 0.10 | 89.5 | 1.72 | 27.2 | 105.2 | 1.96 | 3.00 / 3.04 |
**Recommend keep = 0.15.** It brings the gap back above the old-energy level (23.8 vs 21.0 min) and still passes AC-W3 (86.0 < 90.8; 100.8 < 109.8). 0.10 leaves seller15 only 1.3 min ahead of no workers, which is too close.

### 8.4 AC check (v0.3, new energy, Manage all, new tick order)
| AC | Result |
|---|---|
| AC-W1 casual F10 ≤ 15 m in ≥ 95%, F18 median ≤ 40 | PASS: 98%, 30.7 |
| AC-W2 seller15 ≤ +1 min vs M1 at F10/F18 | PASS: +0.8 / +1.0 (edge) |
| AC-W3 unmanaged never worse than none | PASS at keep 0.25 and 0.15 (L25, F18). F10 +0.8 for seller15 is the accepted hire cost |
| AC-W4 seller15 steps ≤ 6 min, F25 ≤ 70 | PASS: 5.8, 62.2 |
| AC-W4b cheapest steps ≤ 8 min (soft) | PASS: 7.8 (thin) |
| AC-W5 ≥ 1 management action per worker per 10 min | **FAIL by design:** 0.83 actions / 10 min, 0.93–0.95 refills per worker / 10 min. A 15 min drain with a 30% threshold allows at most ~1 per 10.5 min. Reword to "≥ 1 Manage action per 15 min while ≥ 1 worker is hired". The measured value (median) is 1.25 per 15 min |
| AC-W6 slow: REC beats no Coop Hand by ≥ 4 min @F18 and ≥ 15% income @F21 | PASS: 6.0 min, +45% (×3.47 vs ×2.40) |

### 8.5 Recommendations
1. Adopt the new energy values + Manage all: same pacing, 8× fewer taps.
2. Counter-tune **w4_asleep_keep 0.25 → 0.15** to keep active play clearly ahead (ratio ≥ 1.6, L25 gap ≥ 20 min for seller15).
3. Reword AC-W5 to a 15-min window.
4. Telemetry KPI for the CEO rule: managed/unmanaged income ratio at F21 ≥ 1.5 for active cohorts.
