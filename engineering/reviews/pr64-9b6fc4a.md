# CCR review: PR #64 (M41-9 big-number formatter, Art rulings R1-R5, order-card font step-down) @ 9b6fc4ab10debaf89354462e88698b9619c849c6
Reviewer: Claude Code Reviewer (read-only). 2026-10-22 ~21:45 CEST. Worktree /workspace/review-pr64-9b6fc4a (detached, npm ci). Claude calls: 0.
Base: merge-base with origin/main = dd223f5. 5 commits, 14 files, +637/-37. Touches src/ui only (format.ts, orders.ts, order-list.ts, app.ts, styles.css) plus tests, frozen dd223f5 fixtures and a QA shots script. No src/sim, src/econ, save, config or data change.
Specs: art-ux/number-format-big.md (09:45 ruling and the 10:10 addendum, rulings 1-4), backlog M41-9 scope (QA4-1/2/3).

**Verdict: PASS with Minors. Blocker 0 / Major 0 / Minor 3 / Nit 4.** All gates are green. The money math is display-only.

## Formatter boundaries (independent probe /tmp/p64, PR vs frozen main formatters)
- 9,999 -> `9,999`; 10,000 -> `10K`; 999,949 -> `999.9K`; 999,950 -> `1M` (no "1000K"); 9,995,000 -> `10M`.
- Every suffix K..Dc: 1/1.25/9.99/9.995/12.5/125.4/999.94/999.95 hold or roll up correctly. 0 half-up misses over 6,300 x.xx5 points across Qa..Dc for both the count and compact-money paths, thanks to the `dec()` 15-s.f. snap. 999.95T -> `1Qa`; 999.95Dc -> `1.00e36` (count, money, short).
- 1e36 -> `1.00e36`; 1e300 -> `1.00e300`; Number.MAX_VALUE -> `1.80e308`. NaN/±Infinity -> `—` in all 7 formatters. MAX_SAFE_INTEGER (count) -> `9.01Qa`; as cents -> `$90.1T`. 2^53+2 -> `9.01Qa`.
- Cents vs dollars: fmtMoney rounds to whole cents first, then dollars (0.5c -> `$0.01`, 99.995c -> `$1.00`). Under $10K the output is exact with 2 decimals, the same as main.
- Floor path (Sell preview, Sell all): over 11k random points 1e3..1e40, **0** cases where a floored label exceeds the true value (count and money).
- K–T byte identity: 6,132 points (random per decade plus every tier edge) across fmtCount/fmtMoney/fmtMoneyShort/fmtMoneyPreview/fmtMoneyExact/fmtMoneyAria. There is exactly 1 diff, `999,950,000,000,000: 1,000T -> 1Qa`, which is the ruled roll-up. The PR's own test does the same over ~25k points against a frozen dd223f5 copy.
- Negatives, 0, -0 are unchanged from main (n2).

## Labels vs payout preview; money values
- No value changes. The diff never touches sim/econ. sellAll credit and sellAllPreview are the same functions as on main; only the display formatter changes (app.ts:568 `sellAllLabel(eggs, cents, fmtCountFloor, fmtMoneyFloor)`).
- Sell button (orders.ts:40) and Sell all now both floor count and money: QA4-2 repro 12,960 -> `Sell 12.9K · +$12.9K` / `Sell all (12.9K eggs · $12.9K)`. Approved by ruling 4.
- Visible pops (app.ts:373, :386, fmtMoneyExact) are exact below $1e15 (byte-identical) and compact nearest above it (`$1.2Qa`, `$1.23e36`), never spelled (ruling 3).

## R1-R5 tests vs rulings, with mutation checks (scratch copy /tmp/mut64, 6 affected test files)
- The PR's R1-R5 map Art's 10:10 rulings 1, 2, 3 (aria), 3 (visible) and 4. Each block matches its ruling's text and examples.

| Mutation | Result |
|---|---|
| R1: compact money 2 dp (fmtMoneyShort /100 units) | 17 fail incl. R1 |
| R1: compact money 0 dp | 18 fail incl. R1 |
| R1: counts always 1 dp | 18 fail incl. R1 |
| R2: sci without toFixed(2) | 6 fail incl. R2 |
| R2: Dc roll-up -> `1000Dc` (short) | 2 fail incl. R2 |
| R3: spell from K | 8 fail incl. R3 |
| R3: aria below $1e15 = spelled fmtMoney | 4 fail (R3) |
| R3: liveText unspelled | 2 fail (R3) |
| R4: visible exact spelled | 3 fail (R4) |
| R4: visible exact keeps digit string | 3 fail (R4) |
| R5: preview nearest | 13 fail (R5) |
| R5: count floor nearest | 4 fail (R5) |
| R5: money floor nearest | 3 fail (R5) |
| R5: sci ignores floor | 2 fail (R5) |
| no `dec()` snap | 5 fail |
| suffix case `QI` | 3 fail |
| Sell all NBSP dropped | 3 fail |
| eggsFloor -> nearest | 1 fail |
| eggsAria unspelled | 1 fail |

- Equivalent mutants (not gaps): toLocaleString maxFractionDigits 1->2 (v is already 1 dp); SCI_FROM 1e36->1e37 (the Dc roll-up path already emits sci).
- Survivors (gaps): sci floor `+1e-9` removed (n1); syncLineFit never steps down (m2).

## Byte identity elsewhere
- Visible strings that change are exactly the ruled set: `1,000T`-family -> Qa+ (rc2-fmt tests updated), NBSP before `eggs`/`hens` (welcome back app.ts:247, hen pill :535, Sell all, slot preview, §4), and the Sell/Sell all floor (ruling 4).
- Aria/live strings for K–T are byte-identical to main (test against the frozen orders/format fixtures, plus my probe). These apply flag-on and flag-off alike, since the formatters are shared.

## Font step-down (QA4-1)
- Narrow: CSS is only `.order .l1.fit1{14px}` / `.fit2{12px;-0.02em}`. JS (order-list.ts:75-84) only touches `.l1` whose `.egg` would ellipsize, keyed by text|clientWidth. Count and $ are flex-shrink:0, and the ellipsis stays as the last resort.
- Chromium probe (dist-qa, 360 and 1280):
  - $999.9Dc and 1.23e36 cards step to fit2 at 360 and fit1 at 1280, with `eggs` whole (egg not cut). The 2nd card and small orders stay at 16px.
  - **0** `.l1` class mutations and **0** layout-shift score over 3 s of ticking for each state, so there's no oscillation or jank.
  - Re-fit costs ≤2 forced layouts per changed card, only on a text/width change.

## Gates @ 9b6fc4a
- tsc OK. vitest 88 files 1016/1016.
- test:flagoff + golden 6/6: flag-off f90d1678 and M4-on a54c9cf9 unchanged.
- build + check-release-build OK. build:html OK. build:qa OK.
- check-globals (PORT unset) Chromium 3/3. rc0 Chromium (AXE_PATH set) **348/348**.
- Merges: clean with #60, #61, #62 and #65.
- **#62 aria issue:** not touched (no next-goal / goal-label change; rc0 axe + B3 green). m3 is a related label-in-name divergence on the Sell button.

## Findings
- **m1 (Minor) Scientific rounding isn't half-up on x.xx5 mantissas** (format.ts:20). `parseFloat(m) * 100` lands on 999.4999…, so 64 of 900 x.xx5e36 values round down: 1.005e36 -> `1.00e36`, 1.255e36 -> `1.25e36`, 9.995e36 -> `9.99e36` (not `1.00e37`). This is inconsistent with the `dec()` snap the PR adds for the tiers (9.995Sx -> 10Sx).
  - Repro: `fmtCount(9.995e36)`.
  - Fix: `rnd(Number((parseFloat(m) * 100).toPrecision(15)))`, plus a test. Values are unreachable today, so this is display-only.
- **m2 (Minor) The QA4-1 step-down has no behavioural test in any gate.** Mutating `syncLineFit` to never add fit1/fit2 (order-list.ts:82) passes all 67 affected tests and the full suite. The only coverage is a source regex (m41-9-art-rulings QA4-1) and the non-gate shots script.
  - Fix: add an rc0 / QA browser check (`.egg` not ellipsized at 360 for $999.9Dc / 1.23e36, as my probe does), or a jsdom test with stubbed scrollWidth/clientWidth.
- **m3 (Minor) The Sell button's visible count is now floored, but its aria keeps nearest:** visible `Sell 12.9K · +$12.9K`, accessible name `Sell 13K · +$12,960.00` (orders.ts:40 vs :41; pinned at tests/m41-9-big-number.test.ts:103).
  - The visible word "12.9K" is no longer in the name (WCAG 2.5.3 label-in-name, the same family as #62 B1). On main the count matched and only $ differed. rc0 doesn't reach a ≥10K Sell, so it stays green.
  - Ruling 3 keeps K–T aria byte-identical, so this needs an Art/a11y note: either accept it, or let the aria count use the floored count too.
- **Nits:**
  - n1: the sci floor `+1e-9` (format.ts:20) is untested; removing it passes all tests.
  - n2: pre-existing, unchanged from main: negatives format as `$-1.00` / `-5,000,000` (no suffix), and -0 -> `-0` / `$-0.00`. Money is never negative in-game.
  - n3: pre-existing (MK-24): a ready card shows value nearest (`$13K`) next to a Sell preview floored (`+$12.9K`) for the same cents. Ruling 4 accepts the floor.
  - n4: the R1-R5 header cites "Oct 19 10:06", while number-format-big.md has 4 rulings stamped 10:10; R3/R4 split ruling 3. Add the mapping for traceability.
