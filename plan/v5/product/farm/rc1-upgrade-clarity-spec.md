# rc1 Upgrade clarity (UI-only) — PM Farm Upgrades, v0.4, 2026-10-16 · **Status: Build in progress on branch `rc1/ux-clarity`** (fallback: Cut B if time runs short)

> **v0.4 changelog (2026-10-16 23:4x, HoP approved session-3 items 1–5; product/session-3-player-playtest.md, scratch/pmfarm/session3-findings.md):** §2(g) bottleneck-aware scoring for bestBuy (hint + Farm-tab highlight), non-limiting gains count as **zero**, 0.9×/2 s hysteresis kept on top; nav Upgrades opens on the hinted tab; bottleneck copy on the greyed Collect button (Art & UX wording); upgrade cards hide unchanged before→after lines; tr5_run fallback CSV → economy.f1-m4cols.csv pending HoQA sign-off (script not changed). New ACs UC19–UC26. Same picker as m4a-spec M4A-18/M4A-41, which cite UC6. Note: the played build m3-rc1-pre+a01faea still uses the cheapest-candidate hint; this rule applies to bestBuy (rc1/ux-clarity-v2).
> **Pending HoP cut decision:** Engineering sized UC1–12 at 11–14 h, plus 4–6 h for the income source (incomePerSec, UC13–18). Their recommended **Cut A** defers the worker/Grader chips, UC11 and upgrade_bought (§2(d), UC10) to rc2. Nothing is removed from this spec until HoP decides.
Source: HoP rc1 item; Economy F1-CHOICE (product/f1-proposal.md): a non-Farm buy is best 43–46% of the time, but players feel "only Farm is worth it". Fix the presentation only. No changes to the economy or CSV.
Binding best-buy rule: Economy, `best()` in product/sim/f1choice/f1_choice.py (~line 42).

## 0. What rc1-pt1 shows today (game-rc1-ui @2490c79, screenshot m3-pt1-390.png)
- **Farm row** ("Farm level"): before→after lists for Hens, Coop capacity, Egg price, and customer slots/interval/demand; "Coop upgrade at Lx"; cost button; when unaffordable, an F7 "affordable in ~…" hint. **No net effect and no payback.**
- **Collection row** ("Collect per tap"): Eggs per tap a→b and Egg price a→b in $, the cost button, and "Need $X more" when unaffordable (**not** the F7 ETA). There is **no "+12%" or % framing, no income effect and no payback.** "Limited by coop · Upgrade Farm →" sends the player back to Farm.
- **Workers/Grader cards**: cost and wage. No income effect or payback.
- **Next-goal hint** (src/ui/next-goal.ts selectGoal): target = the **cheapest** candidate (affordable ones first), tie order FARM>COLL>W1..W4. Label "Collection L5: +5/tap" or "Farm L6: …", plus "Ready!" or the F7 ETA. Anti-flicker: a new target must hold for 2 ticks at 1 Hz; a purchase applies at once. **It does not use value or payback.** The Upgrades badge lights when either is affordable. There is no highlight beyond that.
- Telemetry: event `upgrade` {upgrade: collection|farm, newLevel, cost, coinsBefore}. **No track for workers, no payback, no best-buy flag.**

## 1. Income model (binding, = Economy best_roi)
- income/s = min(eggs_per_sec[F], demand/s, collect/s) × price − wages/s
- demand/s = (demand_min[F]+demand_max[F])/2 / customer_interval_s[F]
- collect/s = eggs_per_tap[C]
- price = round((1+0.05F)·(1+collection_price_bonus[C]), 2) × Grader tier mult
- gain(option) = income/s after − income/s now. Options: Farm, Collection, next Grader tier, unhired unlocked workers (including the new wage).
- Single-step payback = cost / gain (gain > 0).
- Best buy: for each first buy, score the bundles of that buy + up to 2 more as Σgain / Σcost. Pick the first item of the best bundle. Ties go FARM > COLL > W1 > W2 > W3 > W4 (the existing GOAL_ORDER).
- Computed from config only (economy.csv via Balance), in pure functions unit-tested against the sim: `incomePerSec(state, balance)` in `src/econ/income.ts` (Engineering may move it; the formula above, the **single income source**, see §2(f)) and `bestBuy(state, balance)`, which calls it. The rolling 60 s income is no longer used by any ETA, payback or % (v0.3).

## 2(a). Button content
Each upgrade row and card (Farm, Collection, W1–W3 hire, Grader tier) gets, under the title:
- **Effect line:** "+X% income", where X = round(100·gain/income now). If income now ≤ 0, show the raw effect instead.
- **Payback line:** "pays back in {F7 format}" from the single-step payback. F7 format: rounded to the nearest second; <10 min "~1 min 5 s"; 10–60 min whole minutes; ≥60 min "~1 h 5 min".
- **The button always shows the single-step payback** (e.g. Farm at session start: 167 s). The bundle figure is used only for hint ranking (§1/§2(b)), and on the button only when the single-step gain is 0.
- If the single-step gain is 0 (typically Farm when demand or collection binds), show the bundle payback ("pays back in ~… with next buys") or "unlocks more customers". Copy below.
- If gain ≤ 0 with no bundle value, show no payback line.
- **Workers (hires/Grader) with zero or negative net gain** (wage ≥ added income) show **'No gain yet'**, which replaces the payback chip (muted, on surface-2). Screen reader: 'No gain yet.' Never a negative %, and the card is never hidden (HoP D2).
- The raw effect ("+12% egg price", "+5 eggs/tap", "+N eggs/s") may stay as secondary text. The existing before→after lists stay (they can collapse, per Art & UX's layout).
- Collection's unaffordable hint switches from "Need $X more" to the F7 ETA, the same as Farm.
- The coop link now reads **'Limited by collecting'** and goes to Collection upgrades (HoP D4), replacing "Limited by coop · Upgrade Farm →". Screen reader: 'Limited by collecting. Go to Collection upgrades.'
- The values update on a purchase or level change, and otherwise at most once every 5 s.
- Example values (**verified by Economy 2026-10-16**; identical on F1, whose changes start at L6; the 3-step bundle rule also picks Collection):
  - F5/C4: income ≈ $11.10/s. Collection costs $65 for +$0.90/s, so +8% income and pays back in 72.2 s (~1 min 12 s). Farm costs $448 for +$2.34/s, so +21% and pays back in 191.5 s (~3 min 11 s).

## 2(b). Next-goal hint and highlight
- The target is the §1 best buy, replacing "cheapest".
- The hint **always** points at the best buy by the §1 look-ahead rule. There is no 60 s window and no fallback to the cheapest upgrade (HoP D1). The status shows 'Ready!' when it's affordable; otherwise 'Affordable in ~m:ss' (the duration comes from the F7 formatter at `incomePerSec`, §2(f); '—' when it's ≤ 0).
- Unaffordable options are still scored. An option that is locked or at MAX is not a candidate.
- **Highlight:** the best-buy row/card gets a "Best buy" marker (style by Art & UX), only on the row matching the hint target. At most one marker at a time.
- **Anti-flicker (HoP D3):** re-evaluate every 5 s. With hysteresis, switch target only if the new best's payback is at least 10% better (new ≤ 0.9 × current target's payback, both on the §1 bundle score). This replaces the 2-check GoalHold. A purchase, hire or level change re-picks at once, with no hysteresis. If the current target becomes locked or MAX, switch at once.
- Tap behaviour is unchanged (it opens the tab of the target).

## 2(f). ETA reliability (v0.3, Game Critic review-rc1-pt1-2026-10-16 #2)
Problem: the ETA divides by a lagging rolling average. After a Refill burst, the L16 ETA said 1:38 but took about 2:09, and the countdown held or rose for about 50 s (1:11 → 1:17 → 1:10).
1. **Steady-state ETA:** ETA = (cost − coins) / `incomePerSec(state, balance)`, the same §1 formula from config and the current state. It is never the rolling average. ETA = '—' when income ≤ 0.
2. **Monotonic countdown:** between updates, the displayed ETA never rises by more than 5 s unless steady-state income actually dropped (a worker's wage started, the Grader or a worker tired, a cap started binding) or coins dropped (a buy). On such a drop the ETA may jump at once, and only then.
3. **One income source:** the Farm card, Collection card, worker cards, goal bubble, payback, '+X% income' and the F7 hint all read `incomePerSec`. No other income computation exists in the UI **The top-bar/HUD net income also reads incomePerSec**, not the rolling rate (Engineering's choice, accepted). This satisfies asleep-spec R2: HUD income is never positive while production is stopped.
4. **First minute:** at session start (F0/C0, canonical row) income = min(1.5 eggs/s, 1.8 demand/s, 5/tap) × $1.00 = $1.50/s. Collection costs $10 for +$0.18/s (payback ≈ 56 s); Farm costs $100 for +$0.60/s (≈ 167 s). So the look-ahead rule points at **Collection, ETA ≈ 7 s**, not 'Farm L1 ~6:20'. This follows from the rule; UC16 guards it. (Verified by Economy on canonical and F1: the 3-buy look-ahead picks Collection, at 55.6 s vs Farm's best bundle at 111.9 s.)
- Note: steady-state assumes collect/s = eggs_per_tap (1 tap/s, as in the sim). Active tapping above that makes the ETA a slight over-estimate, which is the safe direction.

## 2(g). Bottleneck-aware best buy (v0.4, HoP approved 2026-10-16)
Why: session 3 (22:57–23:08) the coop sat at 0 eggs with a full queue and the hint kept pointing at Collection, whose extra eggs per tap could not sell a single extra egg.
1. **Limiting stage, each tick (1 Hz, from state, no randomness):** the egg pipeline is production (lay rate, Farm/Hens, Coop Hand refills) → coop (capacity) → demand/collection (customers + taps/Market Hand/Hawker). Classify on a 10 s rolling window so one tap does not flip it:
   - **production-limited:** coop stock < one tap's worth for ≥ 50% of the window AND demand (eggs/s wanted, from incomePerSec inputs) > production eggs/s, or the queue is full.
   - **coop-limited:** coop stock ≥ capacity (full) for ≥ 50% of the window.
   - **demand/collection-limited:** otherwise (the normal state).
2. **Scoring:** each option's gain = the increase in incomePerSec it gives **through the limiting stage** (or the throughput it unblocks). Gains to a non-limiting stage count as **zero** (PM choice: zero, not a discount, so fixtures are exact and testable). Price/value gains (egg price, Grader, `collection_price_bonus`) always count, since they raise income at any stage. Examples: production-limited → Collection's extra eggs per tap = 0, Farm hens/eggs_per_sec and Coop Hand count. Coop-limited → Farm/Hens production gains = 0; coop capacity, Collection and Coop Hand/Market Hand count.
3. If no option has a gain > 0 under the stage filter, fall back to the unfiltered §1 score (never show no target).
4. **Hysteresis unchanged:** UC6 (≤ 0.9× and 2 s hold) runs on top of the filtered score. A stage change counts as a state change (re-evaluate) but not a purchase (no immediate switch).
5. **One picker:** hint ranks every option; the Farm-tab highlight ranks Farm rows only, with the same filtered score; they match whenever the hint is a Farm-tab row.
6. **Nav "Upgrades" button** opens on the hinted tab (`goal.tab`) whenever a hint is shown; with no hint it keeps the last-used tab. The hint tap already does this (app.ts openGoal).
7. **Greyed Collect copy:** while production-limited, the disabled Collect button shows bottleneck copy instead of only "0 ready", e.g. "Hens can't keep up · Upgrade Farm →" (Art & UX owns wording; tap opens the Farm tab). Coop-limited states use the existing coop-full copy.
8. **Upgrade cards** (Farm, Collection, worker, M4 tracks) hide any before→after line whose before and after are equal (e.g. Farm L17 "Customer demand 31–61 → 31–61"; economy.csv L17/L18 are both 31–61). If all lines would hide, show "No stat change" (Art & UX copy).
9. **Sim tool (no code change yet):** `product/farm/m4/tr5_run.py` default fallback CSV changes from economy.f1.csv (superseded L23–29 farm_cost, economy.f1.SUPERSEDED.md) to economy.f1-m4cols.csv **after HoQA signs off and QA re-records the TR-5 baseline** in run-combined.sh. The script stays as is until then.

## 2(c). Acceptance criteria
- UC1: Every purchasable row and card shows the effect line. The payback line follows the §2(a) rules. Verified at 360/390/1280 with no truncation for "~1 h 59 min" and "+999% income".
- UC2: The displayed X% and payback match `bestBuy`/gain within rounding, for 20 scripted states (QA fixture from the Economy sim).
- UC3: The payback string follows the F7 format and rounding exactly (reuse fmtTimeToAfford).
- UC4: The hint target equals the sim `best_roi` first pick in ≥ 95% of 200 sampled states from seller15 runs (the remaining ≤ 5% are explained ties only).
- UC5: At F5/C4 (the §2(a) example), the hint and the "Best buy" marker point at Collection.
- UC6 (updated 2026-10-16, HoP 16:08; same rule as m4a-spec M4A-18/M4A-41): the target is re-evaluated on every state change, with a 5 s re-check as the fallback. It switches only when the new best payback is ≤ 0.9 × the current target's payback AND the current target has held ≥ 2 s (unit test: 0.91× keeps, 0.90× switches). A purchase of the target, or the target becoming unaffordable/locked, re-picks at once within 1 tick. A newly affordable option skips the 2 s hold but must still be ≤ 0.9×; with no target, the first affordable option is picked at once. The hint ranks every option; the Farm-tab highlight ranks Farm rows only, and they match whenever the best is a Farm row (HoP 16:15).
- UC7: The hint always shows the look-ahead best buy, never the cheapest-goal fallback, at any ETA. The status reads 'Ready!' or 'Affordable in ~…' ('—' with no income). It never points at a locked or MAX item.
- UC8: Collection's unaffordable hint uses the F7 ETA.
- UC9: No change to economy.csv, the save format or the sim. The perf budget is unchanged. The screen reader announces the effect and payback.
- UC10: Telemetry per §2(d) fires once per purchase with correct fields (unit test).
- UC11: A worker or Grader card with net gain ≤ 0 shows muted 'No gain yet', never a negative %, and stays visible.
- UC12: The 'Limited by collecting' link opens Collection upgrades, not Farm, and its screen-reader text is 'Limited by collecting. Go to Collection upgrades.'
- UC13: Every ETA equals (cost − coins) / incomePerSec(state, balance) within rounding; the rolling average is not an input (unit test with a spiky income history: same ETA as without).
- UC14: Replaying the L16 Refill-burst case (Critic shot 13), the ETA error vs the actual time to afford is ≤ 10%, and the countdown does not rise.
- UC15: Across a 30-min seller15 run, the displayed ETA never rises by > 5 s between consecutive updates except at a logged steady-state income drop or a coin spend.
- UC16: One selector: the Farm, Collection, worker cards, goal bubble, payback and '+X% income' all derive from incomePerSec (code review plus a test that stubs it and sees all of them change).
- UC17: First minute: from a fresh save, the first hint target shown has ETA ≤ 60 s (expected: Collection, ~7 s), and no hint in the first 60 s shows an ETA > 60 s. **Verified by Economy (canonical and F1):** the 3-buy look-ahead picks Collection first, at a 55.6 s payback vs Farm's best bundle at 111.9 s (single step 167 s).
- UC18: `incomePerSec(state, balance)` lives in `src/econ/income.ts` (Engineering may move it; the name stays). The HUD, worker cards, every ETA, payback, '+X% income' and bestBuy all read it (see product/workers/rc1-asleep-state-spec.md AC-R7). It:
  1. is recomputed every tick from live worker states, so income drops within 1 s when a worker falls asleep or goes unpaid (and recovers within 1 s on Refill/resume);
  2. counts an asleep Grader at 15% of its bonus;
  3. may return ≤ 0 with no clamping, and the ETA shows '—' when ≤ 0;
  4. excludes Paused workers (no output, no wage).
  - The UC15 monotonic rule does not mask these drops: the ETA rises at once when this income really drops.

- UC19 (§2(g)1–2, fixture a): coop stock 0, queue full, demand > production (e.g. F13/C13 economy.csv row, 3 workers) for ≥ 10 s → hint target is Farm or Coop Hand, never Collection; Collection's filtered gain = only its price-bonus part.
- UC20 (fixture b): every existing UC2/UC5/UC17 fixture (demand/collection-limited) gives the same target and payback as v0.3.
- UC21 (fixture c): coop full for ≥ 10 s → hint target is not Farm (hens) or Hens; Collection, Coop Hand or coop capacity ranks first.
- UC22: the stage needs ≥ 50% of the 10 s window to change; a single tap that drops stock below capacity does not change the target (unit test). UC6 hysteresis still holds on filtered scores (0.91× keeps, 0.90× switches).
- UC23: Farm-tab highlight equals the hint whenever the hint is a Farm-tab row, in fixtures a/b/c and in M4 mode (M4A-41).
- UC24: with a hint shown, tapping nav "Upgrades" opens the hint's tab (farm/collection/workers); with no hint, the last-used tab.
- UC25 (copy signed off by Head of Art & UX 23:30): production-limited (0 ready for ≥ 5 s while workers active) → under the unchanged greyed Collect button, a hint link with hen icon: "Hens can't keep up · Upgrade Farm ›" (aria: "No eggs ready. Workers collect faster than your hens lay. Upgrade Farm."). 12px accent text + icon, one line at 360 (non-breaking spaces around ·), › is a chevron glyph, 44px hit area; tap scrolls to the Farm card and gives its Buy button the next-goal pulse. Hidden as soon as eggs are ready; not shown in other stages.
- UC25b (Head of Art & UX 23:30): coop meter at 100% for ≥ 5 s → directly under the coop meter, "Coop full · Upgrade Coop ›" with coop icon (aria: "Coop full. Upgrade Coop to store more eggs."), same style and 44px hit area as UC25; the meter fill gets a full-state outline (not colour alone). Hidden as soon as the coop drops below 100%. Tap scrolls to the Coop card and pulses its Buy button. Not placed under Collect (collecting is the right action when full). UC25 and UC25b are independent; no precedence rule.
- UC26: on any upgrade card, a before→after line with equal values is not rendered (fixture Farm L17: no "Customer demand" line; hens/coop/price/interval lines still shown); all-equal → "No stat change".
- UC27 (tooling, DONE 23:31, HoQA signed off): tr5_run's default fallback CSV is economy.f1-m4cols.csv; QA re-records the TR-5 baseline.

## 2(d). Telemetry
`upgrade_bought` {track: farm|collection|worker_market_hand|worker_coop_hand|worker_hawker|grader, level (new), cost (cents), payback_s (single-step, null if gain ≤ 0), bundle_payback_s (nullable), was_best_buy (bool: equals the bestBuy pick at the time of purchase), session_time_s}. It is sent alongside the existing pinned `upgrade` event; that event stays.
KPI: the non-Farm share of buys before L20 goes from baseline to ≥ 30% (sim says 43%), plus the was_best_buy rate.

## 2(e). Out of scope
- Any economy or CSV change, and M4 tracks (Hens/Egg value).
- New tabs or layout restructuring.
- Tutorial or coach-mark changes.
- Auto-buy, recommendations popups, sound.
- Offline income in payback.
- Showing bundle maths to the player.

## Copy (final, Art & UX, art-ux/rc1-upgrade-value.md v1.2)
Layout, widths and states are in that doc (§1, §3, §4). Mocks: art-ux/mocks/rc1-upgrade-value-360.png, -1280.png and .html.
- Effect: '+X% income'
- Payback: 'Pays back in ~1 min 12 s' (F7 format)
- Bundle payback: 'With next buys: ~3 min 11 s'
- Zero single-step gain: 'Unlocks more customers'
- Highlight: '★ Best buy' chip plus focus outline and glow
- Raw effects: '+12% egg price' / '+N eggs/tap' / '+N eggs/s'. These show only as a fallback (income ≤ 0) and at widths of 960 px and up.
- Next-goal label: '★ {Track} L{n} · +X% income', with status 'Ready!' / 'Affordable in ~m:ss' / '—'
- Accessibility: per art-ux/rc1-upgrade-value.md §2
- Naming: 'Egg value' for the M4 track (not used in rc1).
- Zero/negative-gain worker: 'No gain yet', replacing the payback chip, muted on surface-2, card never hidden. Screen reader: 'No gain yet.'
- Coop link: 'Limited by collecting' → Collection. Screen reader: 'Limited by collecting. Go to Collection upgrades.'

## Decided (HoP 2026-10-16)
1. D1: No fallback to the cheapest upgrade and no 60 s window. The hint always points at the look-ahead best buy and shows 'Affordable in ~m:ss'. (§2(b), UC7)
2. D2: Workers with zero or negative net gain show 'No gain yet', muted, never a negative %, never hidden. (§2(a), UC11)
3. D3: Re-pick every 5 s with hysteresis, switching only if the new best has ≥ 10% better payback. This replaces the 2-check hold. (§2(b), UC6)
4. D4: The coop link points at Collection ('Limited by collecting'). (§2(a), UC12)
