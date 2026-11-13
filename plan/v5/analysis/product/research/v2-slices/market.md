# v2 research slice: customers, orders & events as active goals · PM, Market/Customers · 2026-10-24
For D-CEO-20261024-05 (Vadim's playtest: at Farm L10, once all 3 workers are bought, there's nothing meaningful left to do). Research and PM only. No code, no PRs; M4.2 stays on hold (D-CEO-20261024-04).
**Builds on** `product/research/slices/market.md` (v1, Oct 16: visitors, golden cookie, drones, boat/truck, AdCap goals, session data [GA]). This doc doesn't repeat v1; v1 tags such as [HD-T] point there. **Already approved, not re-argued here:** customer-type-roadmap v0.3 (bulk buyer at F6 paying 1.5×, CT-AC-1 hold-back, mini-goals of 10 manual serves for 8 s of production with a 120 s cooldown), completion bonus 0.05, MK-33a attended-only leave penalty, Focus ≤ 10% on manual taps.
**All numbers are proposals** for the Economy/Balance Designer to model. `economy.csv` is the source of truth, and nothing in it changes until the full-stack re-sim passes (active/idle P95 ≤ 2.0, AC7).

## 0. Why the market goes dead at L10 (grounding, product/economy.csv)
- **L10 row:** 11 eggs/s, $1.50 per egg, a customer every 2.99 s, demand 27–53 eggs (≈ 13.4 eggs/s, about 1.2× supply), queue 8. The Hawker (F8) adds ×1.25 demand.
- **Workers:** Market Hand (F3) sells the whole queue every 1 s, and Coop Hand (F7) collects.
- **Result: eggs, not customers, are the bottleneck.** Every egg sells at the base price with no input, so any market goal that just says "sell more" is already met by the workers.
- **Design consequence.** A goal still matters after automation only if it does one of these:
  - (a) asks the player to **allocate scarce eggs** between workers and a better use (hold, ship, stockpile);
  - (b) asks for **timing**, i.e. being present in a window;
  - (c) gives a **choice** between offers;
  - (d) pays in something **coins can't buy** (a long-arc track or cosmetics).
  Pure coin multipliers on worker sales lift idle play too and add nothing.
- **Rules applied to every mechanic below:**
  - Absence costs nothing: no fail penalty, no streak break, and no timer runs offline or while the tab is hidden.
  - Workers never complete the attention part of a goal.
  - Every effect is a config value, and 0 disables it.

## Sources (new in v2; all opened with WebFetch on 2026-10-24)
- [EI-C] Egg Inc Wiki, Contracts: https://egg-inc.fandom.com/wiki/Contracts
- [EI-CH] Egg Inc Wiki, Challenges (formerly Missions): https://egg-inc.fandom.com/wiki/Missions
- [SDV-Q] Stardew Valley Wiki, Quests (Help Wanted and Special Orders): https://stardewvalleywiki.com/Quests
- [HD-VAL] Hay Day Wiki, Valley (daily quests and reward track): https://hayday.fandom.com/wiki/Valley
- [HD-DBY] Hay Day Wiki, Derby: https://hayday.fandom.com/wiki/Derby
- [ACNH] Nookipedia, Nook's Cranny (daily hot item): https://nookipedia.com/wiki/Nook%27s_Cranny
- [ML] Moonlighter Wiki, Selling and Reactions (popularity): https://moonlighter.fandom.com/wiki/Selling_and_Reactions
- [CC-S] Cookie Clicker Wiki, Seasons: https://cookieclicker.wiki.gg/wiki/Seasons
- From v1 (verified Oct 16): [HD-T] truck, [HD-B] boat, [HD-E] Hay Day events, [AC] AdCap events, [CC] golden cookie, [EI-S] Egg Inc special events, [GA] session benchmarks.

---

## 1. Special orders and contracts
### Precedents
| Game | What it does | Takeaway for us |
|---|---|---|
| **Egg, Inc. contracts** [EI-C] | "Deliver as many of the specified egg as specified within a certain time limit." There are **up to 3 rewards** per contract (tiered goals), and **rewards are earned only once per contract**; replays are "for points only". It's gated: at least 1,000 (currency) and ≤ 3 contract farms active. Grades C→AAA scale goals and rewards with player strength. | Tiered goals mean partial progress still pays, which suits "no punishment for absence". Scaling the size to the player keeps the challenge alive late. |
| **Hay Day truck / boat** [HD-T][HD-B] (v1) | Truck: whole-order delivery, and an order is replaced once the truck leaves. Boat: crates over 18 h, a bonus for filling the whole boat, and **easy/medium/hard choice since Aug 2026**. | A difficulty choice adds a decision; a bonus for the full fill rewards finishing. |
| **Stardew Valley Special Orders** [SDV-Q] | Weekly board with 7–28-day orders. "Ship 100 [crop]" pays 50% of base crop price **on top of normal sale** (Crop Order). Orders **can't be cancelled; time just runs out**; partial goods are returned to Lost & Found on fail. Help Wanted: delivery pays **3× sell price**, and "there is no penalty for accepting a quest and then not completing it". | Big "ship N" orders pay a premium on top of the normal sale, and failure returns the goods. Our version: no egg is lost on expiry. |

### Proposed behaviour: "Order Board" contracts (from F10)
- **Board:** 3 offers (Easy / Medium / Hard) sit on the Market panel, and the player **picks one** to be active at a time. Unpicked offers rotate when the active contract ends.
- **Order:** "Ship N eggs in T min". N is set in **seconds of current production** (eggs/s at accept time), and T counts **online time only**.
- **Delivery needs attention:**
  - A "Ship" button moves min(basket, remaining) eggs into the contract crate, using the bulk-buyer "Need N more" pattern.
  - A **Hold for contract** toggle stops Market Hand selling (same mechanism as CT-AC-1), so eggs pile up in the basket.
  - Hold **turns itself off after `hold_attended_window_s` with no input** (MK-33a attended pattern). An absent player is never left with a stalled shop.
- **Rewards:** three tiers, as in Egg Inc.
  - Hitting 40% / 70% / 100% of N pays the tier rewards.
  - Coins on shipped eggs = delivered × unit price × `contract_price_mult` (paid once per tier at the tier's share).
  - Plus **Market Stars** (a long-arc track, §1 open Q).
- **Expiry:** no penalty. Earned tiers are kept, and eggs left in the crate go back to the basket (Stardew Lost & Found model).
- **Workers:** Coop Hand and Market Hand never ship. Only the Hold toggle and Ship taps move eggs.

### Tunables (proposals)
| Key | Proposal |
|---|---|
| `contract_unlock_farm` | 10 |
| `contract_size_s` (E/M/H) | 60 / 180 / 360 s of production (L10: 660 / 1,980 / 3,960 eggs) |
| `contract_time_s` (E/M/H) | 600 / 900 / 1,200 s online |
| `contract_tier_shares` | 0.4 / 0.7 / 1.0 |
| `contract_price_mult` | 1.25 (below bulk buyer's 1.5, because volume is larger) |
| `contract_stars` (E/M/H) | 1 / 2 / 4, paid at 100% only |
| `hold_attended_window_s` | 30 (reuse `leave_attended_window_s`) |
| `contract_board_size` / `contract_max_active` | 3 / 1 |

- **Rough upper bound (my estimate, not modelled):** a Hard contract diverts about 30% of 20 minutes' production at +25%, so roughly +7–8% income/min while active. Economy must stack it with the bulk buyer and mini-goals against P95 2.0.

### Why it stays meaningful after automation
- Eggs are the scarce resource, so every shipped egg is one Market Hand didn't sell. Hold-and-ship is a real allocation choice that workers can't make.
- Picking a difficulty is a decision, and Stars give a goal beyond coins.

### Edge cases
- Offline or hidden tab: the timer pauses and Hold is forced off.
- Level-up mid-contract: N stays fixed and the price is taken at sale time.
- Golden-egg Frenzy (×2) doesn't apply to contract payouts, so they don't stack ×2.5.
- Basket 0: Ship is disabled ("No eggs", MK-35 copy pattern).
- Bulk buyer present while Hold is on: CT-AC-1 already holds its quantity, and the two holds share one basket. Ship never takes the bulk buyer's reserved eggs; Economy to confirm.
- Save/load mid-contract: N, delivered, tier flags and remaining time are persisted.
- Abandon: allowed, earned tiers are kept, and the board rotates after a cooldown (`contract_abandon_cd_s` 300).

### Telemetry
- `contract {phase: offered|accepted|tier|completed|expired|abandoned, id, difficulty, n, delivered, tier, time_left_s, farm, stars, coins}`
- `contract_hold {on|off, reason: player|unattended|offline}`
- `contract_ship {eggs, basket_before}`
- **KPIs:** accept rate by difficulty, % reaching 100%, Hold-on minutes per session, income/min while active vs inactive.

### Build size: **M**
Board state, crate, a Hold flag reusing CT-AC-1, save fields, copy, and an Art & UX card. Stars are +S if they only count; anything they buy is a separate decision.

---

## 2. Timed events
### Precedents
| Game | What it does | Takeaway |
|---|---|---|
| **Cookie Clicker seasons** [CC-S] | Seasons start and end **from the system clock** (e.g. Halloween Oct 24–31, Christmas Dec 15–31) with **no server**. Seasonal drops, achievements and effects; a paid "season switcher" can force a 24 h season. | A client-only calendar is feasible for our single HTML file. **Halloween starts today (Oct 24).** |
| **Hay Day Derby** [HD-DBY] | Weekly 6-day event with a 24 h break. Pick **one task at a time**, some time-limited ("filling truck orders", "fully serving any type of town visitors"). Points 50–320 per task; checkpoints ("horseshoes") give pick-1-of-3 rewards. **Failing a task has no penalty** but uses up a task slot. Inactive players are opted out. | One-at-a-time tasks plus a points ladder; a fail costs only a slot. |
| **Hay Day Valley** [HD-VAL] | 3-week seasons with themed collectibles (chickens / sanctuary animals) and an exclusive shop. | Themed rotation keeps the same loop fresh. |
| Hay Day / Egg Inc live events [HD-E][EI-S] (v1) | Server calendar, 2–3× multipliers for about 24 h. | Needs live ops; v1 rejected it for now. |

### Proposed behaviour: "Market Fair" (client clock, no server)
- **Trigger:** a local-clock window, e.g. one Fair per real day. It **starts on first open in the window and runs `fair_duration_s` of online time**. Absence never "misses" the Fair; it waits until you play.
- **During a Fair:**
  - **Fair customers** (themed skin) take some queue arrivals. Serving them **manually** earns Fair points.
  - Market Hand serves them at the base price and earns no points.
  - Points fill a **5-step ladder** (Derby horseshoe pattern): coin crates sized in seconds of production, a cosmetic at the top, and pick-1-of-2 at step 3.
- **Seasonal layer (cosmetic first):** egg / customer / coop skins on Cookie Clicker's fixed dates (Halloween, Christmas…). The client clock decides, with no economy effect in v0.

### Tunables (proposals)
| Key | Proposal |
|---|---|
| `fair_unlock_farm` | 10 |
| `fair_window` | 1 per local day |
| `fair_duration_s` | 600 (online) |
| `fair_customer_share` | 0.25 of arrivals |
| `fair_points_per_manual_serve` | 1 |
| `fair_ladder` | 10 / 25 / 45 / 70 / 100 points |
| `fair_crate_production_s` | 20 / 30 / 45 / 60 s |
| `season_dates` | Cookie Clicker table for v0 |

- **Note on the ladder:** 100 manual serves in 600 s is about one every 6 s, so the top step needs real presence. It's still worker-proof, because Market Hand serves earn 0 points. Economy must check whether Focus mode or pausing Market Hand is needed to reach it, since the mini-goal pay gap is the same issue (v0.3).

### Why it stays meaningful after automation
- Points come only from manual serves of tagged customers.
- The ladder gives a once-a-day session goal.
- Cosmetics give a reason to return that doesn't lift idle income.

### Edge cases
- **Clock tampering:** the player can change the device date. Accept it (Cookie Clicker does) and log `clock_skew`. Cap at 1 Fair per 20 h of real time since the last one (`fair_min_gap_h`).
- **Tab hidden:** the Fair timer pauses.
- **Fair overlapping a rush, a contract or a Frenzy:** all allowed. Fair customers pay the base price, so there is nothing to stack.
- **Queue full:** a Fair customer lost to a full queue gives 0 points and no penalty.
- **Pre-F10 players during a season:** they get the cosmetic only.

### Telemetry
- `fair {phase: start|step|end, day_key, points, step, manual_serves, worker_serves_of_fair, online_s}`
- `season_active {season}`
- `clock_skew {delta_h}`

### Build size
- Seasonal cosmetic skin only: **S** (needs Art).
- Fair with ladder: **M**.
- Server live events: **L**, not recommended.

---

## 3. Daily goals, mini-goals and missions
Mini-goals are approved (v0.3). This section adds the **daily set** and **permanent missions**, plus a fix so mini-goals still work after L10.

### Precedents
| Game | What it does | Takeaway |
|---|---|---|
| **Egg, Inc. Challenges** (formerly Missions) [EI-CH] | A permanent ordered list: "Take down 5 drones", "Use a boost!", "Have a shipping capacity of 250,000 eggs/min". Rewards in cash / golden eggs; **does not reset on upgrade or prestige**; progress bar across the whole list; "Trophies replace Challenges when all are completed". | A long-arc checklist that teaches features ("use a boost", "take down drones") is cheap and lasts all game. |
| **Hay Day Valley daily quests** [HD-VAL] | "Every day you get 4 quests", and completions fill a **season reward track** (boxes at 2, 5, 11, 19… quests). | Daily count feeds a longer track. A missed day costs only that day's progress. |
| **Stardew Help Wanted** [SDV-Q] | One random daily request, 2 days to finish. **3 completions = a Prize Ticket**, and "no penalty for accepting… and then not completing". | Small daily asks bundle into a bigger reward. |
| AdCap event goals [AC] (v1) | Claimed goal replaced at once, scaled to income. | Already the basis for our mini-goals. |

### Proposed behaviour
- **A. Missions (permanent list, from F3)**
  - About 30 ordered missions, 3 visible at a time, with one-time rewards. They don't reset.
  - Missions teach late features: "Fill a Hard contract", "Catch 5 golden eggs", "Serve 3 bulk buyers", "Use Activate all", "Reach 10 queue slots", "Finish a Market Fair step 5".
  - Reward: coins = `mission_reward_production_s` × current production, and Stars on milestone missions.
- **B. Daily Market List (from F8)**
  - 3 goals per local day, drawn from attention templates: serve 30 customers yourself, serve 1 bulk buyer, ship 500 eggs to a contract, catch a golden egg.
  - Finishing all 3 gives a **Market Crate**. Unfinished goals **roll over once** (max 6 banked).
  - No streak counter, so missing a day costs nothing.
- **C. Mini-goals post-L10 fix**
  - v0.3 counts manual serves only, but at L10+ Market Hand empties the queue every 1 s. "Serve 10 yourself" then forces the player to Focus or pause, which is the ~9–13% pay gap accepted in v0.3.
  - Proposal: from F10, add worker-compatible attention templates to the rotation (ship N to a contract, serve a bulk buyer, catch a golden egg) with the same reward and cooldown.
  - **Re-check after CT-AC-1**, as v0.3 already requires.

### Tunables (proposals)
| Key | Proposal |
|---|---|
| `missions_visible` | 3 |
| `mission_reward_production_s` | 30 (one-time, ~30 total) |
| `daily_goal_count` | 3 |
| `daily_reset` | local midnight |
| `daily_rollover_max` | 1 day (6 goals) |
| `daily_crate_production_s` | 90 |
| `minigoal_templates_f10` | +3 attention templates; 8 s / 120 s unchanged |

- **Income impact (estimate):** small, since rewards are one-time or once a day. Daily crate ≈ 90 s of production per day ≈ +4% of a 35 min/day player's daily income [GA], or more for shorter players. That's once a day, not per 10-minute window, so the ratio risk is low, but Economy should check it with the other rewards.

### Why it stays meaningful after automation
- Every template counts something only attention produces: taps, catches, ships, choices.
- Missions also point the player to the other three mechanics, which is what Vadim lacked at L10.

### Edge cases
- Template not yet unlocked (e.g. contract before F10): never drawn.
- Day changes mid-session: goals swap at the next idle moment, never while a claim toast shows (same queue rule as QV).
- Clock skew: same rules as §2.
- Mission already met when shown (e.g. queue 10): auto-complete it with a claim tap.
- Offline: no progress, and unclaimed rewards stay claimable.

### Telemetry
- `mission {phase: shown|completed|claimed, id, farm, time_since_unlock_s}`
- `daily_goal {phase: drawn|progress|completed|rolled|expired, template, target, day_key}`
- `daily_crate {day_key, value}`
- Existing `mini_goal` gets `template_kind: manual|attention`.

### Build size
- Missions: **S–M**, list plus counters that mostly exist.
- Daily list: **M**, with day key, save and rollover.
- Mini-goal templates: **S** once mini-goals exist.

---

## 4. Limited-time demand spikes
### Precedents
| Game | What it does | Takeaway |
|---|---|---|
| **Animal Crossing: NH hot item** [ACNH] | "Each day, a hot item is listed on the sign outside… sells for double its normal sell price that day" (2 hot items after the upgrade); **valid only in-store**, not the drop-off box (which pays 80%). | A spike that pays only via the attended channel, not the automated one. That maps directly to manual vs Market Hand. |
| **Moonlighter popularity** [ML] | High popularity raises the "Perfect Sell" ceiling by 25% of base value. Overpricing lowers popularity, and low popularity cuts base value to 75%. | Demand state as a readable, temporary price window. Their penalty side is excluded under our "no punishment" rule. |
| Cookie Clicker Frenzy [CC] / Hay Day 2× events [HD-E] (v1) | ×7 for 77 s; 2× for 24 h. | Short windows reward presence; ours already exists as golden-egg Frenzy ×2 / 30 s. |

### Proposed behaviour: "Rush Hour" (announced, from F10)
- **Announcement:** a banner "Rush hour in 0:45" lets the player **prepare**, for example by pausing Market Hand or turning on Hold (§1) to stock the basket.
- **During the rush:** for `rush_s`, a **Rush lane** (outside the queue, like the bulk buyer) spawns big customers paying `rush_price_mult`, served **by tap only**. Market Hand keeps serving the normal queue at the base price.
- **Why it works post-automation:** with Market Hand on, the basket is near-empty, so the rush only pays a player who planned ahead. That's an allocation-and-timing skill, and the idle player's income is unchanged.
- **Later (with chicken breeds/egg types from HoP's v2 study):** a daily "hot egg" on the ACNH model, 2× for manual sales of one type.

### Tunables (proposals)
| Key | Proposal |
|---|---|
| `rush_unlock_farm` | 10 |
| `rush_interval_s` | U(480, 720) online |
| `rush_warn_s` | 45 |
| `rush_s` | 30 |
| `rush_price_mult` | 1.5 |
| `rush_customer_size` | 2 × demand_max (L10: 106 eggs) |
| `rush_lane_max` | 2 |
| `rush_blocks_during_frenzy` | true (delay the rush until Frenzy ends, no ×3) |

- **Upper bound (estimate):** a fully stocked player sells about 2×106×4 eggs at +50% every ~10 min, a few % of income. Economy to model with the bulk buyer, because both pay the stockpiling player.

### Edge cases
- Hoarding: the bulk buyer already raises it; Rush is capped by lane size.
- Hidden tab during the warning or rush: both pause (golden-egg rule).
- Rush during a Fair: allowed, but Rush customers give no Fair points, so there is no double reward.
- Basket 0: card shows "Need N more" and leaves at the end with **no penalty** (not a queue customer, so MK-33a doesn't apply).
- Unattended: the rush simply passes.

### Telemetry
- `rush {phase: warned|started|ended, served, eggs_sold, value, basket_at_warn, basket_at_start, hand_paused_in_warn, hold_on_in_warn}`
- The key KPI is the **prep rate**: % of rushes where the player changed state during the warning.

### Build size: **S–M**
It reuses the bulk-buyer card and lane, the golden-egg timer and pause rules, and the Hold flag.

---

## 5. Recommendation
**Priority (for the L10 dead zone):**
1. **Contracts / Order Board (M):** the strongest fit. It creates a real egg-allocation decision against automation, a difficulty choice, and a 10–20 min goal.
2. **Missions (S–M):** a cheap long arc that steers players to every late feature, and Egg Inc proves it lasts all game.
3. **Rush Hour (S–M):** a timing-plus-prep skill that leaves idle play untouched, built on the same Hold/lane parts as #1.
4. **Daily Market List (M):** a return hook. It's more valuable once #1–3 exist as templates.
5. **Market Fair + seasons (S cosmetic / M Fair):** the seasonal skin can come any time (Art cost only); the Fair goes last.
6. Server live events: not recommended.

**First slice:** "Order Board v0" at F10.
- One active contract with an Easy/Medium/Hard pick, Hold-for-contract with an unattended auto-off, tap-to-Ship, three tiers, and no fail penalty.
- Missions v0 ships with it: 10 missions, including "Fill your first contract".
- Prerequisites: the bulk buyer (CT-AC-1 hold mechanism) and the golden egg confirmed spawning (HoQA's open "no golden eggs" investigation).
- Gate: Economy's full-stack re-sim (bulk + mini-goals + contracts) keeps P95 ≤ 2.0 and AC7.

## 6. Open questions for Head of Product
### Head of Product rulings: D-HOP-2026-10-24-11 (2026-10-24, recorded 16:26 by PM Market)
1. **Market Stars (Q1):** no new currency is approved yet. Head of Product decides in `product/m5-interaction-plan.md` whether Stars fold into an existing reward or tie to breeds or cosmetics. (The current draft, R4, folds them into breeds and the album: the contract's 100% tier and mission milestones grant a breed hatch.) Until then, §1's `contract_stars` is a placeholder.
2. **Device clock (Q2):** OK for daily and seasonal features, because the game is single-player with no leaderboards. Keep the 1-day rollover cap (§3 `daily_rollover_max`) and no streak.
3. **Stacking budget (Q5):** all active-player rewards share one budget under the 2.0 P95 cap, and Economy allocates it across features. Every reward multiplier in §1–§4 is a request against that budget, not a fixed number.
Q3, Q4 and Q6 remain open.


1. **Market Stars:** do they buy anything? Options: (a) count only, for the missions track; (b) unlock cosmetics; (c) small permanent boosts. Option (c) overlaps Collection and future prestige and needs Economy's model.
2. **Client clock:** OK for daily and seasonal features, accepting device-clock cheating (Cookie Clicker precedent)? Or wait for a server?
3. **Hold-for-contract:** it reuses the CT-AC-1 hold-back. Is the unattended auto-off (30 s) the right guard, and should PM Workers own the Market Hand side?
4. **Manual-only goal gap at L10+:** accept attention templates (ship, catch, bulk) in mini-goals and dailies instead of forcing Focus or pausing Market Hand?
5. **Stacking budget:** bulk 1.5×, contract 1.25×, rush 1.5×, Frenzy ×2, mini-goals and completion bonus all pay the attentive player. Do we set one shared "active premium" budget under P95 2.0 that Economy splits?
6. **Sequencing vs the v2 study:** should contracts wait for chicken breeds/egg types (Egg Inc and Hay Day orders are richer with several goods), or ship single-egg first?

---

## 7. L10+ sales stall: diagnosis and farm-screen stall signal (added 2026-10-24 16:31)
Source: `product/playtest-l10-interaction-2026-10-23.md` (Player, build `5d9efa6`). Shots are in `playtest/player-notes/l10-2026-10-24/shots/`. Code was read at `qa/wt-rc1-5d9efa6` (HEAD 5d9efa61) and not changed. Read-only repro script: `scratch/l10-stall/repro.ts`.

### 7.1 Verdict
**Market Hand was Asleep (energy 0). The sim behaved as designed. The problem is that no stall signal appears on the farm screen.** The approved, QA-passed asleep-visibility work was dropped from the release line on Oct 17 and never came back (bug report: `product/market/bug-l10-sales-stall-5d9efa6.md`).
**It is not a customer or demand cap,** and it is not MK-33a, Bulk mode or `market_hand_min_wait_s`. None of those is in this build (`grep min_wait|attended|focus|bulk src/sim` returns nothing).

### 7.2 Evidence
| Observation (playtest / shot) | What it rules in or out | Code (5d9efa6) |
|---|---|---|
| 16:19–16:21: money flat at about $2,290 while the basket rose 560 → 1,240. In `04_state_1625.png`, the basket holds 1,226 eggs, the queue is full (4 cards plus "+5"), and every card is unfilled. | **Not a cap.** Caps limit arrivals (`tick.ts:43`), but here 9 customers were waiting next to 1,226 eggs. An awake Market Hand serves the whole queue front-first every 1 s (Tired: 3 s), so the basket would have emptied. | `tick.ts:71-87` skips a worker when `isOff(mood)`, meaning asleep or unpaid (`workers.ts:12-15`) |
| Basket rose about 680 eggs in about 133 s, roughly 5.1 eggs/s. | That is exactly a **Tired Coop Hand**: 20 eggs/tap every `tired_every_s` 4 s = 5/s. So Coop Hand was still working, slowly, and only selling had stopped. | `balance.json` coop_hand every_s 2 / tired 4; `tick.ts:84-86` |
| Coins at $2,290 and $1,980. | **Not Unpaid.** Unpaid workers resume automatically once coins ≥ 1 min of wages (≈ $4.25 + $8.50 at F17). | `tick.ts:61-69` |
| Energy drains 1% every 9 s, and Asleep stays at 0 "until managed". | Each worker falls asleep **900 s after its last refill** with no auto-wake. With 3 workers hired at F3/F7/F8, a hands-off player hits this every ~15 min. | `tick.ts:12,18`; `balance.json` energy.drain_s_per_pct 9; v1.1 decision (product/decisions.md, Oct 15) |
| Sell all gave +$3.7K, +$3.0K and +$3.1K, then money stalled again (16:23–16:25). | Sell all is a **player sale** that walks the queue directly and doesn't check or wake any worker, so the stall returns as soon as the player stops tapping. | `actions.ts:57` (`sellAll` → `sellTo`), no energy change |
| `02_dead_stretch.png` (16:14): basket 0, coop 999/1,000, full queue unserved. | Here **Coop Hand** was the one off. The coop was full and nothing was collected, so Market Hand had nothing to sell. This is the same failure on the other worker. (The 16:14–16:17 log was lost, so I can't tell how it recovered.) | same |
| What the farm screen did show: a green, **unlabelled** icon in the nav (shots 02 and 04), a red dot on Market, and the "Full" chip on the customer strip. | The icon is "Manage all", the refill button. It appears only when a worker is ≤ 50% and has no text label on mobile (aria only). The Market dot means "customers + basket ≥ 1". "Full" is the **normal** state at L10+, because demand exceeds supply and the queue is full even when healthy (control run below). None of these says "selling stopped". | `app.ts:89-91, 563-571`; `workers-ui.ts:30-31` |
| "Asleep 💤" appears only on the card in Upgrades → Workers. | The player had no reason to open that tab ("nothing left to buy"). | `workers-ui.ts:61` |

**Repro (`scratch/l10-stall/repro.ts`, real `step()`, F17, seed 7):**
- **A, Market Hand asleep, Coop Hand tired:** over 133 s, coins went $2,285 → $2,267 (wages only), the basket went 720 → 1,380, there were **0 sales**, and the queue stayed at 9/9.
- **Sell all in run A:** +$4,321. Then 60 s with 0 sales.
- **B, control with Market Hand awake:** +$6,791 in 133 s from 38 Market Hand sales, basket 148 → 0, and the **queue still showed 9/9**.
- This matches the playtest shape and size.

**Why it was missing:**
- `product/workers/rc1-asleep-state-spec.md` (AC-R1–R9) asked for a red "Asleep, production stopped" banner, nav and Workers badges, a red HUD income/s, and the rename of "Manage" to "Refill". It was built and **passed QA @8a49d35** (engineering/status.md, Oct 17 10:24).
- It was then **"DROPPED/parked"** on Oct 17 at 12:06 (fwd-merge 7380b86 had 3 Code Reviewer Majors and was past its cap). 7380b86 is **not an ancestor of 5d9efa6**.
- `econ/income.ts` `productionStopped()` still exists with **0 callers**.
- The follow-up `product/workers/m4.2-fatigue-visibility-spec.md` v0.2 (RV-3, approved with edits, D-HOP-37) is parked with M4.2. The M5.0 scope in `m5-interaction-plan.md` doesn't include it.

**Side finding (not new):** the goal ETA reads the rolling coin rate (`next-goal.ts:51-65`), so it keeps showing "Ready in ~N min" for up to 60 s into a stall and then shows "—". This is the RV-5 family and goes to PM Farm Upgrades. Separately, the goal strip kept recommending "Collection L4" during both stalls, because the goal selector never proposes Refill.

**Ruling D-HOP-2026-10-24-11 (16:36):** approved both halves. (a) M4.1 hotfix: restore only the rc1 asleep-state signal (AC-R1–R9, 8a49d35); HoE sizes and schedules it. (b) M5.0: this chip plus fatigue-visibility Rules 2–4, specified in `product/market/sales-stopped-spec.md`, which supersedes §7.3 wherever they differ.

### 7.3 Proposal for M5.0: "Sales stopped" signal (market side), plus pulling in fatigue-visibility Rules 2–4
The symptom the player sees is **eggs piling up while money stands still**. The cause can be a sleeping Market Hand, an unpaid Market Hand, or (before F3) no Market Hand at all. So the market signal should trigger on the **symptom**, and the fatigue chip (M4.2 spec Rule 2) should explain the **cause**. Both share one placement and one fix tap.

| Item | Proposal |
|---|---|
| **Trigger (on)** | **All** of these hold for `stall_hold_s` (8 s): queue has ≥ 1 customer; basket ≥ the front customer's remaining demand, or ≥ `stall_min_basket` (1); **0 sales** (player or worker) in the last `stall_hold_s`; game visible and no sheet open. |
| **Trigger (off)** | Any sale, basket < 1, or queue empty. Hide within 1 s. Re-arm only after it has been off ≥ `stall_rearm_s` (5 s), to avoid flicker. |
| **Copy (cause-specific, ≤ 32 chars at 360 px)** | Market Hand Asleep: **"💤 Market Hand asleep · Refill"**. Market Hand Unpaid: **"⚠ Market Hand unpaid · needs $Y"** (MK-63 pattern). No Market Hand (F0–2): **"Eggs waiting · Sell all"**. Fallback (e.g. a future pause): **"Sales stopped · Sell all"**. Icons and text always appear together (not colour only). Art & UX owns the final strings. |
| **One-tap fix** | The chip **is** the button. Asleep → Refill that worker (the existing `manage` action, so the shared cooldown and the ≤ 50% rule apply); if the refill is on cooldown, show "Refill in 0:ss" and do a Sell all now. Unpaid → open Workers. No Market Hand → Sell all. |
| **Placement** | Farm screen, directly **under the customer strip** (the player watches the strip, and the shots show its "Full" chip is where they looked), full width, 44 px tap target. One slot, shared with the M4.2 fatigue chip: when both would show, the stall chip wins, because it's the bigger loss. It never covers the Collect button or the tab bar. |
| **Supporting changes** | (1) The nav "Manage all" icon gets a visible **"Refill"** label on mobile (AC-R6). (2) The goal strip shows "Refill workers: +$X/s" ahead of buy goals (M4.2 Rule 4). (3) The Market tab dot shows the count of waiting customers only while the stall is on, so it means something. |
| **Telemetry** | `sales_stall {phase: shown|tapped|cleared, cause: mh_asleep|mh_unpaid|no_mh|other, stall_s, basket, queue_len, farm, fix: refill|sell_all|workers_open|none}` and `sales_stall_cleared {by: player_refill|sell_all|auto_resume|basket_empty, stall_s}`. **KPIs:** stalls per 30 min at F10+ (target: falls once Rule 3 ships), median `stall_s` (target ≤ 15 s), % tapped. |
| **Tunables (proposal)** | `stall_hold_s` 8 · `stall_rearm_s` 5 · `stall_min_basket` 1. **No economy effect**, so the active budget isn't touched. |
| **Edge cases** | Hidden tab / <60 s catch-up: never shown, and no event during catch-up. Offline: n/a. Basket < front customer but ≥ 1 with a sleeping Market Hand: still a stall (`stall_min_basket`). Sheet open: the Market sheet's own Sell all covers it, so the chip is suppressed. Golden-egg Frenzy (M5.0): no interaction. Coop full and Coop Hand asleep with basket 0 (shot 02): **not** a sales stall; the fatigue chip (Rule 2) and coop-full hint cover it. |
| **Size** | **S** for the chip, trigger and telemetry, plus **S–M** to port rc1-asleep banner and badges from 8a49d35/7380b86 (Code Reviewer Majors to resolve). Together about 1.5–2 dev-days. No sim change. |
| **Fix recommendation** | Put "Sales stopped" plus M4.2 fatigue Rules 2–4 in **M5.0**, before or alongside #4 Shift Calls. M5.0 keeps workers on the same 15 min drain, so without a cue the new active layer still ends in silent stalls. Whether to also soften the sleep rule (e.g. auto-wake to 10% after N s Asleep) is an Economy and PM Workers question; it touches the P41-6 L0–11 guardrail, so I'm not proposing it here. |
