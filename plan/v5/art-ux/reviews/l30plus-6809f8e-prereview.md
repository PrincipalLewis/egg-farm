# L30+ pack UI pre-review: econ/l30plus @ 6809f8e (2026-10-19 03:35 CEST)
Diffed `dd52bfd...6809f8e` and `90a9c84...6809f8e` (merge-base e38cf76e for both, so the diff is the same 13 files). The UI files are src/ui/app.ts, next-goal.ts and tracks-ui.ts; the Architect's patch is in scratch/m4-retune/l30plus-ui-diff.patch. Data: data/staging/economy.l30plus.csv (56 rows, L0–55), economy-config farmMaxLevel 50. Note: the live data/economy.csv at 6809f8e is still 31 rows, so L30+ is only active once the staging CSV is synced. No renders were done; this review is based on code and widths only.

## Verdict: 1 Major (format, pre-existing but reachable only with L30+), 3 Minors

### MAJOR M1: no T tier, so "1000B" appears at or above $1T (and from $999.95B through rounding)
- Where: src/ui/format.ts:4 (`fmtCount`: the top tier is B) and format.ts:44 (`fmtMoneyShort`: the top tier is B). The HUD coins (app.ts:491 `fmtMoney(s.coinsCents)`), buy buttons and Wants all go through these.
- Cause: before this pack, the game clamped at L30, where the largest cost is collection_cost L29 = $8.31M. With L30+, Collection goes up to L50: the L49→50 cost is **$100.4B**, and the next row is $160.7B. Players save up toward these, and once everything is MAX their coins grow without limit. So coins ≥ 1e12 are reachable, and `fmtCount(1e12)` = "1000B". It also rounds: 999,960,000,000 → toFixed(1) "1000.0" → "1000B". The checklist lists "1000B" as Major.
- Trivial fix: add `if (n >= 1e12) return (n/1e12).toFixed(n>=1e13?1:2).replace(/\.?0+$/,'')+'T';` above line 4, and promote when the rounded value reaches 1000 (for example, test `n >= 999.95e9` for the T tier). In fmtMoneyShort, add `d >= 1e12 ? [d/1e12,'T'] :` to line 44 (it floors, so it has no rounding issue). Add unit tests for 999.94B → "999.9B", 999.95B → "1T", 1.68T → "1.68T".

### Checks that pass
- **(a) Cut-off at 360 above L30: PASS.** Worst-case strings: the buy button `$160.7B` / `$100.4B` (7 glyphs, the same count as the existing worst case `$999.9M`; tabular figures, Nunito 700, so the same advance width; fits the existing ≤96px button). Track costs max at 1,226,114 + surcharge 0.15×farm_cost(50)=689,760 ×1.1 → `$1.99M`. Track meta `Level 55 / 55` is the same width as `Level 30 / 30`. Farm fx `Hens & Egg value up to L50 → L55` is +0 glyphs versus `L29 → L32`. Order "Wants" lines above L30: demand_max goes up to 150 (vs 75), and prices are short-form, so the strings are shorter than the 1.23M/9.99M · $20.8M fixture. §9.1 fallback is unchanged (the count drops first, then $). The $ value is never cut.
- **(b) Hint vs highlightPick: PASS.** next-goal.ts:24 `candidates()` and best-buy.ts `options()` (which feeds highlightPick, tracks-ui.ts:54) now both price tracks with `trackBuyCost` (row cost + L30-17 surcharge), and both drop capped/MAX tracks via `trackLock` (using the new data-driven max of 55). The pool goes to the same `bestPaybackAmong`, so the hint and highlight cost/row agree at the surcharged F≥40 rows.
- Copy: `fxArrow` (tracks-ui.ts:12) hides the arrow when the before and after values format the same (L30-18). OK. No ellipsis was added.
- Tap targets: no changes to CSS or buttons in the diff.

### Minors (log for later, don't hold)
- m1 tracks-ui.ts:13 `Needs Farm L{F+1}`: when the per-row cap changes (F+3→F+5 at F40), the lock text doesn't say how many levels unlock. It's correct but vague.
- m2 app.ts:480 shows `Level L / 55` while the Farm row shows `/ 50`. Players may read the different maximums as a bug. Consider a tooltip/copy note.
- m3 fxArrow compares formatted strings, so a real but rounded-away gain shows only the current value with no "next" arrow. This is intended (L30-18) but should be noted for the Critic.
