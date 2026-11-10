# M4 B player-experience pass (Player)

- Build: `/tmp/relchk/egg-farm.html` (release m4b-dd223f5), sha256 verified, Settings label `m3-rc1-pre+246de09`.
- Fresh farm, Chrome incognito, mobile view 375x700, hand play only. Started 09:16:30 on Oct 19 (Europe/Belgrade). Stopped at 10:19, about 62 minutes in, at Farm L24 (the run was interrupted).
- Full timestamped log: `shots/log.txt`. Screenshots: `shots/01`–`04`.

## Verdict
No blocking bug found. One of the bugs is a real but minor bug in the countdown timers. The rest are confusing UI and copy. Pacing felt good for the first hour. I didn't reach the L30 cap, so I can't say how it feels.

## Key numbers
- **Time to first upgrade:** about 1 min 20 s (Collect per tap L1, $10, at 09:17:52). Good.
- **Upgrade-tracks explainer card:** never shown on the fresh farm, which is expected.
- **Farm levels:** L1 3:40 in · L5 10:00 · L10 19:15 · L15 29:05 · L19 39:00 · L20 42:00 · L24 62:25.
- **Hires:** Market Hand 7:15 in, Coop Hand 16:05, Hawker 17:20, Egg Grader 36:45.
- **Dead stretches:** no stretch of more than about 3 min had nothing to buy. Late in the run, waits between Farm levels grew to 4–5 min, filled with Egg value, Hens and Collect buys. That felt fine, not dead.
- **The L30 cap:** not reached. Farm L24 came at 62 min. The next level cost about $72.2K, roughly 4 min away at about $310/s. Farm price jumps were x1.25 a level up to L15, then x1.45, then about x1.71 at L21. At that pace L30 looks like another 25–40 min, so roughly 1.5 h total. Someone needs to check how the cap feels in a longer or seeded run.

## Bugs
1. **Low: "Ready in" and "Affordable in" timers drift up or lag the clock.**
   Repro: wait for any card's ETA with workers hired. "Affordable in ~0:12" rose to ~0:22 at 09:32. Farm "Ready in ~46 s" was still ~29 s after 25 s at 09:35. At 10:14 "~3 min 49 s" went to "~3 min 53 s". Over 90 s at 10:16 it fell only from 3:53 to 2:47. The cause looks like coins draining (wages) while the ETA is based on gross income. I can't trust the timer.
2. **RETRACTED (10:34): the 10:14 coin drop was not a bug.** Telemetry (`shots/telemetry-1014.json`) shows the only purchase between 10:12 and 10:16 was Farm L23 at 10:14:45: coins before $56,958.51, cost $56,589, leaving $369.51. There was no Hens buy (Hens is still L15). My '$1,543' reading was a misread or stale readout, not a separate loss. The slow coin drift from wages while the coop is full still stands as a readability point: nothing on screen explains it.
3. **Low: the Farm buy button moves as the card text changes.** The "Ready in" text reflows and the button shifts, so I risk a mis-tap. Repro: watch the Farm card while the ETA ticks (from about 09:34).
4. **Low: one Hens buy tap ignored with enough money** (Hens L13, $10.6K, ~10:00). Tapping again worked. Seen once only.
5. **Low (seen early, not rechecked):** the goal chip says "Collection L3 Ready!" before you buy it; "No eggs to sell" shows when there are eggs but no customers; one price ticked down ($45.05 to $44.99); the onboarding Sell step points at a "Sold out!" customer.

## Confusing or annoying (not bugs)
- **Workers get tired silently.** At about 30 min every worker was "Tired" (12–19%) and income had been flat at $20–30/s. Nothing on the farm screen told me. After "Manage all", income jumped to about $75/s. It happened again about every 10 min. Players will just think the game got slow. The "Manage all" button only appears when workers are tired, and Manage buttons are greyed out at 75–81% energy.
- **"Balanced farm N/5" reads like "N of 5 tracks".** It's actually a tier counter. It showed 1/5 with Hens 5, Egg 5 and Farm 7 (shot 03), which looked wrong until I worked it out.
- **Hiring is hard to find.** Upgrades opens on the Farm tab, and the Market Hand hire sits under Workers.
- **Coach tips:** "Workers get tired over time" covers the tab bar. A "Tap Manage" tip shows when the button is already visible. I never saw the "New helper" intro.
- **Big prices are hard to read.** In "$18.2K" the 8 reads like a 6 at that size, so I thought I could afford Farm L20 (shot 04).
- **Taps:** early on I thought taps were being ignored when the coop was full (shot 02). Most of that turned out to be my own rapid or overlapping taps. Single taps about 1.5 s apart register reliably. A fast tapper will still feel it.

## What felt fun
- Fast first upgrade.
- Steady buy-something-every-minute rhythm through the first 40 min.
- Hiring workers and watching income climb.
- Big jumps from Egg value tiers: Jumbo at L20 took income from about $190/s to $310/s.

## Test-setup note (not the game)
The DevTools screenshot Save dialog stole one click at 09:58. That's my tooling, not a game bug.
