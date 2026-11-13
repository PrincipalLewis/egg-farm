# Player read: Farm L10 onward, M4.1 RC1 (PR #67 head)

- **Who / how:** Player (blind player-experience tester), hand play only. Everything below comes from what was on screen: no console, no debug, no specs.
- **Build:** PR #67 head `5d9efa6` (rc/m4.1-rc1), built locally with `npm run build:html`. Settings label `m4.1+5d9efa6`. sha256 `ccb87daa…d5e1`.
- **Setup:** Chrome incognito, mobile view 375x700. Fresh farm started ~15:45 on Oct 24 (Europe/Budapest).
- **Getting to L10:** no fast-forward. I played it honestly, reaching Farm L10 with Market Hand, Coop Hand and Hawker all hired at **16:04:39**.
- **From L10:** played until **16:25:30**, about 21 min, ending at Farm L18.
- **Screenshots:** in `playtest/player-notes/l10-2026-10-24/shots/`.
  - `01_L10_all_workers.png`
  - `02_dead_stretch.png`
  - `04_state_1625.png`
- **Limits of this read:** browser automation made input slow and laggy. My minute-by-minute log for 16:04–16:17 was lost; only the screenshot and a few purchases survive from that stretch. Times are box clock and approximate to about ±30 s.

## The short version
Vadim's read holds. Once all three workers are hired at L10, the farm screen gives me nothing to do. The one big button, **Collect +20**, adds 20 eggs to a pile of about 1,000 and never gives coins. I saw no golden eggs or any other special event in 21 minutes. The money counter kept stalling, and nothing on the farm screen told me why or what to do about it.

## Timeline from L10
| Time | What happened |
|---|---|
| 16:04:39 | Farm L10 bought ($1,094). "Coop upgraded! +1 customer slot" toast. The hint bar suggests Hens L8. All three workers hired, so the Workers tab has nothing left to buy until the Egg Grader at L18. |
| 16:04–16:14 | Bought Farm levels and cheap Hens/Egg value. My detailed log for this stretch was lost. |
| ~16:14 | **Dead stretch** (`02_dead_stretch.png`). Money $4,425, coop 999/1,000 and basically full. Customer row says "Full" with +5 waiting. The only suggestion is "Collection L4: +5/tap". |
| ~16:15, 16:17:07 | Farm L16, then L17 ($7,024). |
| 16:17–16:18 | Tapping test, see below. |
| ~16:18 | Egg value L16 ($3,459), then L17 ($4,601). |
| **16:19:00–16:21:13** | **Bored, about 2 min.** Money stuck at about $2,290 while the egg counter climbed from 560 to 1,240. I thought the game had stalled. |
| 16:21:13 | Opened Market by chance (it had a red dot). Customers were standing there with 0/N eggs filled. Tapped Sell all: +$3.7K. |
| 16:22:06 / 16:22:30 | Sell all again, +$3.0K and +$3.1K. Money $12.2K. |
| 16:22:49 | Farm L18 ($10.2K). |
| **16:23:00–16:25:30** | **Bored, about 2.5 min.** Money stuck at about $1,980. Coop at 1,187/1,187 "Full!" with 1,226 eggs in stock (`04_state_1625.png`). Next Egg value $6,119, next Farm about $11.1K. Nothing to do on the farm screen, and tapping is pointless with the coop full. |

## What I wanted to do but couldn't
- **Make money by tapping.** In an idle game the big button is where I put my energy when I'm waiting. Here it only adds eggs, which were already piling up unsold. I wanted taps to turn into coins, speed something up, or fill a meter.
- **Know why money stopped.** With three workers hired I assumed selling was handled. From the screen it wasn't: eggs piled up into the thousands and money sat flat until I opened Market and hit Sell all. I don't know whether the workers were tired, the customers were full, or selling just isn't automatic. As a player, I just saw "stuck", and the only clue was a small red dot on the Market tab.
- **Do something with a full coop.** "Full!" shows on the coop, and the customer row shows "Full" plus waiting customers at the same time. It looks like everything is full and nothing moves, and I can't do anything about either.
- **Have something to spend on between Farm levels.** Farm prices jump ($7K, then $10.2K, then $11.1K), Egg value is $6K+, and the Workers tab is empty after L10. The waits get long and nothing small fills them.
- **Trust the "Ready in ~N min" timers.** They seemed to assume sales I wasn't making.

## When I got bored
1. **~16:14:** first real "now what?" moment, about 10 min after L10.
2. **16:19–16:21:** about 2 min of a flat money counter. A real player would likely close the game here, or think it's broken.
3. **16:23–16:25:** about 2.5 min with nothing affordable and nothing to tap. **I'd have quit here (~21 min after L10)** and only come back later for offline earnings, if at all.

## Did tapping or golden eggs ever feel worth it?
- **Tapping: no.** Each tap gave +20 eggs, a small "+20" float and a button squish. It gave no coins and money didn't move. Compare: 30 s idle earned about $2,345 in the 16:17 window (customer sales). Three taps added 60 eggs to a ~1,100 coop, which made no visible difference. Once the coop says "Full!", tapping does literally nothing useful. (The first tapping comparison, at ~16:14, was lost with that part of the log.)
- **Golden eggs: never seen.** In about 21 min from L10, and in the ~20 min before it, no golden egg or bonus event appeared on the farm screen. If they exist in this build, they're either too rare or too easy to miss to matter at this stage.

## What would have kept me playing (as a player, not a fix list)
- A reason to tap after L10: taps that earn coins, fill a "rush" meter, or speed up hens or customers for a few seconds.
- Something that pops up and rewards attention every minute or two, like the golden egg I was hoping for.
- A clear sign on the farm screen when money has stopped, and why (eggs unsold, workers tired, customers full), with one tap to fix it.
- Small purchases between the big Farm levels, so there's always something within a minute or two of reach.
- A visible "next goal" that's further along than one upgrade (Egg Grader at L18 and the coop upgrade at L20 were only visible deep inside the panels).

## Other things noticed
- The first session reported sideways page scroll and headings clipped to "grades" and "rket". I haven't confirmed that on screenshots, so treat it as unverified.
- Taps fired close together sometimes didn't register. Spaced taps (about 2 s apart) were reliable. That could be the slow automation rather than the game.
