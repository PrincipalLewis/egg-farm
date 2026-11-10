# Code review (recheck): fix-rc2-minors-sell-states @ c1b4ef5

Reviewer: Code Reviewer · Range: `5d8a058..c1b4ef5` (branch `fix-rc2-minors-sell-states`, base `rc1/ux-clarity-v3`) · Worktree `/workspace/review-c1b4ef5` (not modified)
Topic: recheck of `engineering/reviews/fix-rc2-minors-sell-states-ebbd02e.md` (Major #1, Minors #2–#7, Nits #8–#9).
Files: `src/ui/app.ts`, `src/ui/order-list.ts`, `src/ui/orders.ts`, `src/ui/styles.css`, `tests/rc2-minors-sell-states.test.ts`, `scripts/rc0-browser.mjs`.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 0 |
| Minor | 2 |
| Nit | 3 |

Verdict: the Major is fixed and the fix is sound. All seven ebbd02e findings are addressed in code, and the nits are fixed too. I found no new Major or worse. Two Minors remain. The first is a small visual regression introduced by the Sold hold when the Market sheet is closed. The second is that the OrderList wiring and the new geometry are still guarded only by source-text regexes and browser-only rc0 checks. I could not run `vitest` or `tsc` this session (see "What I ran").

## Status of the ebbd02e findings

| # | Was | Status | Where |
|---|---|---|---|
| 1 | Major: `startAbove` could start a coin at the page origin | **Fixed** | `app.ts:133-134`, `app.ts:370` |
| 2 | Minor: tests would pass a broken implementation | **Partly fixed** (see finding 2 below) | `orders.ts:77-88`, `tests/…:33-52` |
| 3 | Minor: start point and riser top not clamped | **Fixed** | `app.ts:134`, `app.ts:384` |
| 4 | Minor: Sold hold stretched to ~300 ms by the pointer freeze | **Fixed** | `orders.ts` `planRemovals` |
| 5 | Minor: N separate FLIP removals for N sold rows | **Fixed** | `order-list.ts:77-82` |
| 6 | Minor: chip and pop showed different amounts | **Fixed** | `app.ts:371` |
| 7 | Minor: riser could cover the button near the top | **Fixed** | `app.ts:384` |
| 8 | Nit: `lastSale` leak | **Fixed** | `app.ts:375-377` |
| 9 | Nit: doubled `.sold.sold` selector | **Fixed** | `styles.css:374-375` |

### Why each fix holds (static reading)

- **#1.**
  - `onRow` now requires `e.by === 'player'`, `src.isConnected` and a `.order` ancestor.
  - Inside `fly`, `srcLive = isConnected && width > 0` gates the `startAbove` path.
  - Detached or hidden sources go through `center()`, which falls back to the scene rect and clamps.
  - The start point is also clamped with `clampToSafe`.
  - The new rc0 check makes a player row sale and then a Market Hand sale. It asserts that no flyer starts at x<4 and y<4.
  - Against the ebbd02e code the start would have been (0, −12) and that check would have failed, so it would catch a regression.
- **#3.**
  - The coin start point is clamped.
  - The riser is skipped unless `rect.top − 44 − 48 >= safeInsets().t + 2`.
  - The riser is 40 px tall and rises 48 px (`styles.css:151`), so the full path stays on screen and the riser never overlaps the button, because its bottom edge sits 4 px above the button.
  - A detached `lastBuyBtn` gives top = −44, so the riser is skipped.
- **#4 and #5.**
  - `planRemovals` lets a held row leave once its hold ends, even under the pointer freeze.
  - All animated leavers go in one batch: one timer and one `flipRemove`.
  - `lastLeave` is only written when something leaves, and not under reduced motion.
- **#6.** The pop and the chip both use `e.value`.
- **#8.** `lastSale` is deleted on `customer_served`, `customer_partial` and `customer_lost` (when an id exists).
- **Sold chip contrast.** `#3D7F33` on white is about 4.9:1, which passes AA at 12 px.

## Findings

### 1. [Minor] A Sold hold on a stale hidden row makes the row play a late "Sold!" fade when the Market opens
`src/ui/app.ts:375` (`orderList.sold(...)`), `src/ui/app.ts:597-599` (`update` only runs when `open === 'market' || docked.matches`), `src/ui/order-list.ts:113-121`, `:73-74`.

Evidence:
- On a phone with the Market sheet closed, `orderList.update` is not called, so `pending` and the row nodes are frozen at their last-open state.
- A Market Hand sale that completes an order emits `customer_served`, and `orderList.sold(id, …)` finds the stale node. It marks it `sold`, sets `soldUntil`, and kicks `apply(pending)` after the hold.
- `pending` still lists that customer, so the id is never in `gone`. The hidden row stays in the "Sold! +$X" state indefinitely.
- When the player opens the Market, `update` arrives with the current state. The id is now `gone`, its hold is long expired, and `sold(id)` is true, so the row goes into the animated `leaving` batch.
- The player sees a stale "Sold! +$X" row fade for 240 ms (120 ms under reduced motion). `leavingN` also holds back the "Next customer soon…" empty state during that time. Before this change the row was dropped unseen on the first update.

Impact: cosmetic and brief, but it shows a sale from minutes ago as if it just happened. It is reachable in normal play, because the Market Hand sells while the sheet is closed.

Fix: only freeze the row when it is actually being rendered, for example in the handler:
`case 'customer_served': … if (open === 'market' || docked.matches) orderList.sold(...)`.
Otherwise the row takes the normal drop path on the next update. I did not run this path (static reading), so please confirm with a quick rc0 case: close the Market, let a Market Hand sale complete an order, open the Market, and assert that no `.order.sold` row is present or that it is already gone.

### 2. [Minor] The OrderList wiring and the new geometry still have no behavioural test
`tests/rc2-minors-sell-states.test.ts:19-30` (regexes), `src/ui/order-list.ts:96`, `:113-121`, `src/ui/app.ts:133-134`, `:384`.

What is good:
- `planRemovals` is now pure and has real behaviour tests.
- They cover the hold boundary (`t == soldUntil` frees the row, so a `>=` mutation fails).
- They cover the freeze exception, batching, the anti-churn rule and the in-queue case.
- These would catch most breakage in the removal plan.

What is still unguarded:
- `OrderList.sold()` (text, `disabled`, full bar, `soldUntil`).
- `leavingN` accounting.
- The `empty.hidden` expression.
- `fill()` skipping `.sold` rows.
- The `startAbove` start point and the `srcLive` fallback.
- The riser skip guard.
- The pop and chip sharing `e.value`.

All of these are covered only by `readFileSync` regexes, which pass whenever the text is present, even if the logic is wrong. Two examples: `sold()` could set `soldUntil` to the wrong time, or `leavingN` could never be decremented, and every test would still pass. The regexes also break on harmless reformatting. The browser-side rc0 checks do cover the sequencing. I did not run them, and they are not part of `vitest`.

Smaller gaps in `planRemovals` coverage:
- A plain removal with `rm: true` is not asserted to `drop`, so `anim1` ignoring `rm` would pass.
- The in-queue case asserts `animate == []` but not that the id is dropped.

Note on the earlier suggestion: `package.json` has no `jsdom`/`happy-dom`, so the DOM-level `OrderList` tests I suggested before are not free. Extracting pure helpers is the cheaper route.

Fix:
- Extract `emptyHidden(customers, nodes, leavingN)`, `startAbovePoint(rect, size)` and `riserTop(btnTop, insetT)` (returning `null` when there is no room). Unit-test them, including a zero rect, the top clamp and the exact guard boundary.
- Add the two `planRemovals` assertions above.
- Optionally add `happy-dom` as a dev dependency and test `OrderList.sold`/`apply` with the injected `now`/`schedule`.

### 3. [Nit] Sold removal ignores the pointer freeze, and the file header still promises otherwise
`src/ui/order-list.ts:1-3` (header), `:77-82` (leave timer).

Evidence:
- The header says the list has "no adds/removes/moves while a pointer is down and for 300 ms after release".
- The leave timer now runs `flipRemove` without checking `this.pointer`.
- In the normal single tap, the removal lands about 485 ms after the click (245 ms hold plus 240 ms fade). That is after the 300 ms freeze, so a single tap is unaffected.
- A second pointer-down in that window, or a long press on the row below, can see the row glide up under the finger when the Sold row is removed. A glide of at most 200 ms with FLIP compensation is mostly harmless. On release the click target is the common ancestor and `mRows` ignores it, so there is no wrong sale.

Impact: low. The behaviour is a deliberate trade-off (it is what fixed #4), but the contract text is now wrong.

Fix: update the header comment to say that Sold rows leave on their own schedule. If you want to keep the contract, delay only the DOM removal while `this.pointer` is true.

### 4. [Nit] "Sold! +$X" shows the completing sale, not the order total
`src/ui/app.ts:361` (`lastSale.set`), `:375`.

This was raised in ebbd02e #6 (second bullet) and the commit does not answer it. For an order filled in two sales, the chip shows only the last sale's amount and the pop matches. The notes say "Sold! +$X ... alongside the existing sale number-pop", so this reads as acceptable. Please record the decision (a line in the notes or a code comment), or confirm with Art & UX.

### 5. [Nit] The riser is skipped silently, so there is no test of the skip path
`src/ui/app.ts:384`, `scripts/rc0-browser.mjs` (`b4riser`).

`b4riser` runs at 360×740 and 1280×800 at the default scroll position and requires `f.length > 3`, so it proves the riser still appears there. Nothing covers the case where the guard skips it (Upgrades scrolled so the button is near the top, or a short viewport such as 1024×474 or 390×640). Also, the guard depends on the viewport top, not on the panel or sheet clip, so a riser near a sticky header could rise over it. This is cosmetic. It is fixed together with finding 2 if `riserTop` is extracted and tested, plus one rc0 case with the panel scrolled.

## Checked and found fine

- **Scope.** Every change in the diff maps to the ebbd02e findings or the four topic items, plus their rc0 sections. Nothing unrelated was touched. M-Order-zero, M-Tut-* and M-Toast-layer are not in the diff.
- **`sellAllLabel`.** The new `basket`/`customers` parameters default to 0, so existing callers are unaffected. `basket` at the call site is `Math.floor(s.basket)`, so a 0.6 basket stays "No eggs to sell". The behaviour tests cover both cases and the boundaries (basket 1, 0.6, 0).
- **Event order.** `sell` is emitted before `customer_served` (`sim/actions.ts:17-18`), so `lastSale` is set before `orderList.sold` reads it. `customer_lost` with no `id` is guarded with `if (e.id)`.
- **`planRemovals` semantics.** A sold row that is still in the queue (scrolled out of a visible slot) is treated as a plain removal, never as sold. The `soldUntil` entry is deleted in `take()`, so there is no leak. The retry timer at `order-list.ts:84` is bounded: it only fires while a held row exists.
- **Empty state.** `empty.hidden` waits on `nodes.size` and `leavingN`. The leave timer decrements `leavingN` and calls `kick()`, so there is no stuck-hidden path. One side effect: a plain removal deferred by the pointer freeze now also keeps the empty state hidden until the freeze ends. That is the better behaviour.
- **CSS.** `.order.leaving.rmfade` (0,3,0) beats `.order.leaving` (0,2,0). `.reduced-motion .order.leaving` replaces the old `animation:none`, which is intended because sold rows now fade in 120 ms. The Sold chip rule `.order .btn.sell.sold[aria-disabled]` uses the attribute for specificity instead of repeating a class. At 360 and 390 the button is 80 px and 88 px wide with `white-space:normal` at 12 px. "Sold! +$12.40" wraps to at most two lines, which is about 26 px high in a 44 px button, and `fmtMoneyShort` keeps long totals short. At 1280 (docked) the button is 88 px and the same maths holds. These are from CSS reading and the rc0 `fit` assertion, not measurement.
- **rc0 timing bounds.** The non-reduced-motion bound (`lastRow <= 580`) has about 95 ms of margin over the expected ~485 ms. The reduced-motion bound (`<= 440`) has about 75 ms over ~365 ms. These are tight on slow CI but not wrong.

## What I ran

- `git diff 5d8a058..c1b4ef5` (all six files, in full), `git diff --stat`, and the previous report. I read `order-list.ts` in full and the relevant parts of `app.ts` (fly, center, floatText, spawn, sell/served/lost/upgrade handlers, row/buy click handlers, the market render block), `sim/actions.ts`, `fx.ts`, `package.json` and `art-ux/rc2-notes-b2-b3.md`.
- **Not run: `npx vitest run … tests/rc2-minors-sell-states.test.ts tests/art-ux-rc0.test.ts` and `npx tsc --noEmit`.** The Bash permission was denied when I tried (after my read-only git commands had worked), and I did not work around it. So I do not know whether the two test files pass or whether the project type-checks. The type-level risk is low, because `fmtMoneyShort` and `clampToSafe` are already imported in `app.ts` and the new `fly` parameter is optional. The owner or CI should confirm both.
- Not run, per the constraints: browsers and the rc0 sections `rc2minors` and `b4riser`. All layout statements at 360/390/1280 come from static reading of the CSS and the rc0 assertions.
