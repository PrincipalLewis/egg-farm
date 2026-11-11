# Definition (a) v2 — precise (measurement + proposed errata)

## Measurement used in qa/m5/interp-mr-evidence (run-measure-v2 / m5trace-measure)

Buy/RNG path = current `m5mr` / `m5trace-order` (unchanged).

MR meter (a) only:
1. **Non-check-in integer seconds** (`t` integer and `t < sellT`): sample meaningful affordability at integer `t` with current coins (same predicate as `m5mr` L111).
2. **Every check-in** (after `sellAll`, before `pickBuy`): sample at that sim time `t` (fractional allowed) with post-sale coins.
3. **Dedup:** when a check-in lands on an exact integer, the pre-sale integer sample is skipped; only the post-`sellAll` sample exists at that `t`.
4. Stretch open/close rules otherwise = current (first non-aff sample opens with `farm` = level then; next aff sample closes; `s = end − start`; open-at-T closed at T).

## Recommended errata text (for PMC) — see interp-mr-accounting-v2.md §2
