# Critic rc1-pt1 review: Market/customer triage
PM, Market/Customers · 2026-10-16 · source `product/critic/review-rc1-pt1-2026-10-16.md`

**Build:** the reviewer was on **2490c79** (release asset `egg-farm-rc1-pt1-2490c79.html`; the "build 2490c79" tag shows in the HUD in shots 07/09). That's HEAD of `game-rc1-ui` (branch `m3/rc1-ui`), so all file:line refs below are from that tree. In-game hash per MK-26 is working.
**Not in this build yet (expected):** served dwell "Thanks! +$X" (MK-16–22; no dwell/Thanks code in src) and the per-egg copy / "Sell N · +$X" (MK-23–25; `orders.ts:16` still renders "Sell k" / "Sell" / "Need N"). Both are due in the Wed Oct 21 batch, so not re-filed.

| # | Item | Root cause (file:line) | Class | Size | Target |
|---|---|---|---|---|---|
| T1 | "Sell 22" active with 0 eggs | Label logic itself is right: `orders.ts:11–16` sets k = min(floor(basket), remaining); 0 → "Need N", disabled (`order-list.ts:34–36`). Shot 07 at basket 0 shows all "Need N". The stale button comes from the **pointer-freeze**: `order-list.ts:60` skips removals while `frozen` (pointer down + 300 ms, re-kicked every 320 ms, `:21–24, :93`), and `:71–73` only refreshes cards whose customer is still in the queue. A card whose customer was served (often by Market Hand, `sim/tick.ts:85`, which also empties the basket) keeps its last "Sell 22", enabled, until the freeze ends. Repeated clicking (the critic's scripted loops) keeps it frozen. Tapping it is harmless: `sim/actions.ts:12` returns unchanged for an unknown id (no coins, no eggs). | **Bug against spec** (MK-11 / new MK-34–37) | S, ≤ 0.5 d: in `apply()`, for nodes whose id isn't in `ids`, set the button disabled + "No eggs"/hidden immediately even while frozen (only the DOM removal stays deferred); add the MK-37 test | **rc1** |
| T2 | 0-egg copy "Need 63" | `orders.ts:16`: the `wait` state only happens at basket 0 (remaining is always ≥ 1), so "Need N" really means "no eggs"; it reads as an order hint, not a blocked button. | Spec gap (rule now MK-35) | S, copy only | **rc1** (with the MK-24 copy change) |
| T3 | "+$101.40" popup stuck for minutes (shots 07, 09) | Not reproduced from code. The only "+$X.XX" popup is the sale floater `app.ts:319`: CSS fades it to opacity 0 in 700 ms (`styles.css:143,145`) and it's removed by `animationend` or a 750 ms timer (`app.ts:111–117, 138`), with a 30-element cap. A visible, frozen popup needs both CSS animation and timers paused, which fits a backgrounded/automated window (the critic notes scripted loops), not normal play. Neither shot shows it at a readable size. | Needs repro (not yet a bug) | S to check | rc2 unless QA reproduces in a foreground tab; QA: 10 min of Market Hand selling at 360/1280, foreground, count `.floater` nodes (expect ≤ 1–2) |
| T4 | Grammar "1 more customers" | `order-list.ts:87` (`${cur} more customers waiting`, live region), `orders.ts:22` (`moreName`), `app.ts:291` (chip aria label). | Bug (copy) → MK-39 | S, copy only | **rc1** |
| T5 | "Refill 1 tired workers" (Workers, FYI) | `workers-ui.ts:51, 96`. | Bug (copy), PM Workers owns | S | rc1, hand to PM Workers |
| T6 | HUD +$134.61/s vs aria $34.61 (Economy/Eng, FYI) | Rate text and aria come from the same `rateView` (`app.ts:450–452`, `s2-economy-ui.ts:45`), updated together; not Market. Likely a separate render of the text vs the 1/s aria label. | Needs repro, Economy | – | hand to Economy/Eng |
| T7 | "The queue fills up but workers serve it, never a decision" (L8+) | Design: Market Hand serves the whole queue each tick (`sim/tick.ts:85`). | Spec gap / design, not a bug | L | M4 (completion bonus, leave penalty, focus taps already proposed in m4-manage-proposal.md); not rc1 |
| T8 | Queue full shown only by amber badge, no count (shots 07/09: "+4", "Queue full") | QV spec ("6/8 waiting", turned-away count) not in this build yet. | Planned (queue-visibility-spec v1.2) | per QV spec | rc2 as planned |

## Sell-button rule check (MK-23–25 and "Sell N · +$X")
Rule: a sell button never offers more eggs than you have; at 0 it's disabled or shows "No eggs"; label count = min(basket, remaining).
- Build 2490c79 already computes k correctly (`orders.ts:11`) and disables at 0, but breaks the rule for stale cards (T1) and uses unclear 0-egg copy (T2).
- MK-23–25 didn't state the rule explicitly. MK-24's "Sell N · +$Y" must use the same k, so added **MK-34–39** to feature-spec.md: count = min(floor(basket), remaining) from the same frame as the basket pill; 0 eggs → disabled "No eggs", no +$; leaving/removed cards never enabled; label refresh within one frame of any basket change; Y = k × price (AC4); plurals.
- No conflict with MK-24b's stacked 360 layout: "No eggs" fits the single-line button.

## For Engineering (rc1, ~0.5 d total)
T1 fix + test, T2/T4 copy, T5 copy (PM Workers OK). T3 only if QA reproduces it in a foreground tab.
