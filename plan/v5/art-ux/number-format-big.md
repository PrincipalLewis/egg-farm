# Big-number format above T (QA4-3 / M41-9), Art & UX ruling 2026-10-19 09:45
Applies to fmtCount, fmtMoney, fmtMoneyShort and fmtMoneyPreview. Make the tier table data-driven.

1. **Suffix sequence after K/M/B/T:** Qa (1e15), Qi (1e18), Sx (1e21), Sp (1e24), Oc (1e27), No (1e30), Dc (1e33). Case is exactly as written. No aa/ab letter tiers.
2. **Fallback:** at 1e36 and above, scientific with 3 significant figures, `1.23e36`, with no "+" in the exponent. Money gets a "$" prefix (`$1.23e36`). NaN/Infinity stays '—'.
3. **Decimals:** new tiers follow exactly the same rule the function already applies to that tier family (K–T output must stay byte-identical, since tests cover it). For the new tiers that means 2 decimals under 10× the base, 1 decimal at 10× and up, trailing zeros stripped (1.25Qa, 12.5Qa, 125.4Qa→125.4Qa). A value that rounds to 1000 rolls up a tier (999.95Qa → 1Qi). There are never thousands separators in a suffixed value, so "1,000,000T" can't occur. The preview path keeps floor rounding.
4. **Spacing:** there's no space between the number and the suffix (`1.2Qa`). There is one space before a unit word, and it must be a non-breaking space U+00A0 (`1.2Qa eggs`), so the unit is never wrapped or dropped. This fixes the WebKit "eggs" drop. Apply the same to `{n}/{m} eggs`.
5. **Aria and spoken text:** spell the suffix out (quadrillion, quintillion, sextillion, septillion, octillion, nonillion, decillion), following the B-1 rule ("$12.3 thousand"). Above 1e15, the exact/aria formatters use the spelled short form, not a full digit string. Scientific values are read as "1.23 times 10 to the 36".
6. **Width check:** the widest strings are `$999.9Dc` and `$1.23e36`, which must fit at 360 in every engine with no clipping. Shots needed: money pill, Sell button, upgrade row cost, eggs counter, at 360/375/390/1280 in Chromium, Firefox and WebKit.
7. **Sign-off:** the UI/Visual Designer checks shots against this spec, and Head of Art & UX signs off on the pushed SHA.

## Rulings 2026-10-19 10:10 (PR #56 @1eca759, questions from the Senior Engineer, UI & rc1 Fixes)
1. Compact money (pops, cards, Sell preview) keeps its 1-decimal rule ($1.2Qa, $999.9Dc). Counts and plain money use 2 decimals under 10× (1.25Qa, $1.25Qa). The function's existing rule wins.
2. Scientific is always 3 s.f.: exactly 1e36 shows `1.00e36`, and a Dc value that rounds to 1000 rolls up to `1.00e36`. 999.95T→`1Qa` roll-up accepted.
3. Aria: spelled-out words only from Qa up in this PR. K–T aria and live-region strings stay byte-identical to main (e.g. "$1M" stays as it is). Spelling K–T aria is a separate a11y minor for later, not M4.1. Spelled words are for aria and live-region text only. Visible text (coin pops, +$ floaters, cards) always uses the suffix form ($1.2Qa), never "quadrillion". If fmtMoneyExact feeds visible pops, route those through the compact formatter or a separate aria formatter.
4. QA4-2 flooring on Sell / Sell all (12,960 → "Sell 12.9K · +$12.9K") is approved: it never over-promises.
