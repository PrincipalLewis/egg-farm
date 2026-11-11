# PR #22 re-check 7ed1ef2 → 3609b9d (merged scratch with main dfd53b9)
Read-only, 0 Claude calls. Delta: src/ui/format.ts, src/ui/orders.ts, tests/rc2-fmt.test.ts, tests/s2-3a.test.ts. Merges cleanly with dfd53b9.

## Verdict: PASS. m1-m3 are closed. Two nits; one claim is unverified.

## Items
- **m1 eggs() at ≥1e15: CLOSED.** The band now comes from the number itself: <1000 raw, <1e4 one-decimal K, else fmtCount. 1e15 gives "1,000T".
- **m3 fmtMoneyShort half-up + roll-up: CLOSED.**
  - **Float safety:** the input is cents, and `Math.round(cents)` first gives whole-cent integers. Then `c/(base*10)` divides integer by integer, so 345,000,000 / 10,000,000 = 34.5 exactly and rounds to 35, giving "$3.5M". No float tie-break problem exists here. A value that really is $3.4499999M (344,999,999) gives "$3.4M". No epsilon is used or needed.
  - **Edges probed:**
    - 99,995,000¢ ($999.95K) → "$1M", not "$1000.0K".
    - 99,994,999¢ → "$999.9K".
    - 99,999,999,999.5¢ ($999,999,999.995) → "$1B" (roll-up). 99,999,999,999,999.5¢ → "$1T".
    - NaN and ±Infinity → "—".
    - 1e21¢ → "$10,000,000T", and 1e25 also formats without exponent notation.
    - 2^53+1 → "$90.1T". Above 2^53 the input itself is imprecise; no crash, monotone output.
- **m2 whole cents first in fmtMoney: CLOSED** (`Math.round(cents)/100`).
- **Presentation only:** the format functions are imported only by src/ui (app.ts, orders.ts, workers-ui.ts, next-goal.ts). Nothing in sim/save/econ/config imports them.
- **$3.4M → $3.5M is acceptable:** art-ux m3-customer-queue-spec.md:50 and number-pop-spec.md:5 specify 1 decimal (1.2K/3.4M) with no truncation rule. Half-up now matches fmtCount/fmtMoney.
- **Mutation claim (5/6, the survivor equivalent): UNVERIFIED.** It isn't in the commit message or the test file, so I couldn't identify the survivor. The tests do now pin the edges above.

## Nits
1. **Negatives aren't compacted and render "$-34,500.00"** (fmtMoneyShort falls into the `c < 100_000` branch). `-0.4`¢ gives `Math.round` → -0, which renders "$-0.00". This is pre-existing behaviour, and negative money shouldn't reach the UI. Optionally clamp or normalise -0.
2. **Above 1,000T, fmtMoneyShort and fmtMoney disagree:** "$1,234.6T" vs "$1,235T". Cosmetic only.

## Runs (merge with dfd53b9)
- tsc clean.
- vitest: 485 passed, 1 failed. The failure is BUILD_ID, an artifact of the /tmp copy having no .git.
