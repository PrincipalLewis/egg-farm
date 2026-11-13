# v2 research slice: breeds, research tree, prestige (Upgrades)
PM, Farm Upgrades · 2026-10-24 · for Head of Product · task D-CEO-20261024-05 (research + PM only; no code, no PRs; M4.2 build hold unchanged, decisions.md 2026-10-24 14:55)
Builds on `product/research/slices/upgrades.md` (the "v1 slice"). It does not repeat that slice. Cross-game findings on track splits, milestones, active bursts and the prestige formulas are in v1 §2–§3, and its sources are cited as [S1]…[S31]. Sources that are new in this slice are [V1]…[V8] (§7).

**Rules for this doc**
- Every current-game number cites the repo file it comes from. Every number labelled *proposal* is a starting value for Economy to model in `product/sim/economy_sim.py`. None of them changes `economy.csv`.
- External claims cite pages I opened on 2026-10-24 (§7). Where I only saw a search-result extract, the source line says so.
- Build size: S ≈ config plus one UI row. M ≈ a new system with UI, save fields and sim work. L ≈ a new loop or meta layer (same scale as the v1 slice).
- Scope boundary with the other v2 slices (decisions.md D-HOP-2026-10-23-02). Taps, combos and golden eggs belong to PM Collection. Post-automation worker play belongs to PM Workers. Orders, events and mini-goals belong to PM Market. Where a lever here touches one of those areas, I name the hook and leave the design to that slice's owner.

---

## 0. Summary (5 lines)
1. **The gap is real and measurable.** Farm L10 is reached at about 10.0 min p50 and the next unlock, the Grader at F18, comes at about 28.0 min (`product/farm/late-curve-for-workers.md:31`; Grader tier 1 at F18 in `product/economy.csv` w4_price_mult/w4_tier_cost). Between them there are 18 minutes with no new system: by then all three hires (F3/F7/F8, `product/economy.md:67`) are done, and the only "new" things are track milestones.
2. **Fix 1: Breeds at F10.** An incubator hatches breeds from eggs you could otherwise sell, so every egg becomes a choice: sell it or hatch it. Breeds are collected in an album with 4 rarities, and you place the ones you want in a small number of nest slots. Size M.
3. **Fix 2: a Farm Lab research tree at F12.** It has 4 branches that map onto the Coop (Farm), Flock (Hens and breeds), Market (Egg value) and Crew (Workers) systems. Tiers unlock in the Egg Inc. way, by buying enough of the previous tier. Some nodes unlock *new things* rather than adding %. Size M.
4. **Later: prestige ("Show Day").** It should not come before breeds and research exist, because those are what it carries over: the album and a permanent "Heritage" branch. Earliest point is F30 on shipped data (≈40.75 min with workers), or the L50 teaser point if L30+ ships (≈98 min). Size L.
5. **Together these meet the PM principles from minute 10 to 30.** A new system or visual arrives every 2–4 min (F10, F12, F14, F16, F18), with hatch and research completions in between, so there is always a near-affordable next buy and no 3-minute dead zone. Exponential costs stay, balanced by album and research milestone multipliers. Economy must re-run AC7 and the gap gates before any of this is built.

## 1. Recommended sequencing for minutes 10–30 (fixes "nothing to do after L10 + 3 workers")
Timing anchors (F1 baseline p50): F10 10.0 min, F18 28.0 min, F20 38.0 min (`product/farm/late-curve-for-workers.md:31`). Levels take 45–105 s each up to F13 and 150–300 s by F14–20 (`product/f1-midgame-stall.md:21`). With M4 workers and abilities the model gives L23 at 30:00 (`product/workers/m4-abilities-spec.md:35`, AC-W7). Farm-level gates below are *proposals*. Economy should convert them to minutes on the M4 table.

| Beat | Gate (proposal) | ≈ p50 time (F1 anchors) | New thing the player sees | Why it keeps a purchase in view |
|---|---|---|---|---|
| B1 | **F10** | 10 min | **Incubator + Breed album (8 entries) + 1 nest slot.** First hatch is free and guaranteed Common. | The hatch timer (≈60–90 s, proposal) ends with a reveal. The album shows 7 locked silhouettes. |
| B2 | **F12** | ≈12–13 min | **Farm Lab, tier 1** (4 cheap nodes, one per branch). | Node costs sit next to the track costs (§3.3), so something is affordable within about 60 s. |
| B3 | **F14** | ≈15–17 min | **Nest slot 2 + Lab tier 2.** Rare breeds join the hatch pool. | It's the first real choice of which 2 breeds to place. The Balanced farm 3 tier at all tracks ≥ 15 is the visible next goal (`economy.csv` balanced3_level 15). |
| B4 | **F16** | ≈20–23 min | **Breed stall:** one rotating offer bought with coins, refreshed every 5 min (proposal). Special-egg hooks for PM Market. | It's a second source of breeds and a reason to look in every few minutes. |
| B5 | **F18** | ≈28 min | **Grader T1 (existing) + Lab tier 3 Crew branch** (PM Workers decides the content). | It ties into the existing unlock, so nothing is new in engineering terms. |
| Later | F20 nest slot 3 · F24 Legendary in the pool · F30 (shipped max) or L50 (L30+) **Show Day prestige** | 38 min + | Prestige teaser first, then the real prestige once §4's prerequisites hold. | Prestige is planned, not shipped in v2-early. |

How each PM principle is met:
- **A visible, near-affordable next purchase.** Hatches cost eggs, not coins, so you can always start one. Lab nodes are priced at 0.4–1.0× the current Farm step (§3.3).
- **A new system or visual every few minutes.** B1–B5 come every ≈2–5 min, and each hatch reveals a new sprite.
- **No dead zone over 3 min.** Each hatch (60–90 s) and each research (§3.3: 90–240 s, proposal) is a purchase or decision event. Economy should add them to the "purchase gap ≤3 min" gate in `product/late-game-curve-model.md`.
- **Exponential costs balanced by milestone multipliers.** Album completion at 4/8/12 breeds gives +5/+10/+15% egg value (proposal). Lab tier completion also gives a milestone bonus.
- **Prestige planned for later.** See §4. It starts as a teaser only, which `late-game-curve-model.md` already lists at L50.

---

## 2. Lever (a): chicken breeds (buy, hatch, drop), rarity, traits, album
### 2.1 Precedents
| Game | What it does | Source |
|---|---|---|
| Egg, Inc.: egg types | A value ladder (Edible 0.25 → Superfood 1.25 → Medical 6.25…) unlocked by Farm Value thresholds. Already covered in v1 §2.1. | [S7] |
| Egg, Inc.: Artifacts | 4 rarities, **Common / Rare / Epic / Legendary**, plus tiers. They come from **missions (a drop)** or **crafting**. Only **2 can be equipped** (4 with Pro Permit), and only 1 of each type per farm. Unwanted ones can be consumed for Golden Eggs. The effects map onto our tracks: Quantum Metronome (laying rate), Demeters Necklace and Tungsten Ankh (egg value), Gusset (habitat capacity), Lunar Totem (away earnings), Puzzle Cube (research cost). | [V1] |
| Egg, Inc.: Drones | A **random drop on tap**: about one every 23.375 s on average, paying cash 70% of the time and Golden Eggs 30%. Elites are 8% of drones and pay more. Rewards scale with a hidden "struggle" catch-up multiplier. | [V2] |
| Cookie Clicker: Garden | **Breeding by adjacency.** 34 species come from mutations when parents are adjacent to an empty plot. Base chances run from 50% down to 0.0098%. A **seed log** (album) is kept through ascension, while plants are cleared. The plot grows from 2×2 to 6×6 as Farm level rises. Effects are mostly small passives (+1% CpS, +2% click, golden-cookie frequency). Completing the log unlocks "Sacrifice Garden" for a permanent bonus. | [V3] |
| Hay Day: Chicken | Chickens are **bought** for 20 / 140 / 270 coins at XP levels 1 / 12 / 23. A coop houses 6. Each chicken gives eggs every 20 min and **needs feed**. The cost and capacity gating follow the level. | [V7] |
| Chicken Merge Idle | A **chicken collection with rarity tiers** (6 Legendary, 252 Mythical), legendaries **hatched via a random "Mystery Egg Lottery"**, a "Chick-o-pedia" or "Seen-o-pedia" album, plus Ascension and a second prestige layer. *Read from the Play Store and r/incremental_games text returned by WebSearch; the pages were not opened directly.* | [V8] |
| Idle Miner Tycoon: Managers | Rarity-like grades (Junior / Senior / Executive) with longer active effects and cooldowns (1/3/10 min, cooldowns 5/15/50 min). Already in v1 §2.3. | [S20] |
| Idle Farming Empire: crop tiers | Bronze +100% → Platinum +20,000%, upgraded with puzzle pieces from Shoeboxes. Already in v1 §2.5. | [S27] |

**Takeaways for us.** (1) A limited number of **equip slots** turns a collection into a decision; Egg Inc. allows 2 artifacts [V1]. (2) The **album persists** through resets while the active layout is cleared, as with Cookie Clicker seeds [V3]. That makes breeds a natural thing for prestige to carry over (§4). (3) Small passive % effects are fine when there are many of them and the slots are limited [V3][V1].

### 2.2 Acquisition sources: pros and cons
| Source | Pros | Cons | Proposed use |
|---|---|---|---|
| **Hatch** (spend eggs + timer in an Incubator) | Gives eggs a **second use**, so every egg is a sell-or-hatch choice. Today demand is pinned at about 1.2× production and 81–100% of orders fill (`product/research/active-play-study.md:17`), so selling is never a decision. The timer makes a come-back moment. It's free of coins, so it's always available. | Hatching competes with orders: Economy must check that order fill and AC7 hold. Some RNG frustration. Timers can feel mobile-game-like. | **Primary source, from F10.** |
| **Buy** (coins, Breed stall with a rotating offer) | Deterministic and readable. It's a coin sink competing with the tracks, which adds decisions. Hay Day precedent [V7]. | If it's the only source, the album becomes a shopping list. It can dominate best-buy. | **Secondary, from F16.** One offer at a time, refreshed every 5 min (proposal). Common and Uncommon only. |
| **Drop** (golden egg / order reward / milestone) | Surprise and delight, and it rewards active play. Egg Inc. drones [V2], CC garden drops [V3]. | Pure RNG with no agency. It depends on PM Collection's golden-egg design and PM Market's orders. | **Tertiary.** It offers a hook only: a breed token in the golden-egg reward table. PM Collection decides weight and timing. |
| Breed (merge two owned breeds) | It's the deepest system, as in CC Garden mutations [V3]. | It's L-sized with a lot of UI, and too much for a 10-minute player. | **Not in v2.** Revisit after prestige. |

### 2.3 Proposed behaviour
- **Roster v1 (8 breeds, proposal; names are placeholders for Art & UX):**

| Breed | Rarity | Trait (applies while placed in a nest slot) | Track it touches |
|---|---|---|---|
| Leghorn | Common | +5% lay rate | Hens (eggs/s) |
| Sussex | Common | +15% offline eggs | Hens (offline; `offline_eggs_per_sec` column) |
| Rhode Island Red | Common | +5% egg value | Egg value (price) |
| Plymouth Rock | Uncommon | +8% coop capacity | Farm (coop cap) |
| Orpington | Uncommon | +10% lay rate while the coop is under 50% full | Hens: rewards collecting. It's a mild Egg Inc. running-bonus analogue [S1]. |
| Silkie | Rare | Workers resting in the nest gain energy 10% faster (manual Rest only; not Pause) | Workers, **flagged for PM Workers**. It changes *refill*, not the Tired/normal intervals that PM Workers fixed for M4.2. **Resolved for v2 scoping (PMW, 2026-10-24 23:31; accepted by PM Collection):** see §6 H6. |
| Ameraucana | Rare | 5% of eggs are **blue eggs** that sell at ×2 | Egg value. Hook for PM Market (blue-egg orders). |
| Ayam Cemani | Legendary | +10% egg value **and** +10% lay rate | Both. This is the chase item. |

- **Nest slots:** 1 at F10, 2 at F14, 3 at F20 (proposal). Only placed breeds apply their trait, so you choose (Egg Inc. equip limit [V1]). Every owned breed counts toward the album.
- **Duplicates** add a star to that breed, up to 3 stars, each +50% of its base trait (proposal). Beyond 3 stars a duplicate converts to "Feed" that cuts hatch time by 30 s (proposal), so a duplicate is never wasted.
- **Album milestones:** owning 4 / 8 breeds (and 12 / 16 when later rosters ship) gives a permanent +5 / +10 / +15 / +20% egg value (proposal). This follows the Cookie Clicker milk pattern, where collection becomes production [S13].
- **Hatch:** one incubator. Cost is `hatch_eggs = round(hatch_eggs_k × eggs_per_sec(F))`, i.e. k seconds of production. Rarity rolls are weighted, with a pity counter.
- **Visual:** placed breeds walk in the yard as distinct sprites, and the album is a grid. This gives the "new visual every few minutes" that the 3 tracks lack.

### 2.4 Interaction with the Farm / Hens / Egg value tracks and caps
- **Caps are untouched.** Breeds never raise the Hens or Egg value level cap (min(maxLevel, F + 3); `product/farm/m4a-spec.md` M4A-2, `economy.csv` hens_cap_over_farm = egg_value_cap_over_farm = 3), Farm's max (farmMax 50 on L30+ data, decisions.md 2026-10-19 HoE triage), or the 55 track max. Farm stays the spine (v1 §9a).
- **Breeds are multipliers on top of tracks:** eggs/s = Hens eggs/s × (1 + Σ lay traits); price = (M4A-5 price × grade × Balanced × Grader) × (1 + Σ value traits) × album bonus. Economy decides additive versus multiplicative stacking (open question E1).
- **Best buy / next-goal strip (m4a §18):** hatches cost eggs, not coins, so they should **not** be best-buy candidates. Breed-stall buys should be excluded in v2 too, so the ★ logic and F4 trace hashes (F4-25) are unchanged. Engineering confirms.
- **Demand follows Farm (v1 §5a).** If lay traits push Hens-ahead play, the market binds sooner. That's intended (v1 §7.3 bottlenecks), but Economy checks order fill.

### 2.5 Tunables (all *proposal, to be modelled by Economy*)
| Column (proposed) | Start value |
|---|---|
| `breeds_unlock_farm` | 10 |
| `nest_slots_farm` | 10 / 14 / 20 → 1 / 2 / 3 slots |
| `hatch_eggs_k` (seconds of current eggs/s) | 60 (≈660 eggs at F10, where eggs_per_sec = 11.0 in `economy.csv` row 10) |
| `hatch_time_s` | 75 |
| `rarity_weights` C/U/R/L | 70 / 22 / 7 / 1 (Legendary 0 before F24) |
| `pity_rare_after` | 8 hatches without a Rare or better |
| `star_cap`, `star_step` | 3, +50% of base trait |
| `album_bonus` | +5 / +10 / +15 / +20% egg value at 4 / 8 / 12 / 16 owned |
| `stall_refresh_s`, `stall_price_k` | 300 s; 1.0× the current Farm step cost |
| Trait magnitudes | as in the §2.3 table |

### 2.6 Edge cases
- **Hatching takes eggs reserved for an order in the queue.** The hatch only draws from the basket *minus* the eggs committed to the order being served. If the basket is short, the button reads "Need {n} eggs".
- **Offline:** the incubator keeps running offline and the reveal plays on return, after the offline modal (AC11 order).
- **Coop full while a breed with a coop trait is unslotted:** capacity drops below the current coop count. Clamp new eggs, don't delete existing ones. Egg Inc.'s Gusset does the same thing by refusing removal while the capacity is in use [V1].
- **Pity and save-scumming:** roll the result at hatch *start* and store it in the save, so reloading can't reroll (the CC Garden save-scum trivia [V3]).
- **Migration:** v7 saves get `breeds: {}`, `nestSlots: []` and `incubator: null`. Players already at F ≥ 10 see the unlock explainer once (same pattern as M4-AC-EXP1).
- **Grader stacking:** the top-end price stack (Jumbo × Grader T5 × Balanced 5 × breeds × album) must stay within Economy's late-curve envelope. Economy sets a cap if needed.
- **Accessibility:** rarity uses shape and label as well as colour.

### 2.7 Telemetry (proposal)
`breed_unlock_shown {farm_level}` · `hatch_started {eggs_spent, basket_before, farm_level, pool}` · `hatch_completed {breed, rarity, source:'hatch'|'stall'|'drop', duplicate, stars_after, pity_triggered}` · `nest_slot_changed {slot, breed_in, breed_out}` · `album_milestone {owned, bonus}` · `breed_stall_bought {breed, cost}` · `incubator_idle_s` (time the incubator sits empty, the key engagement signal).
**Success signal:** at F10–F18, median gap between player actions ≤ 90 s and ≥ 60% of players hatch at least 3 times (proposal targets).

### 2.8 Build size
**M**: data table, incubator, album UI, nest slots, save fields, sim. It becomes L if breeding/merging is added (not proposed).

---

## 3. Lever (b): research tree ("Farm Lab")
### 3.1 Precedents
| Game | What it does | Source |
|---|---|---|
| Egg, Inc.: Common Research | Paid in in-run cash, **13 tiers**. A tier unlocks after "purchasing enough levels of research from previous tiers". It **resets on prestige**. Lines compound multiplicatively. Already in v1 §2.1. | [S1] |
| Egg, Inc.: Epic Research | Bought with Golden Eggs and **permanent**, e.g. Soul Food and Prestige Bonus. | [S4] |
| Idle Miner Tycoon: Skill System / Research Island | **7 skill trees**, one per continent, with points bought in that continent's currency. The Research Island needs **5.6T cash** to unlock. Skills level up. **Respec costs 400 Super Cash** for all trees, or 100 per continent. The trees cover income, barrier and prestige cost, ad boosts, and manager durations and cooldowns. | [V5][V6] |
| Realm Grinder: Research | Research Points come from reincarnations ((x+1)·x/2 at R x) and are capped per facility. **Research Slots limit how many upgrades are active.** Slots reset on abdication, "enabling the player to make different research builds each run". Six facilities, each tied to factions. Unlocks at R16+. | [V4] |
| Cookie Clicker: Heavenly upgrades | A prestige-currency **tree**, including offline-production nodes (Twin Gates). Already in v1 §2.4. | [S12] |

**Takeaways.** (1) Gating tiers by "N bought in the previous tier" keeps the tree linear enough for casual players and still gives choice [S1]. (2) Branches tied to existing systems (IMT continents, RG factions) make research feel like part of the game rather than a separate one [V5][V4]. (3) A slot limit or respec cost creates *builds*, but that's late-game depth. For a 10–30 min player, Egg Inc.'s "buy levels, unlock next tier" is the right complexity.

### 3.2 Proposed behaviour
- **Unlock at F12** (proposal). A **4th Upgrades view** reached from the Farm tab ("Lab" button on the tracks block). This avoids a 4th tab at 375 px, which v1 §8 rejected as Option B. Art & UX decide.
- **Branches:**
  - **Coop** (Farm): coop capacity %, queue patience. It must *not* raise Hens or Egg value caps.
  - **Flock** (Hens and breeds): lay rate %, hatch time −%, nest slot +1 (one unlock node), pity −1.
  - **Market** (Egg value): egg price %, blue-egg chance (needs Ameraucana), order bonus (hook for PM Market).
  - **Crew** (Workers): content is **owned by PM Workers**. Suggested shape: refill cooldown, ability charge. It must respect PM Workers' rule that M4.1/M4.2 don't touch Tired/normal intervals (decision noted 2026-10-24; the M4.2 fatigue spec is UI-only).
- **Tiers:** T1 at F12, T2 at F14, T3 at F18, T4 at F22, T5 at F26 (proposal). A tier also needs 5 node-levels bought in the tier below, as in Egg Inc. [S1]. Each node has 1–5 levels.
- **One research at a time with a short timer** (90–240 s, proposal). It runs while you play and does *not* stop production. It's another come-back beat, and one research slot is easy to read.
- **Unlock nodes** (at least one per tier) give a *new thing*, not just a %: nest slot +1 (Flock T2), second incubator (Flock T3), blue-egg orders (Market T3, needs PM Market), auto-hatch a Common when the incubator is idle for 60 s (Flock T4; it automates a chore once the player understands it).
- **Tier-complete milestone:** owning every node in a tier gives +5% income (proposal). This is the "milestone multiplier" that balances exponential costs.

### 3.3 Interaction with tracks and caps
- **Pricing so research competes with tracks.** A tier-T node costs 0.4–1.0× the Farm step cost at its unlock level (proposal). For example, at F12, `farm_cost` is 2,138, so T1 nodes would cost ≈850–2,100 coins. Hens costs 838 and Egg value 1,470 at that level (`economy.csv` row 12). The result is a 4-way choice (Farm, Hens, Egg value, Lab) with comparable prices.
- **Caps:** research never changes `*_cap_over_farm`, `maxLevel` (30, `game-rc1-ui/src/config/balance.json:83`) or farmMax. Farm stays the gate.
- **Best buy:** two options. (A) Exclude Lab nodes from bestBuy in v2, so F4 is unchanged. (B) Include them as a new candidate kind, which changes AC7 traces and the F4 strip. **Recommend A** for the first release. Open question H3.
- **Prestige:** the Coop, Flock, Market and Crew nodes reset on Show Day (Egg Inc. common research [S1]). A 5th **Heritage** branch, bought with prestige currency, is permanent [S4][S12].

### 3.4 Tunables (all *proposal, to be modelled by Economy*)
`lab_unlock_farm` 12 · `lab_tier_farm` 12/14/18/22/26 · `lab_tier_req_levels` 5 · `lab_node_cost_k` 0.4–1.0 × farm_cost[F_unlock] with growth ×1.5/level · `lab_time_s` 90 / 120 / 150 / 180 / 240 by tier · `lab_node_effect` +5% per level (coop/lay/price), hatch −10 s per level · `lab_tier_bonus` +5% income per completed tier · `lab_slots` 1 concurrent.

### 3.5 Edge cases
- **Research running at app close:** the timer completes offline and the result is applied before the offline grant (same order as the v1 §9 migrate-then-grant rule), so offline eggs use the new rate only from the completion time. Simpler alternative: apply it on return with no retroactive gain. Economy picks.
- **A node whose host system isn't unlocked yet** (blue-egg chance without an Ameraucana): show it locked with "Needs Ameraucana" and don't let it be bought.
- **Respec:** none in v2. Prestige is the respec.
- **A cost exceeds the current Farm step for a long time:** Economy's gap gate must count research as a purchase only when it's affordable within 60 s.
- **A Coop % node while the coop is full:** the capacity increase applies immediately and existing eggs are untouched.
- **At 375 px:** node cards keep the 44 px targets and the 13 px label floor (v1 §8).

### 3.6 Telemetry (proposal)
`lab_unlocked {farm_level}` · `lab_opened {farm_level, coins}` · `research_started {node, tier, level, cost, farm_level, sec_since_last_buy}` · `research_completed {node, tier, level, offline}` · `lab_tier_unlocked {tier, farm_level, t_since_session_start}` · `lab_tier_completed {tier}`.
**Success signal:** ≥ 70% of players who reach F12 start a research within 2 min. Lab spend is 15–35% of coins spent between F12 and F20 (proposal targets: a real choice, not dominant and not ignored).

### 3.7 Build size
**M**: tree data in CSV, one view, a timer, save fields, sim. Each unlock node that needs a new system (second incubator, blue-egg orders) is costed with that system.

---

## 4. Lever (c): prestige ("Show Day"), later
### 4.1 Precedents (extending v1 §2 and §3.5–3.6; formulas not repeated)
| Game | Currency and rule | What it means for us | Source |
|---|---|---|---|
| Egg, Inc. | Soul Eggs give +10% each, with yield from earnings **since the last prestige** (exponent ≈0.15–0.21). Prophecy Eggs compound at +5% each, in **limited supply**, from contracts and trophies. Epic research, artifacts and the Hyperloop are kept. | A frequent-reset model. A limited "prophecy" currency is a good fit for **album milestones**. | [S2][S3][S5][S4] |
| AdVenture Capitalist | Angels give +2% each, based on lifetime earnings^0.5. **Spending angels removes their bonus.** | Spend-or-keep is a real decision but confusing for casual players, so it's deferred. | [S9] |
| Cookie Clicker | Heavenly chips follow a cubic curve. Prestige levels give +1% CpS each after the unlocks. There's a heavenly upgrade **tree**. **Garden seeds survive ascension.** | A permanent **Heritage** research branch, and **the album persists** across resets. | [S12][V3] |
| Realm Grinder | Abdication keeps factions, gems and trophies. Research **slots reset** each run; RPs persist. | "New build each run": nest slots and Lab reset, the album stays. | [S31][V4] |
| Idle Miner Tycoon | Per-mine prestige for a cash cost gives a fixed multiplier ladder (4× → 145×). | Simpler alternative: a fixed ladder rather than a currency formula. Option P-B. | [S19] |
| Chicken Merge Idle | Two prestige layers (Ascension, Quantum Collapse) on a chicken collection. | A chicken-themed precedent for prestige plus collection (search extract only). | [V8] |

### 4.2 When it fits (what must be true first)
- **Not in minutes 10–30.** The fix for the L10 gap is breeds and the Lab. Prestige at minute 15 would reset a player who hasn't finished learning the game.
- **Timing anchors in our data.**
  - Shipped data stops at maxLevel 30 (`balance.json:83`), and the workers model reaches F30 at about **40.75 min** (`product/workers/m4-abilities-spec.md:35`).
  - The L30+ candidate reaches L50 in ≈98 min with workers, but 0/30 seeds reach it without workers (`product/late-game-curve-model.md`). Its unlock list already has "L50 prestige teaser only".
  - v1 R5 found sim steps over 10 min from about L23–25.
- **Recommendation:**
  - **P0 (with breeds and Lab):** a teaser card at the last level ("Show Day is coming: your album and Heritage research will carry over").
  - **P1:** real prestige becomes available when Farm ≥ `show_day_farm`. That's F30 if L30+ doesn't ship, or F40 with a nudge at F45–50 if it does. Prestige also needs the yield to be at least the minimum that gives ≥ ×1.5 income next run (proposal).
- **Prerequisites:**
  1. Breeds (album) and the Lab exist, so something carries over and the Heritage branch has something to buy.
  2. HoP decides whether L30+ ships, which sets the gate.
  3. Save tracking of `runEarningsCents` and `lifetimeEarningsCents`.
  4. Economy models the yield and the second-run curve: run 2 should reach the previous gate in ≤ 50% of the time (proposal; Pecorella on doubling [S18]).
  5. Telemetry shows a meaningful share of sessions passing 40 min.
  6. Engineering costs a reset that keeps the album and Heritage.

### 4.3 Proposed behaviour (P1)
- **Currency: Rosettes** (show ribbons; placeholder name). Rosettes = floor((runEarnings / `rosette_k`)^`rosette_exp`). Proposal: exp 0.5 since-run, so a longer run pays more. That is between Egg Inc.'s frequent-reset curve and AdCap's lifetime curve [S2][S9][S18]. Each unspent Rosette gives **+5% income** (proposal).
- **Option P-A (recommended): keep-only.** Rosettes are never spent, and Heritage research is unlocked by *total Rosettes owned* thresholds. There is no spend-or-keep trap.
- **Option P-B:** an IMT-style fixed ladder, for example ×2, ×3, ×5 for Show Day 1, 2, 3 at a coin cost [S19]. Simplest to read, but it has a finite ceiling.
- **Option P-C (later):** AdCap-style spend-or-keep [S9]. Not for v2.
- **Resets:** coins, Farm, Hens, Egg value, Collection levels, worker hires and tiers, Coop/Flock/Market/Crew research, nest *placements*, and incubator contents. **Kept:** the album, breed stars, Heritage research, Rosettes, achievements, settings.
- **Album as a "Prophecy" layer:** completing an album row gives a capped number of Golden Rosettes that each compound +5% on Rosettes. This mirrors Prophecy Eggs [S5], is capped by roster size, and gives collectors a long-term goal.

### 4.4 Interaction with tracks and caps
- After Show Day the tracks restart at 0 with the same caps (F+3) and costs. Rosettes multiply income, so run 2 moves faster through the same exponential curve. That is the standard "milestone multiplier balances exponential cost" pattern [S17].
- Heritage nodes can include **starting levels**, for example starting at Farm 3 with Market Hand already hired. They must stay ≤ the hire gates so the onboarding steps aren't skipped in confusing ways.
- The Grader's tier gates stay on Farm (v1 §9a #7), so they're re-earned each run.

### 4.5 Tunables (all *proposal, to be modelled by Economy*)
`show_day_farm` 30 (or 40 with L30+) · `rosette_k` set so the first eligible run at the gate yields ≈10 Rosettes (×1.5 next run) · `rosette_exp` 0.5 · `rosette_bonus` +5% each · `golden_rosette_bonus` +5% compounding, cap = number of album rows · `heritage_thresholds` 10/25/50/100 Rosettes · `show_day_min_gain` ×1.5.

### 4.6 Edge cases
- **Accidental prestige:** a two-step confirmation showing what you keep and lose and the Rosettes you'll get. Prestige is disabled when the yield is under `show_day_min_gain`.
- **Prestige with orders queued, a hatch running, or research in progress:** these are forfeited, with a warning line. An incubated breed is either finished instantly or refunded as Feed (proposal).
- **Offline grant pending:** grant it first, then prestige.
- **Corrupt-save recovery:** the run and lifetime earnings fields must be covered by the CSR rules (`product/farm/corrupt-save-recovery-spec.m41-final.md`). A restored older save must never reduce a lifetime counter below the value already shown.
- **Rollback:** a pre-prestige build loading a post-prestige save is an AC owned by Head of Engineering, as for M4.
- **Workers energy and wages after a reset:** hires reset, so wages reset with them. PM Workers confirms there's no orphaned energy state.

### 4.7 Telemetry (proposal)
`show_day_teaser_shown {farm_level, run_minutes}` · `show_day_available {farm_level, rosettes_offer}` · `show_day_confirm_opened` / `show_day_cancelled {rosettes_offer}` · `show_day_done {run_index, run_minutes, rosettes_gained, rosettes_total, album_owned}` · `heritage_bought {node}` · `run_milestone {run_index, farm_level, minutes}` (compares run 1 and run 2 pacing).

### 4.8 Build size
**L**: a new meta layer, reset logic, save fields with CSR coverage, Heritage UI, and a sim of runs 1–3.

---

## 5. Cross-lever summary
| Lever | Fixes the L10 gap? | When (proposal) | Size | Depends on |
|---|---|---|---|---|
| (a) Breeds, incubator, album | **Yes, directly** (F10) | v2-early | M | Economy (hatch cost vs. order fill), Art & UX (sprites, album), PM Collection (drop hook), PM Market (blue-egg hook), PM Workers (Silkie trait) |
| (b) Farm Lab research | **Yes** (F12–F26 beats) | v2-early, right after (a) | M | Economy (pricing vs. tracks), Art & UX (Lab view), PM Workers (Crew branch) |
| (c) Show Day prestige | No: it's the late-game answer | v2-late, after (a) and (b) and the L30+ decision | L | HoP (L30+ ship), Economy (yield), HoE (reset + CSR) |

## 6. Open questions
**For Head of Product**
- H1. Do you approve the order: breeds at F10 → Lab at F12 → prestige later? Or do you want the Lab first? It's cheaper in art but has less visual novelty.
- H2. Should hatching cost **eggs** (a sell-or-hatch decision, my recommendation) or **coins** (simpler, but it's just another coin sink)?
- H3. Should Lab nodes and breed-stall buys be **excluded from best buy / ★** in v2, to keep F4 and the AC7 traces stable (recommended), or included?
- H4. Prestige gate: F30 on shipped data, or does it wait for the L30+ decision (F40–50)? And is keep-only Rosettes (P-A) acceptable as the first version?
- H5. Where do the Lab and album live at 375 px: in the Farm tab, as a new tab, or a bottom-nav item? This is for Art & UX; v1 §8 rejected a 4th segmented tab.
- H6. **Silkie: RESOLVED for v2 scoping (2026-10-24 23:33 CEST).** PM Collection accepts PM Workers' position (`product/workers/m5.1-worker-failure-cost-proposal.md` v0.3.6, 23:31; also logged against breeds spec §10 #8):
  - Silkie's +10% energy recovery applies **only to manual Rest in the nest, never to Pause**.
  - Pause stays a wage-free hold with no faster energy recovery, per the M5.0 Pause principle: "Pause is **not** designed to be a better way to recover energy" (`product/workers/m5-worker-pause-spec.md`).
  - Extending Silkie to Pause would need a **CEO change request**, because M5.0 is frozen. Silkie is not in M5.1.
- H6 (original). Scope boundaries: the Silkie trait (worker refill) needs PM Workers' agreement, blue eggs need PM Market's, and breed drops from golden eggs need PM Collection's. Do you want these joint items listed in `product/m5-interaction-plan.md`?

**For Economy**
- E1. Should breed, album and Lab bonuses stack **additively within a source and multiplicatively across sources**? And what is the top-end cap with Grader T5 × Jumbo × Balanced 5?
- E2. With `hatch_eggs_k` = 60 s of production and demand pinned at about 1.2× production, how far does order fill drop from 81–100%? What k keeps it ≥ 75%?
- E3. Can the "purchase gap ≤ 3 min" and "affordable within 60 s" gates count hatches and research completions as purchase events? Re-run them from F10 to F20 with these beats.
- E4. Lab node pricing at 0.4–1.0× `farm_cost[F_unlock]`: does the greedy bot buy them at 15–35% of spend, or ignore or over-buy them?
- E5. What `rosette_k` gives ≈10 Rosettes at the first gate, and does run 2 reach that gate in ≤ 50% of run 1's time (with workers)? Without workers the L30+ curve fails to reach L50 (`late-game-curve-model.md`), so is the prestige gate worker-dependent?
- E6. Do Farm-level beat gates (F10/12/14/16/18) still land 2–5 min apart on the M4 table? The anchors in §1 are F1-baseline.

---

## 7. Sources
Sources new in this slice, opened on 2026-10-24 unless noted:
- V1 Egg Inc. Artifacts: [egg-inc.fandom.com/wiki/Artifacts](https://egg-inc.fandom.com/wiki/Artifacts)
- V2 Egg Inc. Drones: [egg-inc.fandom.com/wiki/Drones](https://egg-inc.fandom.com/wiki/Drones)
- V3 Cookie Clicker Garden: [cookieclicker.fandom.com/wiki/Garden](https://cookieclicker.fandom.com/wiki/Garden)
- V4 Realm Grinder Research: [realm-grinder.fandom.com/wiki/Research](https://realm-grinder.fandom.com/wiki/Research)
- V5 Idle Miner Tycoon Skill System: [idleminertycoon.fandom.com/wiki/Skill_System](https://idleminertycoon.fandom.com/wiki/Skill_System) (WebSearch extract)
- V6 Idle Miner Tycoon Research Points: [idleminertycoon.fandom.com/wiki/Research_Points](https://idleminertycoon.fandom.com/wiki/Research_Points) (WebSearch extract); Kolibri Help Center, "What are Skills and the Research Island?": [kolibri-games.helpshift.com](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/50-what-are-skills-and-the-research-island/?p=all) (WebSearch extract)
- V7 Hay Day Chicken: [hayday.fandom.com/wiki/Chicken](https://hayday.fandom.com/wiki/Chicken)
- V8 Chicken Merge Idle: [Google Play listing](https://play.google.com/store/apps/details?id=engineer.number.mergechickenlite) and the developer's [r/incremental_games post](https://www.reddit.com/r/incremental_games/comments/1dsuzrl/merge_chicken_idle_update_android_only/) (WebSearch extract only; not opened directly; treat as weak)

Sources reused from the v1 slice (`product/research/slices/upgrades.md` §11.1): S1 [Egg Inc. Research](https://egg-inc.fandom.com/wiki/Research), S2 [Soul Eggs](https://egg-inc.fandom.com/wiki/Soul_Eggs), S3 [Prestige](https://egg-inc.fandom.com/wiki/Prestige), S4 [Epic Research](https://egg-inc.fandom.com/wiki/Epic_Research), S5 [Eggs of Prophecy](https://egg-inc.fandom.com/wiki/Eggs_of_Prophecy), S7 [Eggs](https://egg-inc.fandom.com/wiki/Eggs), S9 [AdCap Angel Investors](https://adventure-capitalist.fandom.com/wiki/Angel_Investors), S12 [Cookie Clicker Ascension](https://cookieclicker.fandom.com/wiki/Ascension), S13 [Milk](https://cookieclicker.fandom.com/wiki/Milk), S17 [Pecorella Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i), S18 [Pecorella Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii), S19 [IMT Prestige](https://idleminertycoon.fandom.com/wiki/Prestige), S20 [IMT Managers](https://idleminertycoon.fandom.com/wiki/Managers), S27 [IFE crop tiers](https://futureplaygames.theymes.com/hc/en/idle-farming-empire/articles/how-do-i-know-which-crop-to-choose-for-most-profit-67), S31 [Realm Grinder Abdication](https://realm-grinder.fandom.com/wiki/Abdication).

**Dropped:**
- cookieclicker.fandom.com/wiki/Research (404).
- A "Cluckium" chicken-merge site that appeared in search. Its page carries gambling-style "wagering requirements" text, so it isn't a credible game source and isn't used.
- Reddit threads aren't cited as fact, except the V8 developer post as a weak extract.

**Repo files used for numbers:** `product/economy.csv` (rows 10, 12, 18; columns hens_cost, egg_value_cost, *_cap_over_farm, balanced*, w4_*, eggs_per_sec), `product/economy.md:67`, `product/farm/late-curve-for-workers.md:31`, `product/f1-midgame-stall.md:21`, `product/workers/m4-abilities-spec.md:35`, `product/late-game-curve-model.md`, `product/research/active-play-study.md:17`, `product/farm/m4a-spec.md` (M4A-2, §18, §19), `game-rc1-ui/src/config/balance.json:83`, `product/decisions.md` (2026-10-19 HoE triage; 2026-10-24 entries).
