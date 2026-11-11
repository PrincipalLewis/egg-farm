# Claude Gamer — fix/rc1-qa-bugs-v4 @ 7d52952 (pass rc1-qa-bugs-v4-7d52952)
Date: Sat Oct 17, 2026, 00:07–00:52 CEST · Clean clone in /tmp/egg-claude-gamer/v4, `npm run build` passed, served on 127.0.0.1:4183 (now stopped). Real headless Chrome play, no source simulation.

## Sessions (all held the lock for 5 min or less, one at a time)
| Session | Lock command | Held (CEST) | Evidence |
|---|---|---|---|
| m390: 390×844, 240 s, tutorial followed, sold via order-card buttons | **relative path** `flock .browser-test.lock` (cwd /workspace/egg-farm-studio, so it is the same file), no `timeout 600` | 00:07:33–00:11:35 | m390-*.png, m390-events.txt, m390-console.json |
| desk: 1280×800, 180 s | `flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node …` | 00:44–00:47 | desk-* |
| coop: 390×844, 130 s, tutorial skipped, no collecting | the same absolute-path command | ~00:49–00:52 | coop-* |

Console logs: 0 page errors and 0 console errors in all three sessions.

**Build id:** the JS bundle contains `m3-rc1-pre+7d52952`, but `meta[name=build-id]` was **absent at runtime** in every session (`build undefined` in the events files), and no build id is shown in the 390 top bar. See bug B1.

## REAL BUGS
- **B1 (Medium, release/QA tooling).** 7d52952 doesn't set `meta[name=build-id]` or `#app[data-build-id]`. ccd7bf9 (rc1/ux-clarity) is not an ancestor of 7d52952, so that change is missing from this branch. smoke.mjs and the "pass needs a build id" rule can't verify this build from the page. Evidence: `build undefined` in m390/desk/coop-events.txt; the string is present in the bundle.
- **B2 (Low-Med, Market).** "No eggs to sell" is shown while the player holds eggs that are waiting to be collected, e.g. 8 eggs in the top bar (m390-11, m390-12).
- **B3 (Low-Med, order card).** After a sale the card stays as "0/8 eggs · $8.00" with a faded "Sell 8 +$8.00" button, so it looks like an unsold order you can't afford (m390-11). The "x/N" counter means eggs delivered so far. Before any sale it reads "0/6 eggs · $6.00 · Sell 6", which looks like zero available (desk-09).
- **B4 (needs check).** In m390-24 the green ↑ icon covers the price on the upgrade button ("▢.00"). The screenshot was taken ~0.1 s after buying, so this may be a short purchase flourish rather than a permanent overlap.

## Tutorial Sell step: OK
- Both widths followed the same sequence: "Your hens are laying eggs…" → "A customer is on the way… 8 s" (a countdown) → at 0:12 "A customer! Tap them to sell eggs." (390) or "Tap Sell to earn coins." (desktop), with a pointing hand on the customer or the Sell button (m390-10, desk-09) → after one sale at 0:13–0:14 "Sell a few more eggs to afford it · $X to go".
- The step advanced immediately on sale. There was no stall and no silent skip. First upgrade at 0:18 (390) and 0:23 (desk).
- Feel: the first two steps give you nothing to do; step 1 doesn't say "tap Collect" and step 2 is an 8 s wait. The 390 copy ("Tap them") and the desktop copy ("Tap Sell") differ. "$2 to go" doesn't point to Upgrades.

## Order cards (feel)
- Readable and cute: avatar, egg count, colour bar, and "Sell N +$X" on the button. The "+$8.00" float, the coin burst and the "Thanks! +$8.00" chip feel rewarding (m390-11).
- After the tutorial, selling becomes a stream of 2–3-egg partial sells with no single big satisfying sale. A stray "+2" floats over the empty Market panel (m390-11).

## Full-coop stall recheck (pass 2 issue): partly fixed
- With a full coop (50/50, "Full!" tag, "Queue full +2") and $0, the goal chip now shows "—" instead of a frozen countdown (coop-03 to coop-06). That fixes the frozen ETA.
- Still present: Collect stays bright yellow "Collect +5" with no full-coop message, and "Full!" is a small tag.
- Not rechecked: the misleading "+$/s" with wages running. This session had no income, so it needs a mid-game recheck.

## Top 3 likes
1. The Sell step is clear (highlight plus hand) and advances instantly.
2. Sale reward feedback: the +$ float, coins and "Thanks!" chip.
3. The goal chip no longer lies when the coop is full ("—").

## Top 3 frustrations
1. Order-card state after a sale ("0/8 · Sell 8", faded) and "No eggs to sell" while you hold eggs.
2. A passive first ~12 s: no "tap Collect" prompt, then an 8 s wait.
3. The full coop still isn't called out on the Collect button.

## Caveats
- My bot never bought Farm L1 even when the chip said "Ready!", because of how its tab clicks work. Claude's "Farm-cap stall / $137 unspent" is therefore a bot artifact, not a game finding.

Claude calls: 1 for this PASS_ID (Sonnet, 30 s); the full output is in rc1-qa-bugs-v4-7d52952/claude-judgement.txt.
