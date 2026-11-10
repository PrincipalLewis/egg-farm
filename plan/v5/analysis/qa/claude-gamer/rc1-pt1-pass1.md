# Claude Gamer — rc1-pt1 pass 1
Date: Fri Oct 16, 2026 ~14:10 CEST · Build: rc1-pt1 **2490c79** (egg-farm-rc1-pt1-2490c79.html; local copy used from product/critic/builds/ because qa/m3-recheck/rc1-pt1-2490c79/ has no html) · Claude calls: 1
**Method caveat:** Claude did NOT render the build (its shell was blocked); it simulated a ~25-min new-player session from the 2490c79 source (tick.ts, actions.ts, balance.json, formulas.ts, workers.ts, next-goal.ts, onboarding.ts). Feel, animation, audio and layout are unverified. Times are estimates for fast tapping and buying as soon as affordable.

## Raw Claude output
**I did not run the build. I simulated from source.** My shell checks were blocked, so I couldn't confirm playwright was available. I read `tick.ts`, `actions.ts`, `balance.json`, `formulas.ts`, `workers.ts`, `next-goal.ts` and `onboarding.ts`, then worked the economy by hand. The UI strings I quote come from source. I didn't see the game render, so every claim about feel, animation, audio and layout is unverified. All times are estimates, assuming I tap fast and buy as soon as I can afford something.

## Start and rules
- You start with $0, Farm L0 and Collection L0.
- Hens lay 1.5 eggs/s. One tap collects 5 eggs.
- The first customer arrives at 10 s. After that, one arrives every 5 s, and they leave after 30 s.
- The tutorial has three steps: "Tap Collect to gather eggs from the coop." → "A customer is waiting! Tap them, then Sell your eggs." → "Spend your coins: open Upgrades and buy your first one."

## Timeline (estimated)

| Time (m:ss) | Event |
|---|---|
| 0:03 | First 5 eggs ready to Collect. |
| 0:10–0:11 | The first customer wants 6–12 eggs. I sell about 9 for about $9. |
| ~0:17 | **First upgrade: Collection L1 ($10).** Taps now give 10 eggs and the price is +12%. |
| ~0:32 | Collection L2 ($25). |
| ~1:25 | Farm L1 ($100). |
| ~2:17 | Farm L2 ($135). |
| ~3:01 | Farm L3 ($182). This unlocks Market Hand. |
| ~3:08 | Hire Market Hand ($40). |
| ~3:50 | Farm L4 ($246). |
| ~4:40 | Farm L5 ($332). |
| ~5:30 | Farm L6 ($448). |
| ~6:20 | Farm L7 ($605). Hire Coop Hand ($150). |
| ~7:30 | Farm L8 ($817). Hawker ($800) is next. |
| ~9:45 | Farm L10. |
| ~15:45 | Farm L13. |
| ~22:00 | Farm L15. |

- **Cadence:** Farm levels come about every 45 s at L3–L6, then every 60–100 s up to L10. Collection and worker purchases fit in between.
- **Gaps over 3 minutes:** I only expect a real one from about Farm L14 (about minute 17–19). The waits there are 173 s and then 211 s. Collection buys are cheaper and may fill some of that.
- **Is the next goal clear?** Yes, on paper. A "next goal" strip picks the cheapest thing and shows labels like "Farm L3: unlock Market Hand" and "Collection L2: +5/tap". It shows a time-to-afford countdown, or "Ready!", or "—" when there's no income.

## Feedback quality (from source only)
- **Tap:** Tapping with fewer than 5 eggs in the coop reads "Collect" and shakes with "Empty". I couldn't check how the eggs fly to the basket, or the sounds.
- **Sell:** Selling is per customer or "Sell all". I couldn't evaluate coin pops.
- **Workers:** Worker tips read "Tap **Manage** to perk them up!" and "…when their energy drops." A "Coop upgraded!" toast appears at L5/L10/L20.

## Confusing or risky points
- Tapping isn't the bottleneck, eggs/s is. A bigger tap size doesn't earn more. It only saves taps, and eggs wait in the coop until the cap. Collection's real value is the +12% price, but the strip says only "+5/tap". A new player may undervalue it.
- The tutorial gate waits up to 60 s ("A customer is on the way…", "Your hens are laying eggs…"). A step that stays blocked for 60 s is silently skipped.
- **Manage** only works at 40% energy or lower. Coach text says "perk them up" before that, so tapping it early probably does nothing.
- **Unpaid** workers stop silently if coins can't cover the wage. The wage is small, but it's an unexplained state.
- Coop Hand collects one tap's worth every 2 s. That is 7.5 eggs/s at Collection L2, which is slower than hens lay from about Farm L10.

## What keeps me playing, and when I'd quit
- **Keeps me playing:** a purchase about every 30–60 s for the first 8 minutes. There are clear unlock beats too: Market Hand at Farm 3, Coop Hand at Farm 7, Hawker at Farm 8.
- **When I'd quit:** around minute 15–20. Waits stretch to 2.5–3.5 min per Farm level, and workers take over the tapping, so my own input matters less.

## Top 3 likes
1. The first upgrade lands at about 17 s, which is a fast hook.
2. The next-goal strip shows a countdown and a cheapest-first target.
3. Workers unlock on a clear schedule, with a named unlock on each Farm level.

## Top 3 frustrations
1. Waits past minute 15: about 142 s, 173 s, then 211 s per Farm level, with no new mechanic to break them up.
2. The Collection upgrade is advertised as "+5/tap" while its real benefit is price +12%.
3. Once Market Hand and Coop Hand are hired, active play shrinks to buying upgrades and tending energy.

## Suggestions
1. Show Collection as "+12% egg price, +5/tap".
2. Add a mid-game goal, such as a milestone or bonus, for the Farm L10–L15 stretch.
3. Explain why Manage is greyed out at high energy ("Rest at 40% or less").
4. Shorten the Farm cost growth (1.35×) or raise income past L10 so waits stay under 2 minutes.
5. Confirm the tutorial doesn't silently skip steps after the 60 s gate.

## Verdict
The first 8 minutes look strong and clear, but the mid-game waits and the unexplained Collection value need work. This verdict rests on source and my arithmetic, so a real run is still needed.
