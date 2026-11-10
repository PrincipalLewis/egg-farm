# BB-AC13 / AC-W1 flag-on re-baseline — JOINT SIGN-OFF

**Decision:** QA-D-1105-ACW1 (2026-11-05, Egg Farm Studio, Europe/Belgrade CET).
**Status:** SIGNED by Head of QA and Economy/Balance Designer. No baseline file changed by either party.

## Scope
Signs the **AC-W1 flag-on regression constants only**. Explicitly EXCLUDES the separate
final-CSV BB-AC13 package. K10 remains RED and is untouched by this sign-off.

## Verified build and evidence
- Build `fbce499480568e4b0364a0ff0baa0543e4921d19` (`gen/bbv2`), BBv2 v1.0.4 `4ea3841a` / gate Card #12,
  including the affordable-FARM★ fix. Generalist full gates pass.
- Investigation: `engineering/tasks/bbv2/acw1-investigation.md`
  sha256 `b563ae6c4d7cfb099382656d0597c54c4c95c223e8423e99da23e29aef6edd5b`
- Seed data: `engineering/tasks/bbv2/acw1-seeds.csv`
  sha256 `d1529197a11e63c03aaac5a44c24b070b3cf9d71650f41bb492ab4263ff330a7`
- Economy countersign: `scratch/bbv2-ac13-review/ECONOMY-COUNTERSIGN.md`
  sha256 `66764c12cf07845b468ce7d54d8ea6d320ef081d55cc95cc9701904e4b5a4a04` (verified on disk;
  supersedes the earlier `456f94bc…` record hash, **signed constants unchanged**). Adds Economy's
  completed independent review, CSV↔JSON parity (0 mismatches), raw on/off/Part A JSON hashes and
  precise mechanism attribution.
- Economy independent review: `scratch/bbv2-ac13-review/REVIEW-acw1-bb-ac13.md`
  sha256 `4b49d6377136291e592cfbcebcebd9ec7c7625e855d17fa89857e0b29f5031bf` (verified on disk)

## Signed constants (flag-on, seeds 1–200)
| Constant | Value |
|---|---|
| `pass10` (F10 ≤ 900 s) | **100** (percent) |
| `medF10` | **620 s = 10.333333 min** |
| `medF18` | **1180 s = 19.666667 min** |
| Tolerances | existing **±5 pp** and **±20%**, RETAINED, not widened |
| Flag-off values | retained as **history**, not the live expectation |
| Design gate | **unchanged**: ≥95% at 960 s, F18 ≤ 40 min |

Second cohort (201–299) measured, not extrapolated: F10 ≤ 900 s 99/99, median F10 620 s,
median F18 1200 s. If the test asserts per-cohort medians, use 1180 for seeds 1–200 and
1200 for 201–299 rather than one global figure.

## What QA independently recomputed from the 299-row CSV
- flag-off F10 ≤ 900 s: **182/200 (91%)** and **90/99 (90.909091%)**; ≤ 960 s 196/200 and 96/99
- flag-on F10 ≤ 900 s: **200/200** and **99/99**; ≤ 960 s also 200/200 and 99/99
- worst flag-on F10 = **760 s** (200 s inside the 960 s design limit)
- median flag-on F10 **620 s**, F18 **1180 / 1200 s**; observed F18 range 1060–1380 s
- **zero F10 regressions**; every F10 time faster or equal with BBv2 on
- **exactly one F18 regression: seed 208, 1240 → 1340 s (+100 s)**, inside the median and design gates
- **27 seeds** cross from failing (>900 s flag-off) to passing with BBv2 on

## Why the old assertion failed
`expected 9 to be <= 5` is **absolute percentage-point deviation**: |100 − 91| = 9 pp above the
old symmetric 91 ± 5 pp band. It is an improvement, not late seeds and not a design pacing miss.

## Mechanism
Part A alone reproduces 100% at both thresholds in both cohorts. BBv2 filters zero-gain rows from
ranking and resolves all-infinite-payback ties FARM-first instead of cheapest-first, so the bot stops
buying zero-gain rows. Q-E2 then advances the medians further (F10 −20 s, F18 −60/−40 s) but is not
required to explain the band break; no isolated Q-E2-only effect is claimed.

## Conditions on landing
1. Re-baseline to the **flag-on** config. Do **not** widen the old 91 ± 5 pp band to swallow 100%.
   The baseline genuinely moved; a band that admits everything stops being a regression test.
2. The **median bands move in the same change**. F10 13.67 → 10.333333 min and F18 25 → 19.666667 min
   are both below the old 0.8 floor and would fail on the next run if only the percentage is updated.
3. Flag-off numbers stay in the record as history so the pre-BBv2 comparison remains auditable.

## Signatures
- **Head of QA** — accepted 2026-11-05, after independent recomputation of the 299-seed evidence.
- **Economy/Balance Designer** — written countersign, `ECONOMY-COUNTERSIGN.md` sha256 `66764c12…` (final; supersedes `456f94bc…`, constants unchanged).
