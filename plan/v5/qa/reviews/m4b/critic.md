# Critic review: M4 B release m4b-dd223f5 (build-id m3-rc1-pre+246de09), Oct 19 2026

**Score: 7 / 10** (dd52bfd: 6, rc1-pt1: 5.5)

Copy tested: /tmp/relchk/egg-farm.html, sha256 0bc5bb72…179a4c. Session: an existing-save migration check (old dd52bfd save at L6), then a fresh save from L0 to the L30 cap in about 44 min (09:25-10:09 CEST). Most of the play was a scripted loop that played close to optimally, so a real first-timer will be slower. The box was heavily loaded (load average 23-25), so I've ignored input sluggishness. Audio was not evaluated. Screenshots are in `shots-m4b/` (A1-A2, B1-B8).

## Core loop
The upgrade tracks fix the biggest complaint from the last two reviews. From L8 to L14 a Farm level took 26-67 s, with a purchase every 5-15 s. Before, the same stretch was 35-80 s waits with nothing to press but Buy and Manage. From L15 to L30 it settles at 1.5-2.7 min per level, but there's almost always a track or worker tier to buy, so it no longer feels like the game plays itself. The Egg Grader tiers (×1.5 to ×4) make good mid-to-late goals.

The tracks are a sequencing choice, not a direction choice. Hens and Egg value are both capped by Farm level, so you end up buying both every level. The real decision is "buy a track now, or hit the next Farm level sooner", and buying greedily visibly delays Farm. That's a decent decision for an idler, but it's closer to AdVenture Capitalist's "which bar next" than to Egg Inc.'s research tree. "Balanced farm" (bonuses when every track is at 5/10/15…, reaching +30% at 5/5) is a nice hook, but the game never explains it.

## Pacing
There are no dead zones until the cap. Farm cost jumps 1.7× at L19→L20 ($18.2K → $31.1K), but the gap stays at about 2.5 min. Hens reaches L30 MAX at Farm L27, so the last three levels have one fewer thing to buy.

## Clarity of the next goal
- **The goal bubble often points the wrong way.** It repeatedly says "Collection Lx, Ready now" when Farm is 7-21 s away, and following it pushed Farm back (22 s → 46 s, 13 s → 22 s). It flip-flops between Collection and Egg value every few seconds, went blank for a second or two several times, preferred a $6.1K Egg value over a $4.8K Farm level at L15, and never mentions sleeping workers.
- **Countdowns mostly behave now.** There are only small upticks (9→10 s) and brief freezes; the big jumps after the old Manage refills are gone. The bubble and the cards still disagree, though (bubble ~27 s vs card ~0:21, bubble ~15 s vs card ~4 s). Twice a card said "Affordable in a moment" while I was $14K short (L14 and L25, shot B3).

## Polish
- The migrated save carried over exactly, and the explainer card ("Upgrades got an upgrade!") appeared once and correctly stayed gone after a reload. But it vanished on its own within about a minute, it doesn't say where the tracks live, and it doesn't explain "Balanced farm".
- Several stat lines don't change or go backwards: customer demand drops 31-61 → 30-60 at L21; "30-60 → 30-60" and "Customers every 1.5s → 1.5s" from L24; "up to L30 → L30" at L27+.
- Green "Sell 46" buttons showed while the main button said "No eggs to sell" (B5).
- The Workers panel re-renders so often that "Manage all" kept moving under the cursor, which could cause missed taps. Asleep workers sit below the fold.
- The coop look changes at L5, L10 and L20, but nothing changes at L30.

## How the L30 cap lands
It lands flat. There's no dialog, toast or celebration. The Farm card just turns into a yellow "MAX" label, and the goal bubble moves straight on to "Egg value L30 ~41s". After that, all that's left is Collection (L17/30, $29.5K next) and keeping workers awake. Coins pile up past $400K with nothing worth buying, and there's no summary, no prestige teaser and no "what's next". Every genre leader marks its cap or ceiling moment: Egg Inc. has prestige, Cookie Clicker has ascension, and AdVenture Capitalist has angels and new planets. This is the moment a player would close the game.

## What would make me stop
Reaching L30 and having nothing to do. Before that, the bubble steering me away from my Farm level a few times would wear down my trust in the guidance.

## Real bugs, with severity and repro (for QA and Product to triage)
1. **Medium: the goal bubble steers away from a nearly-ready Farm level.** Play past Farm L12 with Collection affordable and Farm 10-25 s away. The bubble shows "Collection Lx, Ready now", and buying it resets the Farm ETA (for example 22 s → 46 s).
2. **Low-medium: the affordability label is wrong.** Save toward Egg value at L14 or L25. The card says "Affordable in a moment" while you're about $14K short, and it disagrees with the bubble (B3).
3. **Low, unexplained: coins drain on a migrated save.** Play old-dd52bfd to L6 with Market Hand hired, open m4b in the same origin, and sit idle. Coins fall about $0.02/s ($248.02 → $247.19 in about a minute) with no buy or sell. This may be an unshown wage.
4. **Low: the explainer auto-dismisses in about a minute** without "Got it" being pressed (A1).
5. **Low: demand regresses at L21 (31-61 → 30-60)** and several stat lines don't change (B4).
6. **Low: the bubble goes blank** for 1-2 s at random moments.
7. **Low: "Sell N" buttons stay active with 0 eggs** (B5).
8. **Low: the Manage all button re-renders and moves** while you're aiming at it.

The flat L30 cap is a design issue, not a bug.

## Top 3 strengths
1. The upgrade tracks give the mid game constant purchases. It no longer plays itself.
2. Steady, dead-zone-free pacing to L30 in about 44 min of near-optimal play.
3. Save migration is clean, and the explainer appears exactly once.

## Top 3 problems
1. The L30 cap has no payoff and no next goal.
2. The goal bubble gives wrong or flip-flopping advice, and the ETA and affordability labels disagree.
3. Tradeoffs are shallow (both tracks get bought every level), and "Balanced farm" and asleep workers go unexplained.
