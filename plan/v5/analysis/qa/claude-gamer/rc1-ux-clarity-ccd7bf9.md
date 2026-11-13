# Claude Gamer — rc1/ux-clarity @ ccd7bf9 (pass rc1-ux-clarity-ccd7bf9)
Date: Fri Oct 16, 2026 · Build: **m3-rc1-pre+ccd7bf9**. The build id was read at runtime from meta[name=build-id] (smoke-2026-10-16T12-59-10-253Z.json; the top bar shows "build ccd7bf9"). Clean clone at /tmp/egg-claude-gamer/ux, built with `npm run build` (check-release-build ok).
**Method:** real headless Chrome play (playwright-core), no source simulation. A bot played: Collect every ~350 ms, Sell all every ~2.5 s, buy the first affordable upgrade in each tab, Refill whenever it was enabled.
- 390×844: 22 real minutes (`m390-*`).
- 1280×800: 7 minutes (`desk-*`).
- Each run has an events file (`*-events.txt`) and a console log (`*-console.json`, 0 page errors, 0 console errors) in this folder. Every file is tagged with the build id.
- Served on 127.0.0.1:4183, because :4173 was already held by another agent serving a different build.
- `run1-stuck/` is an earlier 390px run. The bot only collected while the button said "· N ready", and that text disappears when the coop is full, so the bot stalled from 5:40. It still documents the full-coop state.
- Claude judged the screenshots and logs once (`claude-judgement.txt`). The timings below come from my events log; Claude mislabeled some Farm levels.

## Measured progression (390px, run 2)
- First upgrade at 0:19 (Collection L1, $10). The desktop run got there at 0:13.
- Market Hand at 4:30, Coop Hand at 7:42, Hawker at 9:17.
- Purchase gaps: 6–20 s up to minute 1, 25–52 s from minutes 2–13, then 57 s (14:52), 72 s (16:03, Farm L13), 73 s (17:16), 80 s (18:37, **Farm L14**), 99 s (20:16, Farm L15) and 96 s (21:51).
- **There was no stretch longer than 3 minutes with nothing to buy.** The longest gap was 99 s. Farm L14 arrived at 18:37, matching the expected minute 17–19. The slowdown is real but is not a dead stretch.

## Findings
**(a) Clarity:** good.
- The goal chip is always visible, e.g. "★ Farm L14 · +11% income ~0:34" (m390-17).
- Upgrade cards show before → after values, "+X% income", "Pays back in ~…" and a ★ Best buy tag (m390-06, m390-05).
- Collection now reads "+12% egg price · +5/tap", which fixes pass 1's complaint.
- The Farm card lists 5–6 changes and is cramped (m390-07).
- Collection payback climbs to ~27–36 min by L13–14, and nothing warns that the upgrade has become weak.

**(b) Pacing:** the gaps listed above. They are long but not dead; the Farm L14 area runs 72–99 s per buy.

**(c) Confusing or unexplained states:**
- **Full coop (run1-stuck/m390-13-6m42-periodic.png):**
  - The coop shows 250/250 and a small "Full!" tag, but Collect still says "Collect +40" in bright yellow with no ready count.
  - The goal ETA froze at "~0:14"–"~0:16" for over 15 minutes while money slowly fell from wages ($186 → $165).
  - The top bar kept showing "+$11.03/s".
  - **The ETA and the income figure are wrong whenever the player isn't collecting.**
- **Refill/Manage:** the button is disabled with the caption "Rested, refill below 40%" (m390-11, desk-11). That explains it, which improves on pass 1, but the caption is small. The "Workers get tired over time." tooltip covers the tab bar (desk-11).
- Collect at "0 ready" greys out with no reason (m390-18). "No eggs to sell" sits over the order cards (desk-04).

**(d) Feel:** Collect taps give floating "+N" numbers, and selling gives "+$" pops plus a coin animation (m390-03, m390-04). Once income passes $60/s, Sell-all becomes repetitive.

## Top 3 likes
1. Clear before → after values and payback times on upgrades.
2. The goal chip is always visible.
3. The tap and sell feedback feels good.

## Top 3 frustrations
1. The full coop is a silent stall, with a frozen ETA and a misleading income figure.
2. Buy gaps reach 72–99 s from minute 16 with nothing new to do.
3. Disabled states are weakly explained: Refill (small caption), Collect at 0 ready, and a cramped Farm card.

## Suggestions
- Add a strong full-coop state: "Coop full — collect/sell", and show the ETA as "—" when income has stalled.
- Base the top-bar income figure on actual earnings.
- Add a mid-game target or milestone for minutes 15–20.
- Make the reason on disabled buttons more prominent.
- Show at most 3 lines on the Farm card.
- Flag weak Collection upgrades once payback is longer than ~15 min.
- Move tooltips off the tab bar.

Claude calls: 2 logged for this PASS_ID. Call 1 aborted (no output, counted=0) and call 2 succeeded (counted=1).
