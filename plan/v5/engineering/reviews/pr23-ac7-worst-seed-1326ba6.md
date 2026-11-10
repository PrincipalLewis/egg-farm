# Review: PR #23 AC7 worst-seed guards — 1326ba6 (stacked on #19 c5905f3)

Read-only, one pass, no Claude calls. Worktree /workspace/review-1326ba6 (detached). Runs in /tmp/r23, a clone with a scratch merge.

## Verdict: APPROVE (no blockers). 3 minor findings and 1 nit.

## Ruling vs code
- decisions.md:297 (Oct 17 02:05, HoP), with the 02:07 correction:
  - "P95 of each seed's slowest level <=390 s, worst seed <=480 s. The fixed bot stays a regression fixture at <=360 s."
  - "warn when P95 time-to-L20 > 1740 s".
- `data/pacing-targets.json`: 390 / 480 / 360 / 1740, all in **seconds**. The code fails on `>` (`tests/pacing-guards.ts:52-53,60`) and warns on `>` (`:65`), so ≤ edges are **inclusive** and the warning starts strictly above 1740. **Matches the ruling exactly.**
- Hard vs warn: the variance and fixed guards use `expect(failures).toEqual([])` (hard). Only t20 uses `console.warn`. Correct.
- "Slowest level" (`pacing-guards.ts:16-21`): time on level n = reach(n+1) − reach(n), n = 18..25 (so the run needs L26). The run horizon is extended to 2 h for this, and an incomplete level throws ("extend the run horizon") instead of being skipped. This is a reasonable reading, but the ruling doesn't define it. See m3.

## Runs
- **Scratch merge 1326ba6 + #18 a913934** (which contains #17 b0e8278), csv 86f0e80e, seller fixture regenerated:
  - tsc OK.
  - `tests/pacing.test.ts` + `tests/pacing-guards.test.ts`: 23/23, including #18's `l10_minutes` 8/12 bounds.
  - `npm run test:slow`: 14/14 (seller-variance 11 + worst-seed 3).
- **Measured on F1:**
  - variance L18–25 slowest level P95 **372.2 s** (≤390), worst **471.6 s** (≤480).
  - fixed bot **270.0 s** for all seeds (≤360).
  - t20 P5/P50/P95/worst 1564/1602/**1670**/1727 s, so no warning (≤1740).
  - All of this matches the author's numbers.
- **pacing-targets.json conflict:** add/add with #17/#18, with **no overlapping keys**. A union merge (#18 keys + #23 keys) works; both test sets pass above.
- **sha gating** (`tests/ac7-worst-seed.slow.test.ts:24-26`):
  - 86f0e80e → both guards run (hard).
  - 57d964d5 → 1 passed, 2 skipped (visible as skipped, consistent with the ruling that AC7 isn't verified pre-F1).
  - Unknown sha (CSV + '\n', 168b74da) → **fails** with "unknown economy CSV 168b74da".
- **Vacuous pass:** an empty seed list throws (`quantile of empty set`), and an incomplete L18–25 window throws. **NaN, however, is not caught** (m1).
- **src untouched:** `git diff c5905f3 1326ba6 -- src` is empty.

## Findings
### m1 (minor) — NaN slips through every guard
`tests/pacing-guards.ts:50-66`: the guards only fail on `x > bound`, and `NaN > bound` is false. Probe: a reach map with `r[20]=NaN` gives variance p95/worst NaN, failures `[]`, fixed failures `[]` and t20 warning null, so everything passes. Unlikely from the sim today, but it fails open. Fix: `if (!v.every(Number.isFinite)) failures.push('non-finite')`, or use `!(x <= bound)`.

### m2 (minor) — seed set differs from the AC7 band suite
`ac7-worst-seed.slow.test.ts:21` uses seeds **0..99**, while the seller-variance fixtures and the AC7 band use **1..100**. The worst-seed guard and the band are therefore judged on different populations (99 shared seeds). Pick one; `fx.seeds` is easiest.

### m3 (minor) — "slowest level" definition isn't written down by Product/Economy
The PR uses time-on-level n for n = 18..25 (L18→L19 … L25→L26). One could also read "L18–25" as the steps *into* L18..L25 (reach(n) − reach(n−1)). The 372.2/471.6 measurements and the 390/480 bounds only line up if Economy used the same definition. Get Economy to confirm which one, and cite it in `_note_guards`.

### n1 (nit) — key naming
`l18_25_step_p95_max_s` (360) is used as a per-seed max for the fixed bot, which is correct per the ruling since the fixed bot is deterministic, but the name says "p95". Consider `l18_25_step_fixed_max_s`.
