# Re-check: PR #19 seller variance — c5905f3 (vs efd7d94)

Read-only delta re-check. Worktree /workspace/review-c5905f3 (detached). Runs in /tmp/r19c, a clone with history. Claude calls: 0.
Previous report: pr19-seller-variance-recheck-efd7d94.md.

## Verdict: PASS (approve). M1, M2 and m1 are closed. One advisory nit.

## Verified
- **src untouched:** `git diff efd7d94 c5905f3 -- src` is empty. The changes are the generator, the fixture and the slow test.
- **Fixture provenance:** regenerating on main's CSV (57d964d5) reproduces `seller_variance.json` byte for byte.
- **c5905f3 on 57d964d5:** `npm run test:slow` passes 11/11. The pre-F1 branch asserts the measured values: m1 P5 = 17, m2 max = 18.
- **M1 probe** (newline appended to CSV, sha 168b74da): **FAILS** with `unknown economy CSV 168b74da: update AC7 band test`. Closed.
- **M2 probe** (`throw new Error('boom')` in the band path, `l30()`): **FAILS** with `Error: boom`. it.fails is gone, and every branch is a plain `it`. Closed.
- **Meta-test can't pass vacuously:** it calls the same exported `ac7BandCheck` that the real test uses, with:
  - unknown sha → `toThrow('unknown economy CSV …')`
  - F1 + good values → `not.toThrow`, so a check that always throws would fail here
  - F1 + violated band → throws
  - pre-F1 + drifted values → throws
  - undefined input → throws
  - plus the real 168b74da hash of CSV+'\n'

  All the assertions are positive and negative pairs, so a no-op or an always-throwing `ac7BandCheck` would both fail.
- **Scratch merge with #17 (b0e8278), csv 86f0e80e:**
  - The generator now auto-selects the F1 preset and its guards pass (costs, price, interval).
  - Fixture regenerated → `test:slow` **11/11 with the hard band**.
  - **Variance bot AC7 on F1:** m1 (no workers) L@30 P5/P95 **20/20**, band L18–22: **PASS**. m2 (workers) **20/21**, band L20–24: **PASS**, with P5 on the lower edge.
  - TS vs PY time to L18 within 1 %; spreads 7.1/6.8 % and 7.1/6.3 %.
  - The variance-off m2 bot is bit-exact on 87/100 seeds here too.
- **The 13 diverging variance-off m2 seeds** (main CSV): 4, 8, 14, 15, 22, 32, 37, 39, 45, 47, 48, 79, 94.
  - In every one, **exactly ±15.0 s on the same levels (L5, L18, L20, L22) and on no others**. In other words, purchases shift by one 15 s sell step. Seven are late, six are early, with no drift in direction.
  - That is what you'd expect from the different demand RNG: the TS game uses xorshift, Python uses random.Random. On the demand-bound workers economy, a single customer's demand size moves the coins across a cost threshold at one sell check. Levels reached and L@30 still match per seed.
  - **The ≤15 s tolerance holds**, with max deviation = 15.0. A two-step shift (30 s) would fail, so the tolerance is tight, not loose.

## Findings
### n1 (nit) — tolerance has zero headroom
`tests/seller-variance.slow.test.ts:83`: the observed max deviation equals the limit (15.0 ≤ 15). It's correct as "at most one sell step", but it's floating-point sensitive if the tick-time rounding ever changes. Consider asserting `Math.abs(d) <= sellEvery + 1e-6`, or `d ∈ {0, ±sellEvery}`, so the intent is explicit.

## Note (not a finding)
The AC7 band only passes once #17 (F1 CSV 86f0e80e) is merged and the fixture is regenerated in the same change. Merge order: #17 + fixture regeneration, or #19 first and then #17 with the regenerated fixture. Otherwise the slow job goes red, which is correct fail-closed behaviour.
