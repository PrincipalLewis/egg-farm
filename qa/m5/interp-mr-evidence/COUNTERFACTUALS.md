# Counterfactual measurement definitions (HoQA interp-mr-accounting-v1)

Buy path / RNG / picks are **byte-identical** to `m5trace-order.ts` / `m5mr.ts`. Only the MR stretch meter differs.

## current
Integer-sim-second sample **before** `sellAll` / buys (`m5mr.ts` L107–112 then L118 then L140). Stretch closes only on `mrAff===true` at an integer sample.

## (a) sample after sellAll and before buys
- On non-check-in integer seconds (`t < sellT`): same integer sample as current.
- On every check-in (after `sellAll`, before `pickBuy`), evaluate `mrAff` at that (possibly fractional) `t` and open/close the stretch.
- Pre-sellAll integer sample on a check-in integer is **skipped** (replaced by the post-sellAll sample).

## (b) also close on executed meaningful/exempt purchase
- Same integer samples as current.
- Additionally: when `pickBuy` applies a purchase whose key is FARM|W1–W4 or `optionGain.gain > 1e-12` on the pre-buy state, close the open stretch at that `t`.

Runner: `run-measure.ts` → `m5trace-measure.ts`. Profile `optimal`, T=4000, flags-off (`K.on=false`), `streakCap: 0.28` in S (inert).
