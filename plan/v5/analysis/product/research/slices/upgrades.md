# Research slice: upgrade and progression structure in idle games
PM, Farm Upgrades · 2026-10-16 · for Head of Product · deadline Mon Oct 19 18:00
Status: complete draft. Includes the HoP addition (Vadim direction, M4 must-have): separate Hens and Egg value tracks (§6–§9).

**Rules for this doc**
- Every external claim has a source in §11. Each one was opened with WebFetch on 2026-10-16. Pages that 404'd, returned 403 or timed out were dropped (list in §11.2).
- **Timings:** I give minutes/hours only where a verified source states them. Most wikis give unlock *conditions* (counts, currency amounts), not play time. Those cells say "no verified timing". I did not convert them into minutes.
- Fit (1–5) and build cost (S/M/L) are my own judgement for our game, not sourced facts. S ≈ config plus one UI row; M ≈ a new system with UI, save fields and sim work; L ≈ a new loop or meta layer.
- **All numbers in §7 are proposals** for the Economy/Balance Designer to model. None of them changes `economy.csv`.

---

## 1. Our problem, in our own data
Vadim's playtest: by about Farm L10 the game plays itself. The repo already explains why:
- **One button carries the whole run.** Farm bundles hens, coop cap, egg price, customer speed, order size and queue slots (feature-spec §2). The AC7 player model is literally "buy Farm when affordable, Collection only if ≤50% of the next Farm cost". The best strategy is a fixed rule, so there is no decision to make.
- **Taps don't matter.** Tap rate barely matters down to 0.25 taps/s (L10 +0.2 min), because eggs per tap far exceeds production (feature-spec §7).
- **The market follows production automatically.** Demand is pinned at about 1.2× production at every level (economy.md rationale), so selling never becomes a constraint you have to plan around.
- **Workers (M2) automate whatever was left:** collect, sell and grade.
- Result: from about L10 on, every choice has one dominant answer. The idle games below avoid this with (a) several tracks that bottleneck each other, (b) milestone thresholds that make *when* you buy matter, (c) short active windows on top of idle income, and (d) a reset layer that turns "too slow" into a choice.

## 2. Per-game findings

### 2.1 Egg, Inc. (Auxbrain)
**Structure**
- **Split tracks on one farm.**
  - Habitats cap chicken count. There are 4 hab slots and 19 hab tiers, and the price depends on copies owned [S6].
  - Chickens come from the hatchery and internal hatcheries [S1].
  - Shipping is its own cap, set by vehicles. The game warns "Your farm is making more eggs than the shipping depot can handle!" [S8].
  - Egg value has its own research lines (e.g. "Nutritional Supplements +25% egg value", "Bigger Eggs DOUBLES egg value") [S1]. A bigger step comes from upgrading the egg type itself: Edible 0.25 → Superfood 1.25 → Medical 6.25…, each unlocked at a Farm Value threshold [S7].
- **Common Research** costs in-run currency (Bocks) and resets on prestige. It is organised in 13 tiers, and a tier unlocks only after "purchasing enough levels of research from previous tiers on your current farm" [S1]. Because the research lines differ, they compound multiplicatively [S1].
- **Epic Research** costs Golden Eggs and is permanent. It includes Soul Food (+1 pp per Soul Egg bonus) and Prestige Bonus (+10% Soul Eggs per level) [S4].
- **Prestige**
  - Unlocks as soon as you own one Soul Egg from any source [S3].
  - It resets chickens, common research, habs, silos, vehicles and the egg type. Epic research, mystical eggs, artifacts and the Hyperloop are kept [S3].
  - Each Soul Egg gives +10% earnings [S2].
  - The Soul Egg yield depends on Bocks earned *since the last prestige*, with an exponent of roughly 0.15–0.21 (piecewise) [S2]. Pecorella's 2017 analysis quotes about 0.14 [S18], an older version; the wiki formula is current.
  - Wiki rule of thumb: "if the game is slowing down … it's time to prestige" [S3]. Gains as a share of your total shrink with each prestige [S3].
- **Prophecy Eggs:** each compounds the Soul Egg bonus by +5% (multiplicative). They come from contracts, trophies, the calendar and seasons, and the supply is limited (231 listed) [S5].
- **Active skill layer (important for us):** the Running Chicken Bonus pays only while habs are *not* full. Advanced players deliberately leave one hab research level unbought to keep it alive [S1][S6]. Capacity therefore creates an active decision instead of just being a cap.

**Unlock cadence:** conditions, not times. Research tiers unlock by levels bought; eggs unlock by Farm Value; prestige unlocks at the first Soul Egg. **No verified timing.** The Reddit threads on "when to first prestige" (via search) could not be opened (403/timeout) and are excluded.

**Fit 5/5.** Same fiction (hens, eggs). Its capacity / hen count / shipping / value split maps one to one onto our Farm(coop) / Hens / Market / Egg value. It's the clearest evidence for Vadim's split.
**Build cost:**
- Track split: M.
- Research tiers: M.
- Prestige: L.
- Running-bonus-style active mechanic: S–M.

### 2.2 AdVenture Capitalist (Hyper Hippo / Kongregate)
**Structure**
- **Per-business count milestones.** Lemonade Stand doubles profit speed at 25, 50, 100, 200, 300 and 400 owned, then gives profit ×4 at 500, 600, …, ×5 at 1000, and so on [S11].
- **Two kinds of milestone.** "Profit Speed Doubled" (production rate) and "Profit ×N" (value per cycle) are separate effects [S11]. This is a production/value split delivered as milestones.
- **Cross-business milestones.** Newspaper Delivery milestones boost *other* businesses (e.g. 125 papers: Lemonade ×2; 500: Shrimp Boat ×11) [S11].
- **"Capitalist" unlocks** trigger only when *every* business reaches a count (25, 50, 100…) and boost all of them [S11]. That is a cross-track balance reward.
- **Managers** are bought with cash and automate one business each (Lemonade manager $1,000; Newspaper $15,000; …) [S10]. Automation is a purchase you choose to make, not a default.
- **Angel Investors (prestige)**
  - Each angel gives +2% profit, and only after a reset [S9].
  - Angels can also be *spent* on upgrades, which removes their +2% bonus. The wiki: "be sure that the benefit … outweighs the loss" [S9]. That is a deliberate spend-or-keep trade-off.
  - Yield: (lifetime earnings / (400 B/9))^0.5 minus angels already claimed [S9]. Pecorella: about 3–4× the previous run's earnings to double prestige currency [S18].
- **Design note from AdCap's mobile lead producer:** if the newest generator always dominates, "older generators are largely irrelevant and removes any interesting decisions". Varying milestone multipliers per generator makes "different generators take priority" over time [S17]. This is our L10 problem in one sentence.

**Unlock cadence:** by count owned and cash. **No verified timing.**
**Fit 4/5.** Milestones and the cross-track "all ≥ N" reward port directly to three tracks. Spendable prestige is a later layer.
**Build cost:**
- Per-track milestones: S.
- Cross-track milestones: S.
- Managers: already covered by our Workers.
- Spend-or-keep prestige: L.

### 2.3 Idle Miner Tycoon (Kolibri Games)
**Structure**
- **Three components that bottleneck each other:** Mine Shafts (production), Elevator (transport) and Warehouse (selling). "If only one of these three is lacking in throughput the amount of money that reaches your Warehouse is limited (bottleneck)" [S23].
- **Named strategies exist because the three are separate** [S24]:
  - Balanced: all three at the same cash rate.
  - Shaft-Ahead: over-invest in production, then use active Super Manager bursts.
  - Shaft-Behind: elevator- or warehouse-ahead, or stockpiling.
  That is player choice created by the split.
- **Shaft milestones:** a "boost (a large gain in extraction)" at levels 10, 25, 50, 100, 200, 300…800, and an extra worker at levels 10, 50, 100, 200 and 400. Shafts max at level 800; elevator and warehouse at 2400 (2800 with core shafts) [S22][S21].
- **Gates:** a rock barrier every 5 shafts, which unlocks after a timer or for ads/Super Cash. Core shafts 31–35 need mine Prestige 5 [S22].
- **Managers** unlock when shaft 1 reaches level 5 [S23]. Each has an *active ability*: 1 min effect / 5 min cooldown (Junior), 3 / 15 min (Senior), 10 / 50 min (Executive). Examples: mining speed ×3–7, cost reduction 40–80% [S20].
- **Prestige is per mine.** It resets that mine only and gives a permanent multiplier (Coal Mine 4× → 20× → 30× → 45× → 60× → 145× over 6 levels) for a fixed cash cost [S19].
- On value: I found **no verified source** for per-shaft ore value. IMT's split is production versus transport/sell throughput, not a separate value track.

**Unlock cadence (verified real-time numbers):** manager abilities 1 / 3 / 10 min with 5 / 15 / 50 min cooldowns [S20]; barrier timers exist, but their durations aren't stated on the page [S22]. Managers unlock at shaft L5, a level condition [S23].
**Fit 5/5.** Our coop → basket → market chain *is* a three-stage pipeline. Balanced versus ahead strategies are exactly the decisions we lack.
**Build cost:**
- Bottleneck tuning across our existing three stages: S–M (mostly balance).
- Active manager abilities: S, since our Workers have energy/Manage already.
- Per-farm prestige: L.

### 2.4 Cookie Clicker (Orteil)
**Structure**
- **Golden Cookies, the active layer.**
  - They spawn every 300–900 s by default (average ≈447 s, ≈121 s with Lucky Day + Serendipity) and stay on screen 13 s [S15].
  - Effects: Frenzy ×7 CpS for 77 s; Lucky = the lesser of 15% of bank or 15 min of CpS; Click Frenzy ×777 per click for 13 s [S15].
  - Lucky creates a real *banking decision*: keep at least 100 min of CpS in the bank, 700 min with Get Lucky [S15].
- **Achievements → Milk → Kittens.** Each achievement gives +4% milk. Kitten upgrades multiply CpS by (1 + milk × factor), e.g. Kitten helpers unlock at 13 achievements [S13]. Achievements become a production track.
- **Ascension (prestige)**
  - Heavenly Chips and prestige levels follow a cubic curve: level X needs X³ × 1 trillion cookies baked all time [S12]. Pecorella: about 8× the previous run to double [S18].
  - Each prestige level gives +1% CpS, but only after buying the unlock upgrades [S12].
  - Heavenly upgrades form a tree. It includes offline-production upgrades (Twin Gates: 5% CpS for 1 h offline) and permanent upgrade slots [S12].
- **Community ascension guide:** first ascension at 365 HC (48.6 quintillion cookies baked) buys 9 of 129 upgrades. It assumes active play with golden cookies and lists idle variants [S14][S16].

**Unlock cadence (verified):** golden cookie spawn intervals and buff durations in seconds [S15]. **First-ascension play time: no verified timing.** The Reddit threads (36–40 h, "about a week") could not be opened and are excluded.
**Fit 4/5.** A "golden egg" or "rush customer" active burst fits our tap-and-sell loop at low cost. The milk-style achievement multiplier is cheap. A full heavenly tree is too big for us now.
**Build cost:**
- Golden-egg event: S.
- Achievement multiplier: S–M.
- Ascension tree: L.

### 2.5 Idle Farming Empire (Futureplay)
**Structure**
- **Market Day (prestige):** "trade your current crops for Seeds". Seeds give a static profit % bonus to all crops *and* are a shop currency [S25].
- **Spend versus keep:** spending Seeds lowers the bonus, e.g. "27 million Seeds and spend 25 million on an upgrade affecting just one crop, you will likely see your overall profits take a hit" [S26].
- **Crop tiers (a value track separate from plots):** Bronze +100%, Silver +500%, Gold +2,500%, Platinum +20,000% and up, via Puzzle Pieces from Shoeboxes. Each crop is tied to a specific plot [S27].

**Unlock cadence:** Shoeboxes unlock after planting the 9th plot [S27]. **No verified timing.**
**Fit 4/5.** Farm theme. Its per-item quality tiers are a clean model for our Egg value/quality track. Its prestige reuses the Market/selling fiction, which is ours too.
**Build cost:**
- Quality tiers: S–M.
- Seed-style prestige: L.

### 2.6 Clicker Heroes (Playsaurus) — extra
- Hero Souls give +10% DPS each.
- Ascension earns 1 soul per 2000 hero levels. Primal bosses from zone 100 add more ((level−80)/25)^1.3 [S28].
- Pecorella: currency is based on upgrades bought, which "effectively take[s] a log", and each run is independent of the last [S18].

**Timing:** conditions only (zone 100). **No verified timing.**
**Fit 2/5.** Combat fiction; souls-per-level is the only portable idea.
**Build cost:** L.

### 2.7 Antimatter Dimensions — extra
- **Layered resets inside one run.**
  - The first 4 Dimension Boosts reset the run but unlock dimensions 5–8. Each costs 20 of your highest dimension, +15 after that. Each boost gives ×2 to dimensions [S29].
  - Antimatter Galaxies are the 2nd reset tier: they start at 80 Eighth Dimensions, +60 each [S30].
- Small, frequent resets that *unlock* things are a cadence tool. They are not just multipliers.

**Timing:** none on the pages. **No verified timing.**
**Fit 2/5.** Abstract. A "mini-reset that unlocks a track" is too punishing for our casual target.
**Build cost:** L.

### 2.8 Realm Grinder — extra
- Abdication resets buildings, upgrades and coins but keeps factions, gems and trophies [S31]. Gems cost n(n+1) × 5e11 coins [S31] (square-root yield, about 4× to double, [S18]).
- The wiki's abdication rule is decision-based: abdicate when you can't "increase your income significantly by buying an upgrade after the next couple of spell combos" [S31].

**Fit 2/5.** Faction choice per run is interesting, but heavy.
**Build cost:** L.

## 3. Cross-game patterns
1. **Separate tracks that bottleneck each other create decisions; a bundle removes them.**
   - Egg Inc.: habs / chickens / shipping / egg value [S1][S6][S8].
   - IMT: shaft / elevator / warehouse, with named strategies [S23][S24].
   - AdCap: speed versus profit milestones [S11].
   Our Farm row is the opposite: one bundle, one dominant rule.
2. **Count/level milestones with uneven multipliers.** They make *when* you buy matter and rotate priorities [S11][S17][S22]. Rewards that trigger only when every track passes a threshold reward balance, which counters single-track rushing [S11].
3. **Short active windows on long cooldowns.** Golden cookies every ~2–15 min with 13–77 s effects [S15]; IMT manager abilities 1–10 min on 5–50 min cooldowns [S20]; Egg Inc.'s running-chicken bonus [S1]. These keep an engaged player making timing calls while idle income continues.
4. **Capacity as a tension, not just a cap.** Egg Inc.'s running bonus dies when habs are full [S1], and its shipping cap visibly warns you [S8]. Our coop cap already exists; it just never binds in an interesting way.
5. **Prestige comes when the run stalls.** The yield formula sets reset behaviour:
   - Since-reset with a flat exponent (Egg Inc. ≈0.15–0.21) encourages frequent resets [S2][S18].
   - Lifetime with a square/cube root (AdCap, Cookie Clicker) means you must go further each time [S9][S12][S18].
   - The guidance across wikis is the same: reset when buying slows [S3][S31].
6. **Spend-or-keep prestige currency** (AdCap angels, IFE seeds) is a recurring source of real decisions [S9][S26].
7. **Automation is earned and partial.** Managers are bought per business or unlock at a level [S10][S23], and they come with active abilities [S20]. They don't remove decisions.

## 4. Recommendations (ranked by fit ÷ cost)
| # | Recommendation | Fixes L10? | Fit | Cost | Evidence |
|---|---|---|---|---|---|
| R1 | **Unbundle Farm into Farm (capacity + unlocks), Hens (production) and Egg value/quality (price), with the coop cap and queue as real bottlenecks.** Lets "Hens-ahead", "Value-ahead" and "Balanced" strategies exist (§7). Matches Vadim's M4 direction. | Yes, the main fix | 5 | M | [S1][S6][S8][S23][S24] |
| R2 | **Per-track milestones at uneven levels plus cross-track "all tracks ≥ N" bonuses.** Changes what the best next buy is every few minutes. | Yes | 5 | S | [S11][S17][S22] |
| R3 | **An active burst on a cooldown:** a "Golden Egg" or rush/VIP customer every few minutes, and/or a Worker active ability (e.g. Coop Hand rush ×3 for 60 s, 5-min cooldown) that the player times. Pair it with a banking or coop-room decision (keep coop space free for the burst). | Yes, for engaged players | 4 | S | [S15][S20][S1] |
| R4 | **An achievement multiplier** ("Farm Ribbons": each ribbon +x% egg value). Turns goals into a production lever. | Partly | 4 | S–M | [S13] |
| R5 | **Prestige ("Market Day" / "New Breed") after M4,** triggered when the run stalls (our sim shows steps over 10 min from about L23–25), with a since-run, flat-exponent yield and a spend-or-keep currency. | Late game, not L10 | 4 | L | [S2][S3][S9][S25][S26] |
Not recommended now: multi-layer resets (Antimatter Dimensions), faction runs (Realm Grinder), soul-per-level (Clicker Heroes). Fit ≤2 and cost L.

## 5. Open questions (research)
1. Play-time benchmarks for first prestige in Egg Inc., AdCap and Cookie Clicker. The only sources found were Reddit, which couldn't be opened here. If we want them, a human should read them in a browser, or we run our own playtest.
2. ~~Collection's +12% price bonus~~ **Resolved (HoP, 2026-10-16), see §5a:** it moves to the Egg value track by default. Economy models both options; HoP confirms with PM Collection on Thu Oct 22.
3. ~~Grader vs. Egg value~~ **Resolved (HoP, 2026-10-16), see §5a:** Grader stays a separate worker that multiplies quality on top of Egg value. Revisit at prestige.
4. ~~What demand follows~~ **Resolved (HoP, 2026-10-16), see §5a:** demand follows Farm, not Hens.

## 5a. Decisions (Head of Product, 2026-10-16, M4 direction, open to Economy's model)
1. **Demand follows Farm, not Hens.** Order size and customer interval are derived from Farm level (market size). Hens stays capped at **Farm + 3**.
   - Implementation note: today `demandRange(F)` uses k = eggsPerSec(F) × base interval. In M4, k is computed from the Farm-level reference production (the old 0.2 × (5 + 5F) curve), not from the live Hens rate.
2. **The +12% Collection price bonus moves to the Egg value track by default.** Economy models both options (bonus on Collection vs. on Egg value). HoP confirms with PM Collection on **Thu Oct 22**.
3. **Grader stays a separate worker**, multiplying quality *on top of* Egg value (the w4 tiers ×1.5 / 2.0 / 2.5 / 3.0 / 4.0 are unchanged). Revisit at prestige.
4. **Migration default approved:** Hens and Egg value are set equal to the saved Farm level (identity split, §9).

---

## 6. How other games split production and value (HoP addition, part 1)
| Game | Capacity / gate | Production | Value per unit | Throughput / sell | Source |
|---|---|---|---|---|---|
| Egg, Inc. | Habitats: 4 slots × 19 tiers cap chickens | Chickens via hatchery and internal hatchery research; laying-rate research (Comfortable Nests +10%/level…) | Egg-value research (Nutritional Supplements +25%/level, Bigger Eggs ×2, …) and the egg type (Edible 0.25 → Superfood 1.25 → …) | Vehicles/shipping cap, eggs/min, with an over-cap warning | [S1][S6][S7][S8] |
| Idle Miner Tycoon | Barriers every 5 shafts; core shafts gated by Prestige 5 | Shaft levels (extraction, speed, workers; boosts at 10/25/50…) | No verified separate value track | Elevator + Warehouse levels; bottleneck rule | [S21][S22][S23] |
| AdVenture Capitalist | — | "Profit Speed Doubled" milestones (cycle speed) | "Profit ×N" milestones (value per cycle) | Managers automate cycles | [S10][S11] |
| Idle Farming Empire | Plots (crop tied to plot) | Plots/crops | Crop rarity tiers +100% → +20,000%… | — | [S27] |
| Cookie Clicker | — | Buildings (count) | Global multipliers: kittens × milk from achievements | — | [S13] |

**Takeaway:** the two closest games (Egg Inc. and IMT) both keep *capacity*, *production* and *throughput* separate, and Egg Inc. also keeps *value* separate. Nothing in the research argues against Vadim's split. The one caution: the split only creates decisions if the tracks constrain each other (IMT's bottleneck rule [S23], Egg Inc.'s full habs / shipping cap [S1][S8]). Three independent "+income" buttons would play itself just like one.

## 7. Draft track structure: Farm / Hens / Egg value (HoP addition, part 2)
**All values below are PROPOSALS for the Economy/Balance Designer to model in `sim/economy_sim.py`.** Start values are chosen so a migrated save has identical stats (§9).

### 7.1 What each track buys
| Track | Buys | Proposed formula (start = today's value) | Level cap |
|---|---|---|---|
| **Farm** (capacity + unlocks) | Coop capacity, customer queue slots, market size (customer interval and order size), coop looks, Worker unlocks (F3/F7/F8), Grader tier gates, **the Hens level cap** | coop 50 + 50F; queue min(10, 6 + floor(F/5)); interval as today; cost floor(100 × 1.35^F) (F1 segments when merged) | 30 |
| **Hens** (production) | Hens → eggs/s | hens 5 + 5H; eggs/s 0.2 × hens (H0 = 1.5 starter nest); cost floor(36 × 1.30^H) via column `hens_cost` (HoP adopted 36) | **min(30, F + `hens_cap_over_farm`)** = min(F+3, 30): hens need coop room (Egg Inc.'s hab cap [S6]) |
| **Egg value** | Base egg price and quality grades | price (1 + `egg_value_base_step`·V) × (1 + `egg_value_level_bonus`·V) = (1 + 0.05V)(1 + 0.12V) × grade × Grader. **Collection loses its +12% (TR-6)**; Economy adds both columns. Cost floor(48 × 1.33^V) via column `egg_value_cost` (HoP adopted 48) | min(30, F + `egg_value_cap_over_farm`), grade gates on Farm (7.3) |

### 7.2 Milestones inside each track (proposal; pattern from [S11][S22])
- **Hens:** at H10 / H20 / H30, "laying boost" ×1.25 / ×1.5 / ×2 **eggs/s** (never price). Uneven on purpose. Columns `hens_ms_levels`/`hens_ms_mult`: owner Economy. Toast `Hens L{n}: laying boost ×{mult}` (Art & UX).
- **Egg value:** quality grades at V5 "Grade A" ×1.1, V10 "Large" ×1.25, V20 "Jumbo" ×1.5 (only if F ≥ `egg_grade_farm_gate` = 15, else Large stays) on the Egg value **price**. Columns `egg_grade_*`: owner Economy. Toast `Egg value L{n}: {grade} ×{mult}` (Art & UX). **They stack with the Grader; they don't replace it.** Charged price = base Egg value price × grade multiplier × Grader tier multiplier (w4, when hired and awake; tired/asleep shares as today). Grades are milestones the track earns. The Grader is a worker you hire and manage. Economy models the combined top end (e.g. ×1.5 Jumbo × ×4.0 Grader T5 = ×6.0) against the late curve.
- **Farm:** keeps the coop looks at F5/F10/F20 and the queue steps.

### 7.3 Cross-track milestones and gating (proposal; pattern from [S11] Capitalist unlocks, [S1] research tiers)
- **"Balanced farm" bonus:** tier k = highest with min(F,H,V) ≥ 5 / 10 / 15 / 20 / 25 multiplies the **unit price** by 1.10 / 1.15 / 1.20 / 1.25 / 1.30. Columns `balanced_levels`/`balanced_mult`: owner Economy. Strip `Balanced farm {k}/5 · next +{x}% at all ≥ {N}`, toast `Balanced farm {k}/5: +{x}% income`, top `Balanced farm 5/5 · +{y}%` (Art & UX, m4-tracks-copy.md). It rewards balance and punishes single-track rushing.
- **Gates:**
  - Hens and Egg value ≤ min(F + `*_cap_over_farm`, 30) = min(F+3, 30). Capped row: `Needs Farm L{n}` (n = F+1); at max `MAX` (Art & UX).
  - Egg grades need a Farm level, e.g. "Jumbo" needs F15 (packing shed).
  - Farm itself is never gated, so the spine stays clear.
- **Bottlenecks that make the choice matter:**
  1. Coop cap. Hens-ahead fills the coop fast, so you need taps or a Coop Hand. Egg Inc.'s running bonus shows a full-cap penalty can be designed as a tension [S1].
  2. Market demand tied to Farm (decided, §5a). Hens without Farm leaves eggs unsold in the basket.
  3. Egg value raises income without more eggs, so it's the strongest buy when the market is the limit.
- **Sim acceptance (proposal):**
  - Balanced, Hens-first and Value-first bots each finish within ±15% of each other at 30 min. No single dominant rule.
  - "Cheapest-first" stays ≥70% (as AC7).
  - The best next buy changes at least every 3 purchases in L5–20. That's a measurable "decisions matter" metric.
  - **M4 AC7 (HoP decision, 2026-10-16 12:37; post-F1 baseline):** the greedy best-ROI buyer across all tracks (Farm, Hens, Egg value, Collection) reaches **L18 within ±10% of the F1 time** (F1 seller15 p50 ≈ 19.8 min, so about 17.8–21.8 min; Economy to confirm the exact figure). The **level reached at 30:00 stays in L18–22**. There is **no dead zone over 3 min** (no stretch without an affordable purchase). "Level" here is read as Farm level; Economy to confirm.
  - **TR-5 (QA gate fix 2):** the bot is `product/farm/m4/tr5_run.py` (Collection-aware greedy best-ROI, 3-buy lookahead), table `product/economy.m4-candidate.csv` (then economy.csv after the F1+M4 merge), standard scenario, 30 seeds; pass = median in band AND ≥24/30 seeds in band for each criterion.
  - The Hens-first / Value-first / Balanced ±15% spread and the "best buy changes" metric above are PM proposals on top of this AC, not part of it.

### 7.4 Risks
- Three rows is more UI. Mitigate with a "best value" hint, and keep the time-to-afford hint (F7) per row.
- Demand follows Farm (§5a), so the market binds. Economy must check that Hens-ahead isn't simply wasted, i.e. that the basket and offline stock sell through later.
- AC7/F1 pacing and `late-curve-for-workers.md` must be re-simulated.

## 8. UI tab placement (HoP addition, part 3) — **flagged for Art & UX coordination**
Current (`art-ux/layout-spec.md` §3.5 and the 375 px note): the Upgrades panel has segmented tabs, **Collection | Farm | Workers**, at about 112 px each at 375 px. Labels have a 13 px floor and go icon-only below 340 px. Desktop ≥960 px docks Market and Upgrades with tabs at the top of the column. Tab hit areas are ≥44×44.
- **Option A (recommended): keep 3 tabs.** The Farm tab becomes a 3-row "Farm" screen: **Hens · Egg value · Farm (coop & unlocks)**, plus a "Balanced farm N/5" progress strip at the top showing the next cross-track milestone. This works like IMT's single screen with shaft, elevator and warehouse together [S23]. No new tab width at 375 px; reuses the existing row component (§4.5) and the F7 hint per row.
- **Option B: 4 tabs, Collection | Hens | Eggs | Farm.** Workers moves to the bottom nav or is merged in. About 84 px per tab at 375 px, so it likely needs icon-only tabs (below the label floor). Not recommended.
- **Option C:** fold Collection into the Eggs tab (tap and value together), giving Hens | Eggs | Farm | Workers. Depends on Q2.
- **Art & UX input (2026-10-16), adopted:** keep 3 tabs (Option A).
  - The Farm tab has **one row per track** (Hens, Egg value, Farm). Each row shows an icon, the track name, its level and a buy button of at least 44 px.
  - The **cheapest affordable row gets a next-goal highlight**, same logic as `next-goal.ts` cheapest-candidate.
  - The **cross-track bonus strip sits at the top as segmented progress**: one segment per track, filled up to the next threshold N, so the weakest track is obvious.
  - Options B and C are dropped.
- Art & UX still to define: icons for Hens and Egg value, the milestone strip layout, the badge rule (any affordable row), and the onboarding step 3 target (currently "Upgrade row buy").

## 9. Save migration questions for Engineering (HoP addition, part 4)
Current save: v5 (`save.ts` migrations 1→5). `GameState` holds `farmLevel` and `collectionLevel`. The validator checks NUM_FIELDS `coinsCents, coop, basket, collectionLevel, farmLevel` and caps the levels at `maxLevel`. The new tracks need a **v6→v7** migration (HoP 2026-10-16: v6 is already in use; the v5 references above are historical) that adds `hensLevel` and `eggValueLevel`.

**Mapping options**
1. ~~Identity split~~ **Superseded (HoP 2026-10-16): price-matched start.** hensLevel = F; eggValueLevel = lowest V whose v7 price ≥ v6 price, capped min(F+3, 30) (F10/15/20 → V7/10/14); Collection keeps its levels. First-minute income ×1.23–1.37. See m4a-spec M4A-28. **TR-4:** after migration eggs/s and price are each ≥ their pre-migration values (price = new formula at the migrated V; eggs/s exact at F<10; matches m4-manage-proposal TR-4). Milestones already reached apply immediately, celebrated silently.
   - Downside: their next purchases are priced at level F on *three* curves, a big jump in total cost per unit of progress. Economy needs to check the first 10 minutes after migration.
2. **Split plus partial refund:** set Hens and Value to floor(F × k) and refund coins for the levels removed.
   - Stats drop on load, which needs a message: "Your farm was reorganised: +$X refunded".
3. **Reset the new tracks to 0 and refund their share** of the Farm cost (needs a fixed share, e.g. ⅓ each).
   - Clean economy, but the biggest stat drop.

**Edge cases**
- F30 (MAX): Hens 30 is within cap F + 3 = 33 → 30. Value 30.
- Hens > F + 3 can't happen under identity. It *can* happen if an old build writes the save later; clamp on load.
- Worker unlock thresholds (w1 F3, w2 F7, w3 F8) and the Grader tiers (w4 F18–F24) keep reading farmLevel. See the full gate table in §9a.
- Offline modal (AC11): eggs/s must come from hensLevel in the saved state, not from farmLevel.
- `celebratedTier` (coop looks) stays derived from farmLevel, with no replayed celebration.
- Customers already queued keep their demand (F4 rule). New demand uses the new formula.
- Save written mid-purchase: the atomic rule (AC8) now covers three level fields.
- Validator: add the new fields to NUM_FIELDS, integer checks and per-track max.
- Downgrade/rollback (a v6 build loading a v7 save): **AC owned by Head of Engineering** (QA gate fix 9).
- New fixtures: `m4-v7-*` alongside `m2-rc1-v5-*`. Update `SHA256SUMS.txt`. Add migration tests from v4 and v5 fixtures.
- F1 cost segmentation merges Wed Oct 21. If M4 lands later, the migration must use the F1 table.
- Telemetry: purchase events need a `track` field.
- Time-to-afford hint per row.

**Head of Engineering notes (2026-10-16)**
- **One save-version migration**, v6→v7, the same pattern as `save.ts` migrations 1–5. Estimate: about **2 days plus tests**.
- **Cap and refund:** if a new track's max is below the old Farm max, cap the level and refund the cost difference. The refund amount comes from **`economy.csv`, not code**: the sum of that track's cost column for the levels removed. Under the current proposal (all max 30, Hens cap F + 3 ≥ F) identity never exceeds a max, so the rule only applies if Economy lowers a max.
- **Order on load: migrate first, then apply the offline grant**, so AC11 eggs use the v7 Hens level.
- **No mid-purchase state** exists in the save, so there's nothing to migrate there. **Pending offline eggs are kept as they are.**

**Questions for Engineering** (a) is answered: identity is approved. (b) and (c) are still open:
- (a) Is identity split acceptable?
- (b) Can a refund be granted inside the migration, or does it need a first-load modal (like AC11)?
- (c) Should a migration happen silently or with a one-time explainer?

## 9a. Unlock gates and formulas keyed to `farmLevel`, with proposed driving track
Source: `rg farmLevel game-rc1-ui/src` (2026-10-16), plus the formula and config definitions behind each hit. Proposal rule: **Farm drives capacity, queue, patience, market, looks, worker unlocks and Grader gates.** Only production moves to Hens and only price moves to Egg value.

| # | Gate / formula | Where (game-rc1-ui/src) | Today | Proposed driver | Why |
|---|---|---|---|---|---|
| 1 | `coopCapacity(F)` | game.ts:64, sim/tick.ts (cap), ui/app.ts:417, debug/panel.ts:24 | 50 + 50F | **Farm** | Capacity is Farm's job; it's the coop bottleneck for Hens-ahead play |
| 2 | `queueMax(F)` | ui/s2-economy-ui.ts:18, ui/app.ts:42 (seenSlots), :276 | min(10, 6 + floor(F/5)) | **Farm** | Market size |
| 3 | `patienceS(F)` | sim/tick.ts (timeouts), ui/app.ts:276 | constant 30 s (F ignored) | **Farm** | Keep the Farm signature for future tuning. No change now |
| 4 | `customerIntervalS(F)`, `demandRange(F)` | config/formulas.ts:35, :38 (via tick) | interval max(3, 10 × 0.95^F) × 0.5; demand from k = eggsPerSec(F) × base | **Farm** (§5a) | Demand follows Farm. k uses the Farm reference curve, not live Hens |
| 5 | `coopTier(F)` coop looks, `celebratedTier` | sim/state.ts:39, ui/app.ts:375, save/save.ts:13 | F5/F10/F20 | **Farm** | Visual milestone of the spine. Migration keeps it with no replay |
| 6 | Worker hire gate `unlockFarm` (w1 Market Hand F3, w2 Coop Hand F7, w3 Hawker F8) | sim/actions.ts:36, sim/workers.ts:30, ui/workers-ui.ts:57, ui/next-goal.ts (W1–W3) | farmLevel ≥ unlock_farm | **Farm** | Unlocks are Farm's job. One readable spine |
| 7 | Grader tier gates (w4 T1–T5 at F18/19/21/22/24) | sim/actions.ts:43, ui/next-goal.ts (W4) | farmLevel ≥ tier.farm | **Farm** | Grader stays a separate multiplier on top of Egg value (§5a). Gating it on Egg value would double-reward one track |
| 8 | Next-goal candidates and `farmLabel` suffixes ("unlock X", "new coop", "Grader tier k") | ui/next-goal.ts:17–34 | FARM, COLL, W1–W4 | **Farm** for the labels. **Add HENS and VALUE candidates** | Matches the Art & UX cheapest-row highlight (§8) |
| 9 | Wages `wagePerSecCents` / `wageCents` / `resumeNeedCents` | ui/s2-economy-ui.ts:9,14, sim/tick.ts:61–77, sim/workers.ts:24,44, ui/workers-ui.ts:57 | Market Hand 0.25 × F $/min, Coop Hand 0.5 × F $/min | **Farm (keep)**, see the exception check below | Predictable payroll on the spine |
| 10 | Coop-hand tip | ui/workers-ui.ts:83, config/balance.json:80 | F ≥ 7 (`coop_hand_tip_min_farm`) and coop full ≥ `coop_hand_tip_full_s` | **Farm** | Tied to the W2 unlock at F7. The coop-full trigger already reacts to Hens-ahead play |
| 11 | Workers intro A (Market Hand) | ui/app.ts:519 | F ≥ unlock_farm(MH) and coins ≥ hire cost | **Farm** | Same gate as #6 |
| 12 | `eggsPerSec(F)` in tick | sim/tick.ts (coop fill) | 0.2 × (5 + 5F), F0 = 1.5 | **Hens** | The one production exception: this is the split |
| 13 | `offlineEggs(away, F)` | sim/offline.ts:4–11 | eggsPerSec(F) × 0.25, cap 2 h | **Hens** | Offline = production. Runs after migration (§9 order) |
| 14 | `eggPriceCents(F, C)` | sim/actions.ts:14 | (1 + 0.05F)(1 + 0.12C) | **Egg value**: (1+0.05V)(1+0.12V) × grade × Balanced × Grader; Collection loses +12% (TR-6) | The price exception: this is the split |
| 15 | Farm buy / max | sim/actions.ts:23–26, save/save.ts:73,86 | farmLevel only | Add `hensLevel` and `eggValueLevel` buy kinds, NUM_FIELDS and max checks | Engineering, v7 |
| 16 | Telemetry `farm_level` (worker_yawn, worker_hire) | sim/tick.ts, sim/actions.ts:38 | farm only | Keep `farm_level`; add `hens_level` and `egg_value_level` | Lets the telemetry review attribute progress by track |
| 17 | Debug panel f+/f− and level display | debug/panel.ts:29,43 | Farm and Collection | Add h± and v± | QA tooling |

**Exception check: should wages follow Farm?**
- **Yes, keep Farm (recommended).**
  - Wages are a fixed cost of running a bigger farm, and the player sees them change only when they buy Farm. Today's labels and hints assume that.
  - If wages followed Hens, every Hens buy would also raise costs. That taxes the production track and pushes players toward Value-ahead. If they followed Egg value, the Market Hand would cost more as each sale earns more, which roughly cancels the Value track's benefit.
- **Effect worth modelling:** in Hens-ahead play the Coop Hand's work (collecting) grows while its wage (Farm) doesn't, so hiring it becomes relatively better. That's an intended synergy, not a bug.
- Economy to confirm in the sim that Unpaid/resume thresholds (`resumeNeedCents`) still behave when income comes mostly from Egg value.

**No other exceptions proposed.** `patienceS` takes F but ignores it today. Keep it on Farm so a future patience curve stays a Farm benefit.

## 10. Open questions (tracks)
- Q2, Q3, Q4: **resolved** by HoP on 2026-10-16 (§5a). Q2's final confirmation is with PM Collection on Thu Oct 22.
- Q5: **Resolved by HoP (2026-10-16):** M4 AC7 uses the post-F1 baseline, see §7.3. Still open: confirm that "L18" means Farm level, and the exact F1 L18 time.
- Q6: Are the cross-track bonuses multiplicative with Workers multipliers?
- Q7: Does the identity migration keep F1's L30 band (180–300 min) once Hens and Value costs are added?

## 11. Sources
### 11.1 Verified (opened with WebFetch, 2026-10-16) — 31
- S1 Egg Inc. Research — https://egg-inc.fandom.com/wiki/Research
- S2 Egg Inc. Earnings Bonus / Soul Eggs — https://egg-inc.fandom.com/wiki/Soul_Eggs
- S3 Egg Inc. Prestige — https://egg-inc.fandom.com/wiki/Prestige
- S4 Egg Inc. Epic Research — https://egg-inc.fandom.com/wiki/Epic_Research
- S5 Egg Inc. Eggs of Prophecy — https://egg-inc.fandom.com/wiki/Eggs_of_Prophecy
- S6 Egg Inc. Habitats — https://egg-inc.fandom.com/wiki/Habitats
- S7 Egg Inc. Eggs — https://egg-inc.fandom.com/wiki/Eggs
- S8 Egg Inc. Vehicles — https://egg-inc.fandom.com/wiki/Vehicles
- S9 AdCap Angel Investors — https://adventure-capitalist.fandom.com/wiki/Angel_Investors
- S10 AdCap Managers — https://adventure-capitalist.fandom.com/wiki/Managers
- S11 AdCap Unlocks (Earth) — https://adventure-capitalist.fandom.com/wiki/Unlocks_(Earth)
- S12 Cookie Clicker Ascension — https://cookieclicker.fandom.com/wiki/Ascension
- S13 Cookie Clicker Milk — https://cookieclicker.fandom.com/wiki/Milk
- S14 Cookie Clicker Ascension guide — https://cookieclicker.wiki.gg/wiki/Ascension_guide
- S15 Cookie Clicker Golden Cookie — https://cookieclicker.wiki.gg/wiki/Golden_Cookie
- S16 "When to use ascensions in Cookie Clicker" (Arqade) — https://gaming.stackexchange.com/questions/408093/when-to-use-ascensions-in-cookie-clicker
- S17 Pecorella, "The Math of Idle Games, Part I" (Kongregate/MIGS 2016) — https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i
- S18 Pecorella, "The Math of Idle Games, Part III" — https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii
- S19 IMT Prestige — https://idleminertycoon.fandom.com/wiki/Prestige
- S20 IMT Managers — https://idleminertycoon.fandom.com/wiki/Managers
- S21 IMT Elevator — https://idleminertycoon.fandom.com/wiki/Elevator
- S22 IMT Mineshafts — https://idleminertycoon.fandom.com/wiki/Mineshafts
- S23 IMT Fundamental Gameplay — https://idleminertycoon.fandom.com/wiki/Fundamental_Gameplay
- S24 IMT Mining Strategies — https://idleminertycoon.fandom.com/wiki/Mining_Strategies
- S25 Idle Farming Empire: Market Day — https://futureplaygames.theymes.com/hc/en/idle-farming-empire/articles/what-is-market-day-and-how-does-it-work-84
- S26 Idle Farming Empire: Spent Seeds — https://futureplaygames.theymes.com/hc/en/idle-farming-empire/articles/spent-seeds-but-my-profits-decreased-65
- S27 Idle Farming Empire: crop profit tiers — https://futureplaygames.theymes.com/hc/en/idle-farming-empire/articles/how-do-i-know-which-crop-to-choose-for-most-profit-67
- S28 Clicker Heroes Hero Souls — https://clickerheroes.fandom.com/wiki/Hero_Souls
- S29 Antimatter Dimensions Dimension Boost — https://antimatter-dimensions.fandom.com/wiki/Dimension_Boost
- S30 Antimatter Dimensions Antimatter Galaxy — https://antimatter-dimensions.fandom.com/wiki/Antimatter_Galaxy
- S31 Realm Grinder Abdication — https://realm-grinder.fandom.com/wiki/Abdication

### 11.2 Dropped
- 404, replaced by S5 and S22: egg-inc.fandom.com/wiki/Prophecy_Eggs, idleminertycoon.fandom.com/wiki/Mine_Shaft.
- Not openable (WebFetch timeout or 403; curl 403), so not used: Reddit r/CookieClicker 4zmh3a and 1qfafrd (first-ascension hours), r/EggInc 8cill5 and 1ckxr2t, r/EggsInc 17u66o5 (first prestige advice), r/IdleMinerTycoon b9k4lh (balancing).
- Not opened, so not used: Idle Farming Empire "seeds profit bonus" (article 58).
- Not covered: GDC/YouTube talks. None were opened, so none are cited. Pecorella's MIGS 2016 talk is used via his written series (S17, S18).

## M4 acceptance criteria added (HoP, 2026-10-16; revised for QA M4-A gate)
Authoritative wording: product/farm/m4a-spec.md (M4A-29, M4A-33).
- **M4-AC-MIG1 (refund guard):** under the price-matched rule `migrationRefundCents` = 0 (no Collection refund) for every save. Kept as a guard: if a future cap change removes levels, refund = Σ that track's cost column over removed levels (from economy.csv), added to coinsCents inside the v6→v7 migration, stored as `migrationRefundCents`, applied exactly once (re-load never doubles it).
- **M4-AC-EXP1 (one-time explainer, art-ux/m4-tracks-explainer.md v1.2):** existing saves only, in-session commit of the tracksV7 migration (SAVE_VERSION stays 6; see m4a-spec v1.14); saves created as v7 never see it. Non-blocking = no input is ever blocked (tick and Collect taps continue). Title "Upgrades got an upgrade!", body "Hens and Egg value are now separate. Top them up!" (no arrow; best-buy highlight points after dismiss), refund line only if `migrationRefundCents` > 0, "Got it". Shown once; dismissed by Got it, tap anywhere, Esc or 8 s; flag `seenTracksExplainer` set when shown. Reduced motion = 150 ms fade only. Milestones already reached are marked celebrated silently.
- **Rollback:** owned by Head of Engineering.
