# Research slice: Collection / tapping active-play mechanics
PM, Collection · 2026-10-16 · for Head of Product active-play study (due Mon 2026-10-19 18:00)

**Problem (from playtest):** by about Farm L10 the game plays itself. Today the only active verb in our loop is tapping Collect, which moves `min(coop, eggs_per_tap)` (core-loop-spec §Loop 2). Once taps clear the coop easily, tapping adds nothing over idle income.

**Rules for this doc:** facts come only from the linked sources. I checked every link on 2026-10-16 (WebFetch or curl). **[verified]** means the page loaded (200). **[403, unverified]** means the site blocked the fetch; its content came from a search-index snippet only, so treat it as weaker. I dropped any page that returned 404 (Egg Inc. wiki "Running_Chicken_Bonus", TT2 fandom "Skills"). *Fit* and *Build cost* are **my judgment (PM, Collection)**, not sourced facts.

---

## 1. Cookie Clicker: Golden Cookies (timed random clickable + frenzy buffs)
- **Trigger:** a Golden Cookie spawns at a random screen position and fades after 13 s. Clicking it gives a semi-random outcome.
- **Prompt frequency:** a spawn comes every 300 to 900 s (mean about 447 s, roughly every 7.5 min) without upgrades. With Lucky Day + Serendipity it is every 75 to 225 s (mean about 121 s). Each upgrade also doubles how long the cookie stays on screen.
- **Payoff vs idle:**
  - "Lucky" (about 37 to 42%): the smaller of 15% of the bank or 15 min of CpS.
  - "Frenzy" (about 37 to 42%): 7x CpS for 77 s.
  - "Click Frenzy" (about 3.5 to 4%): 777x per click for 13 s.
  - Cookie Chain and Cookie Storm are rare.
  - The wiki estimates that catching every cookie with both upgrades and a full bank adds about +470% CpS on average, before the other outcomes. Combos such as Frenzy + Click Frenzy multiply (x5439 per click).
- **Unlock timing:** active from the start of the game. Lucky Day unlocks at 7 cookies clicked, Serendipity at 27, Get Lucky at 77. Missed cookies are just lost. There is no penalty, and the game later hid the "missed" counter after player complaints.
- **Sources:** https://cookieclicker.fandom.com/wiki/Golden_Cookie [verified]
- **Fit: 5/5** *(judgment)*. A "Golden Egg" or "Golden Hen" that appears on the farm for about 13 s fits our egg theme exactly. It also works on top of an otherwise idle loop at any Farm level, which is the L10 problem. A Frenzy-style "x7 lay rate for 60 to 77 s" also makes the coop cap matter again, because the player has to tap to keep up.
- **Build: M** *(judgment)*. Needs a spawn timer, a clickable sprite, 2 or 3 outcomes, a buff timer UI, and save of the buff state. The fractional coop and the elapsed-time tick already exist.

## 2. Egg, Inc.: Drones (frequent flying tap targets)
- **Trigger:** drones fly across the farm on a pseudo-random timer. Tap or swipe one to knock it down. It drops cash ("Bocks") 70% of the time and Golden Eggs (premium currency) 30% of the time.
- **Prompt frequency:** one drone about every 23.4 s on average (about 154 per hour). The gap between drones is 2 to 8 s 25% of the time and 12 to 47 s 75% of the time, so drones arrive in waves of 1 to 3. 8% are Elite drones (about 12 per hour). Elites fly faster, take a curved path, and pay more.
- **Payoff vs idle:** a common drone pays 0.04%, 0.2% or 1% of Farm Value, times √(running chicken bonus) and a hidden catch-up multiplier S (30x down to 0.25x). An Elite pays about 20% of Farm Value when S = 1, but only about 5% on a late-game farm. S is larger when the farm is behind, so drones pay most early on. The game nerfed drones in v1.9 "to promote chicken hatching and prestige".
- **Unlock timing:** available from the first farm. On a new account, the Elite chance ramps from 0% over the first five drones.
- **Sources:** https://egg-inc.fandom.com/wiki/Drones [verified]
- **Fit: 4/5** *(judgment)*. The frequent, low-stakes taps are good. Paying a share of farm value, plus a catch-up factor, scales with no tuning per level. Risk: a prompt every 23 s may feel naggy on desktop web, and a big payout could break the pacing in AC7 unless the sim models it.
- **Build: M** *(judgment)*. Needs moving sprites, a hit area that does not clash with the Collect or customer taps, and a payout formula. Add it to the economy sim.

## 3. Egg, Inc.: Running Chicken Bonus / hold-to-hatch (manual combo multiplier)
- **Trigger:** tapping or holding the hatch button sends chickens running. The more chickens run at once, the higher the Running Chicken Bonus (RCB), which multiplies income. The bonus decays if you stop. The bonus can only build while the habs are not full.
- **Prompt frequency:** continuous, for as long as the player wants it. Community advice is to hold for 1 to 2 s, release so the hatchery refills, and repeat.
- **Payoff vs idle:** research raises the RCB cap (e.g. Epic Multiplier "+200x"), and drone payouts scale with √RCB. Hold to Hatch research reaches +30 chickens/s held.
- **Unlock timing:** basic tapping is available from the start. Hold to Hatch is Epic Research.
- **Sources:** https://egg-inc.fandom.com/wiki/Research [403, unverified]; https://www.reddit.com/r/EggsInc/comments/uus5ov/is_there_a_way_to_always_keep_max_chicken_bonus/ [403, unverified]
- **Fit: 4/5** *(judgment)*. This is the closest match to our Collect tap. A "collect streak" could raise a temporary sale-price or lay multiplier while the player keeps tapping within X s, and let it decay when they stop. That makes active tapping worth more than idle without changing the idle rate.
- **Build: S to M** *(judgment)*. Needs a streak counter, a decay timer, a multiplier UI, and a sim player model. We already have the 250 ms tap-combine window to build on.

## 4. AdVenture Capitalist: manual cycles → Managers, and the opt-in 2x boost
- **Trigger:** before you buy a Manager, each business cycle must be started by hand. A Manager restarts cycles automatically, even offline, "allowing AdVenture Capitalist to be an idle game".
- **Prompt frequency:** the ad boost can be watched up to 5 times per day per planet, and each gives 2x for 4 h.
- **Payoff vs idle:** the boost adds +2 to the multiplier rather than doubling it (e.g. x3+x3+x3+x2 = x11). Managers cost cash (Lemonade Stand manager $1,000).
- **Unlock timing:** Managers unlock as the player buys them, one per business.
- **Sources:** https://adventure-capitalist.fandom.com/wiki/Managers [verified]; https://adventure-capitalist.fandom.com/wiki/Opt-In_Boosts [verified]
- **Fit: 2/5** *(judgment)*. This is the opposite pattern: it removes active play. It is useful as a warning for M2 Workers, because automating Collect kills our only verb unless something active replaces it. A non-ad "boost" is possible, but it is passive.
- **Build: S** for a timed boost *(judgment)*.

## 5. Idle Miner Tycoon: Manager active abilities (cooldown boosts)
- **Trigger:** the player taps a manager to activate a timed boost (e.g. 3x to 8x speed or load, or an upgrade-cost cut). There is also an "Activate all" button.
- **Prompt frequency:** Junior lasts 1 min with a 5 min cooldown, Senior 3 min / 15 min, Executive 10 min / 50 min. Super Managers vary: Mr. Turner lasts 30 s with a 15 min cooldown (he stores the output, then multiplies it at the end), Dr. Steiner 5 min / 30 min.
- **Payoff vs idle:** a 2x to 8x multiplier on one station while the boost runs. Uptime is about 17 to 20%.
- **Unlock timing:** managers become available once the first Mine Shaft reaches level 5. Before that, you manage workers by hand.
- **Sources:** https://idleminertycoon.fandom.com/wiki/Managers [verified]; https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/318-mr-turner/ [verified]
- **Fit: 3/5** *(judgment)*. A "Rush Hour" button on the coop (e.g. 3x lay for 60 s, 5 min cooldown) is easy to understand and creates a check-in reason. It is less exciting than a random spawn. The Mr. Turner "bank then multiply" idea maps well to the Basket.
- **Build: S** *(judgment)*.

## 6. Clicker Heroes: cooldown skills (Clickstorm, Golden Clicks, Energize)
- **Trigger:** the player presses a skill button (hotkeys 1 to 9).
- **Prompt frequency:**
  - Clickstorm and Powersurge: 30 s each, 10 min cooldown.
  - Lucky Strikes and Metal Detector: 30 min cooldown.
  - Golden Clicks, Super Clicks, Energize and Reload: 1 h cooldown.
  - Dark Ritual: 8 h cooldown.
- **Payoff vs idle:** Clickstorm adds a temporary auto-clicker at 10 clicks/s. Powersurge gives +100% DPS. Metal Detector gives +100% gold. Golden Clicks makes clicks give 1% of the monster's gold. Energize doubles the next skill. Patch 1.0e11 stopped skill use from "breaking idle".
- **Unlock timing:** skills unlock from hero upgrades (Clickstorm at Cid level 25, ... Reload at Shinatobe level 100), so they arrive gradually through a run.
- **Sources:** https://clickerheroes.fandom.com/wiki/Skills [verified]
- **Fit: 3/5** *(judgment)*. Spreading skills across levels is a good model for adding active tools after L10. "Combo two skills" adds planning depth. A full skill bar is too much for M-scope.
- **Build: M to L** for a set of skills *(judgment)*.

## 7. Tap Titans 2: Fairies (timed tappable rewards, optional ad)
- **Trigger:** fairies fly across the screen. Tap one for gold or a free spell activation. An ad fairy gives bigger rewards for watching an ad.
- **Prompt frequency:** the Japanese beginner guide says fairies spawn about every 2 min. The Fairy Charm skill raises the chance of several fairies at once (up to 7 per wave) and shortens the fairy cooldown.
- **Payoff vs idle:** gold, spell activations, mana, and gold or damage multipliers. Builds use fairies for free Heavenly Strike casts (50% spell-activation chance per fairy, per the fandom Builds page).
- **Unlock timing:** not clearly sourced. Fairy Charm is a Tier III skill-tree node (20 SP required).
- **Sources:** https://gamerch.com/taptitans2/380389 [verified]; https://www.tt2-compendium.com/en/wiki/skills/fairycharm [verified]; https://tap-titans-2.fandom.com/wiki/Builds [403, unverified]
- **Fit: 4/5** *(judgment)*. Same idea as drones and golden cookies, at about a 2 min cadence. That middle ground between drones (23 s) and golden cookies (7.5 min) is attractive for us.
- **Build: M** *(judgment)*.

---

## Session-pacing data found
- Kongregate, GDC 2016 "Idle Chatter" (Anthony Pecorella): quick check-ins "shift up the growth curve". Each return is a "celebratory moment". The core loop is "log in, spend all your cash, log out, return in a few hours". The talk argues against punishing offline play. https://gdcvault.com/play/1023208/Idle-Chatter-What-We-Can [verified]; slides https://www.slideshare.net/slideshow/idle-chatter-gdc-2016-59734260/59734260 [verified]; write-up https://www.gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play [verified]
- GameAnalytics data, cited secondhand in a LinkedIn article: idle games average about 5.3 sessions per DAU (hypercasual 4.6), and idle leads on session length. https://www.linkedin.com/pulse/active-rise-inactive-future-idle-games-samuel-huber [verified page; the stat is secondhand]
- Player opinion (r/incremental_games): preferred check-ins of 1 to 3 min every 1 to 2 h. One player: "if active play is 10+ times faster than idling, then it's just not an idle game." Anecdotal. https://www.reddit.com/r/incremental_games/comments/ok7gtn/ [403, unverified]
- Drone, Golden Cookie, fairy and cooldown cadences are listed under each mechanic above.

## Gaps (no real source found or checked)
- No GDC or postmortem talk found that gives an active-vs-idle income ratio for any of these games. The +470% Golden Cookie figure is a wiki calculation.
- No first-party session-length numbers for Egg Inc., AdCap, IMT or TT2.
- Egg Inc. RCB details and the TT2 fandom pages were 403. Treat them as unverified.
- The TT2 fairy unlock stage and exact base spawn timer are not sourced in English. The "~2 min" figure comes from the Japanese wiki only.
- No YouTube breakdowns reviewed.

## Ranked recommendation: top 3 for us *(PM, Collection judgment)*
1. **Golden Egg plus Frenzy (Cookie Clicker model).** A random golden egg appears on the farm for about 13 s, every 2 to 5 min after Farm L~8. Outcomes: an instant "Lucky" payout (capped at N minutes of income), or a "Laying Frenzy" (e.g. x7 lay rate for 60 s) that fills the coop past what idle collection can handle, so the Collect tap matters again. Build M. Needs an AC7 sim player model and Head of Product's numbers.
2. **Collect streak multiplier (Egg Inc. RCB model).** Steady Collect tapping builds a decaying multiplier on sale price or lay rate. This makes our existing verb worth more than idle without nerfing idle. Build S to M. It pairs with #1, because a Frenzy plus a streak makes a combo.
3. **Flying tap targets (Egg Inc. drones / TT2 fairies).** A tappable "egg thief" or "drone" every 30 s to 2 min that pays a share of farm value, with a catch-up factor. Build M. Do it after #1 is validated, to avoid prompt fatigue.

Not recommended for now: cooldown skill bars (L) and the AdCap-style automation (it worsens the problem). Keep IMT-style cooldown boosts as a cheap fallback (S) if #1 slips.

All numbers here are proposals. Head of Product owns the numbers.
