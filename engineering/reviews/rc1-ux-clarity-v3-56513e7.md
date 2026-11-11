# Code review: rc1-ux-clarity-v3 @ 56513e7 (Cut A v3)

**STATUS: PARTIAL / INCOMPLETE. Do not treat this as a pass.**
Bash was denied partway through the session (every command, including read-only `git` and the allowed `npx tsc --noEmit` / `npx vitest run`). The remaining review had to use the Read tool only. Details in "What I ran" and "Not covered".

Review range given: a01faea..56513e7. `main` has since moved to 2700804, which is already merged into the branch (595335d). The a01faea range therefore also contains main's m4-design, seller-variance, vendored-sim and economy-staging work. I reviewed only what the branch adds on top of 2700804.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 3 |
| nit | 2 |

These counts cover only the files I read. With tsc, vitest and the full diff not run, "0 blocker" does not mean there are none.

## Findings

### 1. [major] Nav and docked Refill show the uncapped tired count when fewer than 3 are hired, but the tap refills only 1
- `src/ui/app.ts:583` calls `navManageView(promptManage(s, b).length, ...)`.
- `src/ui/workers-ui.ts:105-112` uses that `n` for the mobile badge (`String(n)`), the docked label (`refillTiredLabel(n)`) and the aria-label.
- The Workers-tab bar caps it correctly: `workers-ui.ts:54` uses `n = bulkManageAllowed ? n0 : Math.min(1, n0)`.
- Evidence: with 2 hired, both tired, `manageAllHtml` says "Refill 1 tired worker". The nav button shows badge "2" and aria-label "Refill 2 tired workers". `apply(manageAll)` (`src/sim/actions.ts:54`) refills only the lowest worker.
- Impact: this contradicts PM ruling (b) (commit a53f091), and the two Refill controls disagree on the same screen. A screen-reader user is told 2 workers will be refilled. The docked header label also overstates.
- Fix: put the capped count in one helper (for example `refillCount(s, b)` in workers-ui.ts). Use it in `manageAllHtml` and at `app.ts:583`.
- Test gap: `tests/workers-v11.test.ts:146-161` (the ruling (b) tests) call only `manageAllHtml` and `apply`. Nothing calls `navManageView` for the < 3 case, so the broken nav would pass. Add a test that the nav label, badge and aria equal the Workers-tab label for 2 hired and both tired.

### 2. [minor] Order eggs-fit cache key omits the value text, and it forces a layout read on every update
- `src/ui/order-list.ts:38`: `key = e|button|l1.clientWidth|narrow`.
- The fit predicate at `:40` also measures `V.scrollWidth`, so the fit depends on the `$value` text. A price change (Collection upgrade) with the same have/want and the same button label leaves the key unchanged. The cached `fitE` is then stale, so ` eggs` can stay or stay dropped when the value width has changed.
- `l1.clientWidth` is read on every `fill()`, before the cache check, after style writes at `:31-36`. That is a forced synchronous layout per row per update. The commit message claims "no per-frame rewrites".
- Fix: add `val` to the key. Read the width once per batch, or from the ResizeObserver, instead of per row.
- Test: the unit tests cannot cover this because jsdom has no layout. Only the rc0 browser test could, and I did not run it.

### 3. [minor] `--refill-bar-h` is re-measured only when the HTML string changes
- `src/ui/app.ts:604`: the measurement sits inside `if (html !== lastUp)`.
- A resize, rotation or dock change that wraps "Refill N tired workers" at 360px, with identical HTML, leaves a stale value. The sticky bar's padding and the worker cards' `scroll-margin-top` are then wrong.
- Fix: also re-measure from a ResizeObserver on `.refill-wrap`, or on `docked` change.
- Not verified at 360, 390 or 1280 (no browser).

### 4. [minor] The `goal` aria-label is written twice per content change, and the first write is racy
- `src/ui/app.ts:~407-418`: `renderGoal` sets `aria-label` synchronously from `goalLbl.textContent`, then again in a `requestAnimationFrame` after `paintGoalLabel` / `fitGoalLabelEl`.
- Between the two writes the label can describe the previous, unfitted text. The two code paths also build the string differently (`gl.status` vs `goalSt.textContent`).
- Fix: compute the string once in a helper, and write it only when it changes.

### 5. [nit] `showManageAll(ws, _b)` now ignores its balance parameter, and one guard is dead
- `src/sim/workers.ts` defines `showManageAll = hiredCount >= 1`.
- The `!showManageAll(...)` check at `src/sim/actions.ts:56` is redundant after the `bulkManageAllowed` branch above it. The name no longer says what the function does.
- Fix: rename it (for example `hasAnyHired`) and drop `_b`, or leave it with a pointer comment.

### 6. [nit] The stale review base makes the range misleading
- a01faea..56513e7 mixes about 20 main-side commits (m4-design, seller-variance, vendored sim, staging CSV) with the branch's real changes (47 files vs 2700804).
- Future review requests should use `git diff 2700804..56513e7`.

## Checked and found fine (read-only, no tests run)
- `src/sim/actions.ts:53-61`: with < 3 hired, `manageAll` delegates to `manage` on the lowest-energy tired/asleep worker. That path keeps the cooldown and threshold guards. 0 hired returns the state unchanged.
- `src/ui/orders.ts` `count3`: rolls over correctly (999.5K gives 1M, 999.5B gives 1T). It returns "—" for non-finite input and exact values below 1,000. At the T cap, 1e15 renders as `1000T`, which is acceptable.
- `orderView`: "No eggs" applies only when basket < 1. "✓ Ready · $X" still splits cleanly on ` · ` in `order-list.ts:29` and `orderHtml`.
- `src/ui/fx.ts` `clampToSafe` and the `center()` 0x0 fallback to the scene: correct. Flyers are removed on arrival, on animationend and on the timer.
- `src/ui/rotate-prompt.ts` `trapFocus`: the listeners are released on hide, and focus is restored only if `last.isConnected`.
- `src/ui/upgrade-card.ts`: `navUpgradesTab` and `changedLine` match their documented behaviour.

## What I ran
- `git log` and `git diff --stat` for a01faea..56513e7 and 2700804..56513e7.
- `git diff` for `src/sim`, `format.ts`, `orders.ts`, `order-list.ts`, `fx.ts`, `onboarding.ts`, `rotate-prompt.ts`, `welcome-sale.ts`, `upgrade-card.ts`, `collection-copy.ts` and the first ~330 lines of the `app.ts` diff.
- Read: `src/sim/actions.ts` (38-67), `src/ui/order-list.ts` (24-45), `src/ui/workers-ui.ts` (all), `src/ui/app.ts` (440-669), `tests/workers-v11.test.ts` (all).
- **Not run:** `npx tsc --noEmit` and `npx vitest run ...`. Bash was denied before I got to them. No suite result is claimed either way.
- No browser run (as instructed), so the 360/390/1280 layout claims are unverified.

## Not covered
- The rest of the `app.ts` diff (after line ~330 of the diff) and the whole `next-goal.ts` diff (+229 lines: `GoalHysteresis`, `goalLabelParts`, `paintGoalLabel`, `fitGoalLabelEl`).
- `src/econ/income.ts`, `src/econ/best-buy.ts`, `s2-economy-ui.ts`, `styles.css` (+164 lines) and `welcome-sale.ts` cost (`instantSale` steps the sim `every_s * tickHz` times synchronously when the modal opens; I did not check the magnitude).
- All of `tests/rc1-ui.test.ts`, `tests/next-goal.test.ts`, `tests/income-bestbuy.test.ts`, `tests/orders.test.ts`, `tests/p1-oct16.test.ts` and `scripts/rc0-browser.mjs`.
- "Would a broken implementation still pass?" was assessed only for the Workers Refill tests (finding 1).

Re-run once Bash is available: `npx tsc --noEmit`, plus vitest on `tests/workers-v11.test.ts`, `tests/orders.test.ts`, `tests/next-goal.test.ts`, `tests/rc1-ui.test.ts`, `tests/income-bestbuy.test.ts` and `tests/rc2-cuta-followups.test.ts` with the maxForks=2 flags.
