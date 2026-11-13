# Customer type roadmap: DRAFT for review (not a build spec)
PM, Market/Customers · v0.2 · 2026-10-16 · status: **draft; Head of Product decisions applied (v0.2)**. No number here is approved; every default is a proposal for Economy to own and re-sim.
Builds on: `product/research/slices/market.md` (§1a, 1c, 1e, 2: sources [HD-V], [CC], [AC]), `product/m4-manage-proposal.md` (§1 problem, §2.3 golden egg, §2.7 market, §3 "Later (M5+): VIP big-order customer, short goals", §12 leave penalty). Quick sim: `product/market/sim/roadmap_sim.py` → `roadmap_table.md`.

## v0.2 changes (Head of Product, 2026-10-16 22:43)
1. **Golden customer dropped.** The queue-strip golden idea (golden egg occasionally spawning as a customer at the end of the queue strip) is an **M4.x backlog note for PM Collection** (golden egg owner); logged in decisions.md. §2 kept only as the record.
2. **Mini-goals count manual serves only** (per-card taps and Sell all; never Market Hand).
3. **Bulk buyer unlocks at F6.**
4. **Points ladder after M5.**
5. **Mini-goals capped at ≤ 15% income/min** (alone, vs the M4 baseline, for the 5/15/30 s sellers). Retuned defaults in §3/§4.
6. **Economy must re-sim on the full M4 stack (workers, streak, abilities, golden egg, completion bonus, leave penalty) before any default here is approved.**

## 0. Why: the problem these address
- **The game plays itself by L10** (Vadim; critic rc1-pt1 T7): Market Hand (F3) sells the whole queue every 1 s, so from ~L8 the only inputs are Buy and Refill. Measured (M4 §1): active play earns **1.00× idle** at F10/F18/F24 once workers are hired.
- **The market is the bottleneck:** demand ≈ 1.2× supply, but the queue cap (P1q min(10, 6 + floor(F/5))) loses ~15% (fast sellers) to 36% (30 s seller) of arrivals to a full queue (mechanics_table). Big baskets after a break have nowhere to go (S2-3a).
- **Target band (CEO):** optimal sustained active play 1.5–2.0× idle over 10 min, never above 2.0×, without slowing the idle player below M4 AC7. All three types below are **active-only** (worker-proof by design), which is the only way they add to the ratio at all.

## 1. Bulk buyer (Hay Day visitor style)
**Goal / player problem.** Gives a big basket a use and a reason to look at the market after a break or a production burst; a decision ("sell my stock to the bulk buyer now, or keep it for the queue?").
**Reference.** Hay Day visitors ask for ~⅓–½ of your stock of an item and pay 1.7–2.2× base; max 2 at once; wait until accepted/declined; unlock XP L2 [HD-V].
**Behaviour (proposed).**
- Trigger: random timer while online, from **F6** (after Market Hand, so it lands when the queue starts automating).
- Frequency: every U(150, 270) s (≈ 1–3 per 8-min session, research §2), one at a time, **outside the queue** (own slot above the strip; doesn't count toward queue_max).
- Order: fixed at arrival = clamp(round(0.4 × basket), demand_max(F), 4 × demand_max(F)); pays **1.5×** unit price (sale-time price). All-or-nothing, one tap ("Sell 240 · +$X"); waits 60 s, then leaves with no penalty.
- **Workers:** Market Hand never serves it (tap-only; the point is presence). Focus mode ignores it.
- **Offline:** none spawn; a visible one at close is discarded on return (no backlog). On return, the first bulk buyer can arrive after the normal timer (it doesn't fire immediately — avoid a guaranteed offline payout).
**Tunables.** `bulk_unlock_farm` 6 · `bulk_interval_s` [150, 270] · `bulk_share_of_basket` 0.4 · `bulk_min_mult` 1 × demand_max · `bulk_max_mult` 4 × demand_max · `bulk_price_mult` 1.5 · `bulk_wait_s` 60 · `bulk_max_concurrent` 1.
**Milestone / size.** M5 (M4 §3 already lists it as Later). **M** (≈ 2–3 days: spawn/state, own card, save field, copy, tests), plus Art & UX card variant (S).
**Needs from Economy.** Price multiplier and share vs the 2.0× ceiling; whether stock-scaling lets a player farm it by hoarding (wait with a full basket) — the 4× demand_max cap is my guard; confirm.
**Risks / edge cases.** Hoarding (cap above); basket < order → button disabled "Need N more" (MK-35 rule applies: never offer more than you have); arrives with empty basket → order = demand_max, still shown; coexists with a full queue (it's outside); Sell all does **not** include it (explicit tap); hidden tab → its 60 s wait pauses like the golden egg (art-ux §6); level-up mid-wait keeps the order and multiplier, price at sale time.
**Telemetry.** `bulk_buyer {phase: spawn|served|left, n, price_mult, value, basket_at_spawn, farm}`.
**Sim (no workers, M4 baseline done05).** $/min L10–30: 5 s seller +1%, 15 s +1%, **30 s +15%** (L18 30.5 → 28.5 min). It mostly helps the infrequent checker (big basket) — good for S2-3a, small for the "active edge". 15 served, 0 missed per hour.

## 2. Golden "market rush" customer: DROPPED (v0.2; queue-strip idea → M4.x backlog, PM Collection)
**Goal.** A short, rare reason to be present on the market screen; a burst that rewards attention.
**Reference.** Golden cookie: spawns every 300–900 s (avg ≈ 447 s), on screen 13 s; ~40% Frenzy = 7× production for 77 s [CC].
**Overlap warning.** M4 §2.3 already ships a **golden egg pop-up from F8, every 2–5 min, with Frenzy = ×2 sale price for 30 s**. A golden customer with a ×2 price rush is the same reward on a second spawner. **Recommendation: don't build a separate one.** Either (a) make it a market-side *skin/spawn location* of the golden egg (the golden egg sometimes arrives as a customer in the queue strip; same timer, same outcome table), or (b) drop it. Below assumes (a), so it adds no new economy.
**Behaviour (if (a)).**
- Trigger: the golden egg's existing spawn roll; share `golden_customer_share` 0.3 of spawns appear as a golden customer at the end of the queue strip instead of a field spot.
- On screen 30 s (golden egg timings); tap → Frenzy ×2 price 30 s (unchanged).
- **Workers:** Market Hand never taps it; sales during Frenzy by workers do get the ×2 price (as M4 golden egg — Economy's model).
- **Offline:** no spawns, no backlog (collectible spec §4.1); pauses when hidden or a sheet is open.
- Full queue: it still appears (occupies the strip's end, not a queue slot).
**Tunables.** `golden_customer_share` 0.3 (rest from M4: unlock F8, interval 2–5 min, frenzy ×2 / 30 s, life 30 s).
**Milestone / size.** M4.x or M5 after the golden egg ships. **S** (reuse spawner/outcomes; new chip art state + placement in strip).
**Needs from Economy.** Nothing new if (a). If made separate, it must be re-simmed with the golden egg (stacked ×4 price would break the 2.0× cap).
**Risks / edge cases.** Two golden things on screen at once (forbid: one roll, one location); 360 strip has 4 cards + "+N" chip — golden customer replaces the last visible card position (Art & UX); reduced motion; Frenzy while basket empty (still consumed — show "Sell during the rush!" hint).
**Telemetry.** Golden egg events with `{location: field|queue}`.
**Sim (standalone ×2/30 s rush, 13 s window, every U(120,300) s from F8).** $/min L10–30: 5 s +21%, 15 s +19%, 30 s +7% (caught 6/14 per hour). L18 −1 to −2.5 min. This is the golden egg's effect counted again — further evidence not to stack them.

## 3. Rolling mini-goals (AdVenture Capitalist style)
**Goal.** A short, always-present target for the active player in the L8+ stretch ("serve 10 customers"), giving the market a purpose when workers automate it.
**Reference.** AdVenture Capitalist event goals: claimed goal replaced immediately, goals scale with current income, points → reward ladder [AC]; Hay Day truck milestones after N orders [HD-T].
**Behaviour (proposed).**
- Trigger: from **F5**, one goal visible at a time on the Market panel header, e.g. "Serve 10 customers fully" / "Sell 300 eggs" / "Fill 3 orders before they wait 10 s". Goal sizes scale with level (demand/interval from economy.csv).
- Frequency: a new goal **120 s after the claim** (cooldown keeps it ~2–4 per session, research §2); claim is a tap (no auto-claim).
- Payoff: **12 s of current production at current price** (v0.2 retune for the ≤ 15% cap) (Economy to re-express as a share of income).
- **Workers:** only **manual** serves count (per-card tap or Sell all), not Market Hand — otherwise it completes itself and becomes idle income.
- **Offline:** progress frozen; no goal completes offline; an unclaimed reward stays claimable on return.
**Tunables.** `goals_unlock_farm` 5 · `goal_cooldown_s` **120** · `goal_serve_count` **10** · `goal_reward_production_s` **12** (v0.2) · `goal_counts_workers` false.
**Milestone / size.** M5 (M4 §3 "short goals"). **M** (goal templates, progress, claim UI, save, copy; ≈ 3 days). Points ladder: **after M5** (v0.2 decision), L.
**Needs from Economy.** Reward size vs 2.0× ceiling (sim below shows it's the strongest of the three); scaling templates per level; interaction with complete bonus (both reward full serves).
**Risks / edge cases.** Manual-only rule must be clear in copy ("Serve 10 customers yourself"); if Market Hand serves everyone instantly the goal is unreachable at high F → goal must pause Market Hand? No — give the player Focus/Pause (M4 §2.6/2.7) as the lever, and pick templates that are reachable alongside the worker (e.g. "Sell 300 eggs by tapping"); goal unreachable at empty basket (never time-limited, so it waits); level-up mid-goal keeps target; claim while a toast shows (queue it, never stack — same rule as QV celebration).
**Telemetry.** `mini_goal {phase: shown|progress|completed|claimed, template, target, reward, farm, time_to_complete_s}`.
**Sim (10 full serves → 20 s production, 90 s cooldown, no workers so all serves count).** $/min L10–30: 5 s **+29%**, 15 s +30%, 30 s +28%; L18 −3 to −4 min; ~32 goals/hour. First try (5 serves, 30 s reward, no cooldown) was 7× income — the cooldown and size are what keep it sane.

## 4. Sim summary v0.2 (`roadmap_sim.py` → `roadmap_table.md`, 12 seeds, medians, no workers, M4 complete_bonus 0.05 baseline)
Mini-goal retune grid (Δ $/min L10–30 vs baseline, 5/15/30 s): 20 s reward / 90 s cd = +29/+30/+28% (v0.1, fails); 10 s/120 s = +10.9/+10.8/+11.1%; 10 s/150 s = +9.0/+9.1/+9.3%; 15 s/180 s/12 serves = +12.1/+11.9/+12.8%; **12 s/120 s/10 serves (chosen) ≈ +13%**, the largest reward with ~2 pts margin under the cap and ~1 goal per 2.5 min (≈ 3 per 8-min session).
| Seller | Variant | L10 | L18 | L20 | $/min 0–10 (Δ) | $/min 10–30 (Δ) | goals/h |
|---|---|---|---|---|---|---|---|
| 5 s | M4 base | 8.6 | 25.8 | 35.1 | 1,065 | 4,961 | – |
| 5 s | + goals v0.2 | 8.2 | 24.1 | 32.8 | 1,218 (+14.4%) | 5,614 (**+13.2%**) | 24 |
| 5 s | + bulk + goals | 8.2 | 24.1 | 32.7 | 1,229 (+15.4%) | 5,671 (+14.3%) | 24 |
| 15 s | M4 base | 8.8 | 26.0 | 35.5 | 1,022 | 4,898 | – |
| 15 s | + goals v0.2 | 8.5 | 24.5 | 33.0 | 1,151 (+12.6%) | 5,533 (**+13.0%**) | 25 |
| 15 s | + bulk + goals | 8.5 | 24.2 | 32.8 | 1,163 (+13.8%) | 5,600 (+14.3%) | 25 |
| 30 s | M4 base | 9.5 | 30.5 | 43.8 | 906 | 3,607 | – |
| 30 s | + bulk | 9.0 | 28.5 | 40.0 | 949 (+4.7%) | 4,143 (+14.9%) | – |
| 30 s | + goals v0.2 | 9.0 | 28.5 | 40.2 | 1,026 (+13.2%) | 4,098 (**+13.6%**) | 25 |
| 30 s | + bulk + goals | 9.0 | 26.5 | 37.5 | 1,065 (+17.5%) | 4,635 (+28.5%) | 25 |
Mini-goals alone stay ≤ 15% in both windows for all three sellers. Stacked with the bulk buyer: +14% (5 s/15 s) and +28.5% for the 30 s seller (the bulk buyer mostly pays the infrequent checker). The ≤ 15% cap is for mini-goals only; whether the stack fits the CEO's 2.0× active/idle ceiling is **Economy's full-M4-stack re-sim** (workers and other M4 mechanics aren't in this model).

## 5. Sequencing recommendation (v0.2)
1. **Mini-goals (M5, M)**, manual serves only, defaults 10 serves / 12 s reward / 120 s cooldown.
2. **Bulk buyer (M5, M)** at F6.
3. Points ladder after M5. Golden customer dropped (M4.x backlog note for PM Collection).
Prerequisites unchanged: M4 golden egg and Focus/Pause shipped, QV (rc2). Gate: Economy's full-M4-stack re-sim approves the defaults.

## 6. Open questions
Resolved in v0.2 (see top). Remaining: Economy re-sim result; goal templates per level (with Economy); Art & UX bulk-buyer card and goal header at 360.

## 7. rc2 queue note (MK-40+)
- **MK-40 (rc2, queued, pending `art-ux/rc2-order-sell-preview.md`, not yet in the repo):** order card aria wording from Art & UX: "**4 of 17 eggs delivered. Selling adds 13. Order worth $93.84.**" (delivered = filled, adds = k = min(basket, remaining) per MK-34, worth = full order value per MK-23). To be finalised as ACs when the Art & UX spec lands; numbering continues from MK-40.

## v0.3 (Oct 16, 2026)
- Mini-goal reward cut from 12s to 8s of production (10 manual serves, 120s cooldown unchanged), per Economy full-M4 re-sim (product/customer-roadmap-v02-m4-sim.md): goals alone +11.7/+12.0/+13.3%, combined with bulk buyer +13.1/+13.9/+35.0% (5/15/30s sellers); active/idle P95 1.79 (<=2.0x); pacing 200/200 in band.
- Proposed for review: Market Hand reserves the bulk buyer quantity instead of serving it (bulk buyer was 0 served/9 missed per hour with Hand on); add a "Need N more" hint on the bulk card. Mini-goals keep counting manual serves only; the ~9-13% pay gap from pausing Market Hand is accepted for now, to re-check after the reserve fix.
- Pre-existing gap flagged to Head of Product: a casual player with no workers ends at L17 at 30:00.

### v0.3 approved (Oct 16, 2026 23:07)
- CT-AC-1: Market Hand never sells into the bulk buyer and keeps the bulk quantity in the basket for the player; while basket < bulk quantity the bulk card shows "Need N more" (N = shortfall).
