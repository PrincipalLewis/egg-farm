# Core Loop Spec — Milestone 1 (MVP) · v1 · 2026-10-15 · Head of Product
Platform: web-first. Workers are out of scope (M2). Numbers live in `economy.md` / `economy.csv` (source of truth).

## Loop
1. **Produce** — hens lay eggs into the Coop automatically (`eggs_per_sec`), capped at `coop_capacity`.
2. **Collect** — player taps Collect; moves `min(coop, eggs_per_tap)` eggs Coop → Basket (inventory, unlimited in M1).
3. **Sell** — customers arrive every `customer_interval_s` (max queue `queue_max` = min(5, 3 + floor(FarmL/10))), each wanting N eggs (uniform `demand_min..demand_max`). Tapping a customer opens the Market panel; Sell sells `min(basket, N)` at `egg_price` each (partial fills allowed; Sell all serves queue in order), customer leaves once fully served. Unserved customers leave after 30 s.
4. **Upgrade Collection** — spend coins: +5 eggs per tap and +12% egg sale price per level.
5. **Upgrade Farm** — spend coins: +5 hens, +50 coop capacity, +$0.05 base egg price, bigger/faster customers.
6. Repeat. Progress saves locally; offline earnings per AC11.

## Starting state
Coins 0, Coop 0, Basket 0, Collection L0, Farm L0, first customer at t=10 s.

## Acceptance criteria (testable)
- AC1 Coop increases by `eggs_per_sec` per second (±1 tick) and never exceeds `coop_capacity`.
- AC2 One Collect tap moves exactly `min(coop, eggs_per_tap)`; coop never negative.
- AC3 Customers spawn at `customer_interval_s` for current farm level; queue never exceeds `queue_max` = min(10, 6 + floor(FarmL/5)) (P1q, Oct 15; was min(5, 3 + floor(FarmL/10))); demand within [demand_min, demand_max].
- AC4 Sale credits `sold × egg_price` coins (2-decimal rounding, half-up); basket decreases by `sold`.
- AC5 Upgrade button disabled when coins < cost; purchase deducts exactly the `economy.csv` cost for the current level and applies the next level's stats immediately.
- AC6 Costs/stats for levels 0–30 match `economy.csv` exactly (QA checks against the file; formulas in economy.md).
- AC7 Pacing (final, Head of Product approved 2026-10-15, economy M1-R1): Pacing measured with `product/sim/economy_sim.py` (or `python3 product/economy_sim.py`) (20 seeds, random demand, real queue/patience per AC3), Farm L reported as the median across seeds. Player model **seller15**: taps Collect 1/s, presses Sell all every 15 s, and right after each sell buys Farm if affordable; otherwise buys Collection only if its cost ≤ 50% of the next Farm cost (repeat until nothing qualifies). Targets for seller15: first upgrade ≤ 30 s; ≥ 9 upgrades by 5 min (target 10); Farm L10 reached at 10 min; Farm L18 reached at 30 min. Tolerance ±20% on times (L10 within 8–12 min, L18 within 24–36 min). Robustness, model **cheapest** (same tap/sell cadence, always buys the cheapest affordable upgrade): Farm level at 10 min and at 30 min ≥ 70% of seller15's. QA runs both models on the shipped economy.csv.
- AC8 Reload restores coins, coop, basket, both levels (state saved at least every 5 s and on upgrade).
- AC9 All numbers come from one config file (no hard-coded values in UI/logic).
- AC10 UI shows coins, coop fill (x/cap), basket count, customer queue with demand, both upgrade buttons with cost + next-level effect (Art & UX owns layout).
- AC11 Offline: after t ≥ 60 s away, the welcome-back modal shows eggs = floor(min(t,7200)×0.25×eggs_per_sec) at the saved Farm level. Collect adds exactly that to the Basket (ignoring coop cap), and the Coop is unchanged from the last save. Away > 2h gives the same as exactly 2h. Clock set backwards gives 0. The modal is never shown twice for one absence.

## Answers to Art & UX open questions (screen-flow.md)
1. **Collecting:** manual tap only in M1 (auto-collect = M2 Workers). Yes, nest/coop cap = `coop_capacity` (50 + 50×Farm L); show "Full!" at cap.
2. **Selling:** customers request a specific quantity (uniform demand_min..demand_max) at the current egg_price. Tapping a customer opens the Market panel; per-card Sell sells min(basket, N) (partial fill allowed, button shows "Sell k/N"; disabled only at 0 eggs). "Sell all" = YES, serves queue front-to-back.
3. **Upgrade list:** Collection tab = 1 row "Collect per tap" (+5/level). Farm tab = 1 row "Farm level" (bundles +5 hens, +50 coop cap, +$0.05 base egg price, faster/bigger customers; show all four in current→next). No locked/maxed rows in M1 (cap L30 → "MAX"). Farm visuals: yes, coop sprite tier changes at Farm L5/10/20; hen count on screen = min(hens, 12).
4. **Offline earnings:** YES (CEO, 2026-10-15; rate cut to 25% by CEO same day). A welcome-back modal shows time away (capped at 2h), eggs earned, and a Collect button. Eggs = floor(min(t_away, 7200 s) × 0.25 × eggs_per_sec) and go straight to the Basket, bypassing the coop cap. The modal is skipped if you were away < 60 s. **Onboarding:** YES, the 3-step overlay (collect → sell → buy first upgrade), skippable, shown once.
5. **Plots:** single farm, single coop in M1.

## Out of scope (M1)
Workers, auto-collect, offline coins/customers, multiple plots, prestige, multiple egg types, monetization, music. (SFX are IN for M1, owned by Art & UX per CEO.)

## Clarifications (Head of Product, 2026-10-15)
- AC3: Customer patience timer starts on arrival; partial sales do not reset it. Arrival timer never pauses; an arrival into a full queue is lost (logged customer_lost reason=full_queue). A customer who times out after buying ≥1 egg is logged customer_partial, not customer_lost; customer_lost covers only full_queue and timeout with 0 eggs bought (Economy M1-R1). Queue size = min(10, 6 + floor(FarmL/5)) (P1q, Oct 15).
- AC11: Closing the welcome-back modal without Collect still grants the eggs. One absence = gap between last save and next load, >=60 s; at most one grant per load.
- AC7: redefined with an explicit player model (seller15 + cheapest-first ≥70%); see AC7. Owner: Economy/Balance Designer.
- AC7-soft (non-gating, M1): casual player (random arrivals, sells every 20 s, demand -25%) reaches Farm L10 <= 15 min and L18 <= 45 min in >=80% of seeds. Owner: Economy/Balance Designer; QA tracks.
- AC3 same-tick rule (QA-RC2-1, Head of Product 2026-10-15): within one tick, process timeouts/leavers BEFORE arrivals, so a freed slot can take the arriving customer (matches build; sim to align).

> **Change, Oct 15 (Head of Product, P1q, approved for rc0):** the customer queue is now queue_max = min(10, 6 + floor(F/5)), replacing the 3/4/5 slot rule. Order size and customer interval are both halved, so demand per second stays the same. AC3's queue and slot wording follows this rule. Sources: `playtest1-resim.md`, `farm/p1q-farm-review.md`, `economy.p1q.csv`.
