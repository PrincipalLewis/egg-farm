# Code review (recheck): fix-rc2-minors-sell-states @ 9677d26

Reviewer: Code Reviewer · Range: `5d8a058..9677d26` (branch `fix-rc2-minors-sell-states`, base `rc1/ux-clarity-v3`) · Worktree `/workspace/review-9677d26` (not modified)
Topic: recheck of `engineering/reviews/fix-rc2-minors-sell-states-c1b4ef5.md` (#1 hidden-sheet Sold hold, #2 extracted helpers + tests, #3-#5 nits) plus the rc0 hidden-sheet case.
Files changed since c1b4ef5: `src/ui/app.ts`, `src/ui/order-list.ts`, `src/ui/orders.ts`, `tests/rc2-minors-sell-states.test.ts`, `scripts/rc0-browser.mjs`. `styles.css` is unchanged since c1b4ef5.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 0 |
| Minor | 0 |
| Nit | 2 |

Verdict: approve. All five c1b4ef5 findings are resolved. I found no new Minor or worse. Two nits remain. `vitest` passes (21 tests). I could not run `tsc` (see "What I ran"). The rc0 hidden-sheet case is browser-only and was not run, so I checked it by reading.

## Status of the c1b4ef5 findings

| # | Was | Status | Where |
|---|---|---|---|
| 1 | Minor: Sold hold on a hidden row played a late "Sold!" fade on open | **Fixed** | `app.ts:375` |
| 2 | Minor: wiring and geometry guarded only by regexes | **Mostly fixed** (see nit 1) | `orders.ts:90-96`, `tests/…:55-76` |
| 3 | Nit: header still promised the freeze for removals | **Fixed** | `order-list.ts:1-3` |
| 4 | Nit: chip shows the completing sale, not the order total | **Fixed** (decision recorded in a code comment) | `app.ts:375` |
| 5 | Nit: no test of the riser skip path | **Fixed at unit level** (boundary tests on `riserTop`) | `tests/…:67-73` |

### Why each fix holds

- **#1.**
  - `orderList.sold(...)` now runs only when `open === 'market' || docked.matches` (`app.ts:375`). That is the same condition that gates `orderList.update` (`app.ts:594`).
  - A hidden row is therefore never marked sold and takes the normal removal path on the next update. `lastSale.delete(e.id)` runs on both paths, so there is no leak.
  - `open` is declared at `app.ts:167`, before the handler is registered, and `openPanel` sets it synchronously together with `#p-market.hidden`. The gate cannot disagree with what is on screen.
  - Closing the sheet during a live hold is safe. `sold()` already scheduled `kick()`, `apply(pending)` runs with the latest `pending` (the customer is gone), and the row leaves on schedule inside the hidden sheet.
- **rc0 hidden-sheet case** (`rc0-browser.mjs`, `rc2minors`). I traced it against the old and new code.
  - Setup: customer 779 is rendered while the Market is open (300 ms wait), then the sheet is closed. The test asserts `closed` via `#p-market.hidden`. The Market Hand then serves the order, and the test asserts `served`.
  - Without the gate, the hidden node would be marked `.sold` and stay that way, because `update` does not run while the sheet is closed. The sampling loop starts before the open click, so the very first sample finds `.order.sold` and the check fails. So a regression of #1 is caught.
  - With the gate, the only thing that can appear on open is the plain "No eggs" leave fade. That is the old drop path, and the matcher ignores it. It matches only a `.sold` class on the button or row, or text starting with `Sold!`.
  - `st.length > 3` guards against an empty sampling window. `waitForFunction(...).catch(() => {})` swallows the timeout, but `served` is asserted separately, so a timeout still fails the check.
  - Scope: `w < 960 && !rmo`. At 960 and above the Market is docked and cannot be hidden. The reduced-motion variant goes through the same gate, so skipping it loses nothing.
- **#2.**
  - `startAbovePoint`, `riserTop` and `emptyHidden` are now pure and exported from `orders.ts`, and `app.ts` and `order-list.ts` call them.
  - `riserTop` boundaries are exact: `(94,0)→50` passes and `(93,0)→null` fails. `(134,40)→90` passes and `(130,40)→null` fails. Each is one pixel from the edge, so a `>=` vs `>` mutation or a dropped `insetT` is caught.
  - `startAbovePoint` has centred and zero-rect cases, with the correct arithmetic (`200 − 10 − 2 = 188`). `emptyHidden` has all three "keep hidden" inputs.
  - The two `planRemovals` assertions I asked for are in: a plain removal under `rm` drops, and an in-queue sold id is dropped. I checked both by hand against `planRemovals` and they hold.
  - `fly` no longer builds the start point inline. The zero-rect result `(0, −12)` is exactly the page-origin case from ebbd02e #1, and it is covered by the `srcLive` guard plus `clampToSafe`.
- **#3, #4.** The header and the `app.ts` comment both state the decision. Documentation only, no behaviour change.

## Findings

### 1. [Nit] The remaining wiring is still checked only by regexes, and the rc0 case is outside vitest
`tests/rc2-minors-sell-states.test.ts:19-30`, `src/ui/order-list.ts:113-121` (`sold()`), `:77-82` (`leavingN`), `src/ui/app.ts:133-134` (`srcLive`).

Evidence: `OrderList.sold()` (text, `disabled`, full bar, `soldUntil = now + SOLD_HOLD_MS`), the `leavingN` increment and decrement, and the `srcLive` fallback have no behavioural test. They are covered by `readFileSync` regexes, which pass whenever the text is present. The new `customer_served` gate has the same coverage. A broken `leavingN` decrement would hide the empty state forever and every unit test would still pass. `package.json` has no DOM environment, so this was a known gap and the remaining part is narrow.

Impact: low. The logic that matters (removal plan, empty-state rule, geometry) is now pure and tested. The wiring is covered by the rc0 sections (`rc2minors`, `b4riser` and the new hidden-sheet case), which are not part of `vitest`, so a CI run without the browser job would not catch a regression in it.

Fix (optional): add `happy-dom` as a dev dependency and test `OrderList.sold`/`apply` with the injected `now`/`schedule`. Or confirm that the rc0 browser job gates merges.

### 2. [Nit] Test tidiness and a slightly misleading comment
- `tests/rc2-minors-sell-states.test.ts:42` and `:55` add `import { planRemovals, … }` in the middle of the file, below an existing `describe`. The second describe's `base` repeats the first one's with `soldUntil` moved in. Move the import to the top and share `base`.
- The comment at `app.ts:375` says a hidden row "drops unseen on the next update". That is only true when more than one row leaves, the anti-churn window is open, or `rm` is set. A single stale row still plays the plain 240 ms leave fade, as the rc0 comment correctly notes. The fade is the pre-existing behaviour and is not labelled Sold, so there is nothing to fix in code. Reword the comment ("takes the normal removal path").

## Checked and found fine

- **Regressions.** The docked case (≥960 landscape) always passes the gate, so desktop behaviour is unchanged. A row sale with the sheet open takes the same path as in c1b4ef5. The `sell` handler and `lastSale` bookkeeping are unchanged.
- **`tests/art-ux-rc0.test.ts`** still passes. It is the only other test file touching these modules.
- **Layout at 360/390/1280.** `styles.css` is not in the c1b4ef5..9677d26 diff, so the c1b4ef5 analysis stands: the Sold chip is 12 px, white on `#3D7F33` (about 4.9:1), wrapping in the 80/88/88 px button. The hidden-sheet change adds no DOM or CSS. I did not measure it in a browser (not allowed).
- **Scope.** The five changed files map to the c1b4ef5 findings and the rc0 case. The four `rc0:` commits only change the new test case's mechanics (DOM click for the Firefox stable-wait, close via the close button, and the matcher). Nothing unrelated was touched.

## What I ran

- `git diff 5d8a058..9677d26` (all six files, in full), `git diff --stat c1b4ef5..9677d26`, the previous report, and the relevant parts of `app.ts` (`openPanel`, the event handlers, the Market render block) and `order-list.ts`.
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-minors-sell-states.test.ts tests/art-ux-rc0.test.ts`: **2 files, 21 tests, all passed.**
- **Not run: `npx tsc --noEmit`.** The Bash permission was denied for that command, and I did not work around it. The type-level risk is low: `startAbovePoint`, `riserTop`, `emptyHidden`, `planRemovals`, `soldLabel`, `SOLD_HOLD_MS` and `fmtMoneyShort` are all imported where used, and `open` is in scope at the handler. The owner or CI should still confirm the type-check.
- Not run, per the constraints: browsers and the rc0 sections. The rc0 hidden-sheet verdict above comes from tracing the code, not from a run.
