# Code review: rc1-ux-clarity-v3 @ 8a49d35 (Cut A v3)

Reviewer: Code Reviewer. Range `a01faea..8a49d35`, worktree `/workspace/review-8a49d35`, branch `rc1-ux-clarity-v3`. Static review only (see "What I ran").

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 7 |
| nit | 3 |

Verdict: no blocker. One major layout risk (finding 1) needs a measurement or a CSS fix before this ships. Most of the rest is test adequacy and a11y polish.

Scope note. `a01faea` is not an ancestor of the merged `origin/main` (2700804) that this branch took in at 595335d. `git diff a01faea..8a49d35` therefore shows 73 files, including about 35 mainline commits (m4-design, decisions, vendored economy sim, seller-variance, staging CSV, golden harness, save-recovery). I reviewed `git diff 2700804 8a49d35` (50 files, the branch's own work). I did not review the mainline-only files; those went through their own PRs. Re-base the review range to 2700804 next time.

## Findings

### 1. [major] `.wk-body` / `.wk-refill` wrappers have no CSS, so the worker card spacing and Refill button width change
`src/ui/workers-ui.ts` (the `workersHtml` return, about line 117) and `src/ui/styles.css:182` (`.wk{display:grid;gap:4px}`).

Evidence: this cut wraps the old direct children of `.wk` in `<div class="wk-body">` and `<div class="wk-refill">`. `grep wk-body|wk-refill` in `styles.css` finds only `.wk.is-off .wk-body{opacity:.5}` and `.wk.is-off .wk-refill{opacity:1}`. There is no layout rule for either wrapper. rc0 and the tests never measure card spacing: `rc0-browser.mjs` only matches `.wk-banner`, and `rc1-ui.test.ts` only matches strings.

Impact:
- The 4px grid `gap` used to separate `h3`, `.ebar`, `.meta`, the Grader extra and the wage line. Inside the plain block `.wk-body` they now have no gap (`.ebar` has no margin, `.wk h3` has `margin:0`), so the energy bar and text stack tight.
- The Refill `.btn` (`display:inline-flex`) used to be a grid item and stretched to the card width. Inside a block `.wk-refill` it shrinks to its content (`min-width:88px`, left-aligned). The `.wk-cap` caption becomes a separate block line under it.
- This is at 360, 390 and 1280 alike. I could not render it (no browsers allowed). If the design intends the old look, this is a regression. If it intends a compact left button, nothing in the CSS says so.

Fix: give the wrappers explicit rules, for example `.wk-body{display:grid;gap:4px}` and `.wk-refill{display:grid;gap:2px}`, or `justify-items:start` if the button is meant to hug its content. Add an rc0 measurement of gap and button width for one card at 360 and 1280.

### 2. [minor] Goal-button aria reads the new ETA formats badly (`spokenDuration` is stale)
`src/ui/next-goal.ts:211` and `:219`, `:228`.

Evidence: `spokenDuration` only rewrites `(\d+)\s*(min|s|h)` units. `fmtGoalEta` now returns `~0:41` or `~1h 59m`. `~0:41` has no unit and stays `0:41`, so the label says "Affordable in about 0:41." `~1h 59m` becomes "1 hour 59m", because `m` is not in the alternation. No test covers a waiting-state aria (`grep "Affordable in about" tests` finds nothing).

Impact: the waiting state is the most common goal state, and its accessible name is read as a clock time or as "59 m".

Fix: convert from seconds, not from the formatted string. Either build the spoken text next to `fmtGoalEta` or parse `m:ss` and `Hh Mm` in `spokenDuration`. Add tests for `~0:41`, `~1:05`, `~1h 59m` and `~2h`.

### 3. [minor] A test assertion is swallowed by a trailing comment
`tests/rc1-ui.test.ts:79`.

Evidence: `... toContain('Refill 1 tired worker'); // ruling (b): < 3 hired refills one expect(farmManageAllVisible(S([10, 10]), b, false)).toBe(true);`. The `expect(farmManageAllVisible(...))` is inside the comment and never runs.

Impact: the "Farm View Refill is visible with 2 hired and tired" check silently does not exist. A regression in `farmManageAllVisible` for fewer than 3 hired would pass this test. Line 130 of `workers-v11.test.ts` covers 1 hired, so the gap is small but real.

Fix: put the assertion on its own statement.

### 4. [minor] Goal "Refill" path is not tested through the real code
`tests/next-goal.test.ts:35`, `src/ui/next-goal.ts:139` and `:154-165`.

Evidence: the test "asleep best-buy worker -> Refill status" admits in its comments that it cannot build the case ("skip if not natural") and asserts `state !== 'refill'` on a state with no workers. Every other refill test (`review-5d8a058.test.ts`) builds the goal by hand via `refillGoal()`, overriding `state` and `key`. Nothing calls `selectGoal` or `goalFrom` with an asleep hired worker and expects `refill`.

Impact: a broken `bestBuyNeedsRefill`, `goalFrom` refill branch or `selectGoal` live-income loop still passes. In addition, `incomePerSec` assumes one tap per second, so `live <= 0` in `selectGoal` is practically unreachable outside a faked balance. That loop may be dead in play; the only natural entry is the W4 case (asleep Grader with a next tier available).

Fix: add a test for an asleep Grader at a farm level with an available tier: `selectGoal` returns `state:'refill'`, `key:'W4'`, label `★ Grader · Refill`. Delete the vacuous test. Decide whether the `live <= 0` loop is wanted, and remove it if not.

### 5. [minor] `aria-label` on a role-less `div.up`
`src/ui/app.ts` (`upRowHtml`, the `aria` const and `<div class="up…" aria-label=…>`).

Evidence: the "Adds N percent income. Pays back in about X. Best buy. Buy for $Y." text is put in `aria-label` on a plain `div`. ARIA 1.2 prohibits naming a generic element, and most screen readers ignore it. When the string is empty the code correctly omits it. With no payback or best-buy the string also contains double spaces.

Impact: the spoken value summary for a card, the point of the aria work, is probably never announced. axe also reports it (aria-prohibited-attr, needs-review).

Fix: give the card `role="group"` (or `article`), or put the text in a visually hidden element referenced with `aria-describedby` on the Buy button. Trim the string.

### 6. [minor] Banner `role="status"` is recreated by `innerHTML` on every Workers refresh
`src/ui/workers-ui.ts` (`workerBannerHtml`) and `src/ui/app.ts` (render, `uRow.innerHTML = html`).

Evidence: the Workers tab HTML is rewritten whenever it changes (energy ticks, the 1 s cooldown countdown). Each banner is a fresh `role="status"` node with content already inside. Some screen reader and browser pairs announce freshly inserted status nodes.

Impact (PLAUSIBLE, not verified with a screen reader): repeated "Coop Hand is asleep. Collecting is slowed." announcements every refresh while the tab is open.

Fix: drop `role="status"` (the banner is persistent state, not an event), or diff the DOM and keep nodes.

### 7. [minor] Several tests are source greps that a broken implementation still passes
`tests/rc2-cuta-followups.test.ts:6-10`, `tests/p1-oct16.test.ts:25-28` and `:29-33`, `tests/rc1-ui.test.ts` (D5, S2-6, toast duration, welcome line, FX particles: `expect(app).toContain(...)` / `toMatch` on `app.ts` and `styles.css`).

Evidence: they assert that a literal string exists in source. The reviewer rounds on 5d8a058 and 23a3798 already replaced several of these with behaviour tests (`navRefillState`, `headerRate`); these remain.

Impact: they pass if the code is present but dead, wrongly wired, or overridden by a later CSS rule. Example: finding 1 cannot be caught this way, and the D5 `.goal` rule matches even though a later `.goal{display:block…}` block overrides parts of it.

Fix: do not block on this. For the layout ones, rely on the rc0 measurements and add measurements where missing (finding 1). Where the logic is extractable (`COOP_TOAST_MS`, coop FX deferral), test the function.

### 8. [minor] Cut A v3 carries unrelated or weakly related changes
`src/ui/rotate-prompt.ts` (focus trap), `src/ui/fx.ts` + `app.ts` (particle clamp, `animationend` kill), `src/main.ts` + `index.html` + `app.ts` (build id meta, visible HUD build tag), `src/ui/welcome-sale.ts` (instant-sale dry run), `src/ui/styles.css` (`.btn.maxed` colour change, `.goal-status.chip` recolour).

Evidence: each has a rule or QA reference in the commit messages, so they are not accidental. They are outside the topic ("UX clarity" for upgrade value and workers) and several carry their own risk. Examples: the welcome line runs a full sim dry run (`windowS * tickHz` steps) on modal open, and the HUD now shows a build tag at 360.

Impact: wider blast radius for a cut that is meant to be reviewed as one unit. The HUD at 360 now holds a two-line coin pill, a basket pill, the build tag (`white-space:nowrap`) and the settings button; I could not measure it, and `rc0-browser.mjs` has no assertion on the HUD overflowing.

Fix: confirm with the Head of Engineering that these ship in this cut. Add an rc0 check that the HUD does not overflow at 360 with the build tag and a long money value.

### 9. [nit] Sub-cent positive rate still shows the ⚠ glyph
`src/ui/s2-economy-ui.ts` (`rateView`, the `c === 0` branch) and `tests/rc1-ui.test.ts:199`.

Evidence: for `0 < cps < 0.5` the sign is `zero` (not red) but the text is `⚠ $0.00/s`. PM ruling (a) says "red ⚠ only at <= 0". The test pins `rateView(0.3).text === '⚠ $0.00/s'`.

Impact: a grey warning glyph on a positive rate. Unlikely in play (sub-cent per second), but the text contradicts the ruling.

Fix: use `$0.00/s` without the glyph when the sign is `zero`, and update the test.

### 10. [nit] Dead and stale code left behind
- `src/ui/next-goal.ts`: `GoalHold`, `fitGoalLabel`, `GOAL_LABEL_BUDGET_PX` are used only by tests ("kept so tests compile"); `labelFor` has an unused `_b` parameter.
- `src/ui/styles.css`: `@media (max-width:379px){.goal{grid-template-columns:…}}` at line 237 is dead (`.goal` is now `display:block`; the pill carries the grid). The `.hint.limit .link,.hint .link{…}` rule (about line 566) is fully overridden for `.limit` and no other `.hint .link` remains.
- `src/ui/workers-ui.ts`: the `navManageView` doc still says "the cooldown aria text changes at most every 5 s", and `NavAria.at` is vestigial since 53ecdea.
- `src/ui/format.ts`: `fmtShortDur` and `fmtGoalEta` are near duplicates with different rounding (floor vs ceil) and different 24 h handling.
- `src/ui/orders.ts`: `eggsLegacy` is kept only for `slotPreview`.

Fix: delete or merge in a cleanup commit.

### 11. [nit] Release gate string list misses the new QA hooks
`scripts/check-release-build.mjs:21`.

Evidence: the `hooks` list names `eggfarmOnb` and `eggfarmQaRecovery`, but not the new `eggfarmQaFitBanners`, `eggfarmQaFitGoal`, `eggfarmQaWelcome` or `eggfarmOrderList`. They are covered by the `window.X =` allowlist regex at line 27 and by the runtime `check-globals`, and they sit behind `IOS_FLAG_ENABLED`, so this is defence in depth only.

Fix: add the names to the list.

## Checked and found fine

- `bulkManageAllowed` / `lowestManageTarget` / `manageAll` (ruling b): a paid tired worker is preferred over Unpaid, ties break by card order, the shared cooldown applies, and the 3+ bulk path is unchanged. `tests/bot-m2.ts` guards `manageAll` with the min-workers count, so the golden sim trace should not move.
- `hoursMins` carry (no `1h 60m` / `60 min`), `fmtAffordableIn`, `count3` rounding (999.5B to 1T, have/Sell round down), `orderView` ('No eggs', '✓ Ready · $X') and the order fit cache key (includes text, button label, width, narrow).
- `salesStopped` threshold is shared by the header aria and the banners; banner copy matches `rc2-workers-copy.md` §6 (role first, SVG icon, role dropped first, full aria).
- Refill cooldown aria is stable (`Refill, cooling down`) in the nav; the visual countdown is `aria-hidden`.
- The goal label fit and `ResizeObserver` loop is bounded by the width guard; fonts are awaited in `main.ts`.
- `rates.ts` and `income.ts` wage models give the same per-second figure, so the header and the wage lines agree.

## What I ran

- `git log`, `git diff 2700804 8a49d35` per file, and reads of the changed source, CSS, tests, `rc0-browser.mjs` banner section and the Art & UX specs (`rc1-upgrade-value.md` §7, `rc2-workers-copy.md` §6, `m2-workers-layout.md`).
- NOT run: `npx tsc --noEmit` and `npx vitest run …`. Both were denied by the session's permission mode ("don't ask" mode) even though the task allowed them. So I cannot say whether the type check or the test suite passes on 8a49d35. Please run both (and the rc0 browser pass at 360, 390 and 1280) before sign-off.
- No browsers, so every layout statement above (finding 1, the HUD in finding 8) is from CSS and markup, not measured.
