# M4 "Manage" proposal — Head of Product → CEO
v1.0 · 2026-10-16 · status: **for CEO approval** (cap was Mon Oct 19 12:00)
Sources (only): `product/research/active-play-study.md` (ranking + M4 cut approved by CEO), `product/m4-active-checks.md` (Economy, 8 checks), `product/research/slices/{collection,market,upgrades,workers}.md`, `product/market/queue-visibility-spec.md`, `art-ux/m4-timed-collectible.md`, `decisions.md` entries dated 2026-10-16. No number here is new; each traces to one of these. Values marked *(slice proposal)* have not been simulated by Economy on their own.

---

## 1. Goal and problem
- **Problem (Vadim playtest):** by about Farm L10 the game plays itself. One Farm button decides everything, and workers (Market Hand F3, Coop Hand F7, Hawker F8) automate collecting and selling; by L10 the player's only role is Refill (study §2).
- **Measured:** once workers are hired, active play earns **1.00× idle** at F10, F18 and F24. Workers already sell the whole supply and demand is ≈1.2× supply, so any active premium has to come from M4 mechanics (checks headline).
- **Goal:** make choices matter again (split tracks that bottleneck each other, milestones) and give a present player a bounded edge: **optimal sustained active play earns 1.5–2.0× idle, never above 2.0×, over a 10-minute window** (CEO, decisions 12:51) — without slowing the idle / never-user player below M4 AC7.

## 2. Scope (M4)
### 2.1 Three tracks: Farm / Hens / Egg value (must-have)
- **Farm:** coop capacity, queue slots, market size, coop looks, worker unlocks (F3/F7/F8), Grader tier gates, the Hens and Egg value caps. **Demand follows Farm.** Farm itself is never gated.
- **Hens:** production. Cap **H ≤ F+3**. Cost **30 × 1.30^H**.
- **Egg value:** price. Cap **V ≤ F+3** (new gate from Economy check 1). Cost **40 × 1.33^V**.
- Collection stays a separate track; Grader stays a worker, not merged (decisions 12:37).
- **Migration (v5→v6):** Hens and Egg value set equal to the current Farm level (identity split; decisions 12:37, upgrades §9).
- Why: upgrades.md §7.1 costs as written (60×1.30^H, 80×1.33^V) FAIL — Egg value-first dominates and the farm stalls at F4 (0/30 seeds reach L18). The tuned values pass (§5).

### 2.2 Milestones within each track + Balanced-farm bonus
- **Hens:** H10 / H20 / H30 laying boost ×1.25 / ×1.5 / ×2 eggs/s *(slice proposal, upgrades §7.2)*.
- **Egg value grades:** V5 "Grade A" ×1.1, V10 "Large" ×1.25, V20 "Jumbo" ×1.5; Jumbo gated at F15; grades stack with the Grader (modelled by Economy).
- **Farm:** keeps coop looks F5/F10/F20 and the queue steps (queue-visibility QV-7/QV-11 callouts).
- **Balanced farm:** all three tracks ≥ 5/10/15/20/25 → +10/+15/+20/+25/+30% income (upgrades §7.3; on in Economy's runs).
- UI: Art & UX Option A — one 3-row Farm screen plus a "Balanced farm N/5" strip (upgrades §8).

### 2.3 Golden egg pop-up (must-have)
- 30 s despawn (Idle 0–20 s, Warning 20–27 s, Urgent 27–30 s, fade to 30.3 s; art-ux §3). 8 spawn spots per layout at 360/375/1280, live-rect check before each spawn (art-ux §2).
- From F8, every 2–5 min (Economy's model, check 5).
- Outcomes: **Frenzy = ×2 sale price for 30 s** (replaces ×7/×3 laying, which is mostly wasted against demand); **cash payout computed on income including the Grader**.
- **No offline spawns, no backlog** (collectible spec §4.1). Lifetime and spawn timer pause while a menu/sheet/modal is open or the tab is hidden (art-ux §6).

### 2.4 Cooldown ability per worker + Activate-all
- One ability per worker with an Activate-all button (IMT model; PM Workers' #1).
- Economy's modelled values: 30 s active per 5 min cooldown — Coop Hand ×2 speed, Hawker ×2 demand, Grader +50% share (check 6).
- Gate met: the never-user (no-ability) run makes M4 AC7 (18.25 min).

### 2.5 Collect streak
- Steady Collect tapping builds a decaying multiplier, **cap 0.30, applied to price** (not laying, which is demand-capped). Raising the cap from 0.25 to 0.30 is what puts the full stack inside the 1.5–2× band at F24.

### 2.6 Per-worker Pause/Resume (must-have, spec approved)
> **SUPERSEDED 2026-10-24 by `product/workers/m5-worker-pause-spec.md` v1.0** (PM Workers, D-HOP-2026-10-24-04 item 9). The 0.5× recovery below (also in §6 and PA-1–PA-3) is replaced by the locked **0.25× drain (+1%/36 s)** from decisions.md:9. A paused Grader gives a 0% bonus.
- Paused worker: no output, no wage, energy recovers at **half the drain rate** (~1% per 18 s). Resume returns to current energy state. Does not touch the Refill cooldown; Focus mode is kept across pause.
- Pausing every worker allowed ("All workers paused" banner; Refill tired (N) hidden).
- **Offline: workers produce zero**; only the pause state is saved.
- Control: 44px Pause/Resume toggle per worker card, aria-label, 2 s debounce (workers §3).

### 2.7 Market: completion bonus and focus
- `complete_bonus_share` = **0.05** on the sale that completes an order before timeout (workers earn it too; neutral on the ratio).
- **Focus premium ≤ 10%, manual per-card taps only** (0% on worker sales). Market Hand: **Bulk** default (whole queue every 1 s, no premium); **Focus** one customer every 2 s at +5%, 1.5× energy drain, 30 s mode-switch cooldown (decisions 12:35).

### 2.8 The +12% moves to Egg value
- Collection's +12%/level price bonus sits on Egg value (option A). Ratio identical either way; option B fails casual once tuned. Confirmation with PM Collection was set for Thu Oct 22 (decisions 12:37); Economy's result now supports A.

## 3. Out of scope / later
- **Later (M5+):** VIP big-order (bulk buyer) customer, short goals (mini-goals), coin-bought queue slot, achievement multiplier, prestige (after M4, where steps exceed 10 min from about L23–25).
- **Dropped:** unserved-customer penalty (reputation and fee variants); Sell-all combo (it rewarded checking in *less* often).
- **Not in M4:** queue-visibility copy QV-1–27 ships in rc2, before M4. Ads/payments: M4 Phase 1 has no ad code (decisions 08:31).

## 4. Tunables
| Tunable | Value | Source |
|---|---|---|
| Hens cost | 30 × 1.30^H | checks §1; decisions 13:00 |
| Egg value cost | 40 × 1.33^V | checks §1; decisions 13:00 |
| Hens cap | ≤ F+3 (max 30) | decisions 12:37; upgrades §7.1 |
| Egg value cap | ≤ F+3 (max 30) | checks §1; decisions 13:00 |
| Egg value price | (1.00 + 0.05V) × (1 + 0.12V) × grade × Grader | upgrades §7.1; checks §7 (A) |
| Hens milestones | H10/20/30: ×1.25/×1.5/×2 eggs/s | upgrades §7.2 *(slice proposal)* |
| Egg grades | V5 ×1.1, V10 ×1.25, V20 ×1.5 (Jumbo needs F15) | upgrades §7.2–7.3; checks method |
| Grader top end | Jumbo ×1.5 × T5 ×4.0 = ×6.0, from F24 | checks §7 |
| Balanced farm | all ≥5/10/15/20/25 → +10/15/20/25/30% income | upgrades §7.3 |
| Golden egg lifetime | 30 s (warn 20 s, urgent 27 s) | art-ux §3; study §6 |
| Golden egg cadence | every 2–5 min from F8 | checks §5 (Economy model) |
| Golden egg hit / visual | 56 px / 40 px | art-ux §1 |
| Frenzy | ×2 sale price, 30 s | checks §5; decisions 13:00 |
| Golden egg cash | based on income incl. Grader | checks §5 |
| Ability | 30 s per 5 min; Coop Hand ×2 speed, Hawker ×2 demand, Grader +50% share | checks §6 (Economy model) |
| Streak cap | 0.30, on price | checks §6; decisions 13:00 |
| Pause recovery | 0.5× drain rate (~1%/18 s); 2 s toggle debounce | workers §3 |
| complete_bonus_share | 0.05 | decisions 12:35; checks §2 |
| Focus premium (manual) | ≤ 10% | decisions 12:35 |
| Market Hand Focus | +5%, 1 customer / 2 s, 1.5× drain, 30 s switch cooldown | decisions 12:35 |
| Market Hand min wait | 2 s | decisions 12:40 (F1) |
| Offline rate | 0.25 (0.15 if session 3 trips the trigger) | decisions 12:45 |

## 5. Pacing evidence
**Targets:** M4 AC7 — greedy best-ROI buyer reaches L18 within ±10% of the F1 time; Economy's own F1 run gives **19.75 min**, so the band is **17.8–21.7 min**; level at 30:00 in L18–22; no dead zone > 3 min (decisions 12:42). Active vs idle **1.5–2.0×, ≤ 2.0×, over 10 min** (CEO 12:51).
**Method:** 30 Monte Carlo seeds; 600 s windows at F10/F18/F24 with H = V = F, C = F−3, all workers hired. Ratios are optimal / seller15 / casual.

| # | Check | Active/idle (optimal F10/F18/F24) | Result |
|---|---|---|---|
| 1 | Three tracks + AC7 | 1.00/1.00/1.00; tuned A: seller15 t18 **18.25 min**, L@30 21, max gap 2.5 min; casual 24.0 min, L@30 20 | PASS with tuning (§7.1 costs FAIL) |
| 2 | Completion bonus 0.05 | 1.00 everywhere; +5% income for both ($331 → $348/s at F18) | PASS (neutral) |
| 3 | Focus vs Bulk | 1.00–1.05 | PASS; both viable; weak lever |
| 4 | Pause exploit | pause/never 1.000 optimal; casual 0.97–0.99 (10 min), 0.85–0.96 (30 min) | PASS, no exploit |
| 5 | Golden egg (pre-tuning, ×7 laying) | 1.21/1.17/1.03 | PASS cap; Frenzy moved to price |
| 6 | Ability + streak, full stack | cap 0.25: 1.53/1.57/**1.46**; **cap 0.30: 1.58/1.62/1.51**; stress 0.40: max 1.73 | Cap PASS; band PASS only at 0.30 |
| 7 | +12% on Egg value (A) vs Collection (B) | 1.00 (A = B) | PASS; use A (B fails casual) |
| 8 | Offline (context) | active ÷ offline 6.6–24× at 0.25; 11–41× at 0.15 | Info; session 3 decides |

- Highest ratio anywhere: **1.73×** (stress). Never-user pacing: the no-ability run (18.25 min) is inside the band.
- Lucky at 90 s in the full stack gives 1.48–1.60 (Economy note).

## 6. Edge cases
1. **Migration:** a v5 save at Farm F loads with H = V = F; next purchases are priced at level F on three curves — Economy to check the first 10 min after migration. A refund applies only if a track max is below the old Farm max (none under the current max 30).
2. **Caps:** buying Farm raises both caps by 1; at H = F+3 or V = F+3 the row shows locked with the reason. A migrated save never exceeds a cap (H = V = F).
3. **Golden egg with no valid spot** (e.g. a 75dvh sheet at 360/375 blocks all 8): spawn deferred (M4-AC16).
4. **Golden egg + menu / hidden tab:** lifetime and spawn timer pause; resumes at the same age. Background ≥ 60 s or reload removes it silently, no reward; no catch-up offline.
5. **Frenzy while hidden:** runs on wall-clock time and just ends; offline eggs are never multiplied. A second frenzy refreshes, never stacks.
6. **Frenzy + streak + ability + focus stacking:** must stay ≤ 2.0× (max seen 1.73×).
7. **Ability while a worker is paused, tired or asleep:** to be specced by PM Workers (ability acts only while the worker is active).
8. **All workers paused:** banner shown, Refill tired (N) hidden, no wage.
9. **Pause + Focus:** mode kept on resume; Pause doesn't touch the Refill cooldown.
10. **Before F8:** no Coop Hand, idle income ≈ 0, ratios unbounded — not a failure.
11. **Clock change:** a negative delta counts as 0 elapsed (collectible spec §4.5, E13).
12. **Completion bonus:** applies only to the sale that completes an order before timeout, for player and worker sales alike.

## 7. Draft testable ACs
**Tracks (TR)**
- TR-1 Hens cost at level L = 30 × 1.30^L; Egg value = 40 × 1.33^L, read from economy.csv/balance.json (no code constants).
- TR-2 Hens and Egg value can't be bought above F+3; the row shows locked with the reason.
- TR-3 Demand follows Farm only; buying Hens or Egg value doesn't change customer interval or order size.
- TR-4 A v6 save at Farm F migrates to v7 with H = F and V = the lowest level whose price is at least the v6 price (amended 14:15 per Economy). After migration, eggs/s and price are >= their pre-migration values at every Farm level. eggs/s matches exactly at F<10, before any Hens milestone applies. Price may rise because the +12% moves to Egg value. A v5 save is migrated through v6 first. Tests use v5 and v6 fixtures. (amended 2026-10-16)
- TR-5 M4 AC7: greedy best-ROI buyer reaches L18 in 17.8–21.7 min (30 seeds, median), L@30 in 18–22, no gap > 3 min.
- TR-6 +12%/level price sits on Egg value.
**Milestones (MS)**
- MS-1 Hens and grade multipliers apply exactly at their thresholds; Jumbo needs F15.
- MS-2 Balanced-farm tiers apply only when all three tracks meet the tier; the N/5 strip shows the next tier.
**Golden egg (GE)** — Art & UX M4-AC5/15/16/22/25/26 hooks stand.
- GE-1 Despawns at 30 s; states at 20.0/27.0/30.0 s ±1 tick (M4-AC5).
- GE-2 Frenzy multiplies sale price ×2 for 30 s and leaves laying unchanged.
- GE-3 Cash payout uses income including the Grader.
- GE-4 No spawns or rewards for time offline; on-screen egg removed on ≥ 60 s background or reload.
- GE-5 Ratio check: with the full stack, optimal active/idle at F10/F18/F24 within 1.5–2.0×.
**Ability (AB)**
- AB-1 Each hired worker has one ability with duration and cooldown from config; Activate-all fires every ready ability.
- AB-2 A player who never uses abilities meets TR-5.
**Streak (ST)**
- ST-1 Streak multiplier applies to sale price only, never exceeds 0.30, and decays when tapping stops.
**Pause (PA)**
- PA-1 Paused worker: zero output, zero wage, energy +0.5× drain rate.
- PA-2 Offline: workers produce zero; pause state persists across reload.
- PA-3 Toggle 44px, aria-label, 2 s debounce; "All workers paused" banner when all are paused.
- PA-4 Pausing never beats never pausing (casual and optimal models).
**Market (MK)**
- MK-1 Completing an order before timeout pays +5% on the completing sale (player or worker).
- MK-2 Focus premium ≤ 10%, manual taps only; 0% on worker sales.
- MK-3 Market Hand Focus: one customer / 2 s, +5%, 1.5× drain; mode switch cooldown 30 s.

## 8. Telemetry events
- `worker_paused` / `worker_resumed` {worker_id, energy, paused_duration_s} — specced (workers §3).
- `collectible_expired` {reason, incl. `offline`} — specced (collectible spec §4.3).
- **Proposed (fields to be agreed with Engineering):** `track_purchase` {track, level, farm_level, cost}; `milestone_reached` {track, milestone}; `balanced_bonus_reached` {tier}; `collectible_spawned` / `collectible_collected` {spot, outcome, payout}; `frenzy_started` / `frenzy_ended`; `ability_activated` {worker_id, via_activate_all}; `streak_peak` {value}; `order_completed_bonus` {amount, by_worker}; `market_mode_changed` {mode}; `save_migrated` {from, to}.
- Derived metric for live checks: active/idle $/min over 10 min, reported alongside AC7 (study §4 Q2).

## 9. Owners
| Area | Owner |
|---|---|
| 3 tracks, migration rules, milestones, Balanced bonus | PM Farm Upgrades |
| Golden egg, collect streak, +12% move | PM Collection |
| Cooldown ability + Activate-all, Pause/Resume, Market Hand modes | PM Workers |
| Completion bonus, focus premium | PM Market |
| All numbers, economy.csv, AC7 and ratio sims | Economy/Balance Designer |
| 3-row Farm screen, milestone strip, golden egg assets/SFX, ability and pause UI | Head of Art & UX |
| Build, v5→v6 save migration (~2 days + tests), telemetry | Head of Engineering |
| Test plan per AC, pacing and ratio checks in CI, migration tests | Head of QA |
| Spec integration, decisions log | Head of Product |

## 10. Risks and open items
1. **Farm Upgrades bot re-check:** under A the greedy bot leaves Collection at ~2 and Hens at ~11 (tap size caps supply); a Collection-aware bot would be faster. Re-run with PM Farm Upgrades' bot set before the numbers lock.
2. **3.25 min purchase gap already in the F1 baseline** (3.7 min casual) — AC7's "no dead zone > 3 min" is borderline today. Decide: accept, or treat as a pre-existing F1 item.
3. **Ratios only meaningful from Farm 8** (no Coop Hand before F7; idle ≈ 0).
4. **Save migration v5→v6:** first 10 min after migration unchecked; refund in migration vs modal and silent vs explainer still open (upgrades §9 b/c). If M4 lands after F1, the migration uses the F1 table.
5. **Engineering and QA must confirm buildable / testable before kickoff.**
6. **Spec drift:** the collectible spec v0.2 and Art & UX v1.0 still carry Frenzy as 3× eggs for 20 s ("Frenzy! 3× eggs", pill "3× 0:20") and a 90–180 s gap; they must be updated to ×2 price for 30 s and Economy's 2–5 min cadence.
7. **Prompt fatigue:** golden egg + abilities + Refill + streak may be too many prompts on desktop; consider a per-session cap.
8. **Monetisation stacking:** an all-boost player may be at most 35% ahead at 30 min (decisions 08:31) — not yet modelled with M4 mechanics.
9. **Offline 0.25 vs 0.15:** higher Egg value prices raise offline income ×1.4–1.7 vs F1; session 3 decides.
10. Milestone multipliers and Balanced tiers are slice proposals modelled only inside Economy's stack; per-mechanic values for ability per worker type need PM Workers' spec.
11. Scope: M4 starts only after rc1 (decisions 08:31).

## 11. Rough sequencing (after rc1)
1. Economy re-check with PM Farm Upgrades' bots; Engineering + QA buildability/testability sign-off; CEO approval → kickoff.
2. **Foundation:** v5→v6 migration + 3 tracks + caps + new costs + the +12% move (gates everything else; AC7 re-run).
3. **Milestones + Balanced bonus** (S, ships with the split) with the 3-row Farm screen.
4. **Market:** completion bonus + focus/Bulk (small; already decided).
5. **Pause/Resume** (S, spec approved).
6. **Golden egg** with Frenzy on price (assets due Tue Oct 20).
7. **Ability + Activate-all**, then **streak** last, with the full-stack ratio check (target 1.51–1.62× at cap 0.30).
8. QA combined pass: AC7, ratio band, migration, offline, reduced motion.

## 12. Queue-leave penalty (CEO, M4 scope, 2026-10-16) · PM, Market/Customers
Brings back a small, tunable penalty (earlier dropped for M1, decisions.md 2026-10-16 12:35). Sim: `product/market/sim/mechanics_sim.py`, variant "M4 pen05+done05".

### Rule
- When a customer **times out not fully served**, the player loses `leave_penalty_share` × the **remaining** order value: penalty = round_half_up(`leave_penalty_share` × (N − filled) × unit price at the moment of timeout, 2 dp). For a never-served customer that's the full order; for a partly served one only the unfilled part. Default `leave_penalty_share` = **0.05** (config, `customers` block; 0 disables it).
- Coins never go below 0: the deduction is min(penalty, coins).
- It never applies: offline (the queue is frozen, nothing times out); when the basket is empty at the timeout (the player couldn't have served); to customers lost to a full queue (they never joined).
- Shown as a small grey "−$X" on the leaving card (same placement and duration as the timeout leave animation; not the gold pop). Nothing shown when the penalty is $0.

### ACs (MK-27 onward)
- MK-27 A customer who times out with filled < N while basket ≥ 1 egg deducts exactly round_half_up(`leave_penalty_share` × (N − filled) × unit price, 2 dp) from coins, at the timeout tick.
- MK-28 Coins after the deduction are max(0, coins − penalty); the deducted amount equals what's shown and logged.
- MK-29 No deduction when: basket < 1 egg at the timeout; the customer was lost to a full queue; the game is closed (offline); `leave_penalty_share` = 0.
- MK-30 The leaving card shows a grey "−$X" (X = the deducted amount, after the coins-floor) for the length of the leave animation; nothing when X = 0. Reduced motion: static text, same duration.
- MK-31 A customer who completes their order in the same tick as their timeout pays no penalty and gets the completion bonus (sale processed first, see edge cases).
- MK-32 Telemetry `customer_left` is emitted once per customer that leaves or is turned away: `{reason: "timeout" | "served" | "full_queue", penalty}` (penalty = cents deducted, 0 for served and full_queue).
- MK-33 All values come from config; with `leave_penalty_share` = 0 the game behaves exactly as M1 (same seed → same coins and events, apart from `customer_left` with penalty 0).

### Telemetry
`customer_left {reason: timeout|served|full_queue, penalty}` (cents). Existing `customer_lost` / `customer_partial` / `customer_served` stay for continuity; `customer_left` is the single per-customer exit record for KPIs (served %, lost-customer rate, penalty $/session).

### Edge cases
- **Hidden-tab catch-up (≤ 60 s simulated on return):** timeouts during catch-up apply the penalty normally (it's online time) using the basket at that simulated tick; the "−$X" cards aren't replayed, one summary is fine ("Customers left: −$X" in the Market panel for that catch-up).
- **Coins at 0:** penalty deducts 0, shows nothing ("−$0" never shown), logs penalty 0.
- **Rounding:** one half-up rounding to cents per penalty, on the full product; never fractions of cents carried.
- **Timeout in the same tick as a sale:** player input received before the tick's timeout check is applied first (feature-spec edge case 4). If that sale completes the order → served, no penalty, completion bonus. If it's partial → the customer then times out and pays the penalty on the new, smaller remainder.
- **Basket ≥ 1 but less than remaining:** penalty still applies (the player could have sold some); it's on the full remainder.
- **Price change mid-order:** unit price at the timeout tick (sale-time rule, Q3).
- **Workers:** Market Hand timeouts count like the player's (its whole-queue serve makes them rare).

### Sim (mechanics_sim.py, economy.csv live, 20 seeds, medians; AC7: L10 8–12 min, L18 24–36 min)
| Seller | Variant | L10 | L18 | L20 | $/min 0–10 | $/min 10–30 | lost full % | timeout % |
|---|---|---|---|---|---|---|---|---|
| 5 s | base | 9.0 | 27.0 | 36.8 | 956 | 4,561 | 15.3 | 0.2 |
| 5 s | complete 0.05 | 8.6 | 25.8 | 35.1 | 1,068 | 4,961 | 15.1 | 0.1 |
| 5 s | **penalty 0.05 + complete 0.05** | 8.6 | 25.8 | 35.1 | 1,067 | 4,961 | 15.1 | 0.1 |
| 15 s | base | 9.2 | 27.2 | 37.2 | 909 | 4,502 | 15.6 | 0.2 |
| 15 s | complete 0.05 | 8.8 | 26.0 | 35.5 | 1,022 | 4,898 | 15.5 | 0.3 |
| 15 s | **penalty 0.05 + complete 0.05** | 8.8 | 26.0 | 35.5 | 1,022 | 4,898 | 15.5 | 0.3 |
| 30 s | base | 10.0 | 32.0 | 46.0 | 784 | 3,337 | 35.5 | 0.7 |
| 30 s | complete 0.05 | 9.5 | 30.5 | 44.0 | 899 | 3,607 | 36.0 | 0.6 |
| 30 s | **penalty 0.05 + complete 0.05** | 9.5 | 30.5 | 44.0 | 899 | 3,606 | 36.0 | 0.6 |
**Effect:** the penalty costs ≤ $1/min (< 0.1%) and doesn't move any level time, because timeouts are rare (0.1–0.7%; customers are lost to a full queue first, and those aren't penalised). The completion bonus drives the change: +12% early income, L18 −1.2 min (5 s: 27.0 → 25.8, matching Economy's re-sim), within AC7. Worker variants (Market Hand) not simulated here; Economy's AC-W re-sim covers the F21 ratio.
**Implication:** at 0.05 the penalty is a readability signal ("you let a customer go"), not an economic lever. If the CEO wants it felt, the lever is its visibility, not a bigger share; a larger share mostly hits the 30 s seller, and only after a timeout. No change to the default proposed.

### MK-33a — Penalty only when attended (approved by Head of Product, Oct 16, 2026)
- The leave penalty applies only if, at the moment the customer leaves, the player made any input (tap, sell, or upgrade) in the last 30s, OR Market Hand is awake. Otherwise penalty = 0.
- Telemetry: customer_left {reason, penalty, attended}.
- Must ship in the same build as the workers coop-asleep 0.20 share (see workers/coop-full-unmanaged-proposal.md v0.6, AC-CF3).
