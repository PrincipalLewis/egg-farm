# Code review: fix-rc2-money-format (a01faea..7ed1ef2)

Reviewer: Code Reviewer. Worktree `/workspace/review-7ed1ef2`, branch `fix-rc2-money-format`, base main `a01faea`.
Topic: `fmtCount` half-up rounding, tier roll-up (999,950 -> 1M), T tier, NaN/Infinity guard.
Files changed: `src/ui/format.ts` (+14/-6), `tests/rc2-fmt.test.ts` (new, 14 lines).

**Verdict: no critical, blocker or major findings.** The implementation is correct as far as I could check by hand. The 3 minor findings are one narrow regression in a caller, test gaps, and a formatter inconsistency. **I could not run tsc or vitest** (see "What I ran"), so this is a static review. Run the suite before merging.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 2 |

## Findings

### 1. [minor] `orders.ts` `eggs()` regresses once `fmtCount` returns "1,000T" (>= 1e15 eggs)

- Location: `src/ui/orders.ts:6`, caused by `src/ui/format.ts:13` (`Math.round(v).toLocaleString('en-US')`).
- Evidence:
  - `eggs` is `n >= 1000 ? fmtCount(n).includes(',') ? \`${(Math.floor(n/100)/10).toFixed(1)}K\` : fmtCount(n) : String(n)`.
  - It uses a comma in `fmtCount`'s output to detect the 1,000–9,999 band. Before this commit a comma never appeared above 9,999, because 1e15 rendered as "1000000B".
  - The new T tier deliberately emits a thousands separator, so `fmtCount(1e15)` is "1,000T" and the branch fires.
  - `eggs(1e15)` then returns `"1000000000000.0K"`.
  - That string lands in `.order .l1 .e`, which is `flex:none` (`styles.css:345`). It cannot shrink or ellipsize, so it can push the value text and the Sell button on a 360px card.
- Impact: only when an order's `have`/`want`/`rem` is 1e15 or more. That is the exact range the T tier was added for, so a late-game player could see it. It shows as a wrong, very long label, not a crash.
- Fix:
  - In `eggs()`, detect the 1,000–9,999 band by number: `n < 1e4 ? K-form : fmtCount(n)`.
  - Or drop the `includes(',')` trick and add a test `eggs`/`orderView` with `want = 1e15` expecting "1,000T".
- The commit does not touch `orders.ts` and no test covers this path.

### 2. [minor] Test adequacy: several broken implementations would still pass

`tests/rc2-fmt.test.ts` catches the main mutations. I checked:
- `Math.round` -> `Math.floor`
- removing the NaN/Infinity guard in any of the three formatters
- wrong roll-up index
- `i > 0` -> `i >= 0`

These gaps remain:

- **Half-up at 1 decimal is untested for K, M and B.** All half-up assertions are in the 2-dp band (9.995M, 9.985M, 9.995B, 9.995T). The suite has no `fmtCount(12_350)` -> "12.4K". A regression back to `(n/1e3).toFixed(1)` would pass every test. That is the float bug in the K tier: 12.35 is stored as 12.3499…, so `toFixed(1)` gives "12.3". Likewise nothing at 1-dp M/B/T, e.g. `fmtCount(12_350_000)` -> "12.4M".
- **B -> T roll-up is untested.** Only M -> B (999,960,000) and K -> M (999,950) are covered. `fmtCount(999_950_000_000)` -> "1T" is missing. The mapping `TIERS[i-1]` is correct for every tier, but only 2 of 3 are pinned.
- **Just-below-the-edge values are missing.** Without them an off-by-one in the threshold would pass: `999_949` -> "999.9K", `9_994_999` -> "9.99M", and `99_949` -> "99.9K".
- **Exact tier boundaries are missing:** `fmtCount(10_000)` -> "10K", `fmtCount(1_000_000)` -> "1M", `fmtCount(1e9)` -> "1B", `fmtCount(1e12)` -> "1T".
- **`fmtMoney`/`fmtMoneyShort` roll-up is untested.** For example `fmtMoney(99_999_999)` -> "$1M" (d=999,999.99, floored to 999,999, rolled up). `fmtMoneyShort` is not tested at the K/M/B edges either.
- **A very large `fmtCount` is untested.** `fmtCount(1.2345e15)` -> "1,235T" shows the decimals dropped above 1,000T. That is probably intended, but unpinned.
- **The Infinity/-Infinity loop checks only equality with "—".** That is fine, but it ties three formatters into one `it`, so a failure names none of them. Splitting the lines per formatter would help. The file also packs 4–5 `expect`s per line.
- **No caller-level test** (see finding 1).

Fix: add the missing cases above; they are about 10 one-line assertions.

### 3. [minor] `fmtMoneyShort` truncates while `fmtCount`/`fmtMoney` now round half-up

- Location: `src/ui/format.ts:48-50` vs `:13`.
- Evidence:
  - `fmtMoney(9_995_000_00)` is "$10M" (tested), but `fmtMoneyShort(9_995_000_00)` is `floor(9.995*10)/10` = "$9.9M".
  - The same amount of money reads "$10M" on the HUD and "+$9.9M" on the Thanks card or pop.
  - The existing test (`tests/s2-3a.test.ts:118`) is titled "floored", so truncation was a deliberate choice. This commit makes the two formatters disagree for the first time on the topic of rounding.
  - Above 1,000T the two diverge in shape too. `fmtMoneyShort` uses `maximumFractionDigits: 1`, so 1.2345e15 dollars gives "$1,234.5T". `fmtCount` and `fmtMoney` give "1,235T" and "$1,235T".
- Impact: cosmetic, and only in the late game where numbers are huge. Not a bug against the stated spec, but it is a visible inconsistency.
- Fix: either say in the doc comment (`format.ts:50`) that `fmtMoneyShort` intentionally floors and keeps 1 decimal, or make it round half-up. A product decision is needed. The comment currently doesn't mention the T tier.

### 4. [nit] Lower-edge boundaries of the two money formatters have the same "rounds into the next tier" shape

- Location: `src/ui/format.ts:17-21` (`fmtMoney`) and `:48-49` (`fmtMoneyShort`).
- Evidence:
  - `fmtMoney` formats with 2 decimals when `d < 10_000`. If `coinsCents` can be fractional, `d = 9999.996` gives "$10,000.00" instead of "$10K".
  - `fmtMoneyShort(99_999.9)` (d=999.999) gives "$1,000.00" instead of "$1K".
  - I did not verify whether cents are always integers at these call sites. It is only a 6-8 character string either way.
- Impact: none visible, just the same class of issue FMT-2 fixes for counts.
- Fix: none needed if cents are integral. If not, guard with `Math.round(cents)` first.

### 5. [nit] Density and dead code in `fmtCount`

- Location: `src/ui/format.ts:5-13`.
- Evidence:
  - The loop packs a `const` pair, the roll-up formula and the return into three lines. The roll-up repeats the rounding formula with hard-coded `100`.
  - The final `return n.toLocaleString('en-US')` after the loop is unreachable. `n < 1e4` already returns above, and any n >= 1e4 matches the K tier.
  - `TIERS` is ordered largest-first, so `TIERS[i-1]` means the larger tier. That is correct but easy to misread.
- Impact: readability only.
- Fix: optional. Drop the dead return (or keep it for TypeScript's return check, since the loop's return type is not exhaustive) and add a one-line comment that `i-1` is the next larger tier.

## Checked and found correct (by hand arithmetic)

- **Half-up.** `Math.round(n / (base / 10**dp))` is evaluated on integers. The x.5 cases (9,995,000/10,000 = 999.5, 9,985,000/10,000 = 998.5) are exactly representable, so they round up. Floor-then-round introduces no double rounding because every rounding threshold is an integer.
- **Roll-up.** With dp=1 a value reaches 1000 only for n >= 999.95·base/1000 (e.g. 999,950 for K). The roll-up is always `n/(biggerBase/100)` in [99.995, 100) -> "1" plus the larger tier. It is always exactly "1M" / "1B" / "1T".
- **dp=2 band.** It cannot produce v >= 1000, so it never rolls up. A value that rounds to exactly 10.00 renders as "10" through the trailing-zero regex.
- **Trailing-zero regex.** `\.?0+$` is safe here, since `toFixed(1/2)` always includes a decimal point and so "100.0" -> "100" and "10.00" -> "10".
- **Negative numbers.** They skip the tier loop and fall through to `toLocaleString`, as before.
- **NaN/Infinity.** Guarded in all three formatters. In `fmtMoney`/`fmtMoneyShort` it is checked before the `'$'` is added, so no "$—" appears. Callers in `orders.ts:14` already did the same check.
- **Callers of `fmtCount` (`app.ts`).** `setText` / template strings only, nothing parses the result. `sellAllLabel` and `collectLabel` pass it straight through. No site breaks on a "—" string.
- **Existing unit expectations** I read (`ui-logic.test.ts:32-33`, `s2-3a.test.ts:119-120`) are consistent with the new code on paper: `fmtCount(35.9)` "35", 9,999 "9,999", 12,345 "12.3K", 2,500,000 "2.5M", `fmtMoneyShort(100_000)` "$1K", 345,000,000 -> "$3.4M".
- **Scope.** Two files, no unrelated edits. `fmtMoneyShort`'s NaN guard and T tier are in the stated topic.

## Layout (360 / 390 / 1280)

No browsers were run, as instructed. This is reasoning from the CSS only.

- Output lengths are unchanged for every value under 1e12, and "—" is one character, so the HUD pills (`.hud .pill{min-width:0}`, `styles.css:323`), meter text and buy buttons are unaffected at 360, 390 and 1280.
- Huge values get shorter. "$1,000T" is 7 characters where the old format gave "$1000000B" for 1e17 cents.
- The only text that could not shrink is finding 1's order-card label (`.order .l1 .e{flex:none}`). That is the one layout risk I found, and it needs 1e15 or more eggs.

## What I ran

- `git diff a01faea..7ed1ef2`, `git log`, and reads of `src/ui/format.ts`, `src/ui/orders.ts`, `src/ui/onboarding.ts`, `src/ui/app.ts`, `src/ui/styles.css`, `tests/rc2-fmt.test.ts`, `tests/s2-3a.test.ts` and `tests/ui-logic.test.ts` (greps and reads only).
- **Not run:** `npx tsc --noEmit` and `npx vitest run --pool=forks … tests/rc2-fmt.test.ts tests/s2-3a.test.ts tests/ui-logic.test.ts tests/orders.test.ts tests/s2-money.test.ts`. The Bash tool was denied by the session's permission mode (don't-ask) when I tried them. A retry as a single plain command was denied too.
- Because nothing was executed, every claim above comes from reading the code. I traced the arithmetic by hand; I did not run any of the numbers.
- **Do before merge:** run the two commands above and add the missing cases from finding 2.
- I did not modify the worktree. The only file written is this report.

COUNTS critical=0 blocker=0 major=0 minor=3 nit=2
