# Code review: #3 forward-merge to main acdbedc, main wins (D-HOP-2026-10-17-05)

- Branch: `rc1-ux-clarity-v3-main` @ `f09c861` (worktree `/workspace/review-f09c861`)
- Delta base: `8a49d35` (#3 QA-PASS). Range reviewed: `8a49d35..f09c861` (merge `6b0bfd7`, `d6bab92`, `f09c861`).
- Reviewer: Code Reviewer. The worktree was not modified.
- The worktree already had an uncommitted CRLF change to `tests/fixtures/product/economy.csv` before I started. It is not part of any commit.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 1 |
| major | 2 |
| minor | 2 |
| nit | 2 |

**Verdict: do not tag yet.**

- The behaviour change D-HOP-2026-10-17-05 asks for (Manage all only with 3 or more workers hired, threshold from balance) is implemented correctly and is well covered by the vitest suite.
- A browser section that exercises the old rule was not updated (F1). It will fail.
- The merge reordered CSS and dropped an rc1 fix (F2).
- A main wiring (M4A-18 goal hint) is only half merged (F3).

Scope otherwise holds: `git diff acdbedc f09c861 --stat -- src/config src/sim src/game.ts src/save data scripts/*.ts package.json` shows only `src/sim/actions.ts` and `src/sim/workers.ts`. Everything else outside UI and the browser scripts is byte-identical to main.

## Findings

### 1. [blocker] `rc0-browser.mjs` `refillBar` fixture has 2 workers, so the sticky Refill bar no longer exists
`scripts/rc0-browser.mjs:696` (fixture), `:699-700` (assert)

- **Evidence**
  - The fixture is `workers: { market_hand: {energy:0, unpaid:true}, coop_hand: {energy:0} }`, which is 2 hired.
  - The section waits for `#uRow > .refill-wrap`.
  - After `f09c861`, `showManageAll` is `hiredCount >= manage_all_min_workers` (3). `manageAllHtml` returns `''` and `refillCount` returns 0, so `.refill-wrap` is never rendered.
  - The section reaches `ok('Refill bar ${w}: sticky bar present', false, 'no #uRow > .refill-wrap in this state')` at 360 and at 1280.
  - Only the `p1refill`/`s25`/`b58` fixtures were updated (3 workers, or per-worker Refill).
  - `d6bab92` fixed only the caption in `p1refill`.
- **Impact:** the rc0 gate (QA recorded 307/307 at `8a49d35`) fails 2 assertions, at 360 and 1280. The 360/1280 opaque sticky bar layout checks (8px/10px padding, `--refill-bar-h`, scroll-margin) are not exercised.
- **Fix**
  - Add a third hired worker at ≤50% energy (for example `hawker: {energy:0, cdS:0}`) to the fixture.
  - Re-run `refillBar` at 360 and 1280 in all three engines.
  - I did not run browsers. This is by reading the code, but it is deterministic.

### 2. [major] CSS reorder: main's D5 `.goal-pill` block now overrides rc1's cuta3 `height:auto` fix
`src/ui/styles.css:587` (rc1 override) vs `:620` and `:626` (main's D5 block, now later in the file)

- **Evidence**
  - At `8a49d35` the D5 block sat at line ~453 and the cuta3 override `.goal-pill{height:auto;min-height:var(--goal-h);…}` came after it at 584, so it won.
  - After the merge the D5 block was inserted after the override, at 616-626.
  - `.goal-pill{…;height:var(--goal-h);…}` at 620 now wins over `height:auto` at 587 (same specificity, later rule).
  - The desktop media rule at 626, `.goal-pill{height:var(--goal-h-lg)}`, replaced rc1's `height:auto;min-height:var(--goal-h-lg)`.
  - The `.goal-label{white-space:normal;overflow:visible}` half of cuta3 #2 still applies.
- **Impact**
  - The strip is a fixed 40px (44px on desktop) again.
  - With large system text or a two-line label at 360/390, the label overflows the pill border (`overflow:visible`) instead of the pill growing.
  - This is an rc1 behaviour regression, which is the review focus.
  - The current rc0 "Goal label v1.6.1" assertions only check `pillH === 40` when `fs` is unset, so they do not catch it. There is no assertion that the pill grows under large text.
- **Fix**
  - Move the cuta3 line (`.goal-pill{height:auto;min-height:var(--goal-h);align-items:center}`) after the D5 block, or fold it into the D5 rule.
  - Restore `height:auto;min-height:var(--goal-h-lg)` in the ≥960 landscape rule.
  - Add an rc0 assertion that the pill grows past 40px when the label wraps at large text.

### 3. [major] M4A-18 hint wiring was dropped: `hintPick` is computed but never reaches the goal strip
`src/ui/app.ts:404,409,412`, `src/ui/next-goal.ts:154-156,178-190`

- **Evidence**
  - Main's `renderGoal` calls `selectGoal(g.state, b, rate, M4 ? hintPick?.key : undefined)` and bypasses the 1 Hz text tick when the pick changes (`acdbedc:src/ui/app.ts:399-403`).
  - The merge kept `GoalHysteresis` and calls `goalHold.tick(g.state, b, t, imm || goalImm)`.
  - `GoalHysteresis.tick` calls `selectGoal(s, b)` at next-goal.ts:184 and :190 with no `shared` argument.
  - So `hintPick` is assigned and never read, and `selectGoal`'s new `shared` parameter is unreachable.
  - The merge commit message says "selectGoal takes main's shared M4 pick (flag on only)", which is not what the code does.
- **Impact**
  - Flag off (`m4.enabled: 0`, the current `balance.json`, identical to main): no user-visible change.
  - Flag on: the Farm-tab highlight (DualPicker) and the goal strip (`GoalHysteresis` over `bestBuy` payback) can name different upgrades. M4A-18 was meant to prevent this, and "main wins" is not honoured for HENS/VALUE.
  - Nothing in the 884 passing tests drives `GoalHysteresis` with a shared pick, so this is silent.
- **Fix**
  - Thread `shared` through `GoalHysteresis.tick(s, b, t, imm, shared?)`, so it is passed to `selectGoal` and `goalFrom`.
  - Pass `m4On(b) ? hintPick?.key : undefined` from `app.ts`.
  - Restore the pick-change bypass of the 1 Hz gate.
  - Add a unit test (flag on, `shared` = HENS → goal key HENS).
  - Alternatively, if the HoP decision is to ship M4 hint wiring off in rc1, drop the dead parameter and fix the commit message.

### 4. [minor] `#nextIn` format change is unpinned, and `fmtShortDur` is now dead in `src`
`src/ui/app.ts:636`, `src/ui/format.ts:91-96`, `tests/orders.test.ts:57,71`

- **Evidence**
  - Per the decision, `#nextIn` now renders `(${Math.ceil(nextCustomerInS)}s)`, so "(125s)" instead of the rc1 "(~2:05)" designer nit (cuta3 #6).
  - No test or script in `tests/` or `scripts/` references `#nextIn` at either `8a49d35` or `acdbedc`, so neither format is covered.
  - `fmtShortDur` has no remaining caller in `src`. Only the unit test at `orders.test.ts:71` keeps it alive.
- **Impact:** low. The decision is explicit and the string is short at 360/390/1280. The intent is unpinned and the helper is orphaned.
- **Fix:** add a one-line test for the `(Ns)` string. Either delete `fmtShortDur` and its assertion, or note why it is kept.

### 5. [minor] Dead code and stale comments left by the rule change
- `src/sim/actions.ts:6,87`
  - `lowestManageTarget` is imported and unused.
  - `bulkManageAllowed` is identical to `showManageAll` (workers.ts:19 and :22), so the new guard at line 87 is redundant with line 89.
  - The comment at line 86 still says "else refills the single lowest tired/asleep worker".
- `src/sim/workers.ts:20-27`: `bulkManageAllowed` and `lowestManageTarget` document ruling (b), which no longer exists. No test or caller remains.
- `src/ui/workers-ui.ts:11` (unused `bulkManageAllowed` import), `:30`, `:49` (">= 1 hired"), `:53` (blank doc line, "capped at 1"), `:58` ("< 3 hired refills one"), `:130` ("ruling (b) capped count").
- **Impact:** misleads the next reader into thinking a single-worker bulk path exists. tsc does not flag it (`noUnusedLocals` is off).
- **Fix:** remove the two helpers and the import. Use a single `showManageAll` guard. Refresh the comments.

### 6. [nit] Duplicate `.qtag`/`.queue` CSS block
`src/ui/styles.css:464-471` (rc1) and `:628-635` (main) are identical.
Harmless, but delete one. This also reduces the chance of repeating the ordering trap in F2.

### 7. [nit] No test proves the threshold is balance-driven
`tests/workers-v11.test.ts` and `tests/rc1-ui.test.ts` read `E.manage_prompt_threshold` and `E.manage_all_min_workers` from the default balance, and pin 0.5 and 3.
A hardcoded `0.5` or `3` in `canManageWorker`/`showManageAll` would still pass.
One case with a cloned balance (for example threshold 0.3, min workers 2) would pin the "no hardcoded 0.4" requirement.

## What was verified and is fine

- Rule change (`f09c861`)
  - `showManageAll`, `refillCount`, `manageAllHtml`, `farmManageAllVisible` and the `manageAll` action all gate on the same balance value.
  - The nav badge, aria and docked label come from `refillCount`, so they agree.
  - Per-worker `manage` still works at any hire count; tested for all four roles, tired and asleep.
  - Boundary tests use `T` and `T+1`; the `<3` hired case checks `apply(...)` returns the same state.
- `d6bab92`: `p1refill` caption "Rested, refill below 50%" matches `manageCaption`, which reads the balance.
- `b58` (`[30,51,98]`, 3 hired) and `s25` (3 hired, one at 30%) fixtures are consistent with threshold 50 and min 3.
- The `rc1` behaviours I checked survive: `salesStopped`/`grossSalesPerSec`, worker banners, wage lines, Refill-per-card layout, `navManageView`, GoalHysteresis labels, `count3`/order lines, `.btn.maxed` plus the main MAX label.
- Main parity: `balance.json`, `tracks.ts`, `state.ts`, saves, `game.ts`, `data/*` are byte-identical to `acdbedc`.
- Queue-full ghost bubble removal and the `showToast(text, ms, atHud)` change come from main, as intended.

## What I ran

- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1` (whole suite): **78 files, 884 tests passed**, 140 s.
- Before that: `tests/workers-v11.test.ts tests/rc1-ui.test.ts`, 77/77 passed.
- `npx tsc --noEmit`: **not run.** The sandbox denied the command twice, so it is unverified in this review. Please run it before tagging. Nothing I read suggests a type error; `noUnusedLocals` is off, so the unused imports in F5 would not be flagged.
- Browser sections (`rc0-browser.mjs`): not run, per instructions. F1 and F2 are from reading the code and CSS cascade. I did not render 360/390/1280.
- Other commands: `git diff`/`git show`/`git status` and file reads.

COUNTS critical=0 blocker=1 major=2 minor=2 nit=2
