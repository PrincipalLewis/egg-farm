# BUG: Sell all label understates payout by the Grader multiplier (pre-existing on main)

- Severity: Major (player-facing money value wrong; display only, no economy change)
- Found: PR #22 evidence at 3609b9d; reproduces on main (dfd53b9/2700804). Not caused by PR #22.
- Confirmed by Economy/Balance Designer, 2026-10-17 03:42 (UTC+2).

## Cause
- Sell all label: src/ui/app.ts:505-507 is built from eggPriceCents without graderMult.
- Actual sale: the sellAll action loops over sellTo (src/sim/actions.ts:32), which applies graderMult (actions.ts:14-16).
- Order card (app.ts:500) already includes graderMult.

## Repro
1. Grader tier 1 (w4_price_mult = 1.5), 181.2B eggs held (see qa/m3-recheck/pr22-money-format-3609b9d.md evidence).
2. The Sell all label shows $666.8B; the order card for the same eggs shows $1T.
3. Tap Sell all: the money gained is about $1T, not $666.8B.

## Expected
Sell all label = sum of what sellTo pays: multiply by graderMult(s.workers, s.graderTier, b) and round the same way sellTo does.

## Acceptance for recheck
- With Grader tier 0/1/2, the Sell all label equals the actual money delta after tapping, to the displayed precision.
- Label width still fits at 360 in 3 engines (no clipping).
