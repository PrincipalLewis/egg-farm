# Research slice: Managers & Workers (PM, Workers) — 2026-10-16

Problem (Vadim playtest): by ~Farm L10 the game plays itself (auto-collect + auto-sell). Question: how do top idle games hand out automation without removing the player's role?
Only mechanics with a real source are listed. Hay Day-style management was not researched in this pass (no source gathered); flagged as a gap.

## 1. Benchmarks: session length (GameAnalytics, Q3 2018–Q2 2019, 1.2B monthly players)
- Idle genre average: 5.3 sessions/day, ~8 min/session, stickiness 18%. Top 10%: 5.82 sessions, 7 min/session, 34.9 min/day, D1 45.6%. Top 25%: 5.03 sessions, 6 min/session, 21 min/day, D1 39.4%.
- Sources: [GameRefinery](https://www.gamerefinery.com/hyper-casual-vs-idle-the-latest-trends-in-mobile-games/), [Game World Observer](https://gameworldobserver.com/2020/12/22/gameanalytics-names-benchmark-engagement-metrics-idle-games), [GameAnalytics blog](https://www.gameanalytics.com/blog/how-to-make-an-idle-game-adjust)
- Implication: design for ~6–8 min sessions, ~5 per day. A worker check-in every ~2.7 min (current AC-W5 sim) gives 2–3 meaningful prompts per session, which is in range.

## 2. Mechanics

### M1. Manager active ability with duration + cooldown (Idle Miner Tycoon)
- Trigger: player taps a manager's ability; "Activate all" button in Mine Overview fires every manager at once.
- Frequency: Junior 1 m effect / 5 m cooldown; Senior 3 m / 15 m; Executive 10 m / 50 m. Super Managers e.g. 30 s / 15 m, 1–5 m / 30 m. Red skill tree shortens cooldowns and extends effects.
- Payoff vs idle: rank-based multipliers, e.g. 3x / 5x / 8x speed or load; Super Manager Mr. Turner stores 30 s of output and pays it out at 10x.
- Unlock: managers buyable once the first Mine Shaft reaches level 5 (before that, workers are tapped manually). Managers can be sold back for 50%.
- Sources: [Managers wiki](https://idleminertycoon.fandom.com/wiki/Managers), [Super Managers wiki](https://idleminertycoon.fandom.com/wiki/Super_Managers), [Mr. Turner (Kolibri help)](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/318-mr-turner/), [Skill System](https://idleminertycoon.fandom.com/wiki/Skill_System)
- Fit: 5/5. Our workers already have energy plus Refill; adding one timed "rush" ability per worker (for example Market Hand "Rush hour": +demand for 60 s, 10 min cooldown) gives the active player a burst that idle play never gets. Cost: M (ability state, cooldown UI, one sim pass).

### M2. Store-then-multiply burst (Idle Miner Tycoon, Mr. Turner)
- Trigger: activated ability; output during the window is withheld, then paid out multiplied at the end.
- Frequency: 30 s effect / 15 min cooldown.
- Payoff: 10x on the withheld output (passives grow with promotion).
- Source: [Mr. Turner](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/318-mr-turner/)
- Fit: 4/5. A "Market day" where eggs sold for 30 s are banked and paid at a multiple is a readable, tense moment. Cost: S–M.

### M3. Automation as a purchase per business (AdVenture Capitalist)
- Trigger: buy one manager per business; it restarts the cycle automatically, including offline.
- Frequency: none afterwards. It's a one-off purchase that removes tapping for good.
- Payoff: the full idle income of that business; managers are priced cheap relative to the business, because "automation is what the game wants the player to buy".
- Unlock: cash price per business ($1,000 Lemonade Stand to $100B Oil Company); the player's role moves from tapping to spending (unit milestones at 25/50/100… halve cycle time).
- Sources: [Game Design Lab: managers](https://teemo.dev/game-design/adventure-capitalist/systems/managers-and-upgrades/), [Game Design Lab: core loop](https://teemo.dev/game-design/adventure-capitalist/systems/core-loop/), [AdCap Managers wiki](https://adventure-capitalist.fandom.com/wiki/Managers)
- Fit: 2/5 as a model to copy. This is exactly our "game plays itself" problem: AdCap accepts it because its active role is spending on milestones and prestige. Lesson: if workers fully automate, the player needs a strong spending or milestone layer to take over, which we don't have yet. Cost: n/a (it's a warning).

### M4. Upgrade-shortcut managers (AdVenture Capitalist)
- Trigger: EZ Upgrader / Quik Buy buttons buy the next upgrades in one tap.
- Payoff: saves taps; no income bonus. Unlock costs angels (the prestige currency).
- Source: [Game Design Lab: managers](https://teemo.dev/game-design/adventure-capitalist/systems/managers-and-upgrades/)
- Fit: 2/5. Reduces friction, doesn't add an active role. Cost: S.

### M5. Hold-to-boost running bonus (Egg, Inc.)
- Trigger: player holds the hatch button; the running chicken bonus rises while new chickens run, then decays.
- Frequency: continuous; players report keeping it up by tapping about once a second after building it up.
- Payoff: up to x400+ income multiplier (raised by research); drone cash rewards scale with the square root of the bonus (x400 makes drones x20).
- Sources: [Egg Inc Drones wiki](https://egg-inc.fandom.com/wiki/Drones), [Research wiki](https://egg-inc.fandom.com/wiki/Research), [r/EggInc tip thread](https://www.reddit.com/r/EggInc/comments/s9zvz1/running_chicken_bonus_and_other_tips/)
- Fit: 4/5. Same genre and theme. A decaying active multiplier on top of worker income keeps active play worth more than idle without removing workers. Cost: M.

### M6. Random tap targets (Egg, Inc. drones)
- Trigger: drones appear randomly in the sky; tap or drag to collect.
- Payoff: cash about 5% of farm value x sqrt(running bonus); 30% of elite drones drop golden eggs. Was nerfed in update 1.9 for being too strong.
- Source: [Drones wiki](https://egg-inc.fandom.com/wiki/Drones)
- Fit: 3/5. Cheap way to reward presence (e.g. a "rush customer" with a big order a worker can't serve). Cost: S.

### M7. Timed boosts bought with premium currency (Egg, Inc.)
- Trigger: activate a boost from the Boost Shop; 2 at once by default, 5 with Pro Permit.
- Source: [Boosts wiki](https://egg-inc.fandom.com/wiki/Boosts)
- Fit: 2/5 for now (monetisation, not active play). Cost: M.

## 3. Our designs for this slice

### Focus vs Bulk (with PM Market, market.md §3e)
- Market side (PM Market): manual focus premium max +10%, manual taps only. complete_bonus_share = 0.05 on the completing sale. No unserved penalty (timeouts < 1%). Combo dropped.
- Worker side: Market Hand has a mode toggle. **Bulk** (default) serves the whole queue every 1 s with no premium. **Focus** serves one customer every 2 s for +5% (half the manual premium), and drains energy at 1.5x. Switching modes has a 30 s cooldown. Workers do nothing offline.
- Economy/Balance result (product/m4-tracks-model.md, 30 seeds, pre-F1): Focus beats Bulk by +12–16% for managed players and only +0.6–1.9% for unmanaged ones, so Focus pays only when managed. The 30 s switch cooldown is untested.

### Pause/Resume (M4, approved by Head of Product 2026-10-16)
> **Superseded for build by `product/workers/m5-worker-pause-spec.md` v1.0 (2026-10-24).** The values here match (0.25×). The M5 spec adds the guards, the flag and the Rest convergence.
- A paused worker produces nothing, pays no wage, and recovers energy at a quarter of its drain rate (~1% per 36 s). Changed from half: at half, pausing W1/W2 at 40 and resuming at 100 cut wages by 67% and dropped the active/idle ratio to 1.48. Slower recovery makes that pattern lose. Economy/Balance confirmed 0.25 (F1, 30 seeds): pausing at 40 and resuming at 100 changes income by -1.0% for cheapest, -14.5% for casual and -47% for slow, and comes out even for seller15 (+0.03%, accepted, because W1/W2 earn about their wage for a 15 s seller). The fastest recovery that still loses for every model is 0.35. The F22-24 ratio is 2.21 to 2.65. Not modelled: the Market Hand hold rule. Resume goes straight to its current energy state.
- Pause doesn't touch the Refill cooldown. Pausing in Focus keeps the mode for when it resumes.
- Pausing every worker is allowed: a banner reads "All workers paused" and Refill tired (N) is hidden.
- Offline: workers earn nothing (as in the approved spec); only the pause state is saved.
- Control: a 44px Pause/Resume icon toggle on each worker card, with an aria-label and a 2 s debounce.
- Telemetry: worker_paused / worker_resumed with worker_id, energy, paused_duration_s.
- Exploit check: Refill is free, so pausing to recover is weaker than refilling. Economy/Balance is checking whether pausing at the yawn, or pausing waged W1/W2 in low demand, beats never pausing.

## 4. Recommendation for the "plays itself by L10" problem
1. Add one cooldown ability per worker (M1), with an Activate-all button. This has the best fit, is proven in Idle Miner, and the burst only goes to a present player.
2. Add a decaying active multiplier (M5) so active income scales above worker income.
3. Keep Focus vs Bulk and Pause as low-cost choices for the player, not new chores.
4. Avoid AdCap-style full automation (M3) unless a spending or milestone layer takes over the active role.
All numbers above are other games' values; ours need an Economy/Balance sim before they go in the spec.
