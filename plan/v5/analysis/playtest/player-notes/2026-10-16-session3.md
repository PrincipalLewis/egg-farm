# Player playtest, session 3: m3-rc1-pre+a01faea (origin/main)
Oct 16, 22:39-23:25 UTC+2. Hand play, fresh incognito save, device toolbar at 375x700. A rate-limit pause after L8 (22:55:17) cost only a few seconds; same save. Offline break 23:09:03-23:20:14 (11m11s).

## Timeline
- First upgrade: early on; exact second lost in the pause.
- Workers: Market Hand 22:47:42, Coop Hand 22:54:31, Hawker 22:56:40.
- Farm: L5 22:52:32, L7 22:54:01, L8 22:55:17, L9 22:55:23, L10 22:56:52 (toast "Coop upgraded! +1 customer slot"), L11 23:00:11, L12 23:00:36, L13 23:02:05, L14 23:03:23, L15 23:07:12, L16 23:21:48, L17 23:25:01. L1-L4 and L6 weren't logged.
- Collection: L6 22:48:31, L8 22:52:01, L10 22:57:15, L12 22:58:33, L13 23:04:55, L14 23:05:21, L15 23:20:51.
- Dead zones over 3 min with nothing affordable: none (longest about 1.5 min). But 22:57-23:08 felt dead anyway: 0 eggs, queue full, "Collect +55 · 0 ready" greyed. All I could do was wait and buy.

## 1. Next-goal hint
Switches: Collection L12 to Farm L11 (about 23:00), to Collection L13 (23:01:40), to Farm L15 (23:06:50), to Collection L16 (23:08:45). No flicker. But while eggs were the bottleneck (0 stock, queue full), it kept pointing at Collection when Farm (more hens) looked like the better buy. Upgrades opens on the last-used tab, not the hinted one.

## 2. Coop full (B-1)
Not landed as described. At 23:22:55 the coop showed 850/850 with only a small red "Full!". The ETA said "~27 s", not "—". There was no "Coop full" text and no collect/hire advice. The cause: all three workers had fallen asleep at 0% energy while I was away, which the main screen never says. One tap took the bar from 850 to 790 while eggs went 0 to 80 (numbers don't agree). Earlier the ETA also showed "~1 min 3 s" while the coop was full and income was 0.

## 3. Goal labels
Goal labels were never truncated. Other clipping: "Queue full!" clipped at the right edge, with two copies overlapping (23:01:45, 23:03:08); "Sold out!" shown as "old out!".

## 4. Offline return
Popup: "Welcome back! You were away 11m · +2,732 eggs · Collect". No cap explained. Before leaving: $8,873.19, 0 eggs, coop 51/800. Behind the popup: $10.4K, coop 18/800. After Collect: 2,332 eggs and $12.8K (5 customers served instantly). Not believable as shown: about $1.5K earned while away isn't mentioned; 2,732 eggs is over 3x the 800 coop with no explanation; workers came back asleep with no warning. Money and prices also switched to short form ("$10.4K") after the return, so I couldn't compare exact amounts.

## 5. Other
- Workers tab: the sticky "Manage all" covers Market Hand's "Manage" (22:59).
- The Farm L10 card promised an egg price of $3.04; the Collection card then showed $2.94 to $3.12.
- The Farm L17 card says "Customer demand 31-61 -> 31-61" (no change).
- Taps on Upgrades sometimes ignored (23:24, and earlier).

## Top 3 by player pain
1. Workers silently fall asleep (especially offline), the coop fills, and sales stop with no explanation. "Coop full" is a tiny badge with a wrong ETA and no advice.
2. The return popup is incomplete: money isn't shown, no cap is explained, the egg count exceeds coop capacity, and the switch to short-form numbers makes totals uncheckable.
3. The next-goal hint ignores the real bottleneck (pushes Collection at 0 eggs), Upgrades doesn't open on the hinted tab, and there's a dull 10-minute "0 ready" stretch. Plus the overlapping "Queue full!" and "Manage all" covering "Manage".
