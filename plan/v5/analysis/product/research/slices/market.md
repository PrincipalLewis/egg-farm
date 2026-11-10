# Research slice: active-play market mechanics · 2026-10-16 · PM, Market/Customers
Due Mon Oct 19 18:00. Covers games' market/customer mechanics that make players act during a session. **Only facts from the linked pages are stated; each link was opened with WebFetch on 2026-10-16.** Where a source didn't give a number, the cell says "not sourced". Fit (1–5) and build cost (S ≤ 0.5 day, M ≈ 1–3 days, L > 3 days) are my judgement for our loop: Collect → Basket → customer queue → Sell, with demand ≈ 1.2× production and the queue at P1q min(10, 6 + floor(F/5)).

## Sources (all verified)
- [HD-V] Hay Day Wiki, Visitors: https://hayday.fandom.com/wiki/Visitors
- [HD-T] Hay Day Wiki, Truck (order board): https://hayday.fandom.com/wiki/Truck
- [HD-B] Hay Day Wiki, Boat: https://hayday.fandom.com/wiki/Boat
- [HD-E] Hay Day Wiki, Events: https://hayday.fandom.com/wiki/Events
- [CC] Cookie Clicker Wiki, Golden Cookie: https://cookieclicker.wiki.gg/wiki/Golden_Cookie
- [EI-D] Egg Inc Wiki, Drones: https://egg-inc.fandom.com/wiki/Drones
- [EI-V] Egg Inc Wiki, Videos: https://egg-inc.fandom.com/wiki/Videos
- [EI-S] Egg Inc Wiki, Special Event: https://egg-inc.fandom.com/wiki/Special_Event
- [EI-VEH] Egg Inc Wiki, Vehicles: https://egg-inc.fandom.com/wiki/Vehicles
- [AC] Game Design Lab, AdVenture Capitalist events and live operations: https://teemo.dev/game-design/adventure-capitalist/systems/events-and-live-operations/
- [IMT] Idle Miner Tycoon Wiki, Boosts: https://idleminertycoon.fandom.com/wiki/Boosts
- [IFE] Idle Farming Empire Support, Daily Double: https://futureplaygames.theymes.com/hc/en/idle-farming-empire/articles/what-is-the-daily-double-and-how-do-i-use-it-60
- [GA] Game World Observer, GameAnalytics idle benchmarks (Dec 2020): https://gameworldobserver.com/2020/12/22/gameanalytics-names-benchmark-engagement-metrics-idle-games
- [DD] Diner Dash Wiki: https://dinerdash.fandom.com/wiki/Diner_Dash
- [GP] Good Pizza, Great Pizza Wiki, Profit: https://good-pizza-great-pizza.fandom.com/wiki/Profit
- [AC-U] Game Design Lab, AdVenture Capitalist unlocks and milestones: https://teemo.dev/game-design/adventure-capitalist/systems/unlocks-and-milestones/
- [HD-X] Hay Day Wiki, Experience: https://hayday.fandom.com/wiki/Experience
- [HD-P] Hay Day Wiki, Production Buildings: https://hayday.fandom.com/wiki/Production_Buildings
- [ID] Hadjoudj Idris, Progression that keeps players: https://h-idris.com/blog/game-progression-design.html
- Not usable: Supercell's own Truck Orders help page (support.supercell.com) renders client-side and couldn't be verified, so Hay Day order-board facts come from [HD-T] only.

## 1. Mechanics
### 1a. Special / VIP customers
| Game | Trigger | Prompt frequency | Payoff vs idle | Unlock | Fit | Cost |
|---|---|---|---|---|---|---|
| **Hay Day farm visitors** [HD-V] | NPC walks in and asks for one item. **If the player has the item in stock, they ask for about a third to half of the stock** (e.g. 25 of 50 wheat). | Not sourced (time between visitors). Never more than 2 at once, and they wait forever until accepted or declined. | Pay 1.7–2.2× the item's base price (the roadside shop pays up to 3.6×); 2× during a visitor event. Sale is one tap. Accepted visitors leave "after a short happy animation". | XP level 2 | **5**: a stock-scaled bulk buyer directly answers S2-3a (big Basket, nothing to do) | M |
| **Cookie Clicker Golden Cookie** [CC] (rare clickable, not a customer, but the closest "special arrival" model) | Random spawn between T_min 300 s and T_max 900 s (average ≈ 447 s); upgrades halve this twice (75–225 s). | On screen 13 s base; next timer starts after it's clicked or expires. | ~40% Lucky: instant min(15% of bank, 15 min of production). ~40% Frenzy: 7× production for 77 s. | Available from the start; Lucky Day upgrade after 7 clicks | 4: a rare golden customer with a short window and a big order fits the queue | S–M |
| **Egg Inc drones** [EI-D] | Pseudo-random flyovers; tap to knock down. | Average gap 23.375 s (~154/h); 25% of gaps are 2–8 s, 75% are 12–47 s, so they cluster. 8% are Elite (~12/h). | Common: 70% cash (0.04%–1% of farm value × catch-up factor), 30% golden eggs (3–24). Elite: 20% of farm value at "on track". | Not sourced | 3: a tap target for active players; not a market mechanic | S–M |
| **Egg Inc video gifts** [EI-V] | Alert offers a reward for watching an ad. | Every 2–5 min | Cash, golden eggs, boosts, tickets | Not sourced | 1: needs ads (monetization is out of M1 scope) | – |

### 1b. Rush / time-limited orders
| Game | Trigger | Frequency | Payoff | Unlock | Fit | Cost |
|---|---|---|---|---|---|---|
| **Hay Day boat** [HD-B] | Boat docks with 3–5 item types split into crates. | Stays 18 h; next boat 4 h after cast-off. Since Aug 2026, choose easy/medium/hard. | Coins and XP per crate; filling the whole boat in time adds XP, a voucher and leaderboard points (more the sooner you finish); 40/65/100 "Nautical Miles" by difficulty toward a 3-day reward track. | XP level 17 | 3: a big timed order fits but its 18 h cadence is for sessions spread over a day | M–L |
| **AdVenture Capitalist golden goals** [AC] | Event goals ("earn or hold cash, own units, watch an ad"); golden goals are harder. | Claiming a goal replaces it immediately; golden goals expire after 3 h. | ≥ 2,000 points each, toward a reward ladder (e.g. badge at 400 points). Goals scale with current income. | In events (v7.1.0, June 2019) | 3 | M |

### 1c. Timed sales events / price spikes
| Game | Trigger | Frequency | Payoff | Unlock | Fit | Cost |
|---|---|---|---|---|---|---|
| **Hay Day events** [HD-E] | Live calendar; poster on the event board. | Events every day; bonus/boost events usually last 24 h. | Visitors: 2× coins. Truck: 2× coins/XP (rarely 3× XP). Boat: 2× coins/XP. | XP level 9 | 3: a calendar needs live ops; an in-session version fits better | M (offline) / L (live) |
| **Egg Inc special events** [EI-S] | Server calendar (pink icons). | Typically ~24 h; weekday pattern, e.g. Cash Boost on Mondays (2×, rarely 3×), Generous Drones (4×) Tue–Thu. | Earnings ×2–3, sales of 70–80% on research or habs, etc. | Not sourced | 2: live ops | L |
| **Cookie Clicker Frenzy** [CC] | ~40% of golden cookies. | ≈ every 447 s base | 7× production for 77 s | As above | **4**: an in-session "Market rush" (e.g. 2× price for N s, triggered by a golden customer) is cheap and needs no server | S–M |

### 1d. Order boards
| Game | Trigger | Frequency | Payoff | Unlock | Fit | Cost |
|---|---|---|---|---|---|---|
| **Hay Day truck order board** [HD-T] | Orders pinned on a board; fill a whole order to ship. | Completed orders are replaced "as soon as the truck leaves"; a discarded order is replaced after 6–30 min depending on level. | Coins + XP per order (2.5× coins after the June 2025 rebalance); extra milestone rewards after N orders (June 2026). Early on it's "the primary method of earning income". | XP level 3; **1 order at first, rising to 9 at XP level 32** | 3: our single-egg-type orders make a board feel like the queue; more value with multiple egg types (M4+) | L |

### 1e. Quests / mini-goals
| Game | Trigger | Frequency | Payoff | Unlock | Fit | Cost |
|---|---|---|---|---|---|---|
| **AdVenture Capitalist event goals** [AC] | Task list. | Claimed goal replaced immediately. | Points → tiered rewards (2 gold at 50 points, badge at 400, Time Warp at 1,500, …). | Events | **4**: "serve 10 customers", "sell 500 eggs in 2 min" fit our loop and give active players a target | M |
| **Idle Miner Tycoon event mines** [IMT] | Limited-time mine with objectives (per the wiki's boosts page, rewards include boosts). | Not sourced on the verified page | Boost tokens, e.g. 2× to 5000× income for 5 min to days | Not sourced | 2 | L |

### 1f. Boosts that reward returning (related)
- Idle Miner Tycoon [IMT]: ad boost doubles income for 4 h; identical boosts add duration, different ones stack (2× + 50× → 87× in the wiki's example).
- Egg Inc [EI-V]: video gives 2× earnings for 2 h (upgradeable to 8 h); re-watching resets the timer, it doesn't add time.
- Idle Farming Empire [IFE]: "Daily Double" doubles crop profits gathered while away, via an ad, every 4 h.
Fit 1 for M1: all three are ad-based.

## 2. Session pacing data (sourced)
- GameAnalytics idle benchmark [GA]: 5.3 sessions per day, average session ~8 min. Top 10%: 5.82 sessions, 7 min each, 34.92 min playtime a day. Top 25%: 5.03 sessions, 6 min, 21.0 min. D1 retention: top 10% 45.55%, top 25% 39.40%.
- Implication (mine): a 6–8 min session fits about one Cookie-Clicker-style special event at its base cadence (≈ 447 s), or 2–3 at the upgraded 75–225 s. For us, a special customer every ~2–4 min would show up 2–4 times per average session.

## 3. Queue growth: do players notice it, and does it feel rewarding? (revised question, Head of Product 2026-10-16)
### 3a. Our real curve (product/economy.csv, P1q) and when players reach each step
queue_max = min(10, 6 + floor(F/5)): **6 at F0–4, 7 at F5–9, 8 at F10–14, 9 at F15–19, 10 at F20–30.** Four steps, at F5/10/15/20.
Median time to reach each step (mechanics_sim.py base run, 20 seeds, economy.csv, AC7 seller15 buy rule, no workers):
| Seller | F5 (7 slots) | F10 (8) | F15 (9) | F20 (10) |
|---|---|---|---|---|
| 5 s | 4.6 min | 9.0 min | 17.2 min | 36.8 min |
| 15 s | 4.8 min | 9.2 min | 17.5 min | 37.2 min |
| 30 s | 5.0 min | 10.0 min | 19.5 min | 46.0 min |
So every step after the first arrives in a different session for a typical player (GameAnalytics average session ≈ 8 min [GA]).

### 3b. Why Vadim saw 4 slots at Farm L4 (code check)
- **No build has queue_max = 4 at L4.** P1q builds (`game`, `game-rc1-ui`, `game-rc1-save`: `src/config/balance.json:111–113` = base 6 / cap 10 / step 5) give 6. The older `game-m3` and `game-desktop` (`balance.json:109–111` = 3 / 5 / 10) give 3.
- **Most likely: the P1q build's queue strip.** `game-rc1-ui/src/ui/orders.ts:24`: `stripSplit = n > 5 ? { shown: 4, more: n − 4 } : { shown: n, more: 0 }`, and `src/ui/app.ts:277` caps the strip at `min(5, slots)`. With 6 slots at L4, whenever 6 customers are waiting the strip shows **4 customer cards plus a "+2" chip**. Demand is ≈1.2× supply by design, so a full queue of 6 is common. The 4-card + chip strip came in with commit 1e783a6 (2026-10-16 00:58, F5 coalesced "+N" chip), and the step pulse on the chip with 67c2385 (08:46, "S2-3b + §3.3 P1q sync").
- The old cap-5 rule never shows 4 at L4 (it gives 3 slots up to L9).
- So the visible queue is fixed at 4–5 cards for the whole game, and growth from 6 to 10 only changes the number on the "+N" chip. **That likely answers the playtest question too: the growth is nearly invisible** (Player session 2 notes, S2-3b: "+1 customer slot (8 → 9)" promised but only 5 drawn).

### 3c. How other games make capacity growth visible (verified sources)
| Pattern | Game and source | What they do |
|---|---|---|
| **Visible next tier** | AdVenture Capitalist [AC-U] | "The interface shows, for each business, the first unlock it has not yet earned"; a buy mode (v7.3.0) buys exactly enough to reach it; the unlock list lays out the whole ladder. |
| **Next-level preview** | Hay Day [HD-X] | "Players can view the items unlocked at the next level by tapping their level star"; a level-up unlocks items/features. |
| **Level-gated slot growth** | Hay Day order board [HD-T] | 1 order at first, 9 by level 32; each order is a visible paper on the board, so a new slot is a new object on screen. |
| **Bought slot growth, priced visibly** | Hay Day production buildings [HD-P] | Machines start with 1–3 queue slots, up to 9; extra slots cost diamonds, rising 6, 9, 12, …; the empty slot is shown. |
| **Capacity meter + warning** | Egg Inc shipping depot [EI-VEH] | A bar shows current eggs/min against the depot's maximum, turning green → yellow → red, with "Your farm is making more eggs than the shipping depot can handle!"; the depot sprite changes as capacity grows. |
| **Design guidance** | Hadjoudj Idris, "Progression that keeps players" (Sep 2026) [ID] | "The next step is always visible… with its cost and what it does"; "Acquisition is celebrated at the moment it happens"; "If a player cannot tell you what changed after ten upgrades, the upgrades were arithmetic." Convenience unlocks such as "bigger inventory" are "enormously appreciated" when they remove friction the player has felt. |

### 3d. Assessment and recommendation
- **Noticed?** Probably not, from our code: the strip draws 4–5 cards at every level, so steps 7→10 only change the "+N" chip number (one 600 ms pulse). Session 2 confirms ("only 5 slots ever drawn"). Session 3 should test directly (watch for the step at F5 and F10).
- **Rewarding?** Only if it removes felt friction. Our sim: with the queue full most of the time (lost to full queue ≈15% for 5–15 s sellers, 35% for 30 s), more slots are real income, so the friction exists. It isn't shown: lost customers are a small "Queue full!" cue.
- **Recommend (Art & UX + PM Farm Upgrades, copy/UI only, no numbers):**
  1. Show capacity as a number on the strip: "6/8 waiting", like Egg Inc's meter, and pulse the denominator when it grows.
  2. Farm upgrade preview names the step: "Queue 7 → 8" (already partly done in 67c2385), plus the next step on the Farm card when it isn't this level ("Next queue slot at F10"), the AdCap/Hay Day next-unlock pattern.
  3. One-time unlock callout at F5/10/15/20, celebrated when it happens [ID].
  4. Make the friction visible: show "N customers turned away (queue full)" in the Market panel, so the slot step reads as a fix.
- **Upgrade vs level unlock:** keep the level unlock (P1q). A coin-bought slot (Hay Day production slots, Egg Inc vehicles) stays an M4 option.

Sources for §3: [AC-U] https://teemo.dev/game-design/adventure-capitalist/systems/unlocks-and-milestones/ · [HD-X] https://hayday.fandom.com/wiki/Experience · [HD-P] https://hayday.fandom.com/wiki/Production_Buildings · [ID] https://h-idris.com/blog/game-progression-design.html · plus [HD-T], [EI-VEH], [GA] above. All opened with WebFetch 2026-10-16.

## 3e. Three proposed market mechanics: evaluated and simulated (Head of Product request, 2026-10-16)
Sim: `product/market/sim/mechanics_sim.py` (output `mechanics_table.md`). It reads `product/economy.csv` live (P1q queue/interval/demand, current costs, collection price bonus). New game, Collect 1/s, market action every 5/15/30 s, AC7 seller15 buy rule, no workers, 20 seeds, 60 min, medians. AC7 targets: L10 in 8–12 min, L18 in 24–36 min.

### References (verified with WebFetch 2026-10-16)
- [DD] Diner Dash Wiki, https://dinerdash.fandom.com/wiki/Diner_Dash: customers' hearts drop while they wait; "When a group of customers lose all their hearts, they leave the restaurant, incurring a significant point penalty." Chain bonus: repeating the same action multiplies points (e.g. a 2nd check in a row adds +100 on a 50-point action); a different action breaks the chain. The Food Critic leaving unhappy "will cost you A LOT".
- [GP] Good Pizza, Great Pizza Wiki, Profit, https://good-pizza-great-pizza.fandom.com/wiki/Profit: tips depend on filling the order correctly; unhappy or slow-served customers can ask for refunds; from Chapter 2, the shop's rating sets daily rent (15/day at the worst rating down to 5/day at the best).
- [HD-V] Hay Day visitors: declining a visitor "does not have any effect on how often they come or the price they pay"; visitors wait forever (no penalty model).
- [HD-B] Hay Day boat: filling the whole shipment before the time runs out awards extra XP, a voucher and leaderboard points (more the sooner it's done).
- [HD-T] Hay Day truck: orders must be completed at once (no partial delivery).

### Proposed tunables (defaults used in the sim; numbers for Economy to own)
| # | Mechanic | Tunable | Default |
|---|---|---|---|
| 1a | Reputation (price multiplier) | `rep_walkout_loss` / `rep_floor` / `rep_serve_gain` | −0.02 per unserved timeout / 0.80 / +0.01 per full serve (back to 1.00) |
| 1b | Money penalty (alternative) | `walkout_fee_share` | 5% of that order's value, coins never below $0 |
| 2 | Completion bonus | `complete_bonus_share` | +10% of the order's value, paid when the order is filled before timeout |
| 3a | Bulk/combo (Sell all) | `combo_per_extra` / `combo_cap` | +3% per extra customer fully served in the same tap / +15% |
| 3b | Focus premium (per-card Sell) | `focus_premium` | +15% on that sale |
Only unserved **timeouts** trigger (1). Customers lost to a full queue don't (the player can't act on them), and a partly served leaver counts as a timeout.

### Sim results
| seller | variant | L10 min | L18 min | L20 min | $/min 0-10 | $/min 10-30 | Farm L @60 | lost full % | lost timeout % |
|---|---|---|---|---|---|---|---|---|---|
| 5s | base | 9.0 | 27.0 | 36.8 | 956 | 4561 | 22 | 15.3 | 0.2 |
| 5s | P-rep | 9.0 | 27.0 | 36.8 | 954 | 4555 | 22 | 15.3 | 0.2 |
| 5s | P-fee | 9.0 | 27.0 | 36.8 | 956 | 4555 | 22 | 15.3 | 0.2 |
| 5s | B-done | 8.2 | 24.6 | 33.5 | 1196 | 5398 | 23 | 15.0 | 0.1 |
| 5s | C-bulk | 9.0 | 26.6 | 36.1 | 965 | 4714 | 22 | 15.2 | 0.2 |
| 5s | C-focus | 9.0 | 36.1 | 54.2 | 919 | 2649 | 20 | 35.6 | 18.4 |
| 5s | rep+done | 8.2 | 24.6 | 33.5 | 1196 | 5398 | 23 | 15.0 | 0.1 |
| 15s | base | 9.2 | 27.2 | 37.2 | 909 | 4502 | 22 | 15.6 | 0.2 |
| 15s | P-rep | 9.2 | 27.2 | 37.2 | 907 | 4502 | 22 | 15.6 | 0.2 |
| 15s | P-fee | 9.2 | 27.2 | 37.2 | 909 | 4502 | 22 | 15.6 | 0.2 |
| 15s | B-done | 8.5 | 25.0 | 33.8 | 1157 | 5323 | 23 | 15.4 | 0.3 |
| 15s | C-bulk | 8.8 | 24.8 | 33.5 | 1067 | 5482 | 23 | 15.3 | 0.2 |
| 15s | C-focus | 24.5 | nan | nan | 114 | 481 | 15 | 27.0 | 52.0 |
| 15s | rep+done | 8.5 | 25.0 | 33.8 | 1154 | 5321 | 23 | 15.4 | 0.3 |
| 30s | base | 10.0 | 32.0 | 46.0 | 784 | 3337 | 21 | 35.5 | 0.7 |
| 30s | P-rep | 10.0 | 32.0 | 46.0 | 763 | 3318 | 21 | 35.5 | 0.7 |
| 30s | P-fee | 10.0 | 32.0 | 46.0 | 779 | 3334 | 21 | 35.5 | 0.7 |
| 30s | B-done | 9.0 | 29.0 | 42.0 | 984 | 3860 | 21 | 36.4 | 0.6 |
| 30s | C-bulk | 9.0 | 28.0 | 40.5 | 1023 | 4103 | 22 | 36.7 | 0.6 |
| 30s | C-focus | 48.5 | nan | nan | 33 | 120 | 11 | 19.9 | 67.2 |
| 30s | rep+done | 9.0 | 29.5 | 42.0 | 973 | 3848 | 21 | 36.4 | 0.6 |

Caveat on C-focus: the sim's focus player serves **one customer per market action** (worst case: same attention, one card). A player who taps every card individually has Sell-all throughput plus the premium, i.e. about +15% revenue, comparable to B-done.

### Findings per mechanic
1. **Walkout penalty (rep or fee): no measurable effect** on income or pacing (≤ 3% income at 30 s, same level times). Timeouts are rare (0.2–0.7%) because customers are lost to a **full queue** first, which isn't penalised. The penalty would mostly be a feel-bad message with no strategic decision (Diner Dash's penalty works because the player controls the seating; ours doesn't). Hay Day explicitly chose no penalty [HD-V]. **Not recommended.** If wanted for readability, show reputation as cosmetic (no price effect).
2. **Completion bonus +10%: +25% early income ($/min 0–10: 956 → 1,196 for 5 s), L10 ~0.8 min faster, L18 ~2.4 min faster** (5 s: 27.0 → 24.6, at the edge of AC7's 24–36 window). It rewards the behaviour we want (full orders, attention) for all sellers alike. **Recommended at 5%** (about half the effect) or at 10% with a Farm cost or price re-tune so AC7 holds. Needs Economy's sign-off.
3. **Bulk combo rewards checking in less often:** 30 s seller +23% $/min (10–30 min) and L18 32.0 → 28.0, 15 s +22%, 5 s only +3% (the active player rarely has 2+ customers to fill at once). That's the opposite of the "active play" goal. **Not recommended as designed.** **Focus (one per action) is disastrous** for any non-tapping cadence (15 s: L10 9.2 → 24.5 min, timeouts 52%). As a per-card tap bonus it's a +15% active-player premium; fine as a light reward (cap ~10%), but it makes Sell all feel like the wrong button.
4. Combined rep + done ≈ done alone.

### Edge cases (all three)
- **Offline:** no customers queue while closed, so none of the mechanics apply; welcome-back eggs sold later follow normal rules. A hidden tab simulating its first 60 s applies them normally.
- **Full queue:** arrivals lost to a full queue never trigger the penalty or bonus. Combo counts only customers fully served in the tap; a dwelling "Thanks!" card (MK-16/17) doesn't count.
- **Empty basket:** Sell is disabled, so no combo or focus premium; the completion bonus can't fire; the penalty clock (patience) keeps running as today.
- **Partial fills:** completion bonus only on the sale that completes the order (value = full N × current unit price); combo counts only completed orders; focus premium applies per sale.
- **Price changes mid-order:** bonuses use the unit price at the completing sale (sale-time rule, Q3).
- **Rounding:** bonus amounts added to the sale before the single half-up cent rounding (AC4).

### For PM Workers: (3) and the Market Hand (m2-proposal v1.1)
- Market Hand serves the whole queue front-first every 1 s (3 s Tired) (m2-proposal §W1, `w1_every_s=1`). Under a combo rule it would almost never combo (it serves each customer as soon as they arrive), and under a focus premium it would earn the premium on every sale for free, i.e. an uncontrolled +15% worker buff.
- If (3) is adopted: give the Market Hand a mode toggle with **no premium on worker sales**, or a reduced one (e.g. focus 5%), and tie the mode to a management action (it fits "worker fails without the player's active management"). Re-run AC-W2/W4 (margins are zero today: AC-W4 6.0 vs ≤ 6.0).
- Simpler alternative that matches the sim: no (3); the completion bonus (2) applies to Market Hand sales too, since it fills orders fully; check AC-W4 margin with Economy.

### For Economy/Balance: proposed numbers
| Tunable | Proposal | Status |
|---|---|---|
| `complete_bonus_share` | 0.05 (or 0.10 with re-tune) | Recommend; AC7 + AC-W re-sim needed |
| `rep_walkout_loss`, `rep_floor`, `rep_serve_gain` | 0.02 / 0.80 / 0.01 | Not recommended (no effect in sim) |
| `walkout_fee_share` | 0.05 | Not recommended |
| `combo_per_extra`, `combo_cap` | 0.03 / 0.15 | Not recommended (rewards idle checking) |
| `focus_premium` | ≤ 0.10, manual taps only, 0 for workers | Optional |

## 4. Headline findings
1. Hay Day already solves our S2-3a situation: visitors ask for **a third to half of what you have in stock**, so a full Basket produces big, visible, one-tap sales [HD-V].
2. In-session specials are the cheapest active-play hook with no server: Cookie Clicker's golden cookie (≈ 7.5 min base, 13 s window, 7× for 77 s or a lump sum of up to 15 min of production) [CC]; Egg Inc drones every ~23 s, clustered [EI-D].
3. Calendar events (Hay Day daily, Egg Inc ~24 h weekday patterns) need live ops; not for M1 [HD-E][EI-S].
4. Idle sessions average 6–8 min, 5–6 a day [GA]: a special should appear at least once per session to be noticed.

## 5. Top recommendations (for Head of Product; numbers to be simulated before any change)
1. **Bulk buyer (VIP) customer:** appears occasionally (e.g. once per 2–4 min) and asks for a share of the Basket (Hay Day: 1/3–1/2 of stock), shown as a gold card. Answers S2-3a and oversupply after offline. Fit 5, cost M. Needs a sim: payoff vs AC7 pacing.
2. **Market rush:** tapping a rare golden customer starts a short price boost (Frenzy model: multiplier × N s). Fit 4, cost S–M. In-session only, no server.
3. **Mini-goals:** a short rolling list ("serve 10 customers", "sell 500 eggs") that replaces itself when claimed, scaled to income (AdCap model). Fit 4, cost M. Good M4 candidate, also feeds onboarding.
4. Queue cap: keep P1q level-based, but make the growth visible (§3d); park a coin-bought slot as an M4 option.
5. From §3e: a small completion bonus (5%) is the only one of the three Head of Product mechanics worth adopting; skip walkout penalties and bulk combos.
Not recommended for M1: ad boosts/gifts (monetization out of scope), live calendar events, an order board (until multiple egg types).
