# Re-check PR #18 79edfa1 → 6f19823
Commits f5efe4a (merge of b0e8278), c9b8f5b, 6f19823. Delta vs b0e8278: data/pacing-targets.json and tests/pacing.test.ts only. **No src/ change.** Read-only. Claude: 0 calls.

## Verdict: PASS. Both minors are addressed; one wording nit.

- **Regression fixture label:** tests/pacing.test.ts labels the with-workers test "[regression fixture, deterministic bot]", with an explanation and `TODO(F-1)` for the variance-bot gate (bot 17877b41, HoP 00:58, decisions.md:284-289).
- **L10 bounds:** read from `data/pacing-targets.json` `l10_minutes {min:8,max:12}`, with the source note.
- **Ruling:** decisions.md:292, "Oct 17 01:15: pacing.test L10 band: keep both bounds. Fastest seed >=8 min (fast tail) plus P95 seed <=12 min". It's stamped 01:15, not 01:14 as the commit and pacing-targets note say (engineering/status.md:295 also says 01:14).
- **Gates:**
  - tsc clean; sync and check-economy-copy OK; pacing 8/8; vitest 480 with only the golden import failing (pending #14).
  - My first full run, made in parallel with another suite, showed 1 extra failure; a clean re-run was green. Likely load or timeout, since pacing takes ~11 s. Worth watching under CI load.

## Findings
- **NIT: the "fastest seed" wording doesn't match the code.** The ruling and comment say "fastest seed ≥ 8 min", but `quant(ts, 0.05)` with 30 seeds is nearest-rank index ceil(1.5)−1 = 1, the 2nd-fastest seed. Use `Math.min(...ts)` to match the ruling, or reword it as P5.
- **NIT:** the ruling time is 01:15 in decisions.md versus 01:14 in the code and data notes.
