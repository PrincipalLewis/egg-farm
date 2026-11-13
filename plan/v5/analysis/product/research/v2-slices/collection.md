# v2 slice: Collection — tapping & golden eggs after automation
**v0.1 · 2026-10-24 · PM, Collection · for Head of Product (D-CEO-20261024-05: research + PM only, no code/PRs; M4.2 build hold unchanged).** Feeds `product/research/interaction-study-v2.md` → `product/m5-interaction-plan.md`.

**Builds on, does not repeat:** `product/research/slices/collection.md` (Oct 16: Golden Cookie, drones, RCB, AdCap, IMT, Clicker Heroes skills, TT2 fairies), `product/m4-active-checks.md` (Economy's active/idle runs), `product/research/active-play-study.md`. Existing specs are referenced by path: golden egg `product/collection/m4-timed-collectible-spec.md` v0.5, streak `product/collection/m4-collect-streak-spec.md` v0.3, telemetry `product/collection/telemetry-spec.md` v0.6.2, coop-full `product/workers/coop-full-unmanaged-proposal.md` v0.6.

**Labels.** **[V]** = I loaded the page today (2026-10-24) and read the fact there. **[V-10/16]** = verified in the Oct 16 slice. **[P]** = PM proposal for Economy to model; `economy.csv` is the source of truth and Head of Product approves. Fit, build size and all "≈" arithmetic are PM judgement, not sourced facts.

---

## 0. Diagnosis at Farm L10 with 3 workers (from our own data)
| Fact | Number | Source |
|---|---|---|
| Laying at H10 | 11 eggs/s; coop 550 | `economy.csv` row 10 (sha256 c7bb783f…) |
| Eggs per tap at C = F−3 = 7 | 40 (55 at C10) | `economy.csv` row 7 / 10 |
| Coop Hand throughput (Working) | eggs_per_tap every `w2_every_s` = 2 s → 20–27 eggs/s, ≈2× laying | `economy.csv` |
| Asleep/unpaid Coop Hand | keeps collecting at 0.15 share (HoP 23:40, Oct 16); CSV now carries **0.20**, valid only if MK-33a ships in the same build | coop-full-unmanaged v0.4/v0.6 |
| Active/idle once workers are hired, no M4 mechanics | **1.00×** at F10/F18/F24 | m4-active-checks §1 headline |
| Demand vs supply | ≈1.2× supply; Hens out-produce demand from ≈F20 | m4-active-checks §5, Task C |
| CEO rule | optimal active ≤ 2.0× idle over any 10 min; current full M4 stack worst seed **1.93–1.95 at F18** → ≈0.05–0.07 headroom | streak spec "Note: CEO 2× check"; m4-active-checks v0.2 abilities |
| What Vadim played | In the rc1 tree (`qa/wt-rc1-5d9efa6`) I found the `tc_*`/streak constants in `balance.json` and a payout-hook comment ("M4 adds streak / frenzy entries here", `src/sim/payout.ts:7`) but **no collectible or streak code**. HoP to confirm, but it looks like the golden egg and streak were not in the build. | repo read |

**Three conclusions that shape every proposal below:**
1. **A tap only moves eggs the Coop Hand would have moved 1–2 s later.** As long as tap value = `min(coop, eggs_per_tap)`, no eggs-per-tap number can make tapping matter once a hand is hired. Tap value has to be **decoupled from coop contents**.
2. **Supply-side rewards are worth ≈0 from F10.** Extra eggs or extra laying run into demand (×7 laying frenzy ≈ +15%, 0 at F24; the "60 s of eggs" outcome is worth nothing from F20). Rewards must pay **coins or price**, scaled to income.
3. **There is almost no active budget left.** Pure buffs were rejected for this reason. Every proposal here therefore comes with a **funding source** (§4). The one I recommend is to trim the streak cap, which pays for sustained 1 tap/s, the activity Vadim found useless, and spend that budget on *moments* (§4).

---

## 1. Idea (a) — tap gives more: scaling tap value, combos/streaks

### 1.1 Precedents (new for this slice)
| Game · mechanic | What it does | Source |
|---|---|---|
| Cookie Clicker · "mouse" upgrades | 15 upgrades each "Clicking gains +1% of your CpS", unlocked by hand-made cookie totals. The wiki says that with all clicking upgrades, mid-game clicks give ≈10–13% of CpS each and "moderately fast constant clicking" at least doubles production; otherwise clicking "seem[s] obsolete" unless Click Frenzy or Dragonflight is active. | https://cookieclicker.fandom.com/wiki/Cookies_per_Click [V] |
| Cookie Clicker · Cursor | Cursor upgrades double "the mouse and cursors", so the building that automates clicking also strengthens manual clicks. | https://cookieclicker.fandom.com/wiki/Cursor [V] |
| Clicker Heroes · click-damage upgrades | 7 hero upgrades each add "Click Damage by 0.5% of your total DPS", 3.5% in total. Per the wiki this was "implemented to allow clicking to still be worthwhile" once the flat click hero falls behind. Crit-click upgrades: 3 × +3% chance, crit ×10 → ×18. | https://clickerheroes.fandom.com/wiki/Upgrades [V] |
| Tap Titans 2 · Chivalric Order | Converts a percentage of hero (idle) damage into tap damage. Skill level 1 ×1.2, level 5 ×37.2. | https://www.tt2-compendium.com/en/wiki/skills/chivalricorder [V] |
| Tap Titans 2 · Barbaric Fury | "While actively tapping, you get additional free taps… and your Tap Damage is increased while actively tapping" (an active-rhythm combo). | https://www.tt2-compendium.com/en/wiki/skills/barbaricfury [V] |
| Egg, Inc. · Running Chicken Bonus | Research raises the RCB cap ("Coordinated Clucking +0.2× per level", "Enlightened Chickens +2.0×"). The bonus only builds while habs aren't full. The wiki's strategy section describes hold/release timing to keep the bonus at max. | https://egg-inc.fandom.com/wiki/Research [V] (fixes the Oct 16 403) |

**Pattern:** every long-running clicker keeps the click relevant by **indexing click value to idle output** (CpS %, DPS %, hero damage %), not by growing a flat click number. Our `eggs_per_tap` is the flat-number model, which is why it dies once workers arrive.

### 1.2 Proposed behaviour
**A1 "Hand-picked bonus" (tap value as % of income).** Each *credited* Collect tap also pays coins:
`bonus = tap_income_share × income_ref_per_s`
- **Credited** means the streak rule (m4-collect-streak §2.3): at most 1 per `streak_credit_interval_s` (1 s). It does **not** require moving an egg. An empty-coop tap with a hand hired still pays, so the Coop Hand never "steals" the verb.
- **income_ref_per_s** is the 60 s rolling idle-equivalent income (all sales by workers and player, Grader included), excluding streak, frenzy and the M4-B boost so nothing feeds back into itself (same exclusion pattern as golden-egg cash, timed-collectible §3).
- Feedback: "+$3" fly-to-money from the tap point, short form, with tabular numerals per Art & UX. The eggs moved by the tap still go to the Basket as today.
- Unlock: Farm L ≥ `tap_bonus_unlock_farm`, the same level as the streak (8), so it arrives right as workers take over (W2 F7, W3 F8).

**A2 Combo tiers on the existing streak (no new economy).** The streak meter already exists (spec §4). Add tier pops every 10% (`+10% · +20% · +30% · MAX`) with a coin burst equal to the A1 bonus at that tap, plus pitch step-ups (already specced) and a "MAX" sparkle. This is Barbaric Fury's "you're in the zone" feel without its free taps. It is a juice pass, budget ≈0.

**Rejected again:** raising `eggs_per_tap`, or per-tap egg multipliers. They are worthless under a hand (conclusion 1) and demand-capped (conclusion 2).

### 1.3 Tunables [P]
| Name | Start | Range | Note |
|---|---|---|---|
| `tap_income_share` | **0.03** | 0.02–0.06 | At 1 credit/s that is +3% for an optimal tapper and +1.5% casual (0.5/s). At F10, idle ≈$70/s (m4-active-checks §8), so ≈$2.1 per tap. Cookie Clicker's ≈10–13% per click is out of reach under our 2× rule. |
| `tap_bonus_unlock_farm` | 8 | 7–10 | Same as the streak. |
| `tap_bonus_income_window_s` | 60 | 30–120 | Rolling reference window. |
| (reuse) `streak_credit_interval_s` | 1.0 | — | Shared credit gate, no new auto-clicker surface. |

### 1.4 Why it stays meaningful after automation (L10+, 3 workers)
The tap no longer competes with the Coop Hand. It pays a share of what the workers earn, so it scales with Hens, Egg value, the Grader and later prestige, without per-level tuning (the Clicker Heroes rationale). It is small on purpose: its job is to make every tap *visibly* pay (+$ pop) rather than to carry the premium.

### 1.5 Edge cases
- **Auto-clicker / 20 taps/s:** still 1 credit/s, so no gain. Telemetry flags taps/active-min > 600 (telemetry §5.1).
- **Income ≈0** (F<8, everyone asleep and unpaid, empty market): the bonus is ≈0. Display nothing below $0.01 (no "+$0" pop), the same rule as offline-popup "no $0 coins line".
- **Hidden < 60 s:** no taps, no bonus; the rolling window excludes hidden time. **≥ 60 s / offline:** never paid offline; the window restarts after the welcome-back modal.
- **Frenzy / streak active:** reference income excludes them (no compounding). Whether the coin bonus itself is multiplied by frenzy goes to Economy (default: no).
- **Welcome-back modal Collect:** not credited (same as the streak rule §2.4).
- **Telemetry metric clash:** at F8+ with a hand, many legitimate taps move 0 eggs, so `effective_tap_share` < 0.85 would alert falsely. Define it on credited taps there (see §5).

### 1.6 Build size
A1 **S**: one formula on the existing tap action, a rolling income figure that the HUD already computes (the RV-5 60 s gross rate exists), a pop and a config row. A2 **S**: art, sound, copy.

---

## 2. Idea (b) — tapping hens or the coop for bonus eggs

### 2.1 Precedents
| Game · mechanic | What it does | Source |
|---|---|---|
| Hay Day · chickens | Each fed chicken lays every 20 min. The player collects by dragging the egg basket over chickens. Tapping the coop "scares the chickens" (a cosmetic easter egg). | https://hayday.fandom.com/wiki/Chicken [V] |
| Tap Titans 2 · Heart of Gold (formerly Heart of Midas) | "Occasionally your pet glows… Tap on your pet to earn a massive amount of gold." The skill shortens the glow cooldown. | https://www.tt2-compendium.com/en/wiki/skills/heartofgold [V] |
| Cookie Clicker · Wrinklers | Clickable creatures that "wither" CpS while attached. Popping one (3 clicks) returns 1.1× what it stored, so the player decides when to pop. Dormant offline. | https://cookieclicker.fandom.com/wiki/Wrinkler [V] |
| Egg, Inc. · Boxes (random gifts) | Boxes appear on the farm and pay 1% / 5% / 15% of farm value (bigger ones exponentially rarer), golden eggs or boosts. | https://egg-inc.fandom.com/wiki/Boxes [V] |
| Clicker Heroes · Treasure Chest | A 1% spawn-chance mob that pays 10× gold. Ancients raise both the chance and the payout. | https://clickerheroes.fandom.com/wiki/Treasure_Chest [V] |
| Egg, Inc. drones / TT2 fairies | Already covered: Oct 16 slice §2, §7. | [V-10/16] |

**Pattern:** the creature on screen (pet, wrinkler, chicken) is the tap target the automation **can't** reach. The best versions (Wrinkler, Heart of Gold) add a **when-to-tap decision**, not just reflexes.

### 2.2 Proposed behaviour — B1 "Broody Hen" (recommended form of idea b)
- **What:** one yard hen at a time is *broody*. A nest under her quietly **accrues a bonus** while the tab is visible. When the nest is at least `broody_ready_share` full, she glows and wobbles. Tapping her (**one tap**, not Wrinkler's 3, for 360 px and accessibility) pays out the nest as coins and another hen becomes broody.
- **Accrual:** `nest += broody_income_share × income_ref_per_s × dt` (same reference income as A1), capped at `broody_cap_s × broody_income_share × income_ref_per_s`. **It is not diverted from production**: idle income is untouched, unlike the Wrinkler, which withers CpS. At the cap she "settles": the glow pulses slower and nothing is lost, it just stops filling.
- **Payout:** coins, never eggs (conclusion 2). Popup `+$X!` with the cash style, consistent with golden-egg copy (timed-collectible §3, Art & UX 13:10).
- **Decision:** tap now for a small nest, or wait up to the cap. Visiting about every `broody_cap_s` collects everything. That rewards the 2–4 min check-in rhythm the active-play study targets (§4 Q4), not 1 tap/s.
- **Unlock:** the **first Coop Hand hire** (F7+). The moment automation takes the Collect verb, the game hands over a new verb (active-play study §4 Q3: "automation should be earned and partial, and come with active abilities").
- **Workers never tap hens.** The Coop Hand animation can walk past a broody hen without touching her (Art & UX flavour).
- **B2 Coop tap (cosmetic, Hay Day easter egg):** tapping the coop roof flutters the hens. No economy. Pure juice for the "nothing happens when I tap" feeling. Optional.

### 2.3 Tunables [P]
| Name | Start | Range | Note |
|---|---|---|---|
| `broody_income_share` | **0.05** | 0.03–0.08 | Fill rate as a share of income while visible. At 100% capture (visit ≤ cap) this is +5% for **both** optimal and casual players. |
| `broody_cap_s` | **150** | 90–240 | Nest full after 150 s, so the cap ≈ 7.5 s of income (≈$525 at F10). |
| `broody_ready_share` | 0.5 | 0.3–1.0 | Glow from 75 s. Below it, a tap does nothing (no feedback spam). |
| `broody_unlock` | first Coop Hand hire | F7–F10 | Alternative: Farm ≥ 8, to align with the golden egg. |
| `broody_max_on_screen` | 1 | 1 | Prompt-fatigue guard. |

PM arithmetic: optimal or casual +5%; a 5-min visitor gets 7.5/300 ≈ +2.5%; idle +0%.

### 2.4 Why it stays meaningful after automation
Workers can't reach it, it scales with income, and it rewards *returning* rather than grinding. It also gives Vadim's "nothing to do at L10" an on-screen object that changes every couple of minutes, in the yard where the hen sprites already reflect `hens[hensLevel]` (D-HOP-2026-10-24-01).

### 2.5 Edge cases
- **Hidden < 60 s:** accrual paused (visible-time only, like the golden-egg timer §4.2). **≥ 60 s / reload / offline:** the nest is kept and saved (`broody_nest_cents`, `broody_hen_idx`), but **never accrues offline**. On return the hen still glows if ready. This gives the welcome-back moment one tap of payoff. If HoP prefers no new save field, reset to 0 instead.
- **Golden egg on screen:** both may be visible (different targets), but the broody hen's hit area joins the golden-egg exclusion rules (timed-collectible §6, streak meter +16 px zone). No golden egg spawns on a broody hen.
- **Hens count < 2 visible** (narrow viewport): the broody hen is always one of the drawn sprites, never an off-screen one.
- **Sheets/menus open:** accrual continues (it isn't a timer the player can miss), but the glow is hidden under the scrim.
- **Reduced motion:** a static glow ring plus a "nest" badge, no wobble.
- **Frenzy / boost / streak:** the payout uses reference income (none of them included). Never stacked.
- **Everyone asleep, income ≈0:** the nest fills ≈0, which is correct (nothing to bonus). The Refill prompt stays the main verb.
- **Prestige / farm reset later:** the nest pays out or clears on reset (PM Farm Upgrades to decide with the prestige slice).

### 2.6 Build size
**M** standalone (sprite state, hit area, accrual, save fields, popup). **S–M** if the golden-egg collectible framework (spawn slots, exclusion zones, popup, telemetry) ships first, which is why it sits after the golden egg in §6.

---

## 3. Idea (c) — more, and more frequent, golden eggs

### 3.1 Precedents (new for this slice)
| Game · mechanic | What it does | Source |
|---|---|---|
| Cookie Clicker · Golden goose egg | "Golden cookies appear 5% more often" (a rare Easter upgrade). Also: Easter eggs unlock from golden-cookie clicks (10% base), so golden clicks feed a collection. | https://cookieclicker.fandom.com/wiki/Easter_Season [V] |
| Cookie Clicker · Lucky Day / Serendipity / Get Lucky | Cadence 300–900 s → 75–225 s with upgrades. Each doubles on-screen time. Cookie Chain/Storm outcomes. | [V-10/16] Golden Cookie |
| Cookie Clicker · late game | The wiki says active play is "the most efficient late game because of Golden Cookies", at about one every 2 min. | https://cookieclicker.fandom.com/wiki/Cookies_per_Click [V] |
| Tap Titans 2 · Fairy Charm | Raises the chance of multiple fairies per wave (max 7) and cuts the fairy cooldown (+3.6 s → +60 s over 9 levels). | https://www.tt2-compendium.com/en/wiki/skills/fairycharm [V] |
| Clicker Heroes · Golden Clicks / Treasure Chest | Golden Clicks: "1% of the current monster's gold each time you click, for 30 seconds", 1 h cooldown. Chests: 1% spawn, raised by Ancients. | https://clickerheroes.fandom.com/wiki/Upgrades [V]; Treasure_Chest [V] |
| Egg, Inc. · Boxes | Bigger rewards "exponentially rarer". | Boxes [V] |

**Pattern:** frequency is a **progression stat** (upgrades and skills that shorten the gap or multiply spawns), and variety comes from **multi-target outcomes** (Chain, Storm, fairy waves), not just bigger single payouts.

### 3.2 Baseline (don't restate; numbers for the delta)
Golden egg v0.5: F8 unlock, gap 120–300 s (≈17/h), 30 s life, cash 45 s (0.45) / frenzy ×2 price 30 s (0.35) / eggs 60 s → cash from F20 (0.20). Economy: +17% at 100% catch, +11% at 60% (F≤18), +11%/+7% at F24. Market-rush queue variant ≈30% of spawns is in the M4.x backlog (timed-collectible "Backlog").

### 3.3 Proposed behaviour
**C1 "Hot hands": the streak speeds up the golden-egg timer.** While streak `s ≥ golden_hot_streak`, the spawn countdown runs at ×`golden_hot_rate`. This links (a) and (c): sustained tapping now earns *more moments*, not just more price, and an idle player is unaffected. Size **S** on the golden framework.

**C2 "Golden Hen" outcome (chain, multi-target).** A new outcome takes weight from `cash`. A golden hen crosses the yard for `golden_hen_s` and drops `golden_hen_drops` small golden eggs. Each tap pays `cash_s / drops` of income. **EV is identical to `cash` at 100% catch**, so it is budget-neutral by construction, but it is 5 taps of excitement instead of 1 (Cookie Chain/Storm, fairy waves). Size **S–M**.

**C3 "Golden Goose" upgrades (frequency as progression).** 3 one-off coin upgrades on the Upgrades tab at F12 / F16 / F20, each cutting the gap by ×0.9 and adding +5 s lifetime. At max that is ≈ +37% spawns (0.9³ ≈ 0.73 → 1/0.73), so roughly **+6pp** active premium at 100% catch. A coin sink after L10 where purchases otherwise feel automatic (RV-7 "shallow tradeoffs"). Size **M** (new rows, save fields, UI). Coordinate with PM Farm Upgrades' research-tree slice: it may belong there.

**C4 Market-rush variant:** keep as already backlogged. It is PM Market's queue surface; listed only for completeness.

**Not proposed:** shorter base gaps for everyone (pure buff, no decision) or drones (prompt fatigue, deferred in timed-collectible §11).

### 3.4 Tunables [P]
| Name | Start | Range | Note |
|---|---|---|---|
| `golden_hot_streak` | 0.20 | 0.10–0.40 | Reached after 20 s of 1/s tapping. |
| `golden_hot_rate` | **1.25** | 1.0–1.5 | Optimal player ≈ +25% spawns → ≈ +4pp (PM arithmetic on +17% base). Casual < +2pp. |
| `tc_p_golden_hen` | 0.10 | 0–0.15 | Taken from `tc_p_cash` (0.45 → 0.35). Budget-neutral. |
| `golden_hen_drops` | 5 | 3–7 | 7 = the TT2 fairy-wave max. |
| `golden_hen_s` | 8 | 6–12 | Time the drops stay tappable. |
| `golden_goose_gap_mult` | 0.9 per level, 3 levels | 0.85–0.95 | +~6pp at max. |
| `golden_goose_life_add_s` | 5 per level | 0–10 | |
| `golden_goose_unlock_farm` | 12 / 16 / 20 | — | Costs: Economy to fit to the L10–20 buy cadence. |

### 3.5 Why it stays meaningful after automation
Golden eggs are already worker-proof ("Workers never tap collectibles", timed-collectible §5.6) and pay income-scaled coins/price. C1 makes the streak feed them. C3 gives the post-L10 coin pile something active to buy.

### 3.6 Edge cases
- **C1:** the hot-rate only applies while the tab is visible and a spawn is pending. Hidden or offline the timer is paused (§4.2 there). The streak decays to 0 on the ≥ 60 s path, so no carry-over.
- **C2:** the hen drops respect spawn slots and exclusion zones (timed-collectible §6, the streak meter zone). Reduced motion shows the drops in place, without the run. Expired drops pay nothing (no penalty). `rerolled_from` logic with the M4-B boost is unchanged (frenzy only).
- **C2 at 360 px:** 5 targets plus a broody hen plus the Collect button risk misclicks. Drops spawn only in golden slots, with ≥ 48 px targets.
- **C3:** the gap floor must stay ≥ `tc_frenzy_s` (30 s) so frenzies can't overlap (timed-collectible §3 "Overlap"). Upgrades persist in the save; a missing field defaults to 0 (no migration bump).
- **All:** rewards use `egg_price_effective` with the Grader included and the streak/boost excluded (spec §3). From F20, eggs pay as cash (existing rule).

---

## 4. Active-income budget: how this respects the CEO 2× rule
The constraint: worst-seed optimal active/idle ≤ 2.0 over 10 min. Today's full M4 stack is at 1.93–1.95 (F18). The only cleared mean band is 1.5–2.0.

| Mechanic | Optimal premium (≈, PM arithmetic) | Casual | Who it rewards |
|---|---|---|---|
| Streak today (cap 0.40) | ≈ +29% at 0.30 alone (m4-active-checks rerun "streak 0.30 only" 1.29); +0.10 mean from 0.30 → 0.40 in the ALL stack | needs 0.5/s, so lower | sustained 1 tap/s |
| A1 tap bonus 0.03 | +3pp | +1.5pp | every tap |
| B1 broody hen 0.05 | +5pp | +5pp | 2–3 min check-ins |
| C1 hot hands 1.25 | +4pp | <+2pp | tapping → more golden moments |
| C2 golden hen | 0 (reweight) | 0 | variety |
| C3 golden goose (max) | +6pp (later) | +4pp | progression |

**Proposed package P1 [P] (budget-neutral target):** lower `streak_cap` **0.40 → 0.28** (≈ −12pp optimal) and add A1 + B1 + C1 (≈ +12pp). The mean should stay in the 1.5–2.0 band and the worst seed ≤ 1.95, but **Economy must run it** (F10/F18/F24, optimal/seller15/casual, seeds 0–99, ALL stack with abilities v0.2 ×1.15).
- **Why trim the streak, not something else:** it is the only mechanic that pays for *continuous* tapping, which is exactly what Vadim called useless. Its +40% is mostly invisible (it lands on worker sales). Moving budget from "tap 1/s for 10 min" to visible per-tap pops, a hen to visit and more golden moments improves feel at equal ratio. It also narrows the casual-vs-optimal gap (B1 pays casual the same).
- **Fallback:** if Economy shows P1 above 2.0 on the worst seed, drop C1 first, then lower `broody_income_share` to 0.03.
- C3 waits for prestige/progression work, which may raise idle income and so restore headroom.

---

## 5. Telemetry (consistent with telemetry-spec v0.6.2)
Every event carries the v0.6.2 envelope (`type`, `ts`, `sid`, `fgMs`). Level fields go only where listed. All new events are **ring-trimmed, not pinned**. Session totals go on `session_end` so the metrics survive ring eviction (§4 there). Schema additions go to the §3.1 allowlist.

| Event / field | Change | Fields |
|---|---|---|
| `tap` (batched, `tap_batch_ms`) | extend | `credited` (credited taps in the window), `bonus_cents` (Σ A1 coins) |
| `collectible_spawned` / `_collected` / `_expired` | **reuse with new `skin` values**, no new event names (T-AC12 naming rule) | `skin`: `"broody_hen"`, `"golden_hen_drop"`; on `_collected`: `reward_cents`, `nest_fill_share` (broody), `drop_idx` (golden hen). A broody hen never expires, so it emits no `_expired`; it is removed only by reset (`reason:"reset"`) |
| `golden_hot_window` | new (C1) | `start_fgMs`, `dur_ms`, `spawn_ms_saved`; fires when the hot-rate ends. Alternatively fold this into `streak_peak` as `hot_ms` (preferred: no new type) |
| `upgrade` | reuse | `upgrade: "golden_goose"`, `newLevel` (C3; already pinned) |
| `session_end` | extend | `tap_bonus_cents`, `broody_cents`, `broody_collects`, `golden_cents`, `credited_taps` |

**Metrics [P]:**
- **Active share of income** at F10+ with ≥3 workers = (tap bonus + broody + golden cash + frenzy extra + streak extra) / total coins. Compare it with Economy's sim per tap-rate segment (≥45 / 15–45 / <15 taps/active-min, §1 M1 there).
- **Post-automation engagement:** taps/active-min and `credited_taps/fg_min` at F10+ versus F3–F7. The goal is that it does **not** fall after the third hire, which is Vadim's complaint quantified.
- **Broody visit cadence:** median `nest_fill_share` at collect. ≈1.0 means players wait for the cap (cap too short); <0.6 means anxious tapping.
- **Golden catch rate** by skin, against Economy's 60%/100% curves (±3pp rule, §6 there).
- **`effective_tap_share` redefinition:** at F8+ with a Coop Hand hired, use `credited / taps_total` (A1 makes empty taps legitimate). Below F8 keep the egg-moving definition. Alert < 0.85 unchanged.
- **Volume:** no per-tap events; one `collectible_*` triple per hen or drop (≈ ≤ 40/h). Within the 900-event ring budget (≈105 B per event).

---

## 6. Recommended order
| # | Item | Size | Why first |
|---|---|---|---|
| 0 | **Confirm and ship the already-specced golden egg v0.5 + streak v0.3** (they appear not to be in the rc1 build) | M + M (specced, constants already in `balance.json`) | Economy already cleared them (1.44–1.65 mean); they address L10 directly; they're the framework for B1, C1 and C2 |
| 1 | **A1 hand-picked bonus + A2 combo tiers** | S + S | Cheapest fix for "tapping is useless": every tap pops coins, hand or no hand |
| 2 | **B1 broody hen** (+ B2 coop flutter if Art has room) | S–M on the golden framework (M standalone) | A worker-proof object that rewards check-ins and pays casual players too |
| 3 | **C1 hot hands + C2 golden hen** | S + S–M | Ties tapping to moments and adds variety; C2 is budget-neutral |
| 4 | **C3 golden goose upgrades** | M | With PM Farm Upgrades' progression/prestige slice (M5) |
| — | Package P1 budget swap (streak 0.40 → 0.28) | data-only | Must be simmed before 1–3 are approved |

## 7. Open questions
**For Economy**
1. Run P1: streak cap 0.28 + A1 0.03 + B1 0.05/150 s + C1 1.25 in the ALL stack at F10/F18/F24, seeds 0–99. Report the mean and worst seed against 1.5–2.0 / ≤2.0, and casual separately. Report the smallest streak cap that keeps the mean ≥ 1.5.
2. Should A1 coins be multiplied by frenzy? Default no.
3. Does B1's visible-only accrual change the managed/unmanaged F22–24 ratio (≥ 1.5 gate)?
4. C3 costs fitted to the L12–20 buy cadence without breaking AC7 / acw1.

**For Head of Product**
5. Was Vadim's playtest build without golden egg/streak code (my rc1 read)? If so, item 0 may resolve much of the complaint, and a re-playtest with M4 mechanics on should come before any v2 build.
6. Is reallocating streak budget (P1) acceptable, or is 0.40 locked? Alternatively, PM Workers could trim abilities v0.2 (×1.15). That's their lever, not mine.
7. Should the CEO 2× rule be gated on the **worst seed** (today's practice) or the **mean**? It decides how much of this package fits. This is a CEO question; I'm only flagging it.
8. B1 save fields (`broody_nest_cents`, `broody_hen_idx`): OK, or reset the nest on reload?
9. `w2_asleep_collect_share` is 0.20 in `economy.csv` but 0.15 unless MK-33a ships in the same build (coop-full v0.6). Which one is the M4.2 baseline?

**Cross-team (FYI, no action requested by me)**
- PM Workers' post-automation slice: B1 must not overlap a worker ability on the same sprite.
- Art & UX: broody-hen glow and wobble, the golden-hen run, 360 px target density with golden egg + hen + Collect + streak meter.

## Sources checked today (2026-10-24)
[V] cookieclicker.fandom.com/wiki/Cookies_per_Click · /Cursor · /Wrinkler · /Easter_Season — clickerheroes.fandom.com/wiki/Upgrades · /Treasure_Chest — egg-inc.fandom.com/wiki/Research · /Boxes — hayday.fandom.com/wiki/Chicken — tt2-compendium.com …/chivalricorder · /barbaricfury · /heartofgold · /fairycharm — tap-titans-2.fandom.com/wiki/Skill_Tree (Heart of Gold / Fairy Charm placement).
Not found (404): egg-inc.fandom.com/wiki/Running_Chicken_Bonus, /Chickens; clickerheroes.fandom.com/wiki/Click_Damage. GiantBomb TT2 page: 403/timeout, not used.
