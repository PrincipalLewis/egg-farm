# Code review: #3 forward-merge to main af5e3ab (acdbedc + #39), main wins (D-HOP-2026-10-17-05), Major P3 kept

- Branch: `rc1-ux-clarity-v3-main` @ `7380b86` (worktree `/workspace/review-7380b86`).
- Delta base: `8a49d35` (#3 QA-PASS). Range: `8a49d35..7380b86` (merge `6b0bfd7`, `d6bab92`, `f09c861`, `3349832`, `a3dada7`, merge `b9acb23` of `af5e3ab`, `7380b86`).
- Re-review of `rc1-ux-clarity-v3-main-a3dada7.md`. Since `a3dada7` there are two changes: the `af5e3ab` merge (`b9acb23`) and the `orderFit11` removal (`7380b86`).
- Reviewer: Code Reviewer. The worktree was not modified. It already had an uncommitted change to `tests/fixtures/product/economy.csv` that is in no commit.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 3 |
| minor | 4 |
| nit | 4 |

**Verdict: do not tag yet.**

- The three majors (findings 1-3) are carried unchanged from the `a3dada7` review. None of the commits after it touched the lines involved. All three are still open at `7380b86`.
- The `af5e3ab` merge itself is clean. Outside the files the decision names, `src/` is byte-identical to main: `git diff af5e3ab 7380b86 --stat -- src` lists only UI files, `src/sim/actions.ts`, `src/sim/workers.ts` and `src/econ/income.ts`. `src/game.ts`, `src/main.ts`, `src/save/*`, `src/platform/*`, `src/sim/payout.ts` and `src/config/*` are identical to main. The #39 hidden-tab accounting is therefore main's unmodified.
- The order card, `fmtMoney*`, the `ghost` host, the BUG-5 particle timer, TUT-1 and the MK-24 Sell button come from main, as the decision asks.
- One new layout issue came out of the merge (finding 4): an rc1 CSS rule now overrides main's MK-24 Sell button sizing.

## Findings

### 1. [major] (carried, was F1) `p3coll375` passes with a single hint box, so an overlap regression would not fail it
`scripts/rc0-browser.mjs:694-713` (assert at about `:709`)

- **Evidence**
  - The section opens the **Collection** tab and inspects the first `#uRow .up`. Its title and the commit message say "Limited by …", "Affordable in …" and "Need $X more" never overlap.
  - The Collection card renders at most one visible `.hint`: `.hint.eta` ("Affordable in …"), or an empty `aria-hidden` hint that the test filters out. `.hint.limit` ("Limited by collecting ›") is rendered only on the Farm card (`isF`), which this section never opens. No "Need $X more" string exists in `src`, `tests` or `scripts`.
  - The three states (F3/C5, F10/C12, F20/C24, `coinsCents: 1`) differ only by level and render the same single hint.
  - The pass condition is `r.n >= 1 && r.ov.length === 0 && r.out.length === 0`. With `n === 1` the pairwise loop has no pairs, so `ov` is empty by construction. `need` is computed and never asserted.
  - `.hint.eta` is `white-space:nowrap`, so text that overruns its box does not move the box and `out` stays empty.
  - The element filter (`.hint, .hint *`, then `span, button`, then `.hint` again) reduces to "visible `.hint` with text".
- **Impact:** the rc0 gate reports "Major P3 kept" ×3 without exercising the overlap it names. A second hint stacked over the first would still pass. The commit is test-only, so this check is the only thing that "keeps" P3.
- **Fix**
  - Drive a card that really has two hints: Farm tab, low coins, `eggsPerTap(C) <= 0.5 * coopCapacity(F)`, which gives `.hint.eta` plus `.hint.limit`. Assert `n >= 2`, no pairwise overlap, and `limit.top >= eta.bottom`.
  - Or rename the section to what it checks and drop the unreachable strings.
  - Add `scrollWidth <= clientWidth + 1` per hint. Replace the three-step filter with `card.querySelectorAll('.hint')`.
  - Not run in a browser; this is from reading the code and the DOM generation.

### 2. [major] (carried, was F2) Main's D5 `.goal-pill` block still overrides rc1's cuta3 `height:auto`
`src/ui/styles.css:592` (rc1 override) vs `:626` and `:632` (main D5 block, later in the file)

- **Evidence**
  - `:592` is `.goal-pill{height:auto;min-height:var(--goal-h);align-items:center}`.
  - `:626` sets `.goal-pill{…;height:var(--goal-h);…}` and `:632` sets `@media (min-width:960px) and (orientation:landscape){…;.goal-pill{height:var(--goal-h-lg)}}`. Same specificity, later wins.
  - rc1's own copy of the D5 block at `:461` and `:467` has `height:auto` in the landscape rule. The second, main copy at `:626`/`:632` overrides it.
  - `.goal-label{white-space:normal;overflow:visible}` from the same cuta3 line still applies.
- **Impact:** the strip is a fixed 40px (44px on landscape desktop) again. A two-line goal label with large system text at 360/390 overflows the pill border instead of growing it. That is an rc1 behaviour from `8a49d35` lost in the merge. The rc0 "Goal label v1.6.1" checks only assert `pill === 40`, so they pass.
- **Fix**
  - Delete the main copy of the D5 block at `:621-632`, or move `:592` after it. Restore `height:auto;min-height:var(--goal-h-lg)` in the landscape rule.
  - Add an rc0 assertion that the pill grows past 40px when the label wraps at large text.

### 3. [major] (carried, was F3) M4A-18 goal hint is computed but never reaches the goal strip
`src/ui/app.ts:412,417`, `src/ui/next-goal.ts` (`selectGoal`, `GoalHysteresis.tick`)

- **Evidence**
  - `hintPick` is assigned at `app.ts:417` and read nowhere (`grep hintPick` finds `:412` and `:417` only).
  - `goalHold.tick(...)` passes no shared pick. `GoalHysteresis.tick` calls `selectGoal(s, b)` with no `shared` argument, so the new `shared` parameter is unreachable.
  - The merge message says "selectGoal takes main's shared M4 pick (flag on only)". The code does not do that.
- **Impact**
  - Flag off (`m4.enabled: 0` in the current `balance.json`, same as main): none visible.
  - Flag on: the Farm-tab highlight (DualPicker) and the goal strip can name different upgrades. M4A-18 exists to prevent that, and "main wins" is not honoured for HENS/VALUE on the strip. No test drives `GoalHysteresis` with a shared pick.
- **Fix**
  - Thread `shared` through `GoalHysteresis.tick` into `selectGoal`. Pass `m4On(b) ? hintPick?.key : undefined` from `app.ts`. Bypass the 1 Hz gate when the pick changes.
  - Add a unit test (flag on, `shared` = HENS gives goal key HENS).
  - Or record in the decision log that rc1 ships the hint wiring off, drop the dead parameter, and fix the merge message.

### 4. [minor] (new) rc1 `.order .btn.sell` rule overrides main's MK-24 Sell button sizing
`src/ui/styles.css:586` (rc1, "Art & UX 22:31") over `:384` (main MK-24-1 v3)

- **Evidence**
  - Main's rule at `:384` is `.order .btn.sell{width:var(--sell-w,88px);…;min-height:44px;height:auto;…;white-space:normal;line-height:1.15;…}` for the two-line `Sell k` over `+$X` button.
  - rc1's rule at `:586` is `.order .btn.sell{white-space:nowrap;text-overflow:clip;height:44px;min-height:44px;max-height:44px;box-sizing:border-box}`. It has the same specificity and comes later, so it wins.
  - `height:auto` becomes a hard `height:44px; max-height:44px`. `.order .btn.sell.long{font-size:12px}` (`:586`) is dead, because `order-list.ts` and `orderHtml` no longer emit `long`.
  - The two lines are 14px and 12px at line-height 1.15, about 30px. With the 8px padding and the `.btn` border, that is inside 44px at default text size only by a couple of pixels. I did not measure it.
- **Impact:** at larger system text, or a fallback font with taller metrics, the two lines overflow the fixed 44px (`overflow:visible`) and overlap the card border or the line below. Main's `height:auto` was meant to absorb that. `syncSellWidth` (`order-list.ts`) measures `scrollWidth` with the width set to `max-content`, so the `nowrap` also changes what is measured. I did not render this at 360/390/1280.
- **Fix:** delete `:586` (the `.long` half too). Main's `:384-388` already covers all of it. If the 44px height is wanted, use `min-height` only.

### 5. [minor] (carried and extended, was F5) Dead code and stale comments after the rule change and the order-card change
- `src/sim/workers.ts:20-27`: `bulkManageAllowed` and `lowestManageTarget` document ruling (b), which no longer exists. `lowestManageTarget` has no caller. `bulkManageAllowed` is now identical to `showManageAll` (`:19`), so the extra guard at `src/sim/actions.ts:81` is redundant with `:83`.
- `src/sim/actions.ts:80`: the comment still says "else refills the single lowest tired/asleep worker".
- `src/ui/workers-ui.ts:11` (unused `bulkManageAllowed` import), `:54-58` (two stacked doc comments, one still "capped at 1"; `:58` "< 3 hired refills one"), and the "ruling (b) capped count" comment near `:131`.
- `src/ui/orders.ts`: `count3` (`:91`) and `fitOrderEggs` (`:99`) have no caller in `src` now that main's card replaced the rc1 line. `const eggsLegacy = eggs` (`:7`) is a pointless alias. The "Spec §2.1: eggs >= 1,000" doc comment is now duplicated at `:5` and `:90`, orphaned above `count3`.
- `src/ui/app.ts:8`: `IncomeRate` is imported and unused. `src/ui/format.ts:100`: `fmtShortDur` has no caller in `src`.
- `src/ui/styles.css:43`: `.btn.maxed{…}` is orphaned because MAX is now a `<span class="maxed">`. It is pinned only by `tests/rc1-ui.test.ts:339`.
- **Impact:** misleads the next reader, and `tests/orders.test.ts:112-122` keeps `fitOrderEggs`, `count3` and `fmtShortDur` alive. `noUnusedLocals` is off, so `tsc` does not flag the unused imports.
- **Fix:** delete the helpers, the imports, the alias and `.btn.maxed`, along with their test lines. Keep one `showManageAll` guard and refresh the comments.

### 6. [minor] (new) Coverage drop at 1280: `orderFit11` is gone and its replacement checks do not cover the docked order card
`scripts/rc0-browser.mjs:738-739` (removal), `:397-412` (`bug9`), `scripts/mk24-1-overflow.mjs`

- **Evidence**
  - `7380b86` removes `orderFit11`, which ran at 360/375/390/1280. The comment says "Bug9 + main's order checks cover it".
  - `bug9` runs at 360x640, 375x812, 375x600 and 390x844 only. It asserts the Sell button is inside the card and that the text is at most 2 lines. It does not run at 1280 (docked), and it does not assert that the button's own text stays inside the button.
  - Main's `scripts/mk24-1-overflow.mjs` (new in `b9acb23`) is not referenced from `package.json`, `.github`, `engineering/ci-gates.md` or `rc0-browser.mjs` (`grep` finds nothing).
- **Impact:** the docked order card at 1280 and the Sell button clipping (finding 4) have no automated check in this tree. Dropping `orderFit11` is correct under the decision. The gap is that nothing replaces its 1280 and "value never cut" assertions.
- **Fix:** add 1280x800 to `bug9`'s viewports, and assert `btn.scrollHeight <= btn.clientHeight + 1` and `btn.scrollWidth <= btn.clientWidth + 1` for each Sell button. Or wire `mk24-1-overflow.mjs` into the rc0 run and name it in the status gates.

### 7. [minor] (carried, was F4) `#nextIn` format change is unpinned
`src/ui/app.ts:644`, `tests/orders.test.ts`

- `#nextIn` renders `(${Math.ceil(nextCustomerInS)}s)`, matching main as the decision requires. No test or script references `#nextIn`, so neither format is pinned.
- **Fix:** a one-line test of the string. Delete `fmtShortDur` (finding 5) or say why it is kept.

### 8. [nit] (new) Truncated comments and stale test text left by the order-test removal
- `tests/orders.test.ts:119-124`: three "merge af5e3ab … rc1 block superseded by …" comment lines. The first is cut mid-sentence ("order button labels (MK-35") and none sits above any test. Lines 121-122 import `count3` and `fmtShortDur`, which nothing uses.
- `tests/rc1-ui.test.ts:87`: the test title still says `"Rested, refill below 40%"` while its body uses `T` (50).
- **Fix:** remove the orphan comments and imports. Change the title to `refill below N%`.

### 9. [nit] (carried, was F7) Duplicate CSS blocks after the merge
`src/ui/styles.css:456-467` and `:621-632` (D5 goal strip), `:469-476` and `:633-640` (`.qtag`/`.queue`). Delete one copy of each. This also removes the ordering trap behind finding 2.

### 10. [nit] (carried, was F6 and F8) Section header placement, and the threshold is not tested as balance-driven
- `scripts/rc0-browser.mjs:692-694`: the "Art & UX 23:25 sticky refill bar" header sits above `p3coll375`, so `sections.refillBar` (`:714`) has none.
- `tests/workers-v11.test.ts:27` pins `manage_all_min_workers === 3` and `manage_prompt_threshold === 0.5` from the default balance, so a hardcoded 3 or 0.5 would still pass. A case with a cloned balance (threshold 0.3, min 2) would pin "no hardcoded 0.4". `grep` finds no `0.4` or `40` in `src/sim/workers.ts`, `src/sim/actions.ts` or `src/ui/workers-ui.ts`.

### 11. [nit] (new) D-HOP-2026-10-17-05 is not recorded in `engineering/decisions.md`
The ID is cited as the authority in `src/sim/workers.ts`, `src/sim/actions.ts`, `src/ui/workers-ui.ts`, `src/ui/app.ts` and several tests, and appears in `engineering/status.md:487`. `grep` finds no entry in `decisions.md` at `7380b86`. A reader who follows the comment has nowhere to land. Add the entry (the three rules: Manage all at 3 or more hired with the balance threshold, main's M4-A formats, main's MK-24 order card).

## Verified and fine

- Manage-all rule: `showManageAll`, `refillCount`, `manageAllHtml`, `showFarmManageAll`, `farmManageAllVisible`, `navRefillState` and the `manageAll` action all gate on `manage_all_min_workers`. The per-worker `manage` action works at any hire count, tested for all four roles tired and asleep.
- The goal strip's "★ X · Refill" hint (`next-goal.ts`) targets the Workers tab, where the per-worker Refill exists. It does not call `manageAll`, so a 1-2 worker save is not left with a dead hint.
- The rewritten tests fail on the old rule: `<3` hired asserts `''`, `refillCount === 0`, and `apply(...)` returns the same state. Boundaries use `T` and `T+1`.
- The `af5e3ab` conflict resolutions in `app.ts`: main's BUG-5 `expire`/own-target `animationend`, `ghostHost`, TUT-1 row highlight, `fmtMoneyExact` on the served chip, qpop and coin floater, and `sellAllPreview`/`saleValueCents` are in place. The kept rc1 items are present: `slotPreview` with `coopStep`, `fmtTimeToAfford` through `hoursMins`, `clampToSafe`, no empty-queue spotlight, and the NBSP FTUE hint.
- `hoursMins` is declared after its first use in `format.ts`, but only called at runtime, so there is no TDZ problem.
- `d6bab92`: caption "Rested, refill below 50%" follows the balance threshold. `3349832`: the `refillBar` fixture hires 3, so the sticky bar renders at 360 and 1280 again.
- Layout at 360/390/1280 was assessed from CSS and DOM generation only (no browsers). The regressions I found are findings 2 and 4.

## What I ran

- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1` (whole suite): **83 files, 969 tests passed**, 144 s.
- Before that: `tests/rc1-ui.test.ts tests/workers-v11.test.ts tests/orders.test.ts`, 90/90 passed.
- `npx tsc --noEmit`: **not run.** The sandbox denied it (three attempts in this review, and in both earlier ones), so type-checking is unverified. Please run it before tagging. `noUnusedLocals` is off, so the unused imports in finding 5 would not show anyway.
- `scripts/rc0-browser.mjs` and `mk24-1-overflow.mjs`: not run, per instructions. Findings 1, 2, 4 and 6 come from reading the code and the CSS cascade.
- `git diff`, `git show`, `git log` and file reads, all read-only. `Read` of the vitest background output.

COUNTS critical=0 blocker=0 major=3 minor=4 nit=4
