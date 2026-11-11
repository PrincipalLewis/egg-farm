# Code review: #3 forward-merge to main acdbedc, main wins (D-HOP-2026-10-17-05), Major P3 kept

- Branch: `rc1-ux-clarity-v3-main` @ `a3dada7` (worktree `/workspace/review-a3dada7`).
- Delta base: `8a49d35` (#3 QA-PASS). Range: `8a49d35..a3dada7` (merge `6b0bfd7`, `d6bab92`, `f09c861`, `3349832`, `a3dada7`).
- This is a re-review of the earlier one at `f09c861` (`rc1-ux-clarity-v3-main-f09c861.md`). Since then only `scripts/rc0-browser.mjs` changed (`git diff f09c861 a3dada7 --stat`: 1 file, +22/-1).
- Reviewer: Code Reviewer. The worktree was not modified. It already had an uncommitted CRLF change to `tests/fixtures/product/economy.csv` that is in no commit.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 3 |
| minor | 2 |
| nit | 3 |

**Verdict: do not tag yet.**

- Closed since `f09c861`: the old blocker (F1, `refillBar` fixture with 2 workers). `3349832` adds a third hired worker (`hawker`, unlocks at Farm L8, fixture is L12, energy 0), so `.refill-wrap` renders again at 360 and 1280.
- The new `p3coll375` check cannot fail on the defect it claims to guard (finding 1).
- Findings 2-5 and 7 are the same defects as findings 2-7 of the `f09c861` review. They are still open. None of the three commits after `f09c861`'s review touched them. Finding 6 is new.
- The Manage-all rule from the decision is implemented consistently and still correct (see "Verified").

## Findings

### 1. [major] `p3coll375` passes with a single hint box, so an overlap regression would not fail it
`scripts/rc0-browser.mjs:694-712` (assert at `:708`)

- **Evidence**
  - The section opens the **Collection** tab and inspects the first `#uRow .up` card. Its name and the commit message promise that "Limited by …", "Affordable in …" and "Need $X more" never overlap, in 3 states.
  - In this tree the Collection card renders at most one visible `.hint`. `src/ui/app.ts:505` renders `.hint.eta` ("Affordable in …"), or an empty `aria-hidden` `.hint` that the test filters out (empty text). `src/ui/app.ts:508-509` renders `.hint.limit` ("Limited by collecting ›") only when `isF`, i.e. on the **Farm** card, which this section never opens.
  - The rc1 side replaced main's "Limited by coop · Upgrade Farm →" on the Collection row (`acdbedc:src/ui/app.ts:459-461`) with the Farm-row hint. `git grep "Need \$"` finds no such string in `src`, `tests` or `scripts` at `a3dada7` or `8a49d35`.
  - The three states (F3/C5, F10/C12, F20/C24, all with `coinsCents: 1`) differ only by level. Each renders the same single "Affordable in …" hint.
  - The pass condition is `r.n >= 1 && r.ov.length === 0 && r.out.length === 0`. With `n === 1` the pairwise overlap loop has zero pairs, so `ov` is empty by construction.
  - The `need` field is computed (`/Need \$…more/`) and put into the JSON, but it is never asserted.
  - The `out` check compares the `.hint` box to the card. `.hint.eta` is `white-space:nowrap` (`styles.css:530`) inside a flex item that already fits the column, so text that overruns the box does not move the box. A long "Affordable in ~1:23:45" at 375 would pass.
  - The element selection is also convoluted: `.hint, .hint *`, then a filter on `span, button`, then a second filter that keeps only `.classList.contains('hint')`. It reduces to "visible `.hint` with text".
- **Impact**
  - The rc0 gate reports "Major P3 kept" as PASS ×3 without exercising the overlap it names. A broken layout (for example, a second hint stacked over the first) would still pass.
  - The commit is test-only (no `src` change), so this check is the only thing that "keeps" P3.
- **Fix**
  - Drive the card that really has two hints: Farm tab, `isF`, `coinsCents` low, and `eggsPerTap(C) <= 0.5 * coopCapacity(F)`. That gives `.hint.eta` plus `.hint.limit`. Assert `n >= 2` and no pairwise overlap.
  - Or, if P3 is about the Collection card in a shape that no longer exists, say so in the section name and drop the unreachable strings from the comment and message.
  - Assert `need` or remove it. Add `el.scrollWidth <= el.clientWidth + 1` on each hint for the nowrap text, and a vertical-gap assertion (`limit.top >= eta.bottom`).
  - Collapse the three-step filter into `card.querySelectorAll('.hint')`.
  - I did not run browsers; this is from reading the code and DOM generation.

### 2. [major] (carried, was F2) CSS reorder: main's D5 `.goal-pill` block still overrides rc1's cuta3 `height:auto`
`src/ui/styles.css:587` (override) vs `:620` and `:626`

- **Evidence**
  - `:587` is `.goal-pill{height:auto;min-height:var(--goal-h);align-items:center}`.
  - The merge appended main's D5 block after it. `:620` sets `.goal-pill{…;height:var(--goal-h);…}` and `:626` sets `@media (min-width:960px) and (orientation:landscape){…;.goal-pill{height:var(--goal-h-lg)}}`.
  - Same specificity, later wins. So the pill is a fixed 40px (44px landscape desktop) again. rc1 had `height:auto;min-height:var(--goal-h-lg)` at `:462`.
  - `.goal-label{white-space:normal;overflow:visible}` from the same cuta3 line still applies.
- **Impact**
  - A two-line goal label with large system text at 360/390 overflows the pill border instead of growing it. That is an rc1 behaviour from `8a49d35` that was lost in the merge.
  - The existing rc0 "Goal label v1.6.1" and `taps` assertions only check `pill === 40`, so they pass.
- **Fix**
  - Move `:587` after the D5 block, and restore `height:auto;min-height:var(--goal-h-lg)` in the ≥960 landscape rule.
  - Add an rc0 assertion that the pill is taller than 40px when the label wraps at large text.

### 3. [major] (carried, was F3) M4A-18 goal hint is computed but never reaches the goal strip
`src/ui/app.ts:404,409,412`, `src/ui/next-goal.ts` (`GoalHysteresis.tick`)

- **Evidence**
  - `hintPick` is assigned at `app.ts:409` and read nowhere (`grep hintPick` finds only `:404` and `:409`).
  - `goalHold.tick(g.state, b, t, imm || goalImm)` at `:412` passes no shared pick. Main's `renderGoal` passes `selectGoal(g.state, b, rate, M4 ? hintPick?.key : undefined)`.
  - The merge message says "selectGoal takes main's shared M4 pick (flag on only)". The code does not do that.
- **Impact**
  - Flag off (`m4.enabled: 0`, current `balance.json`, same as main): none visible.
  - Flag on: the Farm-tab highlight and the goal strip can name different upgrades. M4A-18 exists to prevent that, and "main wins" for HENS/VALUE is not honoured on the strip.
  - Nothing in the suite drives `GoalHysteresis` with a shared pick.
- **Fix**
  - Thread `shared` through `GoalHysteresis.tick` into `selectGoal`/`goalFrom`. Pass `m4On(b) ? hintPick?.key : undefined` from `app.ts`, and bypass the 1 Hz gate when the pick changes.
  - Add a unit test (flag on, `shared` = HENS → goal key HENS).
  - Or state in the decision log that rc1 ships the hint wiring off, drop the dead parameter, and fix the merge message.

### 4. [minor] (carried, was F5) Dead code and stale comments left by the Manage-all rule change
- `src/sim/actions.ts:6` imports `lowestManageTarget` (unused). `:86` still says "else refills the single lowest tired/asleep worker". `:87` uses `bulkManageAllowed`, which is identical to `showManageAll` (`workers.ts:19` and `:22`), so `:87` and `:89` are redundant guards.
- `src/sim/workers.ts:20-27`: `bulkManageAllowed` and `lowestManageTarget` document ruling (b), which no longer exists. No other caller remains.
- `src/ui/workers-ui.ts:11` (unused `bulkManageAllowed` import), `:30` and `:49` (">= 1 hired"), `:53` ("capped at 1"), `:58` ("< 3 hired refills one"), `:126-131` ("ruling (b) capped count").
- **Impact:** misleads the next reader into thinking a single-worker bulk path exists. `noUnusedLocals` is off, so tsc does not flag it.
- **Fix:** delete the two helpers and the import, keep one `showManageAll` guard, and refresh the comments.

### 5. [minor] (carried, was F4) `#nextIn` format change is unpinned, and `fmtShortDur` is dead in `src`
`src/ui/app.ts:636`, `src/ui/format.ts:92`, `tests/orders.test.ts:57,71`

- **Evidence**
  - `#nextIn` now renders `(${Math.ceil(nextCustomerInS)}s)`. This is identical to `acdbedc:src/ui/app.ts:550`, so it is the intended main behaviour (decision item 3).
  - No test or script references `#nextIn` (`grep nextIn tests scripts` is empty).
  - `fmtShortDur` has no caller in `src`. Only `orders.test.ts:71` keeps it alive.
- **Impact:** low. The string is short at 360/390/1280. The intent is unpinned and the helper is orphaned.
- **Fix:** add a one-line test for the `(Ns)` string. Delete `fmtShortDur` and its assertion, or note why it is kept.

### 6. [nit] `p3coll375` is inserted between `refillBar`'s header comment and `refillBar`
`scripts/rc0-browser.mjs:692-694`
The line `// ---------- Art & UX 23:25: sticky refill bar opaque …` now sits above the P3 section, and `sections.refillBar` (`:714`) has no header. Move the new section above that comment.

### 7. [nit] (carried, was F6) Duplicate CSS blocks after the merge
`src/ui/styles.css:453-462` and `:617-626` (D5 goal strip, duplicated nearly verbatim), and `:464-471` and `:628-635` (`.qtag`/`.queue`). Delete one copy of each. This also removes the ordering trap behind finding 2.

### 8. [nit] (carried, was F7) No test proves the threshold is balance-driven
`tests/workers-v11.test.ts:27` pins `E.manage_all_min_workers === 3` and `E.manage_prompt_threshold === 0.5` from the default balance. A hardcoded `0.5` or `3` would still pass. One case with a cloned balance (threshold 0.3, min workers 2) would pin "no hardcoded 0.4". `grep` finds no stray `0.4` or `40` in `src/sim/workers.ts`, `src/sim/actions.ts` or `src/ui/workers-ui.ts`.

## Verified and fine

- Manage-all rule (item 1 of the decision): `showManageAll`, `refillCount`, `manageAllHtml`, `showFarmManageAll`, `farmManageAllVisible`, `navRefillState` and the `manageAll` action all gate on `manage_all_min_workers` from balance. The per-worker `manage` action still works at any hire count, tested for all four roles tired and asleep. The nav badge, aria and docked label read `refillCount`, so they agree (tested).
- The rewritten tests would fail on the old rule: `<3` hired asserts `''`, `refillCount === 0`, and `apply(...)` returns the same state object. The boundary tests use `T` and `T+1`.
- `d6bab92`: the not-tired caption follows `manage_prompt_threshold` ("Rested, refill below 50%").
- `3349832`: the `refillBar` fixture now has 3 hired workers, so the sticky bar exists at 360 and 1280 and the padding/`--refill-bar-h`/scroll-margin checks run again.
- `#nextIn` matches main (decision item 3).
- Main parity: `git diff acdbedc a3dada7 --stat -- src/config src/sim src/game.ts src/save data scripts/*.ts package.json` shows only `src/sim/actions.ts` and `src/sim/workers.ts`, the intended files.
- Layout at 360/390/1280 was assessed from CSS and DOM generation only. Browsers were not run, per instructions. Finding 2 is the only layout regression I found.

## What I ran

- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/workers-v11.test.ts tests/rc1-ui.test.ts tests/orders.test.ts`: 3 files, 97 tests passed. (The `f09c861` review ran the whole suite: 78 files, 884 tests passed. Nothing in `src` or `tests` has changed since.)
- `npx tsc --noEmit`: **not run.** The sandbox denied it (three attempts across the two reviews), so it is unverified. Please run it before tagging. `noUnusedLocals` is off, so the unused imports in finding 4 would not show.
- `rc0-browser.mjs`: not run. Findings 1 and 2 come from reading the code and the CSS cascade.
- `git diff`, `git show`, `git log`, `git grep` and file reads, all read-only.

COUNTS critical=0 blocker=0 major=3 minor=2 nit=3
