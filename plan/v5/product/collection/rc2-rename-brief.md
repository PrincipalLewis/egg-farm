# rc2 Brief: rename the "Collect per tap" upgrade card · v0.1 · 2026-10-16 · PM, Collection
Status: **READY TO SEND to Head of Art & UX when rc1 tags.** (rc2 list item; not for rc1.) Copy owner: Art & UX. Decision: Head of Product.

## 1. Problem
The card title is "Collect per tap" (app.ts:397). Since C-AC26 the label leads with **"+12% egg price · +5/tap"** because price is the bigger benefit (each level +12% sale price, compounding with Farm; +5 eggs/tap is capped by coop size and, from Farm 3, partly replaced by the Coop Hand). QA (rc1-pt1-pass1) found players read the card as a tapping upgrade only, so they undervalue it once a Coop Hand collects for them. The title contradicts its own first chip.

## 2. Constraints
- Must match the effect label `+12% egg price · +5/tap` (price first), the before→after list (`Egg price +24% → +36%`), and the goal-strip label `★ {Track} L{n} · +X% income` (200px budget at 360; drop ★ when over, never cut the %).
- The tab stays **Collection**; telemetry `upgrade:"collection"` and save keys unchanged (display-only rename).
- {Track} in the goal strip must be the same word(s) as the card title, or a defined short form.
- **Card title budget at 360:** not documented. Working assumption: the title shares its row with `L{n}/{max}` (rc2-notes B-2 item 1), leaving ~**150px** at Fredoka 700 ~18px (~10 px/char → ≤ 15 chars). The current title is 15 chars, so it fits today. Art & UX to confirm the real number.
- Egg-farm tone, plain words, no new currency words ("coins" was rejected; $ is the only currency).

## 3. Options
| # | Title | Chars | 360 fit (est.) | Goal-strip worst case `★ X L25 · +12% income` | Rationale |
|---|---|---|---|---|---|
| A | **Egg Quality** | 11 | ~110px ✔ | ~185px ✔ keeps ★ | Says "better eggs → higher price"; tapping bonus reads as a side effect. Recommended. |
| B | **Better Baskets** | 14 | ~140px ✔ (tight) | ~215px ✘ drop ★ | Covers both effects (bigger basket = more per tap, nicer basket = sells higher); slightly more tap-flavoured |
| C | **Premium Eggs** | 12 | ~120px ✔ | ~195px ✔ borderline | Strongest price signal; loses the tap meaning entirely |
| D | **Egg Grading** | 11 | ~110px ✔ | ~185px ✔ | ✘ Clashes with the Grader worker (price multiplier) — listed to rule out |
| E | **Collection** | 10 | ~100px ✔ | ~180px ✔ (already in use) | Zero-risk: matches tab and goal strip as-is; neutral, says nothing wrong but nothing specific |
Recommendation: **A Egg Quality**, fallback **E Collection**. D excluded (Grader confusion).

## 4. Questions for Art & UX
1. What is the real card title budget at 360 (px, font/size) after the B-2 `L{n}/{max}` title-row change?
2. Pick one of A–E (or propose better); does the title read well next to an icon change (basket → egg with a sparkle)?
3. Goal strip: use the full title as {Track}, or a short form? Confirm L25 widths with Fredoka.
4. Should the tab stay "Collection" if the card is renamed (A/B/C), or is a tab/card mismatch confusing?
5. Any tooltip/explainer line needed ("Better eggs sell for more and you collect more per tap")?

## 5. Acceptance (draft, lock after Art & UX picks)
- R-AC1 Given the upgrades panel at 360/375/1280, then the card title is the chosen name, single line, not truncated, and the label still leads with `+12% egg price`.
- R-AC2 Given the goal strip targets this track at L25 at 360, then the label follows the ★-drop rule and the % is never cut.
- R-AC3 Given any save from rc1, then levels, telemetry `upgrade:"collection"` and keys are unchanged.
