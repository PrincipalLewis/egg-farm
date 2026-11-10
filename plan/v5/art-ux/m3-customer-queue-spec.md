# M3 Customer queue (P1q) + order cards (P2) — v1.2
Owner: Art & UX · 2026-10-15 (v1.1 23:45) · Due to Engineering Fri Oct 16 12:00 (rc0, branch m3/rc0)
Sources: product/playtest1-resim.md (P1q: queue_max = min(10, 6+floor(F/5)); P2 approved), layout-spec.md §3.3/§3.5/§4.4/§9 (bug 9), style-direction.md tokens.
Mocks: mockbuild/m3-customer-queue.html → m3-customer-queue-360.png (360×640), m3-customer-queue-390.png (390×844).

## Changelog
- v1.2 (2026-10-16, rc1, with PM Farm Upgrades): §6 lead line is now "+1 customer (max N)" (Product ruling, final; an interim "Queue holds N customers (+1)" was withdrawn) (replaces "+1 customer slot (a → b)"); one-time chip pulse on a queue step (layout-spec §4.6b). Supersedes the v1.0 arrival pulse and §5.3 exception.
- v1.1 (2026-10-15 23:45): Engineering confirmations recorded (§0); added §5 anti-churn at F24+ (approach to agree with Engineering) and §6 Farm row next-level preview at F5/F10/F15/F20; QA checks 13–20.
- v1.0 (2026-10-15 23:40): first release (queue 4/5 + "+N waiting", P2 order cards).

## 0. Confirmed by Engineering (2026-10-15)
- **Partial selling stays.** "Sell k" sells the eggs on hand; patience is **not** reset; on timeout the customer leaves with the part they got (partial leave). The card collapses like a served card (§1.4).
- **Farm strip: 5 chips** = 4 customers + a "+N" chip; tapping it opens the Market panel (replaces the §1.2 note "5th chip becomes +N", same result).

## 1. Queue of 6–10 orders
### 1.1 Visible count (measured, Market sheet)
Sheet = 75dvh. Header 56px, footer "Sell all" 56px + 8px pad top/bottom = 72px, body padding 12px×2.
Order card min-height 60px (was 72px: 8px vertical padding, 1 text line + 8px bar), gap 8px. "+N waiting" chip 44px.
| viewport | sheet | body avail. | cards shown | used (cards + gaps + chip) |
|---|---|---|---|---|
| 360×640 (ref) | 480 | 480−56−72−24 = **328** | **4** | 4×60+3×8 + 8+44 = **316** ✔ (5 would need 384 ✘) |
| 375×667 | 500 | 348 | 4 | 316 ✔ |
| 390×844 | 633 | 481 | **5** | 5×60+4×8 + 8+44 = **384** ✔ |
Rule (height-driven, width only gates layout): `visible = (sheet body height ≥ 384px) ? 5 : 4`. Practically: 4 at 360–389 wide on ≤700px tall phones, 5 at 390+ wide / ≥700 tall. Never more than 5 on phones. Measured in Chrome headless: no vertical overflow in the sheet body at 360×640 and `scrollWidth === innerWidth` (no sideways scroll).
Width: card grid `40px minmax(0,1fr) auto` (bug9 rule); text column never squeezes below ~150px at 360 because the button is min 88px / max 42%.

### 1.2 "+N waiting" chip
- Shown only when queue length > visible. N = queue.length − visible (max 10−4 = 6).
- Size: min-height 44px, padding 0 16px, pill radius 22px, centred under the last card, Nunito 800 16px.
- Colors: bg Soil Brown #3E2C23, text #FFFFFF = **13.21:1**; chip vs cream sheet #FFF6E5 = 12.31:1 (UI ≥3:1 ✔). Focus ring #2B79A8 2px offset 2px.
- **Tappable: expands the list in place** (all cards render; chip becomes "Show less", same size; body scrolls, Sell all stays sticky). Expanded state resets on sheet close. Rationale: lets a player sell to a specific customer; no new screen.
- a11y: `<button aria-expanded="false" aria-controls="order-list">+3 waiting</button>`; accessible name "3 more customers waiting, show all". A polite live region (`<p class="sr-only" aria-live="polite">`) announces only count changes, debounced 2s: "3 more customers waiting". Do not announce every arrival when 0 hidden.
- Farm-screen queue strip (§3.3, max 5 chips): unchanged chip sizes; if queue > 5 the 5th chip becomes a "+N" chip (56×64, same brown/white colors), tap opens Market (already the strip behavior).

### 1.3 Desktop (≥960px landscape, docked)
Market half of the right column scrolls (`overflow:auto`). Show **all** orders (up to 10), no chip; the list scrolls inside its half. Card styles identical; button may be min-width 112px there.

### 1.4 Ordering & serving
- Order = arrival (FIFO), oldest on top. Never re-sort by fill or value (stable positions = no "stuck" read, no mis-taps).
- Served card (fully sold or customer leaves): collapses height→0 + opacity→0, 240ms `--ease-out`; cards below move up (FLIP translateY, 240ms); the first hidden order fades/slides in from 8px below as the new last visible card; chip N decrements. New arrivals append to the end (hidden if beyond visible → chip N++ with a 150ms scale 1→1.08→1 pulse).
- Partial sale (button "Sell k"): card stays, progress animates 240ms.
- `prefers-reduced-motion: reduce`: no collapse/slide/pulse; swap instantly; progress width changes without transition.
- Tap guard: during the 240ms collapse, buttons under the pointer ignore taps (`pointer-events:none` on the list for 250ms) to avoid double-sells.

## 2. P2 order cards
### 2.1 Content & format
Line 1 (single line): `{have}/{want} eggs · ${value}` e.g. **"3/5 eggs · $12.50"**.
- `have` = eggs the player could deliver now to this order = min(basket allocated to it, want) (Engineering: same number the Sell button sells). `want` = full order size.
- `value` = **full order value** = want × price per egg (incl. multipliers), never the value of what's currently fillable. Never "$0.00": if computed value rounds to 0, show the minimum "$0.01"; if price unknown (loading), show "—".
- Money format: shared formatter, `$` + 2 decimals below $1,000; ≥$1,000 → "$1.2K", "$3.4M" (1 decimal). Eggs ≥1,000 → "1.2K".
- Value text: Hay Gray #6B5D52 on white = 6.34:1; eggs text Soil Brown on white 13.21:1. Tabular numerals.
### 2.2 Progress bar
Under line 1, full text-column width, height 8px, radius 4px, track white with 1px #6B5D52 outline (6.34:1 vs card), fill Meadow Strong #3D7F33 (4.9:1 vs white track ✔ 3:1). Width = have/want. `role="progressbar" aria-valuemin=0 aria-valuemax={want} aria-valuenow={have} aria-label="Order 3 of 5 eggs"`. Transition width 240ms (none under reduced motion).
### 2.3 States
| state | condition | card | button |
|---|---|---|---|
| Waiting | have = 0 | outline 2px #6B5D52 | secondary "Need {want}" (white, #6B5D52 text 6.34:1, border), disabled `aria-disabled` |
| Partially filled | 0 < have < want | outline 2px | primary Meadow Strong "Sell {have}" (white 4.9:1) |
| Ready to sell | have = want | outline **3px #3D7F33** | primary "Sell" |
Patience ring stays on the avatar (inside the 40px, §9).
### 2.4 Truncation
Line 1 is `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`. Priority: the value part (" · $…") is the one that ellipsizes; eggs count never cut. At ≤360 if line exceeds, drop " eggs" word → "3/5 · $12.50" (Engineering: container query `(max-width:200px)` on .txt, or JS width check). Button labels max "Sell 999K" / "Need 999K" (compact numbers).

## 3. CSS (suggestion)
```css
.order-list{display:flex;flex-direction:column;gap:var(--s-2)}
.order{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:var(--s-2);align-items:center;
  min-height:60px;padding:var(--s-2) var(--s-3);background:#fff;border:2px solid #6B5D52;border-radius:var(--r-md)}
.order>.txt{min-width:0}
.order .l1{font:800 16px/1.2 var(--f-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.order .l1 .v{color:#6B5D52;font-weight:700}
.order .bar{height:8px;margin-top:6px;border-radius:4px;background:#fff;border:1px solid #6B5D52;overflow:hidden}
.order .bar>i{display:block;height:100%;background:#3D7F33;transition:width .24s}
.order .sell{min-width:88px;max-width:42%;min-height:44px;border-radius:22px;padding:0 var(--s-3)}
.order.ready{border:3px solid #3D7F33}
.order.wait .sell{background:#fff;color:#6B5D52;border:2px solid #6B5D52}
.order.leaving{animation:orderOut .24s ease-out forwards}
@keyframes orderOut{to{opacity:0;height:0;min-height:0;padding-block:0;margin-top:-8px;border-width:0}}
.queue-more{align-self:center;min-height:44px;padding:0 16px;border-radius:22px;background:#3E2C23;color:#fff;font:800 16px var(--f-body);border:0}
.queue-more:focus-visible{outline:2px solid #2B79A8;outline-offset:2px}
.order-list:not(.expanded) .order:nth-child(n+5){display:none}          /* 4 visible */
@media (min-height:700px) and (min-width:390px){.order-list:not(.expanded) .order:nth-child(n+5){display:grid}
  .order-list:not(.expanded) .order:nth-child(n+6){display:none}}       /* 5 visible */
@media (min-width:960px) and (orientation:landscape){.order-list .order{display:grid!important}.queue-more{display:none}}
@media (prefers-reduced-motion:reduce){.order .bar>i{transition:none}.order.leaving{animation:none;display:none}}
```
(If JS computes `visible`, keep the CSS as fallback; JS must use the same 384px rule.)

## 4. QA acceptance checks
1. 360×640, queue 10: Market sheet shows 4 cards + "+6 waiting"; no sheet-body scroll before expanding; `document.documentElement.scrollWidth === 360`.
2. 375×667 → 4 cards; 390×844 → 5 cards + "+5 waiting".
3. Chip ≥44px tall (getBoundingClientRect), tap expands all 10, label "Show less", aria-expanded toggles; Sell all remains visible.
4. Screen reader: chip name "N more customers waiting, show all"; count changes announced politely, ≤1 per 2s.
5. Serve top card: card collapses ≤240ms, next hidden order appears as last visible, N decrements; reduced-motion: instant, no animation.
6. Order stays FIFO after partial sells and arrivals.
7. Every card shows "{have}/{want} eggs · ${full value}"; with basket 0 cards read e.g. "0/6 eggs · $15.00", never "$0.00" anywhere in Market.
8. Progress bar width = have/want (±1px), progressbar ARIA values correct.
9. States: have 0 → "Need N" disabled; partial → "Sell k"; full → "Sell" + 3px green outline.
10. Long values (e.g. "1.2K/1.5K eggs · $3.4M") never wrap or push the button outside the card; button ≥8px from card edge.
11. Desktop 1280×720: all orders listed in docked Market, no chip, list scrolls internally.
12. Contrast spot-check: chip 13.21:1, value text 6.34:1, button text 4.9:1, bar fill 4.9:1.

## 5. Anti-churn at F24+ (arrivals every ~1.5 s) — **approach to agree with Engineering**
Goal: when the queue is full and the visible list is busy, nothing reflows, flashes or jumps under the finger.
1. **Fixed card heights.** `.order{height:60px}` (not min-height); line 1 nowrap + ellipsis, bar fixed 8px. Chip fixed 44px and fixed min-width (`min-width:9ch`) so "+9" → "+10" never resizes. Sell all label width reserved (`min-width` + tabular-nums).
2. **Keyed DOM reuse.** Each card node is keyed by `order.id` (`data-id`) and kept in a `Map`. Per tick: update text/bar/state class on existing nodes only; create a node only for an order entering a visible slot; remove only on serve/leave. Never `innerHTML` the list or rebuild it.
3. **Overflow arrivals are silent.** When visible slots are full, a new arrival creates no node; only the chip's text number changes (no pulse, no color change, no animation — this replaces the v1.0 chip pulse).
4. **Batch per tick with requestAnimationFrame.** Sim events are queued; one `requestAnimationFrame` callback applies all DOM writes per frame (reads before writes, no forced layout in loops).
5. **Coalesce chip + live region.** Chip text and the `aria-live` message update at most once every 2 s (trailing edge, latest value). Visible cards still update every tick.
6. **Enter animation only into a visible slot**, and at most **one slide per 240 ms**; extra entries in the same window appear without animation. Leave = collapse per §1.4, also throttled to one at a time; with several leaves at once, remove instantly together.
7. **No layout shift (CLS ≈ 0).** Removals use transform/opacity during the animation; the height change happens in one step at the end. With the list expanded, keep `scrollTop` anchored to the card above the change (`overflow-anchor:auto` plus a manual correction if needed).
8. **Tap stability.** On `pointerdown` inside the list, freeze reorders and removals until `pointerup` + 300 ms (updates queue up, text updates allowed). A card under an active pointer never moves.
```css
.order{height:60px;contain:layout paint}
.order-list{overflow-anchor:auto}
.queue-more{min-width:9ch;font-variant-numeric:tabular-nums;transition:none}
```

## 6. Farm upgrade row: next-level preview at F5 / F10 / F15 / F20
queue_max = min(10, 6+floor(F/5)), so buying the Farm level that reaches **F5, F10, F15 or F20** adds a customer slot (6→7→8→9→10). Applies to the §4.5 Farm row (layout-spec) effects list when *next* level ∈ {5,10,15,20}.
- **Lead line (primary, v1.2):** `icon-customer.svg` 16px + "**+1 customer (max N)**", e.g. "+1 customer (max 9)", with N = the new queue_max at that step (7/8/9/10), Nunito 800 14px, Soil Brown #3E2C23 on white = **13.21:1**. (v1.1 was "+1 customer slot (7 → 8)".) Coop steps add a "New coop look" line above it (layout-spec §4.6b).
- **On landing:** the "+N waiting" chip pulses once, 1→1.12→1 over 600ms; reduced motion = color flash (brown → Yolk → brown). See layout-spec §4.6b.
- **Secondary line:** order size change, Nunito 700 12px, #6B5D52 (6.34:1): "Orders 12–24 → 13–26 eggs" (demand_min–demand_max current → next, from config; K formatter beyond 4 digits). If the range doesn't change, omit the line.
- The other Farm effect lines (Hens, Coop capacity, Egg price) follow; the old "Customers (interval / demand)" line is replaced by these two lines on those levels only (no duplicate data).
- Layout at 360: col 2 = 236px (§4.5). "+1 customer slot (7 → 8)" at 14px ≈ 16+4+170 = 190px ✔; "Orders 1.2K–2.4K → 1.3K–2.6K eggs" at 12px ≈ 200px ✔. nowrap + ellipsis fallback. Row height grows by one line (16px) only on these levels; reserve no space elsewhere.
- Screen reader: lead line reads "Next level: one more customer, up to 8".
- Maxed slots (F≥20): never shown again.

## 7. QA checks (v1.1 additions)
13. Debug arrival interval 1.5 s for 60 s at F24, 360×640, Market open: no visible flicker (screen recording reviewed frame by frame), card positions change only on serve/leave.
14. Same run with the list expanded and scrolled to the middle: scroll position stays on the same card (±2px).
15. Chrome Performance panel over that run: **CLS < 0.01**; no long tasks > 50 ms from queue updates.
16. Tap target stability: hold pointerdown on a card's Sell button for 1 s during arrivals and leaves; its getBoundingClientRect stays the same until release.
17. Overflow arrivals: chip number updates at most once per 2 s, without animation; screen reader announcements ≤1 per 2 s; card DOM nodes keep their identity (DevTools: same node, no subtree re-creation on arrival).
18. Partial leave: a customer with 2/5 eggs times out → card collapses, coins for 2 eggs stay, patience never resets after "Sell k".
19. Farm strip: queue 10 → 4 customer chips + "+6" chip; tapping it opens the Market panel.
20. Farm row at F4, F9, F14, F19 (next level = 5/10/15/20): "+1 customer (max N)" lead line with customer icon + order-range line, single lines at 360px; at F3 and F20+ the lead line is absent.
