# Review: PR #19 seller variance port (AC7 bots) — 3155bbd

Read-only, one pass. Worktree /workspace/review-3155bbd (detached). Runs in /tmp/r19, a clone with git history. Claude calls: 0. Everything was checked directly, so a cross-check wasn't needed.

## Verdict: APPROVE the port, with one MAJOR finding to escalate to HoP/Economy
The port is correct and test-only: the CPython MT19937 port is bit-exact and the fixtures reproduce byte-for-byte from the real Python sim. The test suite does **not** check the AC7 band, though. On this repo's economy the variance bot reports **L@30 P5/P95 = 17/18**, which is **below both AC7 bands**. The proposal's "PASS" numbers came from a different CSV.

## Checks
- **Test-only:** the diff touches only `tests/`, `scripts/gen-seller-variance-fixtures.py` and the fixture. `rg seller-variance|py-random src` finds nothing, so nothing reaches the release bundle. With `variance` undefined, `runBot`/`runM2` behave exactly as before (same `tapT += 1` and `sellT += sellEvery`; the only addition is a `reach` map), and the m1 old bot matches Python exactly on all 100 seeds.
- **py-random.ts vs CPython 3.13.5, my own sample:**
  - Seeds tested: 0, 1, 42, 2^32−1, 2^32, 2^32+5, 2^53−1, 123456789012345, 1000020.
  - 700 random() + 50 uniform() calls each are **bit-exact, 0 mismatches**. Seeds above 2^32 exercise the multi-word init_by_array key path.
  - normalvariate/lognormvariate differ by at most 2.1e-16 relative (exp/log ulp between V8 and libm). The Kinderman-Monahan loop, NV_MAGICCONST and `1-random()` all match CPython.
  - The 53-bit float `(a>>>5)*2^26 + (b>>>6)) / 2^53` and the uint32 math (`Math.imul`, `>>>0`) are correct.
  - Not ported: gauss/choice/randint. The variance sim doesn't use them (only random, uniform, lognormvariate).
- **Fixtures are real Python output:** regenerating with `SV_SIM_DIR=product/sim python3 scripts/gen-seller-variance-fixtures.py` gives a **byte-identical** `seller_variance.json`. Recorded sim sha256 560ea73b and proposal sha256 17877b41 both match the files on disk.
- **Exact vs tolerance:**
  - Exact: random() draws, delay/cheap rolls, the order and counts of the full action trace (seeds 1–5, m1 and m2), and old-bot reach times.
  - REL_EPS 1e-12 only on values that pass through exp/log. That is appropriate.
  - Variance-bot outcomes are compared at the distribution level: L@30 quantiles exact, t18 quantiles within 2 %, spread within 2 percentage points. The test header explains why (the game's demand RNG is xorshift, not Python's), and that's justified.
- **Determinism:** the variance stream is seeded separately (`1_000_003*(seed+1)+17`) and the game RNG is untouched. Two runs give identical traces.
- **Tests:** 8/8 pass (71 s).
  - m1 t18 P5/P50/P95: TS 27.78/28.44/30.56 vs PY 27.82/28.54/30.56. Spread 7.4 % / 7.1 %.
  - m2: TS 28.40/28.92/31.03 vs PY 28.38/28.87/31.08. Spread 7.3 % / 7.7 %.

## Findings
### M1 (major) — AC7 is not asserted, and on this repo's economy the variance bot fails it
`tests/seller-variance.test.ts:68-80` asserts TS==PY quantiles and proposal targets 1–2 (≥50 distinct, spread 3–15 %). It **never checks the AC7 band**. `scripts/gen-seller-variance-fixtures.py:45` uses the repo's `data/economy.csv` (sha256 **57d964d5**). The proposal's AC7 PASS (L@30 20/20 without workers, 20/21 with) was measured on `economy.f1-m4cols.csv` (**86f0e80e**). On 57d964d5 both the TS and PY variance bots give:
- t18 of about 28.4 min (vs 20.6 in the proposal);
- **L@30 P5/P95 = 17/18 for m1 and m2**.

That fails "no workers L18–22, P5 ≥ 18" (P5 = 17) and "workers L20–24" (17/18). Per HoP's 00:58 ruling the variance bot is what verifies AC7, so the current main economy does not pass AC7. Either the F1 CSV isn't on main yet, or AC7 regressed. This needs HoP/Economy, not an edit to this PR.
- Repro: `npx vitest run tests/seller-variance.test.ts`. The console line prints `L@30 P5/P95 17/18`.
- Suggested: add an explicit AC7 assertion (P5/P95 band per worker mode), marked expected-fail or gated on the CSV, so this can't stay silent.

### m1 (minor) — m2 old-bot parity is generated but never checked
The fixture contains `runs['m2/old']`, but only `m1/old` is asserted (`:62-66`).

### m2 (minor) — targets checked on TS only
`:76-77`: proposal targets 1–2 are checked only on the TS bot. That's fine, but the "≥15 of 30" variant isn't covered.

### n1 (nit) — fixture size
The 28.8k-line fixture is mostly `indent=0` whitespace. Compact JSON would cut diff noise.
