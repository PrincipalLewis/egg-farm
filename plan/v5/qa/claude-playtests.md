# Claude Gamer playtests

## 2026-10-16 — rc1-pt1 (2490c79), pass 1 (source simulation, not a rendered run)
Details: qa/claude-gamer/rc1-pt1-pass1.md
- First upgrade ~0:17 (Collection L1 $10); a buy every ~30–60 s until ~8 min; first >3 min gap expected around Farm L14 (~min 17–19: 173 s, then 211 s).
- Likes: fast first-upgrade hook; next-goal strip shows the cheapest target plus a countdown; clear worker unlock beats (Market Hand at F3, Coop Hand at F7, Hawker at F8).
- Frustrations: Farm waits of 142/173/211 s after min 15 with nothing new; Collection labelled "+5/tap" when its real value is +12% price; once workers are hired, active play shrinks. Would quit at ~min 15–20.
- Also: Manage is a no-op above 40% energy, but the coach says "perk them up"; tutorial steps are silently skipped after a 60 s gate; "Unpaid" worker state is unexplained.
- Suggestions: relabel Collection "+12% egg price, +5/tap"; add a milestone for F10–F15; explain why Manage is disabled; soften the 1.35× farm cost growth past L10; verify the tutorial skip.

## 2026-10-16 — rc1/ux-clarity @ ccd7bf9 (m3-rc1-pre+ccd7bf9), real headless play at 390px (22 min) and 1280px (7 min)
Details: qa/claude-gamer/rc1-ux-clarity-ccd7bf9.md, with evidence in qa/claude-gamer/rc1-ux-clarity-ccd7bf9/
- First upgrade 0:19. No gap over 3 min; the longest was 99 s. Farm L14 arrived at 18:37 (80 s gap), L15 at 20:16 (99 s).
- Likes: upgrade cards show before → after and payback; the goal chip is always visible; tap and sell feedback.
- Frustrations: a full coop stalls silently (the ETA freezes at ~0:14 and "+$11.03/s" stays on screen while money falls); 72–99 s gaps after minute 16; weak explanations on disabled states. Refill does now say "Rested, refill below 40%".

## 2026-10-17 00:07–00:52 CEST — fix/rc1-qa-bugs-v4 @ 7d52952, real headless play: first session at 390 (4 min) and 1280 (3 min), plus a full-coop recheck
Details: qa/claude-gamer/rc1-qa-bugs-v4-7d52952.md
- The tutorial Sell step is clear and advances instantly (no stall or skip); first upgrade at 0:18.
- Bugs: runtime meta build-id is missing (B1, ccd7bf9 not on this branch); "No eggs to sell" while holding eggs; the post-sale order card stays "0/8 · Sell 8" (faded); possible ↑ icon over the price on buy.
- Full coop: the ETA now shows "—" (fixed); the Collect button still doesn't say the coop is full; "+$/s" with wages not rechecked.

## 2026-10-17 — release m3-rc1-pre-dd52bfd, real headless play, about 26 min active at 390px (3 save-persistent chunks) + 3 min desktop
Details: qa/claude-gamer/m3-rc1-pre-dd52bfd.md
- Fixed: runtime build-id meta; the post-sale order card. Not a bug: the ↑ over the price (purchase flourish). N/A: +$/s (no longer shown).
- Still present: "No eggs to sell" while holding eggs when no customer is there (should be "No customers"); the spinner overlaps "Next customer soon"; the full coop is silent on Collect, and the wage drain is unexplained.
- Pacing: buy gaps of 10–40 s early, 20–63 s at minutes 13–21, 52–111 s at minutes 25–34. None reached 3 min.
