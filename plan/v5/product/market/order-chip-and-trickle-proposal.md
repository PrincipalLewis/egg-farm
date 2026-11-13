# Order chip copy + post-tutorial "trickle" — proposal v0.2 FINAL (approved; MK-59 PASS Oct 17 2026)
PM Market/Customers, 2026-10-17. Source: qa/m3-recheck/claude-gamer-triage-7d52952.md (B3b; feel note "stream of 2–3-egg partial sales"). For Head of Product; copy with Head of Art & UX; numbers to Economy for modelling (not in economy.csv).

## 1. Order chip copy (B3b)
**Problem.** New orders read "0/13 eggs · $15.34 · Need 13" (orders.ts at 7d52952). "x/N" means delivered, but first-time players read "0" as "0 available". The button "Need 13" adds to it (MK-35 already replaces it with "No eggs" at basket 0).
**Options.** (a) "Delivered 0 of 13" (HoP example): clear but long. "Delivered 1.2K of 1.8K · $1,242.00" is ~34 chars, ≈240 px at 14 px, which doesn't fit the 360 px row (170 px track). (b) "Wants 13" before the first delivery, then progress (Gamer/QA suggestion). (c) A verb on the progress ("Got 4 of 17"), rejected in v0.2.
**Ruling (v0.2): (b) wins. Head of Art & UX ruled on the copy, and Head of Product approved it subject to their check.**
- Nothing delivered: **"Wants 13 eggs · $15.34"**, shortening to **"Wants 13 · $15.34"**. Aria: "Customer wants 13 eggs, order worth $15.34".
- Some delivered: **"4/17 · $93.84"** at every width. ("Got 4 of 17" and "4/17 got" are dropped.)
- Complete: **"✓ Ready · $X"**.
- Shortening order: drop " eggs" first, then show 3 significant figures from 1,000 up (e.g. 1.24K). The $ value is never cut.
- Sell all with eggs but no open demand: **"Waiting for customers"** (already in PR #30, build passed). "No eggs to sell" stays for basket 0.
- Per-card buttons are unchanged (MK-35 "No eggs", MK-24 "Sell N · +$Y").
- Fit: the UI/Visual Designer measures it in the build fonts at 360/375 px (not the Wed batch). The v0.1 character-count estimates are withdrawn.

## 2. Trickle of 2–3-egg sales
**Diagnosis (build 7d52952, src/sim/tick.ts:70–86).** Market Hand (w1) unlocks at F1 with `w1_every_s` = 1 and, on every action, sells the whole basket front to back (`sellTo` per card). The basket only gains production between actions (eggs_per_sec = 2–3 at F1–F2), so each sale is ≈ eggs_per_sec × 1 s = **2–3 eggs** (sim median 3.0 at F2, 4.0 at F3, ~63 sales/min). The queue is supply-limited (demand ≈ 3.7 eggs/s vs 3 eggs/s at F2), so there's always a partial order to drip into. `market_hand_min_wait_s` (option B, F1) is **not** in 7d52952, and it doesn't fix this anyway: it only delays the first serve per customer (sim: 62.7 vs 63.3 sales/min, median unchanged). The worker "Bulk default" isn't separate code: it *is* this Market Hand front-to-back loop. Manual Sell is not the cause (a Collect tap gives 10–15 eggs).
**Options (sim: product/market/sim/trickle_sim.py → trickle_table.md, MH-only player, 40 seeds × 20 min, F2–F10).**
| Option | median eggs/sale F2/F5/F10 | sales/min F2 | income/min | served % F2/F5/F10 |
|---|---|---|---|---|
| base (every 1 s) | 3 / 6 / 11 | 63 | — | 69.3 / 62.8 / 79.7 |
| min_wait 2 s (option B) | 3 / 6 / 11 | 63 | 0.0% | unchanged |
| min partial size max(5, 25%·N) with a 10 s patience bypass | 3 / 6 / 11 | 59 | 0.0% | unchanged (the bypass fires constantly in a supply-limited queue) |
| MH action every 5 s | 9.6 / 16.7 / 25 | 20 | −0.3% | 69.8 / 70.0 / 81.2 |
| combined pop/card only (visual batching) | n/a (economy identical) | — | 0% | unchanged |
| **Hold threshold: sell only when basket ≥ min(front remaining, ceil(5 s × eggs_per_sec)); last-chance sale in the front customer's final tick** | **9.4 / 13.3 / 22.4** | **22** | **−0.1 to −0.2%** | **77.7 / 79.6 / 82.9 (+8.4 / +16.8 / +3.2 pp)** |
**Recommendation: Market Hand hold threshold. APPROVED by HoP 2026-10-17** ( `market_hand_hold_s` = 5, `market_hand_last_chance_s` = 1.0 s (v0.3, QA rewrite; was 0.1 s)). Sales get ~3× bigger and ~⅓ as frequent. Served % rises because eggs finish the front order instead of being spread across doomed ones. Income/min stays within −0.2%. Add the visual combined pop as a cheap complement only if HoP wants it. Interaction: it supersedes `market_hand_min_wait_s` = 2 (Economy to decide whether to keep both). It's compatible with the bulk-buyer hold-back AC (v0.3) and MK-33a. **How Market Hand is charged in build 7d52952 (src/):**
- Wage is time-based, not per sale or per egg. On each action interval (`w1_every_s` = 1 s Working, `tired_every_s` when Tired), `workerActions` (tick.ts:70–80) charges `wageCharge(id, farm, interval)` = wage_per_farm_per_min × farm × interval/60 (workers.ts:48–53, exact cents with the fraction carried). This happens *before* it tries to sell, whether or not any eggs are sold. The only cases with no charge are Asleep, Unpaid, or not enough coins (→ Unpaid).
- Energy is time-based per tick: Working/Tired drain 1% per `drain_s_per_pct` = 9 s (tick.ts:17), independent of sales.
- So under the hold rule, cost per minute is unchanged. Eggs sold per minute changes by −0.1 to −0.2% (sim), so hand cost per egg sold rises by ≤ ~0.2%, which is effectively neutral. Nothing scales with the number of sale events, so batching is not a stealth buff.

Caveats: the sim has no manual player, Coop Hand or energy, so Economy should re-run on the full M4 stack (income/min, served %, 2.0× active/idle, pacing).

## 3. ACs (proposed)
- MK-52 (copy) A card with filled = 0 reads "Wants N eggs · $V", shortening to "Wants N · $V". It never shows "0/N" or "Need N". The short form is used only when the full form would overflow the row (scrollWidth > clientWidth). 3-significant-figure K/M formatting applies only after " eggs" has been dropped and the text still overflows.
- MK-53 A card with 0 < filled < N reads "F/N · $V" at every width. "✓ Ready · $V" shows only when delivered (filled) == N. A preview reaching N (filled + preview = N) keeps the numeric "F/N · $V" text and shows only the preview segment (MK-43 outline). Shortening applies only on overflow (scrollWidth > clientWidth): drop " eggs" first, then 3 significant figures K/M from 1,000 up only if it still overflows. The $ value is never cut or ellipsised.
- MK-54 The Sell all label with floor(basket) ≥ 1 and no open demand reads "Waiting for customers" (disabled; PR #30). With floor(basket) = 0 it reads "No eggs to sell".
- MK-55 Aria: at filled = 0 the card aria reads "Customer wants N eggs, order worth $V", and the MK-40 progressbar label becomes "Customer wants 13 eggs. Selling adds 8. Order worth $15.34." (k = N: "...Selling adds 13 and completes the order..."; k = 0: "...No eggs to sell..."). MK-40 is unchanged for filled > 0. At 360 and 375 px in the build fonts, the three worst-case rows ("Wants 138 eggs · $1,242.00", "1.24K/1.84K · $1,242.00", "✓ Ready · $1,242.00") render with scrollWidth ≤ clientWidth and no ellipsis (measured by the UI/Visual Designer).
- MK-56 (trickle) On each action Market Hand sells only if floor(basket) ≥ min(front remaining, ceil(market_hand_hold_s × eggs_per_sec)), with market_hand_hold_s = 5. Holding is part of Market Hand's work, not idle time. Market Hand wage/min and energy drain/tick are unchanged vs the pre-hold build (±0.01 $/min). Cost per egg sold is reported, not gated.
- MK-57 If the front customer would time out within market_hand_last_chance_s (= 1.0 s), Market Hand sells min(basket, remaining) to that customer. Measured at tick resolution (0.1 s): sale when time-left is in [0.9, 1.0] s; never after timeout.
- MK-58 When MK-56 passes, Market Hand serves front to back as today (bulk-buyer hold-back and MK-34 limits still apply). Manual Sell / Sell all are never gated.
- MK-59 (HoP bar 08:21; numbers PENDING Economy full-M4) vs the pre-hold build: Market Hand wage/min unchanged; income/min within ±0.5%; worst progression served % ≥ base −0.5 pts; median F2 Market Hand sale ≥ 8 eggs; cost per egg sold is info only (reported, not gated).
- MK-59a On the merged build, progression served % (seller15, seeds 1–100, 3600 s, pooled filled/spawned) at every level L3–25 is ≥ base −0.5 pts; L20 is reported explicitly.
## 4. Telemetry
- `sell {by, eggs, cents, partial}` → median eggs per MH sale and sales/min by Farm level (target: median ≥ 3× base).
- `mh_hold {farm, basket, threshold}` (sampled) and `mh_last_chance {eggs}` count.
- `customer_left {reason, penalty}` (existing): watch the timeout share against base.
- `order_card_first_view {state: wants|partial|ready}` + time to first Sell after the tutorial (does B3b confusion drop?).

### MK-59 bar revised (Head of Product, Oct 17 08:21)
Pass when: wage/min unchanged vs current build; income/min within +/-0.5%; worst progression served % >= -0.5 pts; median F2 Market Hand sale >= 8 eggs. Cost per egg sold reported as info only. market_hand_last_chance_s = 1.0 (approved; replaces 0.1). market_hand_min_wait_s = 2 kept.

### MK-59 result: PASS (Economy, Oct 17 08:22, scratch/mh-hold/t2_lc1.json; hold_s 5, last_chance 1.0s, min_wait 2, 100 seeds)
- Wage/min unchanged (within +/-0.008 $/min). Income/min -0.08 to -0.17% fixed, -0.10 to 0.00% progression. Worst progression served % -0.48 pts at L20 (bar -0.5; margin within noise). Median F2 sale 3 -> 9 eggs.
- Info: cost per egg +4 to +14%. The served % gain largely disappears at 1s (fixed -0.02 to +0.19 pts); the benefit is batching, not served %.
- MK-59a: QA re-checks served % at L20 on the built feature; if it is worse than -0.5 pts, flag to PM Market.

### MK-59a FINAL verdict rule (Head of Product, Oct 17 2026 08:43; supersedes earlier MK-59a text)
Method per qa/m3-recheck/mk59a-harness-report.md: base vs hold on shipped code, 400 paired seeds, seller15 default variance, 0.1s ticks, 3600s progression, served % per arrival level pooled. PASS if the L20 lower 95% bound of the mean paired difference is >= -2.0 pts, AND no level L3-25 has a mean difference below -2.0 pts. The L20 mean is reported as info. Always required: wage/min unchanged, income/min within +/-0.5%, F2 median Market Hand sale >= 8 eggs.

### MK-59a guard amendment (Head of Product via QA, Oct 17 2026 08:45)
Guard: if any level L3-L25 has a 400-seed mean served-% difference below -2.0 pts, rerun that level at 1,600 paired seeds. FAIL only if the rerun mean is still below -2.0. This applies to every level. The L20 lower 95% bound >= -2.0 rule and the always-required items are unchanged. Matches MK-T59a.
