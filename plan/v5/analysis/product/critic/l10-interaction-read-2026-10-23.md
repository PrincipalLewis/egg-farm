# L10+ interaction read: M4.1 RC1 (PR #67 head 5d9efa6, build m4.1+5d9efa6)

Requested by Head of Product under D-CEO-20261024-05. Played Oct 24, 2026, 16:13-17:03 CEST. This is a read only, with no fixes.

**Bottom line: Vadim is right.** From Farm L10 with all three workers hired, the player's only real input is pressing Buy, plus Manage all every 9-14 minutes. Tapping is worth about 0-8% of income while workers are awake. Golden eggs, worker abilities and the collect streak do not exist in this build: their numbers are in `balance.json` (`tc` block), but no game code reads them, and a DOM scan found no golden, streak, ability, prestige, boost, mission or achievement UI. L10 to L30 took about 36 minutes, and after L30 the only thing left to buy is Collection, with waits growing past 7 minutes.

## Method and caveats
- I started from an injected Farm L10 save with Market Hand, Coop Hand and Hawker hired at full energy and $290. The save was generated with the build's own game logic (`product/critic/saves/`).
- I played the first ~4 minutes by hand. After about 16:17 a script bought anything affordable every 3-4 s, so purchase gaps below are shorter than a human would see. A real player sits in each "waiting" stretch for longer.
- Screenshots and log are in `product/critic/shots-l10-m41/` (`log.txt`, t0-t12).

## Minute-by-minute: what the player can actually do
| CEST | Farm | Income | Available and meaningful | What happened |
|---|---|---|---|---|
| 16:13-16:15 | L10→12 | ~$100/s | Buy Hens / Egg value / Farm | Hens and Egg value are gated by Farm level, so each Farm level opens about 3 buys. Collect and Sell are already handled by workers. |
| 16:15-16:19 | L12→15 | $100-140/s | Buy | The stored eggs ran out around L13. "Queue full" with 10 customers waiting, and nothing for the player to do about it. |
| 16:20-16:22 | L15→17 | $140-190/s | Buy | The "★ Best buy" chip pointed at Collection, which delayed Farm. |
| 16:22:29-16:23:25 | L17 | $190/s | Only Collection | **Dead zone, 56 s.** |
| 16:23-16:24 | L18 | $190-300/s | Buy Farm L18, Grader hire $5.5K; Manage all (workers at 32%) | First Manage of the session. |
| 16:26-16:27 | L19→20 | $560-600/s | Buy Grade ×2 | |
| 16:28-16:33 | L20→22 | $0.6-1.3K/s | Buy Grade ×2.5 / ×3 | 20-45 s waits between bursts of buying. |
| 16:33:55-16:34:15 | L22 | | Nothing affordable ($60K banked) | **Dead zone, ~20 s.** |
| 16:34-16:41 | L23→27 | $1.7-2.5K/s | Buy Grade ×4, Farm ($57K-$98K) | 20-45 s waits repeating. Hens and Egg value both hit MAX at L27. |
| 16:42-16:44 | L27 | | Manage (workers Tired at 16:42) | 20-45 s waits. |
| 16:44:41-16:46:59 | L28 | ~$2.8K/s | Only Collection | **Dead zone, ~2:15.** |
| 16:46:59-16:48:52 | L29 | ~$3K/s | Only Collection | **Dead zone, ~1:55.** |
| 16:48:52 → | L30 MAX | ~$3K/s | Collection ($121K → $1.27M, ×1.6 each), Manage all every ~9 min | **Permanent dead zone.** Gaps between purchases grow from ~1 min to 7.5 min and keep growing. |

## Dead zones
1. L17: 56 s (only Collection buyable).
2. L18-19: 20-40 s between buying bursts.
3. L22: ~20 s with $60K and nothing to buy.
4. L23-27: repeating 20-45 s waits after each buy.
5. L28: ~2:15. L29: ~1:55 (only Collection).
6. L30+: open-ended. Only Collection is left, at 1-7.5+ min per buy and climbing, plus Manage all every 9-14 min.

Those are script-paced numbers. For a human, add the reaction time to each, and the "between bursts" stretches are where a human would just watch numbers.

## Where tapping and other inputs stop mattering
- **Collect taps** stop mattering by L15. With Coop Hand hired, very few eggs are ready to collect: 20 taps in 14.6 s gave ~$205/s against $189/s idle (+8%, within noise). At L20 it was $574/s vs $573/s. At L28-30 with fresh workers, tapping plus Sell all was no better than idle.
- **Manual Sell** is meaningless next to Market Hand and Sell all.
- **Tapping only matters when the player has neglected workers.** Tired (under 30%) cuts income by ~55-60%, and Asleep cuts passive income to $0. Tapping then restores near-full income ($0 → ~$2.6K/s with a tap every ~2 s, and $1.26K → $5.4K/s briefly while clearing the 535-egg backlog). So the only time tapping pays is as a penalty for forgetting Manage.
- **Golden eggs, worker abilities, collect streak:** absent, so they never matter.
- **Manage:** one tap fills every worker for free, then a 30 s shared cooldown. Pressing a single worker's Manage also locks Manage all. It's a chore every 9-14 min with a big penalty for missing it, and no alert outside the Workers panel.
- **The "★ Best buy" chip** often recommends Collection (+5 per tap, which adds nothing to passive income) when Farm is close, so following it slows progress. The countdown itself is accurate and useful.

## 3 biggest fun gaps vs top idlers
1. **No active-play layer once workers are hired.** Cookie Clicker has golden cookies and frenzies, Egg Inc. has drones, boosts and the hold-to-hatch button, and AdVenture Capitalist has timed events and manager unlocks. Each gives a reason to look at the screen in the mid game. Here, from L10 the player's input is Buy, and tapping is dead weight unless workers are neglected. The planned golden eggs, abilities and streak are exactly this layer, and they aren't in the build.
2. **Decisions collapse to "buy whatever's affordable", and late on to "wait".** Every Farm level opens the same few gated buys. Hens and Egg value are bought every level, Collection is a trap the chip recommends, and Hens and Egg value hit MAX at L27. Idle Miner Tycoon (shaft vs elevator vs warehouse bottlenecks) and Egg Inc. (research choices) keep real tradeoffs going throughout. This build doesn't have any after about L15.
3. **No horizon past L30.** There's no prestige, reset, new farm, missions or achievements, so L30 is reached in ~36 min from L10 and then the only purchase left gets slower every time. Every genre leader turns its cap into the start of the next loop: Egg Inc.'s soul eggs, Cookie Clicker's ascension, AdVenture Capitalist's angels and planets. Here the cap is the end.

Also notable: worker upkeep is the one recurring interaction, and it's maintenance (refill, or lose up to 100% of passive income) rather than play.
