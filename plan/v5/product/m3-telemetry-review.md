# M3 telemetry review (Economy/Balance Designer)

## AC6: D1 and first session (script ready, no playtest data yet)
- Script: `product/sim/d1_review.py <exports_dir> [--check]`.
- D1 = the export has at least one `session_start` in [first `session_start` + 20 h, + 48 h], both ends inclusive, keyed on install_id. Exports with zero, more than one, or a missing install_id are flagged and not counted. A duplicate install_id across exports counts once.
- First session = the first `session_end` at or after the first `session_start`, in minutes.
- Output: D1 share and median first session, each with a bootstrap 80% CI (2000 resamples, seed 0). With n<10 counted testers the result is "insufficient data" (§4, C2).
- Verification: 9/9 match against `qa/m3-fixtures/exports/expected.json`, the same result as `qa/m3-scripts/d1_reference.py`. Fixture run: n=7 counted, 2 flagged, which comes out as insufficient data.

## AC8: telemetry vs sim
To do after the playtest (needs at least 2 calendar days of exports).
