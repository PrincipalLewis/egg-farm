# PR #15 F1 cost segments @ f67a425 (base main 7944010)
Commits 7021375 (segments, off by default) + f67a425 (test). Read-only. Claude: 0 calls. /tmp copy laid out as game/ + sibling product/.

## Verdict: APPROVE. Two minor test hardenings, non-blocking.

## Runs
- tsc clean; `sync-economy --check` up to date.
- vitest 474 pass + 2 skipped of 476. The only failing file is engineering/golden/flagoff-golden.a01faea.test.ts (load error, fixed by PR #14), matching the claim.
- cost-segments 7/7, including when run from `/` (paths resolve via import.meta.url, not cwd).
- build + check-release-build OK; check-globals (Chromium) PASS: only eggfarmExportTelemetry, refused boot [].

## Money math
- Segments match product/f1-proposal.md:20, :33, :54 (×1.25 L6-14, ×1.45 L15-20, ×1.35 after, base 100).
- F1-GAP matches decisions.md:157 (HoP 13:20): L18 11,076, L19 18,201, w4 5,538 / 9,100.
- The test pins both the multipliers and the absolute values (tests/cost-segments.test.ts:40-42).
- The curve stays strictly increasing and integer: L17 10,185 < L18 11,076 < L19 18,201 < L20 31,050, with a CSV-wide strictly-increasing check (:43-44). floor() keeps integers; the 0..500 monotone/finite check is at :73-79.
- **Flag-off:** `farmCostGrowthSegments: []` takes the unchanged pre-F1 expression (formulas.ts farmCost first branch). balance.json is byte-identical (test :54), and live data/economy.csv is unchanged.
- **Determinism:** pure functions, data-only.

## Findings
- **MINOR: the pinned failing fit can't tell why it fails.** tests/cost-segments.test.ts:49. `toThrow(/farm/)` matches the generic "could not fit farm costGrowth from economy.csv"; any other farm-curve defect in economy.f1.csv would also satisfy it. It isn't vacuous: the per-row loop (:41) and the un-gapped fit succeeding (:50-51) pin the cause to rows 18/19 by construction. Still, tighten it: assert that the un-gapped CSV differs from f1 only at L18/L19 (farm_cost, w4_tier_cost). Add a TODO so the Features override PR flips `toThrow` to a successful fit with `costOverrides`, so the pin can't silently outlive the fix.
- **MINOR: no row-count guard on economy.f1.csv.** :41-44. If the file were truncated after L19, the loops would pass on fewer rows; the L18/L19 w4 asserts are the only existence checks. Add `expect(f1.length).toBe(31)`.
- **NOTE: CSV path.** It's robust across working directories (env override → in-repo product/ → sibling ../product). When none is found it fails loudly instead of skipping, which is good for honesty but means CI without the sibling product/ dir fails this test. Make sure CI sets ECONOMY_F1_CSV or vendors the file (as PR #8/#11 did for staging).
