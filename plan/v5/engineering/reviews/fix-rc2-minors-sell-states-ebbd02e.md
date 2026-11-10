# Code review: fix-rc2-minors-sell-states @ ebbd02e

Reviewer: Code Reviewer · Range: `5d8a058..ebbd02e` (5 commits, branch `fix-rc2-minors-sell-states`, base `rc1/ux-clarity-v3`) · Worktree `/workspace/review-ebbd02e` (not modified)
Topic: rc2 Minors (`art-ux/rc2-notes-b2-b3.md` §"rc2 Minors"): M-SellAll-empty, M-Sold-freeze, sale coin burst starts above the chip, QA B4 purchase riser.
Files: `src/ui/app.ts`, `src/ui/order-list.ts`, `src/ui/orders.ts`, `src/ui/styles.css`, `tests/rc2-minors-sell-states.test.ts`, `scripts/rc0-browser.mjs`.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 1 |
| Minor | 6 |
| Nit | 2 |

Verdict: the label change, the Sold freeze and its CSS are correct and in scope, and they match the signed-off notes. One regression needs fixing before merge. A coin burst can start at the page origin (0, -12) when the remembered sell source is a detached or hidden row button. That is the bug fixed in bd0dc66, now reachable again through the new `startAbove` path. The unit tests are mostly source-text regexes and would not catch it, or a broken `OrderList.sold`.

## Findings

### 1. [Major] `startAbove` bypasses the zero-rect fallback, so coin bursts can start at the page origin
`src/ui/app.ts:131-133` (`fly`), `src/ui/app.ts:212-218` (`lastSellSource`), `src/ui/app.ts:367-370`.

Evidence:
- `lastSellSource` is set on a row click (`:216`) and never cleared. The `sell` handler uses `lastSellSource ?? sellAllBtn` for every `sell` event, whatever `e.by` is.
- `sellTo(..., 'market_hand')` (`src/sim/tick.ts:86`) emits `sell` events with `by: 'market_hand'`. Nothing in the handler looks at `by`.
- After the player taps Sell on a row, that row leaves and its `<button>` is detached. A later auto-sale by the Market Hand still sees `src.closest('.order')` as truthy, because the detached button's parent row is intact. `onRow` is therefore true.
- `startAbove` computes `from.getBoundingClientRect()` directly. A detached element, or one in a closed sheet with `display:none`, returns an all-zero rect, so the start is `{x: 0, y: -12}`.
- The old path went through `center()`, which falls back to the scene rect and calls `clampToSafe`. The comment at `app.ts:126-128` says this exists for QA bd0dc66 ("coin flyers from the closed Market's Sell all started at 0,0").
- The new path skips both the fallback and the clamp.

Impact: after one manual row sale, every Market Hand sale (including with the sheet closed) can send up to 6 coins from the top-left corner. Market Hand is the first worker, so this is common play, not an edge case. The rc0 checks only exercise a player click on a live row, so they would not catch it.

Fix:
- Compute the start from `src` only when `src.isConnected` and the rect has size. Otherwise use `center(src)`.
- Run the `startAbove` point through `clampToSafe(..., safeInsets())` as well.
- Also reset `lastSellSource = null` when `e.by === 'market_hand'`, or ignore it for that case. Something like:
  ```ts
  const live = (el: Element) => el.isConnected && el.getBoundingClientRect().width > 0;
  const onRow = e.by === 'player' && live(src) && !!src.closest('.order');
  ```
- Add an rc0 case: sell via a row, then let a Market Hand sale happen and assert that no `.flyer` starts at x < 4.

### 2. [Minor] Unit tests would pass for a broken implementation
`tests/rc2-minors-sell-states.test.ts:15-30`.

Evidence:
- The M-SellAll-empty `sellAllLabel` tests are real behaviour tests and they are good.
- Every M-Sold-freeze assertion except the constants and `soldLabel` is a `readFileSync` regex over `app.ts`, `order-list.ts` or `styles.css`.
- Examples: `toMatch(/!shownSet\.has\(id\) && !held\(id\)/)` and `toMatch(/this\.empty\.hidden = .../)`.
- These pass if the code is present but wrong. For example, `sold()` could set the wrong `soldUntil`, `kick` could never fire, or `leavingN` could be mis-decremented, and all of it still passes. They also break on harmless reformatting.
- There is no test of `OrderList.sold` or `apply` behaviour. `OrderList` already takes injectable `now` and `schedule`, so it is testable.
- There is no test of the `fly` `startAbove` geometry or of the riser position. The riser and burst only have an rc0 browser check, which I did not run per the review constraints.

Impact: finding 1 and the timing in finding 4 would not be caught. The most intricate logic (hold, deferred removal, `leavingN`, empty-state ordering) is guarded only by source text.

Fix: add behavioural tests of `OrderList` (jsdom or a minimal DOM stub, with fake `now` and `schedule`) covering:
- `sold()` on a live row gives text `Sold! +$X`, `disabled`, and a full bar.
- `apply()` before `SOLD_HOLD_MS` keeps the node; after it, the node gets `leaving` (plus `rmfade` when `rm`) and is removed after 240/120 ms.
- The empty state is hidden until the leaving row is gone.
- `fill()` does not overwrite a `sold` row.

Extract the `startAbove` start-point maths into a pure function in `orders.ts` or `fx.ts` and unit-test it (zero rect, top clamp).

### 3. [Minor] `startAbove` start point and riser top are not clamped to the viewport or safe area
`src/ui/app.ts:132` (start `y = r.top - size/2 - 2`), `:382` (`top = Math.max(4, …)`).

Evidence:
- For the first row in a scrolled sheet, or when the list is under the top bar at 360×740, `r.top - 12` can be negative or under the notch. The coins then start off-screen or in the inset.
- `center()` clamped to the safe insets; `startAbove` does not.
- The riser clamp of `4` is a fixed value, not `safeInsets().t`.

Impact: cosmetic. Coins appear mid-flight or clipped at the top edge. It overlaps with finding 1.

Fix: route both through `clampToSafe` / `safeInsets().t`.

### 4. [Minor] The Sold hold is about 300 to 350 ms for pointer clicks, not 240 ms, and the rc0 upper bound is tight
`src/ui/order-list.ts:26` and `:72`, `:122`; `scripts/rc0-browser.mjs` (`lastRow <= 240 + 240 + 100`).

Evidence:
- A pointer click sets `frozenUntil = now + 300` on `pointerup` (`:23`). The `!frozen` gate on removals then defers the sold row's removal until after 300 ms, plus the next `apply` (the retry is `setTimeout(kick, 320)`).
- So the row freezes about 300–350 ms before `leaving` starts, and is gone about 540–590 ms after the click.
- The rc0 check `lastRow <= 580` for the non-rm case (and `<= 440` for rm) sits right at that edge. It is flaky-prone, and the "freeze ~240ms" check `sold[last].t >= 230` hides the overshoot.
- Keyboard-activated sells (no pointer) leave at about 245 ms.

Impact: the spec says "about 240 ms". 300+ ms is acceptable but inconsistent between input methods. The rc0 test is at risk of timing flakes on slow CI.

Fix: either let held sold rows leave regardless of `frozen` (sold rows are never moved by a pointer), or document the overshoot and widen the rc0 bound to about 700 ms. The first is more correct, since the pointer-freeze exists to prevent layout shifts under the finger.

### 5. [Minor] Sold rows bypass the leave anti-churn rule, and each is removed in its own `flipRemove`
`src/ui/order-list.ts:80-84`.

Evidence:
- The header contract (§5) is one leave animation at a time (`gone.length === 1`, `t - lastLeave >= 240`). `wasSold || animate` ignores both, and sets `lastLeave = t` for each.
- Sell all serving N orders gives N rows. Each is scaled and faded together, then removed by N separate `setTimeout → flipRemove([el])` calls in the same ms.
- Each call measures `rest` rects and applies FLIP `translateY` plus a rAF-scheduled transition. The second and later calls measure mid-transition rects and overwrite the earlier transforms.
- Previously all removals were batched in one `flipRemove(drop)`.

Impact: possible visible jitter in the rows below when several orders are sold at once. I could not verify this in a browser.

Fix: collect the leaving elements and remove them in one timer and one `flipRemove(els, rm)` call per `apply` batch.

### 6. [Minor] The Sold chip amount (`e.value`) can differ from the sale pop (`e.k * e.price`) when a Grader tier is active
`src/ui/app.ts:366` (`lastSale.set(e.id, e.value)`) vs `:371` (`floatText(`+${fmtMoney(e.k * e.price)}`…)`).

Evidence:
- `sellTo` makes `value = Math.round(k*base*gm)` and the pop uses `k * price` without the grader multiplier. The notes say the chip should appear "alongside the existing sale number-pop". With a Grader the two numbers on screen differ.
- The pop is pre-existing, but this change makes the mismatch visible in one frame.
- For a partly filled then completed order, the chip shows the completing sale (not the order total). That matches the pop, but confirm it is what the designer wants.

Fix: use the same figure for both. Prefer `e.value` for the pop too, and confirm the "last sale vs order total" wording with Art & UX.

### 7. [Minor] Riser clamp `Math.max(4, btnTop - 44)` can put the riser over the button, and there is no test
`src/ui/app.ts:382`.

Evidence:
- If the buy button is within 48 px of the viewport top (docked panel scrolled to put the button under the tablist, or a short sheet), the clamp keeps `top = 4`. The 40 px riser then overlaps the button and its new price. That is the QA B4 bug again.
- The rc0 `b4riser` check only buys the first `#uRow .btn.buy` at the default scroll position, so it does not cover this.
- The riser also now covers the element above the button (chips or ETA line) for its 480 ms rise. That is the intended trade-off.

Fix: if `btnTop - 44 < 4`, skip the riser or place it beside or below the button. Add an rc0 case with the Upgrades panel scrolled so the button is near the top.

### 8. [Nit] `lastSale` map entries leak for orders that leave unserved
`src/ui/app.ts:361` (`lastSale.set`), `:374` (`delete` only on `customer_served`).

An order that is partially sold and then times out (`customer_partial` / `customer_lost`) never gets its entry deleted. It is tiny and bounded by the session, but a delete in those two cases is a one-liner.

### 9. [Nit] Doubled `.sold.sold` selector
`src/ui/styles.css:375`.

`.order .btn.sell.sold.sold` raises the specificity to (0,5,0) to beat `.order .btn.sell{…nowrap…}` at `:582`, which is only (0,3,0). Plain `.order .btn.sell.sold` (0,4,0) already wins. Drop the repeat, or comment why it is needed.

## Checked and found fine
- **M-SellAll-empty.** `basket` at the call site is `Math.floor(s.basket)`, so a 0.6-egg basket stays "No eggs to sell". `customers` uses the full `s.customers.length`, including hidden slots. Disabled state is unchanged (`eggs === 0`). There is no separate `aria-label`, so the name matches the text. At 360 the 21-character label fits the `#sellAll` button (min-width 280, ellipsis).
- **Sold chip contrast.** `#3D7F33` on white is about 4.9:1, so it passes AA. At ≤375 px the button is 80 px wide, at 390 and 1280 it is 88 px, height 44 px. At 12 px with `white-space:normal`, "Sold! +$12.40" fits on one or two lines (2 × 13.2 px < 44 px). `fmtMoneyShort` keeps long totals compact. I could not measure this in a browser; it relies on the commit's own rc0 `fit` assertion.
- **Event order.** `sell` is emitted before `customer_served` (`sim/actions.ts:17-18`), so `lastSale` is set before `orderList.sold`. Market-closed sales still freeze correctly, because `sold()` and the `+5 ms` kick do not depend on the panel render.
- **`fill()` early return on `.sold`.** Held rows are not in `s.customers`, so `fill` is not called for them anyway; the guard is only defensive.
- **Reduced motion.** A 120 ms fade (`rmfade` plus `.reduced-motion .order.leaving`) with no transform. Non-sold rows in rm mode are still dropped instantly, as before.
- **Empty state.** `empty.hidden` now also waits on `nodes.size` and `leavingN`. The `leavingN` timer calls `kick()`, so it re-evaluates after the last row is removed. No stuck-hidden path found.
- **Scope.** Everything in the diff maps to the four topic items plus their rc0 sections. No unrelated changes. M-Order-zero, M-Tut-* and M-Toast-layer are correctly not touched.
- **Existing tests.** `tests/art-ux-rc0.test.ts` is unaffected and passes.

## What I ran
- `git diff 5d8a058..ebbd02e` and `git log`, read in full, plus `order-list.ts`, `app.ts` (fly, floatText, sparkle, sell/upgrade handlers, market render), `sim/actions.ts`, `sim/events.ts`, `styles.css`, and `art-ux/rc2-notes-b2-b3.md`.
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-minors-sell-states.test.ts tests/art-ux-rc0.test.ts` → 2 files, 12 tests, all pass.
- `npx tsc --noEmit` → **not run**. The tool permission was denied twice in this session, so I did not work around it. Type-checking is unverified from my side; the owner or CI should confirm it.
- Not run (per constraints): browsers and rc0 sections `rc2minors` / `b4riser`. All layout statements at 360/390/1280 are from static reading of the CSS and the rc0 assertions, not from measurement.
