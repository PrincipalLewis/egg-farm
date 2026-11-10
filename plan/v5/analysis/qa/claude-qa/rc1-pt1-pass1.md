# rc1-pt1 (2490c79) QA pass 1 — Claude-assisted review, verified — 2026-10-16
Source: game-rc1-ui @ 2490c79 (asset egg-farm-rc1-pt1-2490c79.html). The npm tests pass (401/401) but don't catch any of these. Verified by reading the code. Out of scope: QA-RC1UI-1, the 'm3-rc1-pre' label, and the build tag collision.

## BUG-1 (Major) The Sell coin popup and income rate ignore the Grader multiplier
- File: src/ui/app.ts:315,319 (vs sim/actions.ts:16, which credits `value`)
- Repro: hire the Grader and buy a tier above 1×, then sell to a customer.
- Expected: the '+$X' popup equals the coins actually added (`e.value`).
- Actual: the popup shows k×price, without the multiplier, so it reads lower than the coin delta. The income rate and ETAs are underestimated too.
- Screenshot: TBD

## BUG-2 (Major) The 'Sell all ($X)' label ignores the Grader multiplier
- File: src/ui/app.ts:479-481 (rows use `unit` with the multiplier, line 473)
- Repro: same setup as BUG-1. Open Market with eggs in the basket.
- Expected: the Sell all total equals the sum of the per-row values and the coins received.
- Actual: the label is lower than the row values and the payout.
- Screenshot: TBD

## BUG-3 (Minor) Big-number rounding shows '1000K', '1000M', '1000B' and has no tier above B
- File: src/ui/format.ts:4-6
- Repro: reach 999,960 or more eggs (or $999,960 or more), or 999,999,999. Verified: fmtCount(999960)='1000K', fmtCount(999999999)='1000M', fmtCount(1e12)='1000B', fmtMoney(99996000)='$1000K'.
- Expected: '1M', '1B', '1T'.
- Actual: the values above.
- Screenshot: TBD

## BUG-4 (Minor) The 'Sold out!' or partial-customer ghost disappears after about 300 ms instead of about 1.5 s
- File: src/ui/app.ts:116,271-273 and styles.css:64
- Repro: let a customer leave partially filled or sold out, with motion not reduced.
- Expected: the customer waves, then slides left and fades (300 ms delay plus 240 ms).
- Actual: the img's 300 ms `wave` animationend bubbles up to the ghost's `kill` listener, so the ghost is removed before the `leave` animation starts.
- Screenshot: TBD

## BUG-5 (Minor) The merged '+N' collect floater is removed mid-animation
- File: src/ui/app.ts:130-132
- Repro: tap Collect twice, about 500–700 ms apart.
- Expected: the merged floater restarts and finishes its rise.
- Actual: the first spawn's 750 ms kill timer still fires, so the popup vanishes early (and the retriggered animationend may also kill it).
- Screenshot: TBD

## BUG-6 (Major) A save without `savedAt` grants the full 2 h offline reward
- File: src/save/save.ts:88 and game.ts:43
- Repro: in localStorage, remove `savedAt` from the save (or use an old save without it), then reload.
- Expected: no offline grant, or a minimal one.
- Actual: savedAt=0, so the gap is the full epoch time, capped at 2 h. You get the Welcome back screen with the maximum eggs. Repeatable by editing the save (an exploit).
- Screenshot: TBD

## Unverified (not reproduced)
- U1: save validate doesn't check customer and worker entries, so a null entry may throw every frame (save.ts:85-87).
- U2: the order list stays frozen if the pointerup/pointercancel is lost (order-list.ts:20-22). Both listeners are on window, so this is unlikely.

## Browser verification (2026-10-16 14:24 CEST)
- BUG-1/BUG-2 REPRODUCED in browser at 390px (served copy of egg-farm-rc1-pt1-2490c79.html, Egg Grader hired, farm lvl 20): customer row `58/58 eggs · $278.40`, button `Sell all (58 eggs · $185.60)`, popup `+$185.60`, coins $5,000.00 -> $5,278.40. Button/popup use ungraded $3.20/egg vs paid $4.80/egg. Desktop (1000px): button mismatch also seen. Screenshot: not saved (capture failed; box overloaded, load avg >90).
- BUG-3..6: browser check not done (browser became unresponsive). Verified by code reading only; BUG-3 also verified by running the formatter.
- Note: the HTML is not in qa/m3-recheck/rc1-pt1-2490c79/; same-MD5 copy used from /workspace/p1/.
