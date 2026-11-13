# Workers (M2): spec · v1.0 · 2026-10-15 · PM, Workers
Status: **v1.1 approved** (Head of Product, 2026-10-15). v1.0 was handed to Engineering after QA's M1 sign-off (sanctioned by Head of Product and the CEO). The v1.1 changes are balance-only (energy, Refill tired (N), Grader keep, AC-W5). v0.2 adopted the Economy/Balance validation (`product/workers/m2-economy-validation.md`, set `M2_REC` in `product/sim/economy_sim.py` `run_m2()`). economy.csv (M1) is unchanged.
Offline rate is **25%** (CEO 2026-10-15), cap 2 h.
Tags: **[V]** = validated in `run_m2()` (100 seeds, 2 h, seller15/cheapest/casual). **[A]** = assumption, not validated yet. **[P]** = proposal, pending sim.

## Changelog
- 2026-10-16: active/idle playtest metric moved from F21 to the F22–24 average (≥ 1.5); Grader share stays 0.5 under F1 (Head of Product).
- v1.1 (2026-10-16): clarified Refill tired (N) in §3, §8 items 8/15.4/19 and §10. It unlocks at 3+ workers hired (not 3+ tired), is shown when N ≥ 1 worker is at ≤ 0.4 energy, and is hidden at N = 0.
- v1.1 (2026-10-16): §8 items 19–20 (rc1 S2-2a/S2-2b). "Manage all" renamed to "Refill tired (N)" throughout, with hide/greyed/cooldown-ring/"Ready in Ns" rules; per-worker Manage captions "Not tired yet" / "Ready in Ns" (12px Nunito #5A4C42).
- v1.1 (2026-10-16):
  - HoP approved P4: Manage only at ≤ 40% energy, Refill tired (N) counts only workers at ≤ 40% (fixes the 81%+ bug). Re-sim (playtest1-resim.md): AC-W4 5.5, W4b 7.5, W5 5.62 / 15 min, all PASS.
  - All queue references now use the M1 rule P1q: queue_max = min(10, 6 + floor(F/5)).
  - Added §8b: Grader cost under F1 (0.5 × Farm cost, L18 $7,384), pending the ≥ 1.5 ratio check; fallback 0.6.
- v1.1 (2026-10-15): §8 item 18 confirms Engineering's calls on build aa885bf (no partial wage charge, resume stops at the first worker that can't afford it, one-tick drain before Unpaid).
- v1.1 (2026-10-15): §8 items 16 (R9 resume reserve includes workers already paid, QA F10 example) and 17 (AC-W1 random-arrival ruling: Poisson and ×0.75 are test-only, gated on Python seeds 0–99, build parity ±20% of medians).
- v1.1 (2026-10-15): §8 item 15 added, answering QA's v1.1 questions (Unpaid drain, Manage on Unpaid, Grader tier refill, Refill tired (N) disabled at 100%, resume order). These are PM decisions; the numbers are unchanged.
- **v1.1 approved (2026-10-15, Head of Product):** §10 approved as written and folded into §2, §3, §5, §6 and §8; the §8 answers stand.
- v1.1 proposal (2026-10-15): energy and management changes from Economy/Balance validation §8, see §10. 15 min drain, Tired < 30%, 40% yawn cue, Refill tired (N) at 3+ workers with a shared 30 s cooldown, asleep Grader keep 25% → 15%, AC-W5 reworded, new playtest metric (managed/unmanaged F21 income ≥ 1.5 for active players).
- v1.0 (2026-10-15): added §8 Rules clarifications (QA). The rules themselves are unchanged; the (PM decision) items need Head of Product to confirm.
- **v1.0 approved (2026-10-15, Head of Product):** removed the Hawker +1 queue slot entirely, along with its "sold out" display. Reason: it moved pacing by ≤ 0.4 min, and a purely cosmetic slot would confuse players. queue_max stays the M1 rule P1q: queue_max = min(10, 6 + floor(F/5)).
- **v1.0 (2026-10-15):** built on the Economy/Balance follow-up sims (validation §7).
  - Coop Hand unlock moved F10 → F7.
  - Hawker +1 queue slot is now optional and cosmetic (no economic value: pacing moves ≤ 0.4 min), with the queue capped at the M1 queue_max (now P1q: min(10, 6 + floor(F/5))). Customers turned away while a Hawker is hired show as "sold out", not lost.
  - Added the "hire a Coop Hand" tip.
  - Added AC-W6 (slow tapper) and the slow-tapper / queue-slot results (§7b).
- **v0.2 (2026-10-15):** adopted the Economy/Balance recommendations.
  - W1: dropped the 10% fee and the 5 s defer rule, now a wage of $0.25 × Farm L/min. Unlock moved F1 → F3 ($40 unchanged).
  - W2: unlock moved F3 → F10.
  - W3: F5/$400 → F8/$800, still +25%.
  - W4 tiers changed to ×1.5/2.0/2.5/3.0/4.0 at F18/19/21/22/24, each costing 0.5 × Farm cost. An Asleep Grader now keeps 25% of its bonus (was 0%).
  - AC-W2 loosened to +1 min. AC-W4 steps loosened to ≤ 6 min.
  - Added a proposal: Hawker gives +1 queue slot [P].
  - Replaced the v0.1 sanity check with the validation results.
- v0.2 update (2026-10-15, Head of Product): AC-W2 (+1 min) and AC-W4 (≤ 6 min) approved; added soft AC-W4b; offline behaviour confirmed. Stays v0.2 until the Hawker +1 queue slot and slow-tapper Coop Hand sims are back.
- v0.1 (2026-10-15): first draft. W1 10% fee + 5 s defer, v0.1 tiers ×1.25…×4.0. Superseded: the fee slowed active players whatever the defer value, and the tiers missed ×2 at F21 (×1.80–1.86).

## 1. Design goals
1. Workers automate collect, sell, and (late game) income.
2. Workers fail without management. The failure is felt but not punishing: unmanaged workers never do worse than no workers (AC-W3).
3. The late game is carried by price multipliers (W4), not extra eggs or demand, because M1-R1 is production-limited. Target ×2 income by F21 [V: ×2.37–3.46].

## 2. Worker types
| ID | Worker | Unlock | Hire | Running cost | Managed effect | Tired (1–29%) | Asleep (0%) |
|---|---|---|---|---|---|---|---|
| W1 | **Market Hand** (auto-seller) | Farm L3 | $40 | wage $0.25 × Farm L/min, no % fee [V] | serves the queue every 1 s | every 3 s | stops, no wage |
| W2 | **Coop Hand** (auto-collector) | Farm L7 | $150 | wage $0.5 × Farm L/min (PM decision) | collects eggs_per_tap every 2 s | every 4 s | stops, no wage |
| W3 | **Hawker** | Farm L8 | $800 | — | demand ×1.25 | ×1.10 | ×1.0 |
| W4 | **Egg Grader** (tiered) | Farm L18 / 19 / 21 / 22 / 24 | 0.5 × Farm cost at the tier's level | — | price ×1.5 / 2.0 / 2.5 / 3.0 / 4.0 (cumulative, not stacked) | half of the bonus | keeps 15% of the bonus |
Notes
- A flat W1 wage removes the fee loss for active players. Their remaining +0.8 min at F10 comes from the hire costs [V].
- W2 is the worker for players who don't tap constantly. For the slow tapper it brings F18 6.0 min earlier and F21 income +51%, but only alongside W1. For 1-tap/s players it is worth about 0 (±0.3 min) [V].

### 2b. "Hire a Coop Hand" tip
- Trigger: the coop has been at cap (Full! state) for ≥ `coop_full_tip_s` = 10 s (PM decision), Farm ≥ F7, and no Coop Hand is hired.
- Shows once per session, and never again after the Coop Hand is hired. Tapping it opens the hire panel.
- UI copy and design: Art & UX.

## 3. Management and failure-without-management
- Energy 0–100%, drains −1% per 9 s while not Asleep (15 min to empty) [V].
- Working ≥ 30%, Tired 1–29%, Asleep 0%. Effects are in §2.
- **Yawn cue** at 40% energy (visual cue plus sfx-upgrade reuse), a warning before Tired.
- **Manage (P4, HoP-approved):** enabled only when a worker is at **≤ 40% energy** (its yawn point). It refills the lowest such worker to 100%. **Refill tired (N)** unlocks once **3+ workers are hired** (the 3+ counts hired workers, not tired ones). It is shown when **N ≥ 1** (N = hired workers at ≤ 40% / 0.4 energy) and refills those N; **hidden at N = 0** (except while the cooldown runs, §8 item 19). Free; shared 30 s global cooldown. This replaces the earlier rule (Manage at any energy, and Manage all counting every hired worker, including those at 81%+).
- Sleeping workers charge no wage. Manual actions always work.
- The W1 Tired mistake rule (5% under-fill) from v0.1 stays optional and is not modelled [A].

## 4. Offline (confirmed by Head of Product 2026-10-15)
Workers don't work, drain or get paid offline. The offline rate stays 25% / 2 h, and offline eggs still bypass the coop. This follows the CEO rule that active play out-earns idle. On return, an awake W1 starts selling the offline stock.

## 5. Proposed economy.csv rows / columns (M2)
| Farm L | w1_cost | w1_wage_per_min | w2_cost | w2_wage_per_min | w3_cost | w4_tier | w4_price_mult | w4_tier_cost |
|---|---|---|---|---|---|---|---|---|
| 3 | 40 | 0.75 | — | — | — | — | 1.0 | — |
| 7 | 40 | 1.75 | 150 | 3.5 | — | — | 1.0 | — |
| 8 | 40 | 2.00 | 150 | 4.0 | 800 | — | 1.0 | — |
| 10 | 40 | 2.50 | 150 | 5.0 | 800 | — | 1.0 | — |
| 18 | — | 4.50 | — | 9.0 | — | 1 | 1.5 | 11,091 |
| 19 | — | 4.75 | — | 9.5 | — | 2 | 2.0 | 14,973 |
| 21 | — | 5.25 | — | 10.5 | — | 3 | 2.5 | 27,288 |
| 22 | — | 5.50 | — | 11.0 | — | 4 | 3.0 | 36,839 |
| 24 | — | 6.00 | — | 12.0 | — | 5 | 4.0 | 67,139 |
w4_tier_cost = floor(0.5 × floor(100 × 1.35^F)), i.e. half the cost to buy the next Farm level at F.
Global tunables: w1_serve_s=1, w2_every_s=2, w3_demand=1.25, coop_full_tip_s=10 (PM decision), w4_asleep_keep=0.15, energy_drain_s_per_pct=9, manage_cooldown_s=30, tired_threshold=0.30, yawn_cue_pct=40, manage_all_min_workers=3.

## 6. Acceptance criteria
| AC | Criterion | Result (M2_REC) |
|---|---|---|
| AC-W1 | casual managed: F10 ≤ 15 min in ≥ 95% of seeds, F18 median ≤ 40 min | PASS: 98%, 30.7 min |
| AC-W2 | seller15 managed no more than **+1 min** slower than M1 at F10/F18 | PASS: +0.8 / +1.0 (approved HoP 2026-10-15) |
| AC-W3 | unmanaged never worse than no workers | PASS: F25 seller15 83.8 < 90.8, cheapest 96.5 < 109.8. F10/F18 within +0.8 min of hire cost |
| AC-W4 | seller15 managed: steps **≤ 6 min** F18→F25, F25 ≤ 70 min | PASS: worst step 5.5 (P4 re-sim, playtest1-resim.md); was 6.0 |
| AC-W4b (soft, non-gating, AC7-soft pattern) | cheapest-first managed: steps ≤ 8 min F18→F25 | PASS: worst step 7.5 (P4 re-sim); was 7.8 |
| AC-W6 | slow tapper (`SLOW`) managed: M2_REC beats REC without Coop Hand by ≥ 4 min at F18 and ≥ 15% on F21 income | PASS: 6.0 min (36.5 → 30.5), +51% (×2.33 → ×3.51) |
| AC-W5 | ≥ 1 Manage action per 15 min while ≥ 1 worker is hired; state readable at a glance (telemetry, not a gate) | PASS: 5.62 Manage taps / 15 min (P4 re-sim); was 1.25 |
| Playtest metric | managed / unmanaged income averaged over F22–24 ≥ 1.5 for all player models (was F21; changed 2026-10-16, Head of Product, because under F1 the Grader is not yet asleep at F21) (CEO rule: active play out-earns idle; telemetry, not a gate) | Sim: 1.67 seller15 … 2.88 slow |

## 7. Validation results (Economy/Balance, M2_REC, 100 seeds, 2 h; times in min)
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
Asleep Grader keeping 0% / 25% / 50% of its bonus (unmanaged seller15 F25): 104.2 / **83.8** / 73.8 min. At 0% it fails AC-W3. v1.0 chose 25%; v1.1 lowers it to 15% under the new energy values (§10).
Notes: the cheapest bot's worst step (7.8 min) is covered by soft AC-W4b (≤ 8 min). Raw tables: `product/sim/m2_validation/`.

## 7b. Follow-up sims (validation §7, M2_REC, 100 seeds, 2 h)
Slow tapper (`SLOW`): visits every 30 s, 5 taps per visit, then Sell all (~0.17 taps/s), seller15 buy rule. To be checked against playtest telemetry.
| model | scenario | F10 / F18 / F25 (min) | ×M1 @F21 | max step F18→25 | lost % |
|---|---|---|---|---|---|
| slow | M1 | 12.5 / 36.5 / n/r | 1.00 | — | 44 |
| slow | M2_REC (Coop Hand F10) | 12.5 / 30.5 / 64.5 | 3.51 | 6.0 | 32 |
| slow | REC without Coop Hand | 12.5 / 36.5 / 86.0 | 2.33 | 8.5 | 48 |
| slow | Coop Hand only | 12.5 / 36.5 / n/r | 1.00 | — | 44 |
| slow | REC unmanaged | 12.5 / 35.0 / n/r | 1.34 | — | 44 |
| slow / seller15 / casual | Coop Hand at **F7** | 12.0 / 30.5 / 64.5 · 10.8 / 29.0 / 62.8 · 12.3 / 30.7 / 64.7 | — | — | — |
- F7 gives the slow tapper −0.5 min to F10 at no cost to the other models. F3–F5 cost the other models 0.2–0.4 min.
- Queue +1 slot (capped at the M1 queue_max, now P1q: min(10, 6 + floor(F/5)); simmed before P1q), all models: pacing within ≤ 0.4 min, ×M1 @F21 unchanged. Lost customers 32 → 31% for active players; partial leavers 1 → 4–5%.
- Note: the AC-W6 numbers were measured with the Coop Hand at F10. At F7 the F18/F25 results are the same.

## 8. Rules clarifications (QA)
Answers to qa/m2-test-plan.md §9. Sources: this spec and `run_m2()` in `product/sim/economy_sim.py`. "(PM decision)" = the spec was silent, so PM Workers decided.
0. **Hawker scope:** only the +1 queue slot was dropped (v1.0 approved). The Hawker stays: F8, $800, demand ×1.25 Working / ×1.10 Tired / ×1.0 Asleep. queue_max is the M1 rule P1q: queue_max = min(10, 6 + floor(F/5)).
1. **Wage timing:** wages accrue continuously as $rate × F / 60 per second, in proportion to time in a paying state (Working or Tired, same rate in both); nothing accrues while Asleep. The sim debits in each worker's action interval (W1 every serve, W2 every collect), which is equivalent. F is the current Farm level. (PM decision on display: the HUD shows the total $/min.)
2. **Coins short:** coins never go negative and there is no debt. The sim clamps the charge at the coins available. Rule (PM decision): if a wage can't be paid in full, that worker goes **Unpaid**, which works like Asleep (stops, no effect, no wage), and resumes on its own once coins ≥ 1 minute of wage. "Unpaid" warning on the portrait. Never worse than no worker.
3. **Hawker demand:** the draw is M1's uniform int in [dmin, dmax]. The ×1.25 (or ×1.10) multiplies the drawn value, then it's rounded half-up, min 1 (this is what the sim does: `max(1, round(draw × m))`). Not applied to dmin/dmax.
4. **State changes and the queue:** Hawker demand is fixed when a customer spawns, so customers already queued are unaffected. The Grader multiplier is read at each sale, so a state change applies from the next sale. A sale already done is never re-priced.
5. **Grader rounding:** round once, half-up to cents, the full unit price (1+0.05F)×(1+0.12C)×grader (QA W4-4 is correct; PM decision). The sim rounds k × unit per sale (difference ≤ $0.01 per sale, does not affect pacing).
6. **Energy drain:** every hired worker that isn't Asleep drains, Working **and** Tired, passive ones (W3, W4) included. W4 has a single bar (one drain, not per tier). Values (v1.1): −1% per 9 s (15 min), Tired < 30%, yawn cue at 40%, asleep Grader keeps 15%.
7. **Grader:** one worker with tiers, one energy bar, up to 5 tier purchases. The current tier's multiplier m replaces the previous one (not stacked). Tired = 1 + (m−1)/2, Asleep = 1 + 0.15 × (m−1) (v1.1; QA's formula is correct).
8. **Manage:** free. Cooldown is 30 s and **global** (one Manage per 30 s across all workers, same as the sim). "Refill tired (N)" shares that cooldown. Under P4, Manage is enabled only at ≤ 40% energy. Refill tired (N) needs 3+ workers hired and is shown when N ≥ 1 is at ≤ 40%.
9. **Firing/pausing (PM decision, already shared with Art & UX):** in M2, workers **can't be fired or paused**, and there are **no refunds**. A hire lasts the rest of the save; Asleep/Unpaid are the only off states.
10. **CSV:** w1–w4 columns on all 31 rows (PM decision). Wage columns use the formula at every F from the unlock on. Before the unlock, every cell is empty. "—" in the §5 table meant "unchanged / already hired" (one hire per type; w1_cost stays $40 on every row from F3); the CSV should have the actual value, not "—". w4 columns hold the current tier and its multiplier on every row from F18.
11. **Tips (Art & UX rules, PM decision):**
    - A tip shows when the worker is unlocked and affordable, the Coop Hand one additionally needs the coop to have been Full for ≥ `coop_full_tip_s` = 10 s (PM decision). A dip below the cap resets the 10 s.
    - Once per session; a reload counts as a new session.
    - Never shown during the welcome-back modal.
    - Two dismissals hide it until the next worker unlock.
12. **Designer 2× step metric:** soft and non-gating (a telemetry/design health metric). QA reports it per seed and on medians, for all models. Steps under 30 s are ignored to avoid noise from the 0.1 s resolution (PM decision). Gating step ACs are only AC-W4 (seller15, medians) and the soft AC-W4b (cheapest).
13. **AC-W5:** a playtest telemetry target, **not a release gate**.
14. **Other PM decisions:**
    - One worker per type (W1, W2, W3, and one tiered W4).
    - W2 wage is $0.5 × Farm L per min.
    - `coop_full_tip_s` is 10 s.
    - Worker sound effects reuse `sfx-upgrade`.
15. **v1.1 answers (QA test plan §10, PM decisions):**
    1. An **Unpaid** worker doesn't drain energy.
    2. Manage and Refill tired (N) refill an Unpaid worker's energy, but it stays Unpaid until it resumes. Each tap counts as a Manage action for AC-W5.
    3. Buying a Grader tier doesn't refill the Grader's energy.
    4. Refill tired (N) is available only with 3+ workers hired, and it is hidden/disabled at N = 0 (no hired worker at ≤ 40%). This supersedes "disabled at 100%". A disabled tap doesn't start the 30 s cooldown. The same applies to Manage when no worker is at ≤ 40%.
    5. Unpaid workers resume one at a time, in order W1→W4. Each needs coins ≥ 1 min of its own wage, after reserving 1 min of wage for every worker already resumed in this pass. Only W1/W2 have wages, so in practice W1 then W2.
16. **R9: resume reserve includes workers already paid (PM decision).**
    - When an Unpaid worker's resume is checked, coins must cover 1 min of its own wage, plus 1 min of wage for every worker already being paid (Working or Tired), plus every worker resumed earlier in the same check.
    - Order stays W1→W4 (only W1 and W2 have wages).
    - QA example at F10 (W1 = $2.50/min, W2 = $5.00/min):
      - Both Unpaid with $6.00: only W1 resumes (2.50 ≤ 6.00; W2 needs 2.50 + 5.00 = 7.50).
      - Both Unpaid with $7.50: both resume.
      - W1 already Working: W2 needs $7.50.
17. **AC-W1 and random arrivals (engineering/m2-questions.md Q7; PM ruling).**
    - **Game rules unchanged:** the shipped game keeps M1's fixed arrival intervals (MK-2): first customer at `first_customer_s` = 10 s, then every `customer_interval_s` for the current Farm level. Demand ×1.0. The casual model's Poisson arrivals and demand ×0.75 describe a *player/variance scenario*, not a game rule, and must never reach production config.
    - **Arrival model for AC-W1 (as in `run_m2`, `CASUAL`):**
      - First arrival at 10 s, fixed.
      - Each next gap = Exponential(mean = `customer_interval_s(F)`), using F at the moment of the arrival, floored at the 0.1 s tick, and arrival times rounded to 0.01 s.
      - Demand = round-half-up(uniform int [dmin, dmax] × 0.75), min 1. With a Working Hawker that's × 1.25 (× 1.10 Tired) on top.
      - The casual player sells every 20 s and taps 1/s, with the seller15 buy rule. Managed, M2 v1.1 values, 2 h runs.
    - **Seeding:** one RNG per run, seeded with the integer seed. Arrival gaps and demand draws come from that one stream in tick order. The reference set is seeds 0–99.
      - Engineering's TS RNG is not expected to reproduce Python's stream bit-for-bit; parity is judged on distributions (below).
      - Each build run must be reproducible from its seed (e.g. `?marketSeed=`).
    - **Gate:** AC-W1 is gated on the reference Python sim (`run_m2`, casual, seeds 0–99): F10 ≤ 15 min in ≥ 95% of seeds and F18 median ≤ 40 min. Current: 98%, 30.7.
    - **Build check:** Engineering adds test-only hooks (option a), Poisson arrivals and a demand scale, off by default and rejected by config validation in production builds. The 100-seed build bot must:
      - Meet the same two thresholds.
      - Be within the AC7 tolerance of ±20% of the Python medians for t(F10) and t(F18).
      - Have a pass rate within 5 points of Python's.
    - If the build passes the thresholds but misses parity, that is a sim/build bug for Engineering and Economy/Balance, not an AC-W1 fail. A playtest is not the gate (option b rejected); casual telemetry is a later check of the ×0.75 assumption.
18. **Engineering's calls on build aa885bf (confirmed by PM):**
    1. If a worker can't cover its full wage charge, it's charged **nothing** and goes Unpaid. There's no partial charge. This clarifies "clamps" in item 2: coins are never charged below 0 because the charge is skipped, not cut down.
    2. Resume is checked strictly in order W1→W4 and **stops at the first worker that can't afford to resume** (with the R9 reserve). This is equivalent to the sim: W1's wage ($0.25×F) is lower than W2's ($0.5×F), so if W1 can't resume, W2 can't either.
    3. A worker may drain energy for **one tick** before going Unpaid (an accepted tick-order artefact). Exempt from item 15.1 for that tick.
19. **rc1 S2-2a: "Refill tired (N)"** (renamed from "Manage all"; rules per P4 unchanged).
    - Label "Refill tired (N)", where N = number of hired workers at ≤ 40% energy. aria-label "Refill N tired workers".
    - **Hidden** when N = 0 and no cooldown is running.
    - During the 30 s shared cooldown it stays **visible but greyed**, shows the cooldown ring, and has the caption "Ready in Ns". The caption updates at most once a second.
    - Unlocks once 3+ workers are **hired**; shown when N ≥ 1. The 3+ is hired workers, not tired ones.
20. **rc1 S2-2b: per-worker Manage caption.**
    - When the Manage button is greyed it shows a one-line caption: "Not tired yet" if the worker is above 40%, or "Ready in Ns" during the cooldown (cooldown takes precedence if both apply).
    - Captions on both buttons use 12px Nunito in #5A4C42, per Art & UX (art-ux/m2-workers-layout.md).
- **Margin warning (QA):** AC-W4 (6.0 vs ≤ 6.0) and AC-W4b (7.8 vs ≤ 8) have no margin. They're evaluated on medians of 100 seeds and QA reports the seed spread. Any change to Grader tiers, costs or the energy re-sim must re-check both. If the energy re-sim breaks AC-W4, that goes to Head of Product before adopting the change.

## 8b. Grader cost under the F1 fix (pending)
- F1 fix: `product/f1-proposal.md`, merging Wed Oct 21, pending Product approval. Under it, the Grader tier cost rule stays **0.5 × Farm cost**, so the absolute costs fall with the new Farm curve. Example: the L18 tier goes $11,091 → **$7,384**.
- Sim under F1: AC-W4 5.5, AC-W4b 5.0, AC-W5 5.75 Manage taps / 15 min, all passing.
- **Decided 2026-10-16 (Head of Product):** Grader share stays **0.5 × Farm cost**. The managed/unmanaged metric is measured as the F22–24 average, ≥ 1.5 (at F21 under F1 the Grader is not yet asleep: seller15 1.25; at F22 2.05). The 0.6 fallback is dropped (it does not fix F21).
- The §5 w4_tier_cost values are pre-F1 and change if F1 merges.

## 9. Open items
1. Art & UX: energy bar + Manage tap (is a 10-min drain management or a chore?), Coop Hand tip copy.
2. Not modelled: a Hawker at +15% for production-limited players; the W1 Tired under-fill mistake. Telemetry: validate the slow-tapper and casual models.
3. Engineering handoff after QA signs off on M1 (not sent yet).

## 10. v1.1: energy and management (approved by Head of Product 2026-10-15; folded into the main sections)
Source: m2-economy-validation.md §8 (100 seeds, 2 h, new tick order: timeouts before arrivals, matching the build; economy.csv unchanged). Changes vs v1.0:
| Item | v1.0 (in force) | v1.1 proposed |
|---|---|---|
| Energy drain | −1% / 6 s (10 min) | **−1% / 9 s (15 min)** |
| Tired threshold | < 50% | **< 30%** |
| Yawn cue | — | **at 40% energy** (visual + sfx-upgrade reuse) |
| Manage | one worker per tap, 30 s global cooldown | **Refill tired (N) once 3+ workers are hired** (one tap refills every worker at ≤ 40%; shown at N ≥ 1), shared 30 s cooldown. Below 3 workers, one worker per tap |
| Asleep Grader keeps | 25% of bonus | **15%** |
| AC-W5 | ≥ 1 management action per worker per 10 min | **≥ 1 Manage action per 15 min while ≥ 1 worker is hired** (telemetry, not a gate). Sim median 1.25 / 15 min |
| New playtest metric (CEO rule: active play out-earns idle) | — | **managed / unmanaged income averaged over F22–24 ≥ 1.5** (originally F21, superseded 2026-10-16) (telemetry, not a gate) |
Why:
- The new energy values keep pacing the same or slightly better (≤ 0.6 min) with **8× fewer Manage taps** (6.7 → 0.83 per 10 min).
- They also make unmanaged play stronger, so the asleep keep drops to 15%. That restores the active/idle gap: seller15 ratio at F21 1.59 → 1.67, L25 gap 18.2 → 23.8 min (old energy: 21.0). AC-W3 still passes (seller15 L25 86.0 < 90.8; cheapest 100.8 < 109.8). Keep 0.10 was rejected: only 1.3 min ahead of no workers.
- v1.0's AC-W5 fails by design under a 15 min drain (≤ ~1 per 10.5 min).
AC check (§8.4, at keep 0.25; keep 0.15 only changes unmanaged runs):
| AC | Result |
|---|---|
| AC-W1 | PASS: 98%, F18 30.7 |
| AC-W2 | PASS: +0.8 / +1.0 (edge) |
| AC-W3 | PASS at 0.15 |
| AC-W4 | PASS: 5.8, F25 62.2 |
| AC-W4b | PASS: 7.8 (thin) |
| AC-W5 (reworded) | PASS: 1.25 / 15 min |
| AC-W6 | PASS: 6.0 min, +45% |
| Active/idle metric | ≥ 1.5: seller15 1.67, cheapest 1.86, casual 2.84, slow 2.88 (keep 0.15) |
Caveats:
- Managed runs assume an attentive player who taps Manage as soon as a bar shows Tired.
- §8.4's managed numbers were run at keep 0.25. Keep 0.15 was only run unmanaged, but managed play doesn't let the Grader sleep, so it should not change.
- Engineering's current balance.json has the v1.0 values (6 s / 50%). Engineering needs a balance-only change.
