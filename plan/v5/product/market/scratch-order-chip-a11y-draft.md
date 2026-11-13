# DRAFT for HoP: customer order chip accessible name (queue L42, HoQA M-1 from #62 @09cee47)
PM Market/Customers, 2026-11-09 23:58 CET. Not approved. Don't route to Art or Eng until HoP approves.

## Problem
The arriving-customer chip is `<button class="chip arrive" aria-label="Customer">` (`src/ui/app.ts:411` at 96ac430, worktree `wt-v5-golden-game`; was `:328` at 67ff56a). Its only visible text is `.tag .num` = `fmtCount(c.demand - c.filled)` (`app.ts:412`), e.g. "3", with a decorative egg icon (alt=""). The name "Customer" doesn't contain the visible "3", so WCAG 2.5.3 label-in-name fails.

## Rule
Follow BR-AC52c (decisions.md L982): the accessible name **starts with** the visible text, not strict equality. It reuses the approved order-chip aria wording (order-chip-and-trickle-proposal v0.2 §1: "Customer wants 13 eggs ...").

- Name = `<visible> egg(s) wanted by customer`, where `<visible>` is the exact string rendered in `.tag .num` (the same `fmtCount` output, e.g. "3", "1.24K").
  - The singular "egg" is used only when demand − filled = 1; otherwise "eggs".
  - Examples: "3 eggs wanted by customer", "1 egg wanted by customer", "1.24K eggs wanted by customer".
- The name is updated in the same render as `.num`, so it never lags the visible digit.
- QA's suggestion "Customer, wants 3" is rejected because it doesn't start with the visible text.
- Not a live region. A count change isn't announced (the queue strip QV-6 already announces politely).

## Acceptance criteria
- **OC-A11Y-1:** For every rendered `.chip.arrive`, the accessible name, trimmed, starts with the chip's `.tag .num` textContent. Check in Chromium via the accessibility tree at 360×640 and 1280×720, over at least 3 chips with different counts, including one ≥1,000 if reachable via the debug seed.
- **OC-A11Y-2:** The name is exactly `<num> egg wanted by customer` when demand − filled = 1, and `<num> eggs wanted by customer` otherwise. There is no `aria-label="Customer"` left in the chip markup.
- **OC-A11Y-3:** After a partial sale changes the count (e.g. 4 → 3), the name reflects the new value on the next frame, with no stale name. The chip still has no role or live-region change, and axe reports no `label-content-name-mismatch` on the chip.

## Strings
English only; Art owns final copy, and wording changes keep the "starts with visible text" rule.
