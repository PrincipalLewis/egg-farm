# rc2 notes: B-2 first-hire tip at 1280, B-3 compact Farm upgrade card · Art & UX (UI/Visual Designer) · v0.1 · 2026-10-16 20:00 · **SIGNED OFF by Head of Art & UX (2026-10-16 19:44)**
Source: qa/m3-recheck/cut-a-1371305.md (B-2, B-3) + *-tired-tip-1280.png, *-farmcard-360.png. Code refs: game-rc1-ui/src/ui/ (build 1371305 evidence; line numbers from the rc1-ui tree on the box, re-check after rebase).

## B-2 First-hire tip "Workers get tired over time." covers the Upgrades tab bar at 1280
Cause: `coach()` app.ts:499–507 anchors on the worker row's `.ebar`, and places the tip **above** whenever `r.top >= 120` (app.ts:505). At 1280 the energy bar is ~480px down, so the tip goes above it, straight onto the tablist (943,514, 276×68 in QA).
Proposal:
1. **Place below the energy bar** for this tip: `coach(text, ebar, 3000, 'below-pref')`, and in `place()` prefer below when `cls` has `below-pref` and `r.bottom + 12 + elHeight <= innerHeight - 8`; else above. Tip top = `.ebar` bottom + 12px, hand points up (existing `.coach.below` / `handup`, styles.css:253).
2. **Never cover the tablist** (all tips): in `place()`, if the computed rect intersects `[role=tablist]` rect, flip side; if both sides intersect, clamp top to `tablist.bottom + 8`.
3. Horizontal: centre on the bar, clamped to the docked panel (`.panel` left+156 / right−156) rather than the viewport, so it doesn't spill over the farm view.
4. Unchanged: 3 s, non-blocking, `.coach` style (styles.css:250–254, max 320px at ≥960), reduced motion = no hand bob.
- 360 is clean in QA, but the same `farmcard-360` shot shows the "Tap Refill…" tip over the tabs too; rule 2 fixes both.
- AC: at 1280×800 and 360×640, the tip's rect doesn't intersect the tablist or the Refill button; it touches the energy bar's row.
- **Amended 2026-10-17 00:55 (Head of Art & UX sign-off, after 00:49 FAIL on PR #4 @ 572864a), supersedes 1, 2 and the AC above:**
  - A. Anchor: tip top = bottom of the whole worker row + 8px (not `.ebar` bottom + 12). Never touches Refill/Manage or the Energy label.
  - B. Every tip runs the tablist + viewport check. If it can't sit fully clear of the tabs and the worker name, don't show it there; defer to the next time the worker row is fully on screen. Never clamp/place over the tabs (replaces the clamp in rule 2).
  - C. Show only when Workers is open and the energy bar is visible; otherwise defer (fixes the tip floating over the coop roof with the sheet closed).
  - D. Short docked heights (amended 2026-10-17 02:15, signed off by Head of Art & UX): if the tip can't fit clear, first auto-scroll the Upgrades panel so the worker row sits just under the tablist (smooth; instant under reduced motion), then place per A. Guard: only auto-scroll if the player hasn't scrolled or touched the panel in the last 1s; otherwise treat it as a skipped visit. Never pull the panel from someone mid-scroll. If it still can't fit (e.g. 1024×474): skip the tired tip this visit, still show the Manage tip; mark the tired tip seen once shown or after 3 skipped visits. Never place the tip beside the row.
  - AC: at all QA sizes (incl. 1024×474, 390×640, 360×740), the tip rect intersects none of tablist, worker name, Refill button, Energy label; never shows with the sheet closed.

## B-3 Farm upgrade card: 345px → target ≤ 260px at 360 (−25%)
Current (L6, 360, farmcard-360.png): title + coop note, 5 fx lines (Hens, Coop capacity, Egg price, Customers every, Customer demand), effect chip, payback chip, limiter link, Level meta, Buy 52px, ~7 × 8px gaps, 16px padding.
Also a **bug found in the shot**: the "Limited by collecting" link sits on top of the payback chip (text overlaps). **Cause (corrected 2026-10-16 21:15, confirmed by QA in qa/m3-recheck/cut-a-1371305-artux-triage/):** the wrapper `.hint.coop` (app.ts:489 @1371305) inherits the farm-sprite rule `.coop{position:absolute…}` (styles.css:76 @1371305), so the hint is pulled out of flow and lands on the chip row. It is **not** the ETA-line / negative-margin collapse noted earlier. Fix: rename the modifier (e.g. `.hint.limit`) or scope the sprite rule (e.g. `.farm .coop{…}`). (Local game-rc1-ui tree: app.ts:404 / styles.css:73.)
Changes (CSS-level; game-rc1-ui/src/ui/styles.css):
| # | Change | Where | Saves |
|---|---|---|---|
| 1 | Level into the title row: `Farm · L6/30` right-aligned muted 12px; remove the separate `.meta` line | `.up h3` :125, `.meta` :127 | ~24px |
| 2 | fx list as 2-col grid on phones: `.fx{display:grid;grid-template-columns:1fr 1fr;column-gap:12px;row-gap:2px;font-size:13px}`; short labels `Hens 35→40`, `Coop 350→400`, `Price $2.08→$2.16`, `Every 3.68→3.49s`, `Demand 21–42→23–45` (each ≤110px at 13px; ellipsis kept per v1.6 for effect lines) | `.fx` :126 | 5 rows → 3, ~44px |
| 3 | Effect + payback chips on **one row** (`flex-wrap:wrap; gap:4px`); at 236px `+19% income` ~84 + `Pays back in ~3 min 43 s` ~150 = 238 → use the short payback form `~3 min 43 s` with clock icon (SR keeps full text) | chip block | ~24px |
| 4 | Coop note (`Coop upgrade at L10`) moves into the tier line under the title, 12px, same row as the icon | `.tier` :127 | ~18px |
| 5 | Gaps `.up .col{gap:6px}` (was 8), card padding 12px (was 16) on ≤375 | `.up` :120, `.up .col` :122 | ~20px |
| 6 | Buy stays 48px min (tap target), full width | `.up .btn` :128 | 0 |
Estimate: 345 − ~130 ≈ **~215–250px** depending on hint lines; target **≤ 260px**, no clipping at 360/375/390, all text ≥ 4.5:1 (unchanged tokens), Buy ≥ 48px, link ≥ 44px hit.
- ≥ 960 docked keeps the current one-line chip row (§5); the 2-col fx grid also applies there.
- Needs a mock (mocks/rc2-farmcard-360.png) before Eng builds; not made yet.

## B-3 mock v2 (2026-10-16 20:25, measured; mock approved for rc2 by Head of Art & UX)
mocks/rc2-farmcard-360.png (+ @2x), source mocks/rc2-farmcard.html, render/measure script mocks/rc2-farmcard-shot.cjs (Chrome via playwright-core; build woff2 fonts; style-guide tokens). Left: current build (345px); right: proposal.
- **Measured card height: 260px without the ETA line, 282px with it** (`Affordable in ~1:05`). No `.fx` item clipped (scrollWidth check). (Previous approved figures 244/266px; +16px is fix 2.)
- **Fix 1 (customer interval):** `Cust. every 3.68 → 3.49s` was clipped at 13px → used **14px `icon-customer.svg` + `Every 3.68 → 3.49s`**; aria-label `Customers arrive every 3.68 s, next 3.49 s`.
- **Fix 2 (Buy ↔ link):** link `margin-top:16px` (col gap 6 + 16 = 22 = 14px hit-area overhang + **8px clear**; measured 8px between Buy bottom and the hit-area top).
- fx list is a **wrapping flex row** (not a grid): `Hens | 👤 Every` / `Coop | Price` / `Demand`; a 2-col grid clipped because column widths are shared.
- Order: title (`Farm` + `L6/30`) → tier/coop note → fx → chips (`+19% income`, `~3 min 43 s`) → [ETA] → Buy 48px → `Limited by collecting ›` (hit area `::before{inset:-14px 0}`, no negative margin → overlap bug fixed).

### Engineering handoff (game-rc1-ui/src/ui/styles.css + app.ts card render; re-check line numbers after rebase)
| Where | Change |
|---|---|
| `.up` :120 | `padding:12px` at ≤375 (was 16) |
| `.up .col` :122 | `gap:6px` (was 8) |
| `.up h3` :125 | flex row: title left, `L{n}/{max}` right, 12px Nunito 700 `--c-muted`; remove separate `.meta` line (:127) |
| `.tier` :127 | coop note ("Coop upgrade at L10") moves here, 12px `--c-wood-text` + 12px icon |
| `.fx` :126 | `display:flex;flex-wrap:wrap;column-gap:10px;row-gap:2px;font-size:13px;line-height:18px`; keep `.fx li{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`; order Hens, Every, Coop, Price, Demand; short labels `Hens`/`Every`/`Coop`/`Price`/`Demand`; customer li gets `<img class=fxi src=icon-customer.svg alt="">` 14px, `vertical-align:-2px;margin-right:4px` + aria-label `Customers arrive every {a} s, next {b} s` |
| chip block | one `flex-wrap` row, gap 4px; payback chip short form `~{F7}` with clock icon, SR full `Pays back in about …` |
| `.up .btn` :128 | stays 48px, full width; moves **above** the limiter hint |
| `.hint .link` :131 / limiter | remove `margin-block:-14px`; `position:relative;margin-top:16px` + `::before{content:"";position:absolute;inset:-14px 0}` (44px hit, 8px clear of Buy) |
| `[hidden]` | ETA line must use a real `display:none` (`.hint{display:flex}` overrides the `hidden` attr otherwise) |

## rc2 Minors (approved by Head of Art & UX, 2026-10-17 05:19)
- **M-SellAll-empty**: when the basket has eggs and no customers, the greyed Sell all button reads "Waiting for customers" (aria label matches). An empty basket keeps "No eggs to sell". Code: game/src/ui/orders.ts:57-59.
- **M-Sold-freeze**: on sale, freeze the order row in its sold state with a disabled "Sold! +$X" chip (#3D7F33 fill, white text) for about 240ms, alongside the existing sale number-pop. Then the row leaves, and only then does the "Next customer soon…" empty state show. With reduced motion there's no slide, just a 120ms fade. Code: game/src/ui/order-list.ts:28,66.
- **M-Order-zero** (Head of Art & UX, 06:20): when no eggs have been delivered, the order line reads "Wants 13" instead of "0/13", with aria "Customer wants 13 eggs". After the first egg it switches to "1/13".
- **M-Tut-parity** (SUPERSEDED 08:24 by first-minute v0.2 FM-AC4 strings: 'Tap Collect to gather eggs.' / 'A customer! Tap Sell to earn coins.' / 'Buy your first upgrade: more eggs per tap.', identical at every width): tutorial copy must be identical at every width. The 390 strings are the source; diff the desktop strings against them and fix any mismatch.
- **M-Tut-goal**: the tutorial bubble reads "$2 to go · Upgrades ›" (keep the non-breaking spaces). The link scrolls to the target upgrade and pulses its Buy button.
- **M-Toast-layer**: Welcome-back always draws above other toasts. "Coop upgraded!" must not draw over it on reload.
- **Copy: Coop upgrade toast** (Head of Art & UX, 07:26; formalizes rc0 F1): show "Coop upgraded! +1 customer slot" only when queue_max actually increases (F5/10/15/20). Every other coop upgrade shows plain "Coop upgraded!". Toasts name the effect.
