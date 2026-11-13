# Market / Customers — Feature Spec · M1 · v1 · 2026-10-15 · PM, Market/Customers
Source of truth for numbers: `product/economy.csv` / `economy.md` (Head of Product owns). This spec does not change any number; proposals are in the last section. Extends core-loop-spec.md AC3/AC4/AC10.

## 1. Parameters (from economy.md; L = Farm level, 0–30)
| Name | Value | L0 | L10 | L30 |
|---|---|---|---|---|
| `customer_interval_s` | P1q: 0.5 × base, base = max(3, 10 × 0.95^L), 2 dp | 5.00 | ≈3.00 | 1.50 (floor from L24) |
| `demand_min` | P1q: ceil(0.4k), k = eggs_per_sec × base interval (see economy.md) | 6 | 27 | 38 |
| `demand_max` | P1q: ceil(0.8k) | 12 | 53 | 75 |
| `egg_price` | 1.00 + 0.10L | 1.00 | 2.00 | 4.00 |
| `queue_max` | P1q: min(10, 6 + floor(L/5)) | 6 | 8 | 10 (L20–30) |
| `patience_s` | 30 (core-loop-spec) | | | |
| first customer | t = 10 s from new game | | | |
All values read from config (AC9); none hard-coded.

## 2. Customer lifecycle
1. **Spawn** — a spawn timer counts down `customer_interval_s` for the Farm level *at the moment the timer is (re)started*. On zero: if queue < `queue_max(L)` for the current Farm level, a customer is appended to the back of the queue; timer restarts.
2. **Demand** — rolled once at spawn: integer N uniform on [demand_min, demand_max] inclusive, for the Farm level at spawn. N never changes afterwards. Customer also stores `remaining = N`.
3. **Waiting** — each customer has its own patience timer of 30 s starting at spawn. Card shows demand (`remaining`/N) and a patience indicator.
4. **Serve** — per-card Sell sells k = min(basket, remaining); label "Sell k/N" (k = what would be sold now). Coins += round_half_up(k × egg_price, 2) at the *current* egg_price; basket −= k; remaining −= k. If remaining = 0 the customer leaves served. If remaining > 0 (partial) the customer **stays** in the queue with the reduced remaining and its original patience timer (not reset).
5. **Leave unserved** — when patience reaches 0, the customer leaves; any eggs already sold to them stay sold (no refund).
6. **Sell all** — iterates the queue front-to-back, applying step 4 to each until basket = 0 or queue processed. Atomic: evaluated in one tick.

### Randomness
- Uniform integer: `N = demand_min + floor(rng() × (demand_max − demand_min + 1))` with rng() in [0,1). No float rounding of bounds (bounds are integers by formula).
- Single seeded PRNG for market (spawn demand only). Seed: random per new game in production; config/URL debug flag `marketSeed=<int>` fixes it for tests. Same seed + same action sequence ⇒ identical demand sequence.
- RNG is not reseeded on reload in M1 (demand of saved customers is saved; see §3.10).

## 3. Edge cases
1. **Zero eggs:** per-card Sell and Sell all disabled when basket = 0; no coin/queue change.
2. **Basket < total demand:** Sell all fills front customers fully, last served one partially; later customers untouched.
3. **Queue full:** spawn at full queue is skipped (customer lost, counted in `customers_lost_queue_full` metric); timer restarts normally (no backlog burst when a slot frees).
4. **Timeout during sale:** sale and timeout resolve in the same tick → the sale wins if the player's input was received before the timeout tick is processed; a customer whose card was removed can't be sold to (input ignored, no coin change).
5. **Partial then timeout:** customer leaves; coins from the partial sale kept; logged as `customer_partial` (NOT `customer_lost`; Economy M1-R1, 2026-10-15: demand ≈1.2× supply by design, so part-served leavers are normal sell-outs, not losses).
6. **Market panel open when customer times out:** card removed/closed; panel goes to next customer or closes if queue empty.
7. **Farm level up mid-queue:** existing customers keep their N; new spawns use new range. Remaining timer is not altered; the new interval applies from the next timer restart. Price applies at sale time, so pending customers pay the new higher price. `queue_max` grows at L5/10/15/20 immediately (the next spawn can fill the new slot); it never shrinks.
8. **Max level (L30):** values fixed at L30 row; no change in behavior.
9. **Sell amount:** k = min(basket, remaining) always, so a sale never exceeds what the customer still wants.
10. **Save/reload:** queue (N, remaining, patience left) and spawn timer remaining are saved; on reload they continue from saved values. Customers don't queue or time out while the game is closed (decision 5.1); on return the queue resumes where saved.
11. **Tab hidden / backgrounded (browser throttling):** timers use elapsed game time; on resume, the first 60 s of hidden time are simulated (spawns/timeouts) and the rest is frozen (decision 5.1, MK-13).
12. **Coin rounding:** each sale rounded separately (half-up, 2 dp); Sell all sums per-customer rounded amounts.
13. **Rapid double tap:** a second Sell tap on a customer already removed is ignored; no double credit.

## 4. Acceptance criteria (QA)
- MK-1 With a new game, the first customer appears at t = 10 s (±1 tick).
- MK-2 At Farm level L with queue not full, consecutive spawns are `customer_interval_s(L)` apart (±1 tick); verify at L0 (5 s), L10 (≈3 s), L24+ (1.5 s).
- MK-3b Queue cap = min(10, 6 + floor(L/5)) (P1q): 6 at L0–4, 7 at L5–9, 8 at L10–14, 9 at L15–19, 10 at L20–30; after upgrading to L5 a 7th customer can join at the next spawn.
- MK-3 Queue length never exceeds `queue_max(L)`; a spawn while full adds no customer and increments the lost-full counter; the next spawn happens one interval later (no burst).
- MK-4 Every demand N is an integer within [demand_min, demand_max] from economy.csv for the level at spawn. Over 10,000 seeded spawns at L0, each value 6..12 occurs 14.3% ±1.5%; min and max both observed.
- MK-5 With `marketSeed` fixed, two runs with identical inputs produce identical demand sequences; different seeds produce different sequences.
- MK-6 Per-card Sell label shows "Sell k/N" with k = min(basket, remaining); button disabled iff basket = 0.
- MK-7 A sale credits round_half_up(k × egg_price, 2) and reduces basket by exactly k; coins never change on a disabled/ignored tap.
- MK-8 Full fill removes the customer immediately; partial fill keeps them with remaining = N − k and an un-reset patience timer.
- MK-9 Sell all serves front-to-back: given basket B and queue [a,b,c], results match sequential per-card sells; stops when basket = 0.
- MK-10 (canonical for Q4) A customer not fully served leaves exactly 30 s after arrival (±1 tick), whether or not they bought part of their order; a partial sale keeps them in the queue with the eggs they still want and does not reset or extend patience; coins from partial sales are kept.
- MK-11 Input on a customer that has already left causes no coin, basket or queue change.
- MK-12 After a Farm upgrade, customers in queue keep N; customers spawned afterwards use the new range; sales after the upgrade use the new price.
- MK-13 Hidden tab: on resume, the first min(hidden time, 60) s are simulated (spawns, timeouts); anything beyond 60 s is frozen (not simulated). E.g. hidden 45 s → 45 s simulated; hidden 5 min → exactly 60 s simulated. Reload restores queue (N, remaining, patience left) and spawn timer within ±1 s; no customers spawn or leave while the game is closed.
- MK-14 Metrics emitted per customer: spawned, served_full, customer_partial (served_partial_then_left; excluded from lost-customer rate), left_unserved, lost_queue_full (for % served / lost-customer rate KPIs).
- MK-15 All market values come from config (AC9): changing a CSV value changes behavior without code changes.

- **S2-3a, APPROVED for rc1 (Head of Product, 2026-10-16; decisions.md; source s2-3a-proposal.md):**
- MK-16 When a customer is fully served (card Sell, Sell all or Market Hand), their card stays in its slot for `served_dwell_ms` (one config value, default 1500 ms, ±1 frame) showing "Thanks! +$X" (X = coins from that customer's final sale), then plays the leave animation (MK-16b) and is removed.
- MK-17 A dwelling card doesn't count toward `queue_max`: an arrival during the dwell is accepted whenever the live queue has room, and is never logged as lost to a full queue. If the slot is needed, the dwelling card is displaced and turns into a "+$X" pop (Head of Product, 2026-10-16). Every served customer shows either the full dwell card or the pop.
- MK-18 A dwelling card can't be tapped and is ignored by Sell all, Market Hand and the Sell all total.
- MK-19 Reduced motion: no leave animation; a static "Thanks! +$X" card for the same `served_dwell_ms`.
- MK-20 Presentation only: with the same seed and inputs, coins, eggs sold and customer events are identical with and without the dwell (and when `served_dwell_ms` = 0).
- MK-21 (playtest check, not an automated gate) With Market Hand Working and ≥ 500 eggs in stock at Farm L10–14, over 60 s a customer card (waiting or dwelling) is visible ≥ 40% of the time.
- MK-22 Add-on C: on return from offline (load with an offline grant), the next customer arrives immediately, within 1 tick of the welcome-back modal closing (arrival timer set to 0). After that, normal intervals resume. Queue-frozen-while-closed (decision 5.1) still holds: only one customer, no backfill.
- **Art & UX spec for the served card (2026-10-16), applies to MK-16 to MK-19:**
  - MK-16a The "+$X" is a gold number pop: scale 1.2 → 1.0 over 150 ms at the start of the dwell, with a coin sound hook (plays only if SFX is on).
  - MK-16b After `served_dwell_ms` (1.5 s) the card leaves the way its list flows, over 250 ms with a fade: **sideways in the queue strip** (the following card slides in sideways to take its place over 200 ms, ease-out) and **upward in the Market panel list** (the following row moves up over 200 ms, ease-out). Same timings in both. Total time from serve to removal = 1.75 s.
  - MK-18a The card can't be tapped for the full 1.75 s window (1.5 s dwell + 250 ms leave): input ignored, no coin/basket/queue change.
  - MK-19a Reduced motion: no pop scaling and no slide; static "Thanks! +$X" for 1.5 s, then a 250 ms fade, and the next card moves into place instantly.
  - MK-16c Engineering includes a 360 px screenshot or clip of the served card (dwell, pop, leave, shift) in the next screenshot batch.
- Deferred to F1: B (Market Hand serves only customers who've waited ≥ 2 s).

- **S2-P1 zero-pay, APPROVED for rc1 (Head of Product, 2026-10-16; source s2-p1-zero-pay.md):**
- MK-23 An order card never shows $0.00. Its value is the full order (N × current price, minimum $0.01), with progress `filled`/N (P2, already on rc1: orders.ts:11–17).
- MK-24 (rc1, copy only; layout per Art & UX, `art-ux/layout-spec.md` §4.4) The card shows the price line "$X per egg · paid as you sell" (X = current unit price incl. multipliers, sale-time). The Sell button shows the eggs and coins of this tap, for **partial and full fills alike** (Art & UX: full uses the same pattern, replacing the plain "Sell"); Y uses AC4 rounding.
  - MK-24a At ≤ 375 px the price line wraps to two lines, "$1.80 per egg" over "paid as you sell", muted 14 px; never truncated; the 72 px row height still fits.
  - MK-24b At ≤ 375 px the button stacks "Sell 28" over "+$50.40" (value line 14 px), button ≥ 44 px tall. From 390 px up it's one line, "Sell N · +$Y", if it fits; otherwise it uses the stacked form.
  - MK-24c Engineering's screenshot batch includes the worst case at 360 px: a partial button with a 3-digit egg count and a value ≥ $1,000 (e.g. "Sell 138" / "+$1,242.00").
- MK-25 Every sale, partial or full, adds exactly the shown amount to coins (AC4). A partial sale plays the "+$X" pop on that card, **reusing the existing number-pop (Engineering confirmed): rc1, Wed Oct 21 batch.**
- MK-26 (process) Playtests run only rc1 (or later) builds, and the build hash is shown in the game (debug/about line) so notes record it.
- MK-34 (rc1, sell-button rule, critic rc1-pt1) A per-card Sell button never offers more eggs than the basket holds: its count is always k = min(floor(basket), N − filled), computed from the same state frame as the basket pill.
- MK-35 With floor(basket) = 0 every per-card button is disabled (aria-disabled, greyed) and reads **"No eggs"**; it never shows a Sell count or "+$". Tapping it shakes and does nothing (no sell event, coins unchanged). The card still shows progress filled/N. (Replaces "Need N" for that case; "Sell all" keeps "No eggs to sell".) **CONFIRMED "No eggs"** (UI/Visual Designer, 2026-10-17; rc2-order-sell-preview.md updated).
- MK-36 A card that is leaving (served, timed out) or no longer in the queue never shows an enabled Sell button: when it leaves the list (including while the list is pointer-frozen) its button is disabled at once, and a tap on it is a no-op.
- MK-37 After any basket change (Collect, Coop Hand, Market Hand, Sell, Sell all) every visible Sell label and enabled state match MK-34/35 within one rendered frame.
- MK-38 The "Sell N · +$Y" copy (MK-24) uses that same k: Y = k × unit price with AC4 rounding; k ≥ 1 whenever the label shows.
- MK-39 Plurals in Market copy: "1 more customer waiting" / "N more customers waiting" (live region and "+N" chip aria label); never "1 more customers".
- MK-40 (rc2, order sell-preview, spec art-ux/rc2-order-sell-preview.md v1.0 signed off 2026-10-16 23:55) Order card progressbar aria-label reads "4 of 17 eggs delivered. Selling adds 13. Order worth $93.84." (delivered = filled, adds = previewed k per MK-41/42, worth = full order value per MK-23). When k = remaining: "4 of 17 eggs delivered. Selling adds 13 and completes the order. Order worth $93.84." When k = 0: "4 of 17 eggs delivered. No eggs to sell. Order worth $93.84." Big numbers are spoken in words via the existing formatter ("1.8 million"). aria-valuenow stays = filled; updates go through the existing live-region throttle: at most one update per 1000 ms (src/ui/app.ts:527–528 at 7d52952, `t - lastLive > 1000`).
- MK-41 Each order bar shows track + solid fill (width filled/N) + a preview segment directly after the fill (width k/N of the track inner width). Standalone (single-card sell), k = min(floor(basket), N − filled), equal to that card's Sell button count from the same state frame (MK-34). E.g. 4/17, basket 8 → 360 mock: track 170 / fill 40 / preview 80 px; 1280 docked: 178 / 41.9 / 83.8 px.
- MK-42 Sell-all allocation: previews are allocated in Sell all fill order (queue front to back). Each card previews min(basket left after earlier cards' previews, its remaining); the sum of all visible previews never exceeds floor(basket). A card whose allocation is 0 shows no preview.
- MK-43 Full order: when a card's preview equals its remaining, fill + preview reach exactly 100% of the track and the card uses the existing `.order.ready` meadow outline (#3D7F33). No text hint at any width; card height stays 60px. Fill and preview never both round to 100% unless k = remaining.
- MK-44 Hidden preview: no preview segment when k = 0 (floor(basket) = 0; button per MK-35) or on a `.leaving`/removed card (MK-36); a leaving card's fill is frozen.
- MK-45 Minimum width: whenever k > 0 the preview is ≥ 4px wide (e.g. 1.8M demand, basket 2,400 → 0.4px computed, shown at 4px). If the 4px would pass the track end, the fill shrinks (max-width calc(100% − 4px)); the bar never overflows. The solid fill may still be 0px.
- MK-46 Styling: preview has a diagonal hatch in --c-meadow-text #2F6B27 over #3D7F33 @ 40% tint and a 1px #FFFFFF left divider against the fill; the hatch (≥3:1 vs track) and divider (≥3:1 vs fill) carry the distinction and remain visible in greyscale.
- MK-47 Row copy: "4/17 eggs · $93.84" keeps showing the full order value; " eggs" is dropped ("4/17 · $93.84") whenever the value would otherwise be cut, at every width including 360/375px and ≥960px. The value span is never ellipsised while " eggs" is still shown.
- MK-48 360/375px: at 360 and 375px widths all of MK-41–47 hold with no layout change (card 60px, preview within the 170px track per the 360 mock), and no row text is cut.
- MK-49 Same-frame updates: after any basket change (Collect, Coop Hand, Market Hand, Sell, Sell all) every visible preview width and the aria-label match MK-41/42 in the same rendered frame as the basket pill and Sell labels (MK-37); the visual grow animates over 120ms --ease-out with no pop. Transitions are 120 ms ±16 ms (one frame at 60 Hz).
- MK-50 Sell motion: on Sell the fill tweens to its new width over 200ms --ease-out (cubic-bezier(.22,1,.36,1)) while the preview shrinks to 0 and is removed at 200ms, starting within ±1 frame of the Sell number pop; durations 200 ms ±16 ms (one frame at 60 Hz); replaces the old 240ms fill transition.
- MK-51 Reduced motion (`.reduced-motion`/`.rm`): no width tweens; fill/preview widths swap instantly, with at most a 120ms opacity 1→0 fade on the preview.

## 5. Resolved decisions (Head of Product, 2026-10-15)
1. Q1: the queue freezes while the game is closed (no spawns or timeouts). A hidden tab simulates its first 60 s, then freezes (no spawns or timeouts after that).
2. Q2: the arrival timer keeps running when the queue is full. A customer arriving to a full queue is lost (`lost_queue_full`), and there's no backlog burst.
3. Q3: the price is taken at sale time (the current `egg_price`).
4. Q4 (MK-10 canonical): a partly served customer stays in the queue with the eggs they still want (remaining = N − k). Patience runs from arrival and is never reset; if not fully served by 30 s after arrival, they leave.
5. P4 approved: `customer_patience_s`=30, `queue_max`, `first_customer_s`=10 are config tunables (economy.csv columns, economy.md).
6. P2 DROPPED. Patience stays at a flat 30 s.
7. Queue scales with level: `queue_max` = min(5, 3 + floor(L/10)) (replaces P3; co-owned with PM Farm Upgrades). SUPERSEDED by decision 8 (P1q).
8. P1q (Head of Product, Oct 15, approved for rc0; core-loop-spec AC3 + change note, economy.md PT1 rows): queue_max = min(10, 6 + floor(F/5)) replaces the 3/4/5 rule; customer interval and order size halved (demand per second unchanged). Numbers above follow economy.md PT1; economy.csv not updated until PM Farm Upgrades signs off (economy.p1q.csv).
9. S2-3a (2026-10-16): served dwell (MK-16 to MK-21) and immediate first arrival on return (MK-22) approved for rc1; Market Hand 2 s delay deferred to F1.
10. S2-P1 (2026-10-16): MK-23 to MK-26 approved for rc1 with the conditions above (360 layout per layout-spec §4.4; partial pop confirmed rc1 via the existing number-pop, Wed Oct 21 batch; rc1-only playtests with build hash).
- Still open: Art & UX patience indicator and the partial-order card state.

## 6. Proposals for Head of Product (not applied)
- P1 (sim done: market/sim/sim-results.md; market is the bottleneck L0–L30) Interval floor reached at L24 while demand keeps climbing; fine, but at L24+ income is demand-limited at ~(demand avg)/3 s — suggest QA sim check that market stays the bottleneck intended.
- P2 (DROPPED by Head of Product; sim: not needed; moves losses from timeout to full queue) Consider patience scaling with demand (e.g. 30 s + 0.5 s × N) so large late-game orders aren't lost while tapping Collect; keep 30 s for M1 unless pacing sim shows high lost rate.
- P3 (SUPERSEDED by queue_max = min(5, 3 + floor(L/10)); sim: removes full-queue losses up to L19 for a 15 s-check player; consider queue 3+floor(L/10)) Optional queue_max 3 → 4 at Farm L10+ for a "lively market" feel; only if lost_queue_full > 10% in playtests.
- P4 (APPROVED, applied) Add `customer_patience_s`, `queue_max`, `first_customer_s` as columns/constants in economy.csv config so they're tunable (AC9).

### MK-59a guard amendment (Head of Product via QA, Oct 17 2026 08:45)
Guard: if any level L3-L25 has a 400-seed mean served-% difference below -2.0 pts, rerun that level at 1,600 paired seeds. FAIL only if the rerun mean is still below -2.0. This applies to every level. The L20 lower 95% bound >= -2.0 rule and the always-required items are unchanged. Matches MK-T59a.
