# Interaction study v2: what gives a Farm L10+ player something meaningful to do
Head of Product · 2026-10-24 · for the CEO (D-CEO-20261024-05, from Vadim's 15:40 playtest) · research + product only, no code, no PRs

**Status:** v1.1 draft (PM Collection slice folded in; §3a corrected to pay coins, not eggs). The plan built on it goes in `product/m5-interaction-plan.md`.
**How to read it:** "[src N]" points to §6. Each external number is quoted from the page it cites. **[unverified]** means the page was blocked or second-hand, or a search snippet stood in for the full page. Fit, cost and risk ratings are Product judgement, not sourced facts. No number here goes into `economy.csv` until Economy has simulated it.
**What's new versus the Oct 16 study** (`product/research/active-play-study.md`, called "v1" below):
- v1 looked at 8 titles and only at mechanics that could ship in M4. v2 covers about 20 titles and 13 mechanic families, adds Vadim's four ideas, and asks one question of each mechanic: does it stay meaningful after automation?
- v1's M4 active layer (golden egg, worker abilities, collect streak, Focus/Bulk) was **specified but never shipped** (§1.2). So the L10 dead zone Vadim hit is the "M4-A only" game, not the game v1 designed.
- v1 had no tap-scaling, no unit types or collection, no events or contracts sources, no research tree, and no idle-vs-active branch design (Clicker Heroes). It also had no "tap the producer" mechanics (Cookie Clicker wrinklers, Egg Inc. running chicken as a tap-the-object verb). v2 adds all of these.

---

## 1. Context: what a player can actually do today, and why it goes flat at L10

### 1.1 Shipped build checked
The build checked is the M4.1 RC1 at `5d9efa6` (PR #67), read from `art-ux/scratch/rc1-5d9efa6/`. The full shipped-vs-specced-vs-cut audit is `product/research/m4-shipped-audit.md` (HoP, 15:50); this section agrees with it. Read-through of the action set:
- **The player has exactly these verbs** (`src/sim/actions.ts:9-12`): `collect`, `sell`, `sellAll`, `buyCollection`, `buyFarm`, `buyTrack` (Hens / Egg value), `hire`, `manage`, `manageAll`, `buyGraderTier`. That's everything. No golden egg, streak, ability, Focus/Bulk or Pause action exists.
- **Collect moves eggs, it doesn't make them.** `collect` = `min(coop, eggs_per_tap[C])` from Coop to Basket (`actions.ts:55`; spec `product/core-loop-spec.md:6,16`). Production comes only from Hens (`m4a-spec.md:99`, M4A-4). However hard you tap, total eggs don't change. Tapping only matters when the Coop would otherwise sit full.
- **Sale price has one multiplier, the Grader** (`src/sim/payout.ts:7-9`). The code comment there says "M4 adds streak / frenzy entries here", and they were never added.
- **The golden egg (timed collectible) was never built.** The Oct 17 freeze cut it, which CEO/HoQA confirmed today. What exists: the DRAFT spec `product/collection/m4-timed-collectible-spec.md` v0.5 (unlock F8 at :13, 2–5 min gap at :16, 30 s life at :19, Frenzy 2× price at :39), the `tc_egg_*` / `tc_streak_*` / `tc_ability_*` columns in `product/economy.csv:1` (with "off" values allowed by `m4a-spec.md:83`), and the art. **Vadim's "no golden eggs appear" report is correct: there are none in the build.** M4-A was scoped to pass "with all of those mechanics off" (`farm/m4a-spec.md:63-81`).
- The collect streak (`product/collection/m4-collect-streak-spec.md`), worker abilities (`product/workers/m4-abilities-spec.md`; `product/decisions.md:8-12`) and the rc2 Refill/charges (`product/decisions.md:159-165`) also exist only as specs and sims. There's no `charge` or `ability` state in `src/sim/`.

### 1.2 Active interactions by level (shipped build)
Numbers from `product/economy.csv` rows L1/L10/L20/L30 and `src/config/balance.json:23-75`.

| | L1 | L10 | L20 | L30 (cap) |
|---|---|---|---|---|
| Production (H=F) | 2.0 eggs/s | 11 eggs/s | 21 eggs/s | 31 eggs/s |
| Eggs per Collect tap (C=F) | 10 | 55 (= 5 s of production) | 105 | 155 |
| Coop cap | 100 | 550 | 1,050 | 1,550 |
| Collect | Main verb: tap often or the 100-egg coop fills in 50 s | **Coop Hand (F7) collects every 2 s**, so a manual tap just takes eggs from a worker who would have moved them anyway | Same | Same |
| Sell | Main verb: tap customers / Sell all | **Market Hand (F3) sells every 1 s; Hawker (F8) +25% demand.** Player selling is redundant | Same | Same |
| Buy | Farm, Collection; Hens/Egg value from M4 | Farm/Hens/Egg value roughly every 5–15 s from L8 to L14 (Critic, `critic/review-m4b-dd223f5-2026-10-19.md:8`) | One buy per 1.5–2.7 min (`:8`); Grader tiers F18/19/21/22 (`balance.json:55-75`) | Farm "MAX", coins pile up past $400K, nothing worth buying (`:27`) |
| Workers | — | **All three hired by F8** (`balance.json:35-53`: F3/F7/F8). One verb left: Manage all, since energy drains 1% per 9 s, so a yawn at 50% comes about 7.5 min after a refill (`balance.json:26-30`) | + Grader tiers | Keep workers awake |
| Random/timed events | none | **none** (golden egg not built) | none | none |
| Milestones | — | Hens L10 coop/offline, Egg value grades V5/V10, Balanced 10 (`m4a-spec.md:118-122`) | Balanced 20, Jumbo | none at L30 (`critic …:24,27`) |

### 1.3 Why it goes flat at L10 (root causes, with evidence)
1. **Tapping is a transfer, not production.** Collect never creates eggs (`actions.ts:55`). Once Coop Hand runs (F7), a manual tap only beats a 2 s timer. Vadim's "clicking is useless" is literally true in the code. v1 already measured this: tap rate hardly matters down to 0.25 taps/s (v1 §2b).
2. **Every active role is automated by F8, and nothing replaces it.** Market Hand at F3, Coop Hand at F7, Hawker at F8. v1 called this the AdCap pattern. AdCap gets away with it because milestones and prestige take over the active role (v1 §2b). We shipped the automation without the replacement layer, because the golden egg, abilities and streak were cut (§1.1).
3. **M4's tracks add purchases, not interactions.** The Critic calls the tracks "a sequencing choice, not a direction choice … you end up buying both every level" (`critic/review-m4b-…:10`; queue RV-7 "Shallow tradeoffs", `product/queue.md:26`). Buying is a menu action every 5–90 s. It isn't play on the farm screen.
4. **The only remaining verb is a chore.** Manage all refills energy roughly every 7.5–15 min. Players miss it, and income silently flattens (`session-3-player-playtest.md:15,30`; RV-3 `queue.md:22`). It punishes absence instead of rewarding presence.
5. **Nothing random, nothing to collect, nothing to aim at.** No timed pickups, no unit variety, no goals beyond the next level. The session-3 player calls 22:57–23:08 "dead anyway: 0 eggs, queue full … All I could do was wait and buy" (`session-3-player-playtest.md:9`).
6. **No ceiling payoff.** L30 "lands flat … This is the moment a player would close the game" (`critic/review-m4b-…:27`; RV-1 `queue.md:20`).

**Design constraints we already hold** (carry into every recommendation):
- Active/idle (tab open, taps vs no taps) ≥ 1.4 (`m4a-spec.md:83`).
- The CEO cap: active stack ≤ 2× idle, judged at P95 ≤ 2.0 with a worst-seed guard ≤ 2.25 (`product/decisions.md:157`; `m4-focus-bulk-cooldown.md:51-59`).
- AC7 pacing ±20% (`core-loop-spec.md:22`).
- The full v0.3 active stack already broke the 2× cap at F22–24 (P95 2.12, `m4-focus-bulk-cooldown.md:56`). **Any new tap/golden-egg value has to fit inside that budget, or the cap has to be re-set by the CEO.**

---

## 2. Catalogue of mid/late-game active mechanics, by family
Columns: **Does** = what the player physically does. **Unlock** = when it appears. **After automation** = why it still matters once the base loop runs itself (the key question). **$** = monetisation tie-in. **Src** = §6 source id. v1-sourced facts cite the v1 slice that holds the original link.

### 2.1 Tap scaling and combos
| Game · mechanic | Does | Unlock | After automation | $ | Src |
|---|---|---|---|---|---|
| Cookie Clicker · "mouse" upgrades | Click the Big Cookie | Plastic mouse at 1,000 hand-made cookies (price 50,000), then 14 more tiers | **Each tier: "Clicking gains +1% of your CpS".** Click value is pegged to idle income, so a click never becomes worthless as CpS grows | none (premium-free) | [S1] |
| Cookie Clicker · Thousand/Million fingers | Click | Own 25 cursors (Thousand: +0.1 per non-cursor building), Million ×5 at 50 cursors | Click value scales with the size of the whole empire | none | [S1] |
| Cookie Clicker · Click Frenzy / Dragonflight combo | Click as fast as possible in a window | Golden cookie outcome | Click Frenzy ×777 per click for 13 s, Dragonflight ×1,111; they stack multiplicatively with Frenzy ×7 and Building Special. Late-game play is built around **lining up buffs, then clicking** | none | [S2], v1 collection §1 |
| Clicker Heroes · Juggernaut combo vs idle branch | Keep clicking (3+ clicks) to build a combo | Ancients bought with Hero Souls (prestige currency) | **Branches are exclusive by design:** active = combo multiplier (Juggernaut), idle = +DPS after 60 s with no clicks (Siyalatas). Click-DPS upgrades ("each click deals 0.5% of DPS") tie the channels; 40 clicks/s cap; "after 5 idle minutes the first click doesn't cancel idle" | none | [S3] [S4] |
| Tap Titans 2 · tap damage / Pet build | Tap continuously | Skill tree (Knight's Valor, Chivalric Order etc.) | A whole build archetype (pet damage scales from tap damage) is chosen *for* tapping. Active players are a legitimate build, not just faster idlers | Skill points, pets (gems) | [S5] |
| Egg, Inc. · Running Chicken Bonus (RCB) | Hold/tap the hatch button; bonus decays when you stop | From start; research raises the cap | Research "Coordinated Clucking" +0.2× max RCB per level (50 levels, +10×), "Motivational Clucking" +0.5× (50 levels, +25). So the active multiplier **keeps growing with the meta-tree**. Players report holding 2–3 s / releasing 1–2 s keeps it maxed. Only builds while habs aren't full | Hold-to-Hatch is Epic Research (golden eggs) | [S6] [S7] [S8 unverified, Reddit] |
| Farm Away · Sunshine | Tap-grab everything during a 20 s window | Ad reward | "boosts all profits collected within its 20-second limit and has you unleashing a flurry of grabby taps" | Rewarded ad | [S9] |

**Pattern:** tapping stays meaningful only when (a) the tap's value is **pegged to income** (CC +1% CpS, CH 0.5% DPS), and/or (b) taps are **concentrated into short windows** opened by another mechanic (Click Frenzy, Sunshine), and/or (c) a **build choice** commits to active vs idle (CH, TT2, Realm Grinder). Raw +N-per-tap scaling (what our Collection track is today) dies as soon as production outgrows it.

### 2.2 Tap-the-object bonuses (producers, buildings, critters)
| Game · mechanic | Does | Unlock | After automation | $ | Src |
|---|---|---|---|---|---|
| Cookie Clicker · Wrinklers | 3 clicks pops one (shiny: 9–12 clicks) | Grandmapocalypse | Each eats 5% CpS but returns ×1.1 when popped (shiny 1/10,000 spawn, ×3.3). Up to 10 (14 with upgrades). With 10 attached the effective idle CpS is ≈ ×6. Popping is a **when-to-cash-in decision**: pop for a purchase or a combo, otherwise leave them | none | [S10] [S11] |
| Hay Day · feed the chickens | Tap each hen with feed; collect its egg 20 min later | XP L1 | **Never automated.** Feeding/harvesting stay the core verbs and become Derby tasks. The hen IS the interaction | 2 diamonds per chicken to skip | [S12] |
| Egg, Inc. · drones | Tap flying drones | First farm | Avg 23.4 s (~154/h), 8% Elite; payout is a share of farm value × √RCB (nerfed v1.9) | none directly | v1 collection §2 |
| Clicker Heroes · clickables | Click treasure on screen | Zone 35 | ≈10× normal monster gold; can drop rubies (premium) | rubies | [S13] |
| Cats & Soup · balloons / photo prompts | Tap hot-air balloons of money; take photos when prompted | Early | Ambient taps on the scene pay gold even when production is idle | none / ads | [S14 unverified, Reddit guide] |
| Idle Supermarket Tycoon · delivery trucks, VIP customers | Collect delivery profits; serve VIPs for gems | Mid | "easy to forget about these but the profits are incredibly rewarding" | gems | [S15] |

### 2.3 Golden/random drops and frequency
| Game · mechanic | Cadence | After automation | $ | Src |
|---|---|---|---|---|
| Cookie Clicker · Golden Cookie | Spawn every 300–900 s (avg ≈ 447 s), 75–225 s with upgrades; 13 s on screen | Payout is a share of bank/CpS (Lucky min(15% bank, 15 min CpS); Frenzy ×7 77 s), so it scales forever; upgrades make it **more frequent and last longer**, which is the meta progression of the mechanic itself | none | v1 collection §1 |
| Egg, Inc. · drones | ~23 s avg | Value ∝ farm value; Elite tier | none | v1 collection §2 |
| Idle Slayer · Random Box | Spawns every 38–120 s once unlocked (100 coins) | Triggers random events (Frenzy, Horde…); 5% Special box → Bonus Stage (skill mini-game, 30 s per segment). **Silver Boxes:** 4 every 30 min after day 2, stack to 1,000 — players bank them for active sessions | ad for Second Wind | [S16] [S17] |
| Tap Titans 2 · fairies | ~2 min (JP wiki only) | Gold/spell activations; ad doubles | ad | v1 collection §7 |
| Cookie Clicker · Wrath cookies | Replace golden cookies in Grandmapocalypse | Risk/reward variant: can be negative (Clot −50% 66 s) or Elder Frenzy ×666 for 6 s | none | [S18] |

### 2.4 Unit types, breeds, rarity, collection
| Game · mechanic | Does | After automation | $ | Src |
|---|---|---|---|---|
| Egg, Inc. · artifacts | Launch ships (short/standard/extended), equip 2 (4 with Pro Permit) | 4 tiers × 4 rarities (Common/Rare/Epic/Legendary); legendary drop rates ~0.01–1.2% per drop; targeting raises chances 2–5×. A permanent loadout decision layered on top of a fully automated farm | Pro Permit slots | [S19] [S20 Reddit] |
| Egg, Inc. · egg types | Upgrade farm to next egg at a farm-value threshold | 19 egg types (Edible → Enlightenment); each is a new visual and value tier | — | [S21] |
| Cats & Soup · cat breeds | New cat per new station; reroll look in Observatory | 60–65 permanent + 23 event-limited breeds; completing a **collection group** gives an effect boost; all permanent breeds equal odds (≈2.85% in 2022) | 3 ad rerolls/day, 100 gems, tickets in paid packs; event-limited breeds | [S22] [S23] [S14] |
| Roblox Chicken Farm (Skandi) · chicken tiers + merge | Buy chickens, merge 2–3 duplicates into next tier | 36+ chicken types; rarer chickens lay more valuable eggs; merging frees nest space. Shows the egg-farm + breed fantasy works for a young audience | gems, lucky blocks | [S24] [S25] |
| Cheeky Chooks (Steam, 94% positive of 2,154) | Hatch/discover rare chook types | Collection + happiness/feeding care loop | premium, no IAP | [S26] |
| Idle Egg Factory · chicken stages | Level each chicken; at L25 promote to next stage (0–10) | Stage promotion "greatly multiplies output" | promotions mostly via ads | [S27] |
| Hay Day · animal types | Chicken (20 min) → cow (60 min) → pig (4 h) → sheep (6 h)… | Each new animal = new feed chain and product; coops capped at 6 chickens | diamonds | [S12] [S28] |
| *Chicken Farm Rush* site | — | **Excluded:** page claims an Oct-2026 release with detailed breeding stats; looks auto-generated, not citable | — | — |

### 2.5 Events and limited-time goals
| Game · mechanic | Shape | After automation | $ | Src |
|---|---|---|---|---|
| Idle Miner Tycoon · Event Mines | Themed limited mine, usually ~5 days; objectives/milestones → materials, boosts, skill points, Super Cash; event cash doesn't carry over | A *fresh short run* with its own pacing — the early game's dense decisions again, for a reward that feeds the main game. GDC 2019 (Telfer): "a clear inflection point in their revenue as they integrated more with their events system" | event packs | [S29] [S30] |
| AdVenture Capitalist · events | Temporary planets, ~1 week; goal tiers → gold, Mega Bucks; rewards persist | Same: restart-in-miniature | Mega Bucks | [S31], v1 market 1b/1e |
| Hay Day · Derby | Weekly, 6 days, L18+; one task at a time, 50–320 pts (themed 400) | Tasks are the *existing verbs* (feed, harvest, fill orders) reframed as goals | diamonds for extra tasks | [S32] [S33] |
| Egg, Inc. · contracts | Deliver N of an egg in a time limit, up to 3 goals; co-op (even solo); grades C→AAA | A timed goal on a *separate* farm. Rewards: golden eggs, boosts, Prophecy/Soul Eggs, artifact cases | Ultra subscription perks | [S34] |
| Tap Titans 2 · tournaments | 24 h events from fresh resources (Abyssal: stage 1,000+) | Race-style re-run | — | [S35 unverified, Reddit] |

### 2.6 Research / tech trees
| Game | Shape | After automation | Src |
|---|---|---|---|
| Egg, Inc. · Research | 13+ tiers of repeatable lines (e.g. Comfortable Nests +10% lay ×50 levels; Bigger Eggs ×2 once; Coordinated Clucking +10× RCB) | Where the *money goes* once the farm is automated; several lines boost the active verbs (RCB, hatchery) so the tree also deepens active play | [S7] |
| Idle Egg Factory · production research | Price → conveyor speed → efficiency | Cash and diamond research | [S27] |
| Realm Grinder · factions + faction research | Good factions (Fairy/Elf/Angel) = active (spells, clicks); Evil (Goblin/Undead/Demon) = idle | A per-run identity choice; spells don't work offline | [S36] [S37] |

### 2.7 Missions, mini-goals, contracts
| Game | Shape | Src |
|---|---|---|
| Idle Supermarket Tycoon · missions | "snappy little objectives … drip-feed of rewards, including cash and gems" | [S15] |
| AdCap · goals | Task list, replaced when claimed; golden goals expire in 3 h | v1 market 1e |
| Hay Day · truck/boat orders | Replacement orders 6–30 min; boat 18 h | v1 market 1b/1d |
| Egg, Inc. · contracts | §2.5 | [S34] |

### 2.8 Prestige
| Game | Shape | Src |
|---|---|---|
| Egg, Inc. · Soul Eggs / Prophecy Eggs | Reset farm for Soul Eggs (earnings bonus) | v1 upgrades §2.1 |
| AdCap · Angel investors | Reset for angels (+2% each) | v1 upgrades §2.2 |
| Idle Supermarket Tycoon · move city | "Multipliers when moving to a new city are accumulative" | [S15] |
| Farm Away/IFE · harvest season | Harvest all → seeds → permanent multipliers | [S9] |
| Antimatter Dimensions · challenges unlock autobuyers | Autobuyers unlock at 1e40–1e110 antimatter; challenges (reach 1.8e308 under altered rules) upgrade their intervals → **automation is the reward for active mastery** | [S38] |
| NGU Idle · challenges | Run under restrictions from Rebirth; capped completions | [S39] |

### 2.9 Active abilities and boosts
| Game | Shape | Src |
|---|---|---|
| Idle Miner Tycoon · manager abilities + Activate all | Junior 1/5 min, Senior 3/15, Executive 10/50; ≈17–20% uptime | v1 workers M1 |
| Egg, Inc. · boosts | Tachyon Prism (hatch), Soul Beacon, Boost Beacon multiplies them; Legendary 10 min, Supreme 1 h | [S40] |
| Clicker Heroes · skills | 30 s / 10 min to 8 h cooldowns | v1 collection §6 |
| Farm Away · Rain (×2, 4 h) / Sunshine (20 s) | Ad-gated long and short boosts | [S9] |
| Idle Supermarket · ad campaign | ×2 revenue 1 h per ad, stack to 6 h | [S15] |

### 2.10 Manager/automation as a choice
| Game | Shape | Src |
|---|---|---|
| Clicker Heroes | Idle vs active branch, exclusive | [S4] |
| Realm Grinder | Faction = playstyle | [S36] |
| Melvor Idle | Offline = same rate as online, 24 h cap; risky actions (combat, thieving) need an opt-in and can kill you offline | [S41] |
| NGU Idle | Idle Attack for farming; manual for Titans/bosses ("much stronger") | [S42] |
| Antimatter Dimensions | Automation earned via challenges | [S38] |

### 2.11 Merging
| Game | Shape | Src |
|---|---|---|
| Merge Dragons | 3 → 1, 5 → 2 (bonus for bigger merges) | [S43] |
| Roblox Chicken Farm | 2–3 matching chickens → next tier; frees nest slots | [S24] [S25] |
| Hyper-casual idlers (Merge Planes) | Idle economy on a merge core (Telfer, GDC 2019) | [S30] |

### 2.12 Mini-games
| Game | Shape | Src |
|---|---|---|
| Cookie Clicker · Garden | 34 plants; ticks 3–15 min by soil; mutations from adjacent mature parents (e.g. 2 Baker's Wheat → Thumbcorn 5%/Bakeberry 0.1% base) | [S44] [S45] |
| Idle Slayer · Bonus Stage | Platformer, 30 s per segment, rewards scale; "pure skill" | [S17] |
| Leaf Blower Revolution · crafting | Timing + RNG quality crafting of leaves | [S46] |
| Cats & Soup · claw machine, fishing | Side loops feeding cosmetics/food | [S14] |

### 2.13 Offline vs active trade-offs
- Melvor: online = offline (24 h cap), so active play is about *choices*, not *rate* [S41].
- Clicker Heroes: exclusive idle/active branches with a grace rule [S3] [S4].
- Cookie Clicker: wrinklers boost idle; golden cookie combos reward active; wrinkler CpS loss "has no effect for offline production" [S10].
- Idle Slayer: Silver Boxes accumulate while away and are *spent* when active [S16].
- Realm Grinder: spells (active) don't produce effects offline [S37].
- Ours: offline 0.25× (AC11) and the CEO 2× active cap. **Takeaway: the best designs let away-time build a resource that is spent actively** (Silver Boxes, wrinklers, Egg Inc. RCB research). That makes active and idle complementary instead of competing.

---

## 3. Vadim's four ideas
Each idea gets: precedents → how they stayed meaningful late → pitfalls → **fit for us**. Shared constraint: the current active stack budget (CEO 2× cap, P95 ≤ 2.0) is **unused today**, because the shipped build's active/idle is ≈1.00× once workers are hired (`m4-shipped-audit.md`, last row). So there is headroom, but the designed v0.3 stack alone already filled it (P95 2.12 at F22–24, `m4-focus-bulk-cooldown.md:56`). **Vadim's ideas and the old v0.3 stack compete for the same budget. Economy has to split it on purpose** (PM Market's Q5 asks for exactly this).

### 3a. Tapping gives more eggs (scaling taps, combos)
- **Precedents:** Cookie Clicker mouse upgrades, 15 tiers of "+1% of CpS per click" [S1]. Clicker Heroes click-DPS "each click deals 0.5% of DPS", with a Juggernaut combo and a 40 clicks/s cap [S3]. Egg Inc. RCB: hold/tap, decays when you stop, cap raised by research to +10× / +25× [S7] [S8]. Farm Away Sunshine: a 20 s grab window [S9]. TT2 tap/pet builds [S5].
- **How they stayed meaningful late:**
  1. **Tap value is a share of passive income**, never a flat +N. Our Collection track is flat (+5/tap per level, `core-loop-spec.md:8`), which is why it dies.
  2. **Bursts beat grinding.** Late Cookie Clicker clicking is concentrated in Click Frenzy windows (×777 for 13 s) [S2]; Farm Away's 20 s Sunshine does the same [S9].
  3. **A meta track raises the tap ceiling** (Egg Inc. Coordinated Clucking) [S7].
  4. **Players can opt out.** Clicker Heroes makes idle a first-class branch [S4].
- **Pitfalls:** autoclickers and macro abuse (CH's 40/s cap and our `tc_streak_max_taps_per_s` = 1 credited tap/s in `product/economy.csv` exist for this). Thumb fatigue on mobile. Active over idle above the 2× cap. A combo that breaks when you look away feels punishing; Egg Inc.'s forgiving decay (Reddit: "the game is actually quite forgiving" [S8]) is the model.
- **Correction (v1.1, after PM Collection's slice):** extra *eggs* are worth about 0 from F10, because demand caps sales at ≈1.2× supply and Hens out-produce demand from ≈F20 (`v2-slices/collection.md:18,24`). So the tap bonus must pay **coins as a share of income**, not eggs. Points 1–2 below are superseded by PM Collection's A1 "Hand-picked bonus" (coins = `tap_income_share` × 60 s income, 1 credit/s) and the streak stays on price.
- **Fit for us: very high, and it's the most direct answer to "clicking is useless".** Concretely:
  1. Turn Collect into **production**: each tap also *lays* bonus eggs = `tap_share` × eggs/s (CC pattern). A tap at L10 would then be worth the same share of income as at L1.
  2. Put the **collect streak** (spec v0.3 approved, `collection/m4-collect-streak-spec.md`) on **eggs per tap instead of price**, as the audit suggests. It builds while you tap and decays slowly. The cap reuses `tc_streak_cap` 0.40.
  3. Tap bonus eggs keep flowing when the coop is empty, so the Coop Hand doesn't make tapping redundant.
  4. Cost: S–M. The sim hook exists (`payout.ts:7`) but the egg path needs a new one in `actions.ts:55`. Economy has to size `tap_share` under the cap.

### 3b. Tapping hens or the coop for bonus eggs
- **Precedents:**
  - Hay Day: you feed each hen, and an egg is ready 20 min later. It's **never automated** and becomes the Derby's task vocabulary [S12] [S32].
  - Cookie Clicker wrinklers: they leech 5% CpS each and return ×1.1 when popped (3 clicks; shiny 1/10,000 returns ×3.3; 10 attached ≈ ×6 idle) [S10] [S11].
  - Egg Inc.: the hatch button sits on the hen house, and the chickens visibly run [S7].
  - Cats & Soup: tap money balloons and photo prompts in the scene [S14].
- **How they stayed meaningful late:** wrinklers turn tapping a creature into a **when-to-cash-in decision**. They pay *more* the longer you leave them, so idle and active add together. Hay Day keeps the creature as the interaction forever, with no automation of the feed verb.
- **Pitfalls:**
  - A tap on every hen every few seconds becomes a chore (Farm Away: "Tapping, the only input, is quickly accepted as a chore" [S9]).
  - Small targets: we show at most 12 sprites (`core-loop-spec.md:31`; M4.1-P1 `queue.md:44`), and Art needs ≥44 px.
  - Hidden-tab and offline rules.
- **Fit for us: high, and on-theme (the yard is already on screen).** Proposal shape:
  1. **"Broody hen"**: every 60–120 s one yard hen glows and *holds* eggs, which build up at a share of eggs/s while she waits. A tap releases them ×1.1–1.5.
  2. No penalty if you ignore her. She caps at N seconds of production, wrinkler style.
  3. Optionally, a **coop "shake"** that empties the coop into the basket with a +X% bonus once per cooldown. This is the "tap the coop" half.
  4. Avoid per-hen timers on all 12 sprites, which would be a chore.
  5. Cost: M (sprite hit-testing, the glow art, one timer). It pairs with breeds (§3d), because the broody hen can be a specific breed.

### 3c. More and more frequent golden eggs
- **Precedents:**
  - Cookie Clicker golden cookie: base spawn every 300–900 s (avg ≈447 s), 75–225 s with upgrades, 13 s on screen. Payout is a share of bank/CpS (v1 collection §1).
  - Egg Inc. drones: ~23.4 s average, 8% Elite, value ∝ farm value. Nerfed in v1.9 (v1 collection §2).
  - Idle Slayer Random Box: 38–120 s once bought for 100 coins; 5% become Special boxes → a skill Bonus Stage. **Silver Boxes accrue 4 per 30 min and stack to 1,000, so players bank them for active play** [S16] [S17].
  - Wrath cookies: a risk/reward variant (Elder Frenzy ×666 for 6 s vs Clot −50%) [S18].
- **How they stayed meaningful late:**
  1. Payout is always **proportional to income**.
  2. **Frequency, duration and payout are themselves upgrade targets** (CC's golden-cookie upgrades; Idle Slayer's box upgrades). "More and more frequent" *is* the late game.
  3. Rare variants (Elite drone, Special box, shiny wrinkler) add a jackpot layer.
  4. Banking (Silver Boxes) lets away-time feed active play.
- **Pitfalls:**
  - Too frequent means noise and prompt fatigue (v1 §7).
  - Payout inflation: Egg Inc. had to nerf drones (v1 collection §2).
  - Any frenzy stacking with abilities pushes past the 2× cap (spec v0.4 already rules "frenzy and boost never stack", `collection/m4-timed-collectible-spec.md:40`).
- **Fit for us: very high, and the cheapest because it's half-built.** The spec (v0.5), art and CSV tunables exist, with zero code (`m4-shipped-audit.md`). Proposal:
  1. **Ship the golden egg first** at the spec's 120–300 s gap, F8 unlock and 30 s despawn.
  2. Then make **frequency a progression axis**: a Lab node or breed trait shortens the gap toward ~60–120 s, plus a rare "Golden Hen" variant.
  3. Optionally **bank golden eggs while away** (max 3–5), shown on Welcome back and tapped on return, so absence isn't punished (Kongregate's "celebratory return" principle, v1 §4 Q4).
  4. Economy re-sims the gap/weights on the T3 economy.
  5. Cost: M for v1, S per frequency upgrade after that.

### 3d. Different chicken types / breeds with rarity, traits, collection
- **Precedents:**
  - Egg Inc. artifacts: 4 tiers × 4 rarities; legendary drop rates ~0.01–1.2% per drop; 2 equip slots (4 with Pro Permit) [S19] [S20].
  - Egg Inc. egg types: 19 tiers [S21].
  - Cats & Soup: 60–65 permanent breeds + 23 event-limited; set-completion bonuses; rerolls via 3 ads/day, 100 gems or tickets [S22] [S23].
  - Roblox *Chicken Farm*: 36+ chicken types, merge duplicates into rarer tiers, and rarer hens lay more valuable eggs [S24] [S25].
  - *Cheeky Chooks*: rare chooks to hatch, care loop; Steam 94% positive of 2,154 reviews [S26].
  - *Idle Egg Factory*: per-chicken levels with a stage promotion at L25 that "greatly multiplies output" [S27] [unverified, guide site].
  - Hay Day animal ladder [S28].
- **How they stayed meaningful late:**
  1. **Slots force a loadout choice** (Egg Inc. 2–4 artifact slots; v2 PM Upgrades proposes 1→3 nest slots).
  2. **Set and album bonuses** give a long-arc goal (Cats & Soup).
  3. **Rarity is a jackpot moment** on top of steady progress.
  4. **Event-limited variants** bring players back.
  5. Merging gives duplicates a use.
- **Pitfalls:**
  - Paid random drops count as loot boxes in some markets. Keep breeds **earned with eggs/coins** and disclose odds.
  - Power creep breaks AC7 pacing.
  - Each breed needs a sprite (Art cost).
  - UI density at 375 px (PM Upgrades H5).
  - A "best breed" turns into a solved answer unless traits trade off.
- **Fit for us: very high on theme. The strongest long-arc system in this study.** PM Farm Upgrades' v2 slice proposes the concrete version:
  1. **Incubator at F10** that hatches from *eggs* (a sell-or-hatch choice), an **8-entry album with 4 rarities**, and 1→3 nest slots at F10/F14/F20.
  2. Album milestones at +5/+10/+15% egg value (all proposals, `v2-slices/upgrades.md:13-40`).
  3. Traits should change **how you play**, not just %: e.g. a Golden Hen raises golden egg frequency (§3c); a Broody breed makes the broody-hen tap (§3b) stronger; a Silkie helps worker refill (PM Upgrades H6).
  4. Cost: M (L with merging or events).

---

## 4. Additional candidates from the research
| Candidate | Precedent | What the player does | After automation | Pitfalls | Fit / cost | Studio owner |
|---|---|---|---|---|---|---|
| **Order Board contracts** | Egg Inc. contracts (3 goals, timed) [S34]; Hay Day truck/boat (v1) | Pick Easy/Med/Hard "ship N eggs in T min"; Hold-for-contract stops Market Hand; tap Ship | Creates an **egg-allocation decision against the workers**; idle income unchanged | Hold can starve the shop (auto-off after 30 s unattended); stacking budget | High / M | PM Market `v2-slices/market.md:42-90` |
| **Rush Hour** | AdCap events, Farm Away Sunshine [S9] | 45 s warning → prep (Hold) → 30 s tap-only rush lane at ×1.5 | Timing + prep skill; worker income untouched | Hoarding; prompt overlap with Frenzy (rule: delay) | High / S–M | PM Market `market.md:219-245` |
| **Missions / mini-goals** | Idle Supermarket missions [S15]; AdCap goals; Hay Day Derby [S32] | Short goals ("serve 10 by hand", "hatch a Rare") for rewards | Steers players to every late feature; doubles as onboarding | Checklist fatigue; must not be "sell more" (workers do that) | High / S–M | PM Market `market.md` §3; customer-type-roadmap v0.3 |
| **Worker Shift Calls (abilities with energy cost)** | IMT manager abilities + Activate all (v1 workers M1) | Fire Rush/Sweep/Shout/Inspect (×1.15, 30 s / 300 s); each costs 10 energy | Fatigue becomes the price of play; brings back scarcity at 3 workers | Over the 2× cap with the full stack; UI collision with Manage all | High / M | PM Workers `v2-slices/workers.md:32-53` |
| **Farm Lab research tree** | Egg Inc. research [S7]; Idle Egg Factory [S27]; Realm Grinder faction research [S36] | Buy nodes in 4 branches (Coop/Flock/Market/Crew); some nodes unlock *new things* | Where money goes after the tracks; nodes can deepen active verbs (tap share, golden egg gap) | Becomes another "+%" list; best-buy/★ pollution (PM Upgrades H3) | High / M | PM Farm Upgrades `upgrades.md:122-170` |
| **Prestige ("Show Day")** | Egg Inc. Soul Eggs, AdCap angels (v1); Idle Supermarket city moves [S15]; Farm Away harvest [S9] | Reset for a permanent currency at the L30 ceiling | Answers RV-1/Critic "L30 lands flat" | Needs breeds/Lab to carry over; save migration; L | Medium now, high later / L | PM Farm Upgrades `upgrades.md:172-230` |
| **Event Fair / seasonal** | IMT Event Mines (~5 days; revenue inflection, GDC 2019) [S29] [S30]; Hay Day Derby [S32]; Cats & Soup event breeds [S22] | Themed customers, points ladder; event-limited breed or skin | Fresh short goals; event breeds feed the album | Live-ops load; client-clock cheating | Medium / M (cosmetic S) | PM Market `market.md:94-147` |
| **Banked away-resource** (Silver Box pattern) | Idle Slayer [S16]; CC wrinklers [S10] | Away-time stores N golden eggs / broody eggs that you spend on return | Makes absence and presence **complementary**, fixing the "punish absence" feel of energy | Inflates offline income: count it against the 0.25 offline rate | High / S (once 3b/3c exist) | HoP + PM Collection |
| **Idle vs active build choice** | Clicker Heroes exclusive branches [S3] [S4]; Realm Grinder factions [S36] | A Lab branch or breed loadout that favours tap play *or* idle play | Respects both audiences; active is a choice | Two economies to balance | Medium / M (later, inside the Lab) | Economy |
| **Merge duplicates** | Roblox Chicken Farm [S24]; Merge Dragons 3→1, 5→2 [S43] | Merge spare breed hens into a rarer one | Gives duplicates a use | Shifts genre toward merge; UI | Medium / M (later, after breeds) | PM Farm Upgrades |
| **Mini-game (breeding pen)** | CC Garden: 34 plants, adjacency mutations, 3–15 min ticks [S44] [S45]; Idle Slayer Bonus Stage [S17] | Place two breeds next to each other for a mutation chance | Deep optional layer for engaged players | Scope creep; RNG frustration | Low now / L | — |

---

## 5. Comparison table
Ratings are Product judgement. "Solves L10" = gives a F10–F17 player something meaningful to do every session. "After automation" = still matters with all 3 workers hired. Cost: S < 1 wk, M 1–3 wk, L > 3 wk of the current team (rough, needs HoE). Economy risk = the chance it breaks AC7 or the 2× cap.

| Mechanic | Solves L10 dead zone? | Works after automation? | Build cost | Economy risk | Egg-farm theme fit | Monetisation hook (none ship now, M4-B parked) |
|---|---|---|---|---|---|---|
| Golden egg (spec v0.5) + frequency upgrades (3c) | **Yes** | Yes (% of income) | **M** (spec/art/CSV exist) | Med (frenzy stacking; re-sim on T3) | High | Rewarded "double it" later |
| Tap lays eggs (% of eggs/s) + streak on eggs (3a) | **Yes** | Yes (pegged to production) | S–M | **High** (direct active premium; autoclick) | High | Low |
| Broody hen / coop shake (3b) | **Yes** | Yes (store-and-release) | M | Med | **Very high** | Low |
| Breeds + incubator + album (3d) | **Yes** (F10) | Yes (loadout + collection) | M (L with merge/events) | Med–High (power creep) | **Very high** | High (event breeds, cosmetics; no paid random) |
| Order Board contracts | **Yes** | **Yes** (allocation vs workers) | M | Med | High | Medium |
| Rush Hour | Yes | Yes | S–M | Low–Med | High | Low |
| Missions / mini-goals | Partly (direction, not depth) | Yes if attention-based | S–M | Low | Medium | Low |
| Worker Shift Calls (abilities v0.3 + energy cost) | **Yes** | Yes (built for it) | M | **High** (v0.3 stack already over the cap) | Medium | Low |
| Farm Lab research tree | Yes (F12+) | Yes | M | Med | High | Medium (gem nodes later) |
| Prestige "Show Day" | No (L30 answer) | Yes | L | High | High | High |
| Event Fair / seasons | Partly | Yes | M (S cosmetic) | Low–Med | High | High |
| Banked away-resource | Partly (return session) | Yes | S | Med (offline income) | High | Medium |
| Idle/active build branch | Partly | Yes | M | High | Medium | Low |
| Merge | Partly | Yes | M | Med | Medium | Medium |
| Breeding-pen mini-game | No (too late, too deep) | Yes | L | Low | High | Low |
| Per-worker Pause/Resume (old M4 must-have) | **No** | Economy knob | S | Med (exploit noted) | Low | None |

**Reading the table:** six mechanics both solve the L10 gap and survive automation at ≤ M cost: golden egg, tap-lays-eggs, broody hen, breeds, contracts, and Shift Calls. They all draw on **one active budget**. The plan has to pick a set whose combined P95 stays ≤ 2.0×, or ask the CEO to re-set the cap given Vadim's explicit ask for "a lot more meaningful interaction".

---

## Studio inputs (v2 slices and fresh reads)
Folded in as of 2026-10-24 ~15:55 CEST; PM Collection added ~16:00 (v1.1). Files that didn't exist yet are marked as placeholders.
- **PM Farm Upgrades** (`v2-slices/upgrades.md`): the gap between F10 (≈10.0 min p50) and the next unlock, Grader F18 (≈28.0 min), is **18 minutes with no new system** (`:13-14`). Proposes **breeds at F10** (incubator hatching from eggs, an 8-entry album with 4 rarities, nest slots at F10/14/20), a **Farm Lab at F12** (4 branches, tiers unlocked by buying the previous tier), and **Show Day prestige later** (F30 or L50). This gives a new beat every 2–5 min across F10–F18 (`:20-40`). Open: eggs vs coins as the hatch cost, and whether Lab/stall buys are excluded from best buy/★.
- **PM Workers** (`v2-slices/workers.md`): refill supply (0.40/min) ≥ demand (0.29–0.40/min) with 3 workers, so Refill isn't a decision (`:7-14`). Speed effects add ~0% because eggs are the limit, so effects must raise price or supply. Primary package **"Shift Calls"**: the approved v0.3 abilities, each costing 10 energy, a charge fork (refill / refill + combo / save), Energised after Rest, a single "⚡N ready" badge, unlocking at F10 (`:32-44`). Stretch: Overtime, worker levels, traits at hire, wake-up tap.
- **PM Market** (`v2-slices/market.md`): eggs, not customers, are the bottleneck at L10 (11 eggs/s vs ≈13.4 demanded). A market goal only matters after automation if it asks for **allocation, timing, a choice, or pays in something coins can't buy** (`:6-20`). Priority: **Order Board contracts (M)** > missions (S–M) > Rush Hour (S–M) > Daily list > Fair/seasons. First slice: Order Board v0 + 10 missions at F10. It asks HoP for **one shared active-premium budget** under P95 2.0 (Q5).
- **PM Collection** (`v2-slices/collection.md` v0.1, folded in 15:5x):
  - **Diagnosis** (`:10-25`): the Coop Hand moves eggs_per_tap every 2 s (≈2× laying), so a tap only moves eggs the hand would move 1–2 s later. The rc1 tree has the `tc_*` constants but no collectible or streak code, which agrees with the audit. Three rules follow: decouple tap value from coop contents; pay coins or price, never eggs (supply-side rewards ≈0 from F10); and every new reward needs a funding source inside the 2× budget.
  - **A1 "Hand-picked bonus"** (S): each credited tap (≤1/s) pays coins = `tap_income_share` 0.03 × 60 s rolling income, roughly +$2.1 per tap at F10. It pays even on an empty coop. **A2 combo tiers** (S, juice only, no economy) sit on the existing streak.
  - **B1 "Broody Hen"** (S–M on the golden-egg framework, M standalone): one yard hen at a time builds a nest at 0.05 × income while the tab is visible, capped at 150 s, and glows from 50%. One tap pays the nest out in coins. It isn't diverted from production, unlocks at the first Coop Hand hire, never accrues offline, and the nest is saved across reloads. B2 coop flutter is cosmetic.
  - **Golden egg extensions:** C1 "Hot hands" (streak ≥ 0.20 speeds the spawn timer ×1.25); C2 "Golden Hen" outcome (5 drops, budget-neutral by reweighting cash 0.45 → 0.35); C3 "Golden Goose" upgrades (3 levels, gap ×0.9 and +5 s life each, about +6 pp at max).
  - **Budget package P1** (`:183-198`): lower the streak cap 0.40 → **0.28** (≈ −12 pp optimal) to fund A1 + B1 + C1 (≈ +12 pp). Fallback: drop C1 first, then broody 0.03. Economy has to run it.
  - **Order:** ship golden egg v0.5 + streak v0.3 → A1/A2 → B1 → C1/C2 → C3 with the Lab.
  - **Open:** worst-seed vs mean for the 2× gate; B1 save fields; `w2_asleep_collect_share` 0.20 vs 0.15.
  - **Where it differs from this study:** it pays coins rather than eggs (adopted, see the §3a correction), and it gives the streak budget to "moments" instead of constant tapping.
- **Economy** (tap-share model, golden-egg options, gates): **placeholder.** No v2 output yet.
- **Critic, fresh L10+ read of RC1 `5d9efa6`:** **placeholder.** A session was in progress (`product/critic/wt-5d9efa6/`, `product/critic/saves/` created 15:44); no review file yet.
- **Player, fresh L10+ read:** **placeholder.** No new file in `playtest/`. The most recent hand read is session 3 (Oct 16): "22:57-23:08 felt dead anyway … All I could do was wait and buy" (`session-3-player-playtest.md:9`).
- **Shipped audit** (`research/m4-shipped-audit.md`): only the M4-A passive layer shipped. Golden egg, streak, abilities, Pause, completion bonus, Focus/Bulk and mini-goals were all dropped by the Oct 17 freeze (D-CEO-20261017-01) and never restored. The measured active/idle at L10+ is ≈1.00×.

**Where the inputs agree:** all three PM slices and this study independently land on the same rule. A post-automation mechanic must (1) pay as a **share of income**, (2) ask for **timing, allocation or a choice**, and (3) **never punish absence**. All three also flag the shared active budget as the binding constraint.

---

## 6. Sources
**How these were checked (2026-10-24):** "fetched" = the full page opened with WebFetch. "extract" = page text quoted in a WebSearch result from that URL (the quoted figures come from the page, but nobody read the full page). **[unverified]** = Reddit/forum/second-hand, or a guide site with no primary confirmation. v1 sources (v1 slices) are not repeated; they're cited as "v1 <slice> §n", and the slices hold the original links.

| id | Source | Used for | Check |
|---|---|---|---|
| S1 | https://cookieclicker.wiki.gg/wiki/Cookies_per_Click | Mouse upgrades +1% CpS/click, unlocks, prices; Thousand/Million fingers | extract |
| S2 | https://cookieclicker.wiki.gg/wiki/Golden_Cookie · https://cookieclicker.wiki.gg/wiki/General_Combo_Guide | Frenzy ×7, Click Frenzy ×777, Dragonflight ×1,111, multiplicative stacking | extract (search synthesis) |
| S3 | https://teemo.dev/game-design/clicker-heroes/systems/damage-and-skills/ | Exclusive combo/idle branches, 0.5% DPS per click, 40 clicks/s cap, idle grace | extract |
| S4 | https://teemo.dev/game-design/clicker-heroes/wiki/mechanics/idle/ · https://clickerheroes.fandom.com/wiki/Siyalatas,_Ancient_of_Abandon | Idle after 60 s with no clicks; Siyalatas +25%→15%/level | extract |
| S5 | https://tap-titans-2.fandom.com/wiki/Pet_build | Tap/pet active build | extract (search synthesis) |
| S6 | (v1) https://www.reddit.com/r/EggInc/comments/s9zvz1/running_chicken_bonus_and_other_tips/ | RCB basics | [unverified] (403 in v1) |
| S7 | https://egg-inc.fandom.com/wiki/Research | Research lines incl. Coordinated Clucking +10×, Motivational Clucking +25 RCB; Bigger Eggs ×2 | extract |
| S8 | https://www.reddit.com/r/EggsInc/comments/oxtqv8/tap_or_hold_run_button/ · https://www.reddit.com/r/EggsInc/comments/z3nxw5/optimal_tapping_of_the_chicken_button/ | RCB hold/release patterns, "quite forgiving" | [unverified] Reddit |
| S9 | https://www.pocketgamer.biz/in-app-inspector-farm-away/ | Farm Away Sunshine 20 s tap window, Rain ×2 4 h, "less and less actual interaction", tapping as a chore | **fetched** |
| S10 | https://cookieclicker.wiki.gg/wiki/Wrinkler | Wrinklers: 5% CpS each, ×1.1 on pop, shiny 1/10,000 ×3.3, max 10/14, no offline effect | extract |
| S11 | https://teemo.dev/game-design/cookie-clicker/systems/wrinklers-and-the-grandmapocalypse/ | Spawn timing, 3 clicks/9 for shiny | extract |
| S12 | https://hayday.fandom.com/wiki/Chicken | Feed → egg in 20 min; 2 diamonds to skip; derby tasks | extract |
| S13 | https://teemo.dev/game-design/clicker-heroes/systems/clickables-chests-and-random-rolls/ | Clickables from zone 35, ≈10× gold, rubies | extract (search synthesis; fetch interrupted) [unverified] |
| S14 | https://www.reddit.com/r/CatsAndSoup/comments/xp0v3j/new_player_guide_tips_tricks/ | Balloons/photo taps; equal breed odds (2.85%, Sept 2022) | [unverified] Reddit |
| S15 | https://codigames.helpshift.com/hc/en/7-idle-supermarket-tycoon/faq/417-tips-to-make-more-money/ · https://www.gamezebo.com/walkthroughs/idle-supermarket-tycoon-guide-tips-cheats-and-strategies/ | Managers +50%, city move multipliers accumulate, missions, delivery trucks, ad campaign ×2 1 h up to 6 h | extract (Gamezebo = guide) |
| S16 | https://idleslayer.fandom.com/wiki/Random_Box | Random Box 38–120 s; Silver Boxes 4 per 30 min, stack 1,000; Special 5% | extract |
| S17 | https://idleslayer.fandom.com/wiki/Bonus_Stage | Bonus Stage 30 s/segment, ad Second Wind | extract |
| S18 | https://cookieclicker.wiki.gg/wiki/Grandmapocalypse | Wrath cookies: Clot −50% 66 s, Elder Frenzy ×666 6 s | extract |
| S19 | https://egg-inc.fandom.com/wiki/Spaceships | Ships → artifacts, tiers/rarities | extract |
| S20 | https://www.reddit.com/r/EggsInc/comments/16fo3pe/ · https://www.reddit.com/r/EggsInc/comments/1fj3ew5/ | Legendary drop rates and targeting effect; 2/4 slots (Pro Permit) | [unverified] Reddit (community data) |
| S21 | https://egg-inc.fandom.com/wiki/Eggs | 19 egg types | extract (search synthesis) |
| S22 | https://cats-soup.fandom.com/wiki/Cats · https://catsandsoupgame.fandom.com/wiki/Cats | 60–65 permanent + 23 event breeds, collection-group bonuses | extract |
| S23 | https://catsandsoupgame.fandom.com/wiki/Observatory | Reroll via 3 ads/day, 100 gems, tickets | extract |
| S24 | https://robolibrary.org/wikis/chicken-farm | Roblox Chicken Farm: 36+ types, merge up to 3 | extract [unverified, fan wiki] |
| S25 | https://www.roblox.com/games/137233438285284/Chicken-Farm · https://newgame.co.jp/metaverse/en/roblox/137233438285284/chicken-farm/guide/ | Merge to rarer breeds, Gold Chickens, rebirth | extract |
| S26 | https://store.steampowered.com/app/922460/Cheeky_Chooks/ | Rare chook collection; 94% of 2,154 positive | extract |
| S27 | https://www.levelwinner.com/idle-egg-factory-guide-tips-tricks-strategies/ | Chicken stage promotion at L25, research order | extract [unverified, guide] |
| S28 | http://guidebookhayday.weebly.com/ | Animal ladder, production times (2015) | extract [unverified, fan guide] |
| S29 | https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/45-how-does-the-event-mine-work/ · https://idleminertycoon.fandom.com/wiki/Event_Mines | Event Mines ~5 days, rewards, cash doesn't carry | extract (search synthesis) |
| S30 | https://mobilefreetoplay.com/gdc-2019-deconstructing-idle-miner-tycoon/ | GDC 2019 (Telfer): events revenue inflection, Kolibri ~$200K/day, merge/hyper-casual idle trend | **fetched** |
| S31 | https://adventure-capitalist.fandom.com/wiki/Events | AdCap event planets ~1 week, persistent rewards | extract (search synthesis) |
| S32 | https://hayday.fandom.com/wiki/Derby | Derby: weekly, 6 days, L18+, one task at a time | extract |
| S33 | https://hayday.fandom.com/wiki/Derby_Tasks | 50–320 pts, themed 400 | extract |
| S34 | https://egg-inc.fandom.com/wiki/Contracts · https://medium.com/@kevin_67107/how-contract-points-cs-are-calculated-20ccadf1635e | Contracts: up to 3 goals, co-op, grades C–AAA, CS formula | extract |
| S35 | https://www.reddit.com/r/TapTitans2/comments/kb68d9/abyssal_tournament_general_strategy_guide/ | 24 h Abyssal tournaments, stage 1,000+ | [unverified] Reddit |
| S36 | https://realm-grinder.fandom.com/wiki/Factions | Good = active, Evil = idle factions | extract (search synthesis) |
| S37 | https://realm-grinder.fandom.com/wiki/Spells | Spell effects not produced offline | extract (search synthesis) |
| S38 | https://antimatterdimensions.wiki.gg/wiki/Automation · https://antimatterdimensions.wiki.gg/wiki/Normal_Challenges | Autobuyers unlock 1e40–1e110; challenges upgrade intervals | extract (search synthesis) |
| S39 | https://sayolove.github.io/ngu-guide/en/mechanics/challenges/ | NGU challenges from Rebirth, capped completions | extract (search synthesis) |
| S40 | https://egg-inc.fandom.com/wiki/Boosts | Tachyon Prism / Soul Beacon / Boost Beacon; 10 min / 1 h | extract (search synthesis) |
| S41 | https://wiki.melvoridle.com/w/Offline_Progression | Offline = online, 24 h cap; risky offline opt-in | extract |
| S42 | https://sayolove.github.io/ngu-guide/en/mechanics/adventure/ | Idle Attack vs manual for Titans | extract (search synthesis) |
| S43 | https://gramgames.helpshift.com/hc/en/9-merge-dragons-1497457953/faq/54-tip-merging-5-at-once-is-better-than-3/ | Merge 3→1, 5→2 | extract (search synthesis) |
| S44 | https://cookieclicker.wiki.gg/wiki/Garden | Garden ticks 3–15 min, mutation rules, 4 growth stages | extract |
| S45 | https://cookieclicker.wiki.gg/wiki/Random_list_mechanism | Mutation odds (Baker's Wheat → Thumbcorn 5%, Bakeberry 0.1% base) | extract |
| S46 | https://leafblowerrevolution.wiki.gg/wiki/Crafting | Timing + RNG crafting | extract (search synthesis) |
| — | chicken-farm-rush.app | **Excluded:** looks auto-generated (claims an Oct 2026 release with detailed stats) | not used |

**Internal sources:** `product/research/active-play-study.md` (v1) and `product/research/slices/*.md` (v1 slices, with their original links); `product/research/v2-slices/{upgrades,workers,market}.md`; `product/research/m4-shipped-audit.md`; `product/core-loop-spec.md`; `product/farm/m4a-spec.md`; `product/economy.csv`; `product/m4-focus-bulk-cooldown.md`; `product/collection/m4-timed-collectible-spec.md`; `product/collection/m4-collect-streak-spec.md`; `product/critic/review-m4b-dd223f5-2026-10-19.md`; `product/session-3-player-playtest.md`; `product/queue.md`; `product/decisions.md`; RC1 code at `art-ux/scratch/rc1-5d9efa6/src/` (`sim/actions.ts`, `sim/payout.ts`, `config/balance.json`).

**Gaps that remain:**
- Still no sourced active-to-idle income ratio for any title (the same gap as v1).
- No first-party retention data for breed or collection systems in idle games.
- Several new figures are search extracts rather than full-page reads.
- The PM Collection, Economy, Critic and Player inputs were pending at writing time.
