# UI screenshot spec check · 2026-10-16 23:25 · UI/Visual Designer
Routine run. New screenshots since the 22:55 run (log: reviews/screenshot-check-log.md).
Builds: **d56033f** (origin/rc1/ux-clarity-v3, newest Cut A line, `m3-rc1-pre+d56033f`, Chromium only) in qa/m3-recheck/cuta-ux-extras/; **a01faea** (m3-rc1-dialog QA trial) in qa/trial-qa-bot/.

## Verdict: FAIL, 1 Minor. Asleep/Unpaid banner copy, icons, size and dimming PASS (closes checklist A16 / C15 for Chromium).
| # | Item | Spec | Result |
|---|---|---|---|
| 1 | Unpaid banner `⚠ Unpaid, production stopped` (Market Hand, Coop Hand), 360 + 1280 | rc1-upgrade-value.md:98 | PASS |
| 2 | Grader banner `💤 Asleep, bonus down to 15%`, 360 + 1280 | rc1-upgrade-value.md:98 | PASS |
| 3 | Dim at 50% except banner and Refill | rc1-upgrade-value.md:99 | PASS |
| 4 | Refill / tab / nav tap targets ≥44 | rc1-upgrade-value.md:100, style rule | PASS |
| 5 | Count badges (Upgrades nav + Workers tab) | rc1-upgrade-value.md:97 | Workers tab PASS; nav badge aria PASS, visual not captured |
| 6 | Sticky `Refill 1 tired worker` bar while the Workers list scrolls, 360 | rc1-upgrade-value.md:98 (banner reads in full) | **FAIL, Minor** |
| 7 | QA trial a01faea core-loop shots, Chromium + Firefox docked 1024×720 | m3-customer-queue-spec.md, layout-spec.md | PASS (one copy nit, see notes) |

## 1–3. Banners: PASS
Evidence: chromium-{360,1280}-2a-unpaid-banner.png, -2b-grader-banner.png, -2-workers-sheet.png; rects.json `banners` (unpaidCount 2, texts exact).
- Copy exact, icon + text so state isn't colour-only ✔. Strip ≈32px tall (64px at DPR 2), white bold ~14px on `--c-danger`, one line at 360 (328px card) and in the 1280 docked panel ✔.
- Card body dimmed (title, energy bar, wage, `Unpaid ⚠` / `Asleep 💤` tag); banner at 100% ✔. Grader Refill at 100% ✔. Market/Coop Hand Refill shows the standard disabled fill because they're rested (80%, `Rested, refill below 40%`), which is the correct locked state, not a dimming bug ✔.
- Wage units: `Wage $4.50/min` (Market Hand) vs `Wage $0.15/s` (Coop Hand) look mixed but follow decisions.md:15 (under $0.10/s shows per minute) ✔.

## 4. Tap targets: PASS
chromium-360-rects.json `upgradesWorkersOpen`: card Refill 145×48, sticky Refill 304×48, Hire 308×48, tabs 107×44, close 44×44, nav 93×64 (Refill nav 81×64). Only <44 hit is the `Ready!` status pill inside `button#goal` (64×20, not its own target; parent 320×44) ✔. Unequal Refill nav width (81 vs 93) is the known QA-RC1UI-1 item already deferred to rc2 (decisions.md:18), not re-raised.

## 5. Count badges
- Workers tab shows red `3` badge top-right, matching 2 Unpaid + 1 Asleep ✔ (360 and 1280).
- Upgrades nav: aria `Upgrades, 3 workers asleep or unpaid`, text `3 Upgrades` ✔, but at 360 the open sheet covers the nav and 1280 has no nav, so the 18px badge itself is **not in any screenshot**. chromium-360-1-closed-nav.png uses a different seed (no tired workers) and shows the fallback affordable dot, which is correct for count 0 ✔.

## 6. FAIL (Minor): sticky Refill bar has no backing, the next card's banner peeks around it
Evidence: chromium-360-2c-grader-viewport.png (scrolled), selector `div#uRow > div.refill-wrap > button.btn.manage[data-act="manageAll"]`.
- When the list scrolls, the sticky green `Refill 1 tired worker` button floats directly over the Coop Hand card. The red `⚠ Unpaid…` strip shows as slivers left and right of the button and its text is hidden, and the Market Hand card's `Rested, refill below 40%` line shows just above it. It reads as a rendering glitch and hides the only state label of the card underneath.
- Fix: give `div.refill-wrap` an opaque panel background (`--c-panel` cream) spanning the full sheet width with 8px top/bottom padding (so cards scroll under a solid strip), and add `scroll-margin-top` / list padding equal to the strip height so a card's banner is never parked under it. No change to the button itself.
- Not visible at 1280 in this capture (list doesn't scroll); please check docked too after the fix.

## 7. QA trial a01faea: PASS
Evidence: qa/trial-qa-bot/{chromium,firefox}/01–10-*.png, report-a01faea.md.
- Tutorial dim + spotlight on the Buy button (yellow ring, hand pointer), `Tap Buy.` bubble ✔. Partial order row `8/10 eggs · $10.00` with `Need 2` and progress bar ✔; `Need $2.00 more` under the unaffordable buy, disabled fill ✔. Docked Market/Upgrades fits 1024×720 ✔.
- Copy nit (not a fail, older build): the tutorial bubble wraps `Sell a few more eggs to afford it` / `· $2 to go`, so line 2 starts with the separator (firefox/04-after-sell-0.png). Same rule as the goal label: keep ` · $2 to go` together and never start a line with `·` (use a non-breaking space before `·`).
- QA's note that a partly filled order shows the total ($10.00) rather than the remaining payout is a product question; no spec of mine covers it.

## Coverage gaps / asks (d56033f)
- Closed-sheet 360 capture with the banner seed, to see the 18px `3` badge on the Upgrades nav.
- Plain `💤 Asleep, production stopped` variant (Market or Coop Hand asleep, not Grader).
- Firefox and WebKit runs (`capture.mjs firefox|webkit` is ready).

## Out of scope / no review needed
- product/critic/wt-7d52952/docs/readme/*.png (4): md5-identical to qa/scratch/pr1-96c4a1e README copies.

## Still waiting on
M4-A sign-off captures (locked `Needs Farm L{n}` row + aria, MAX row, `Balanced farm 5/5 · +30%` + toasts, Farm tab at 360 and 1280 docked, strip text-alternative DOM dump); B-1 Coop full SHA (PM Workers); B-3 compact Farm card SHA (UI engineer); 'Limited by collecting' overlap fix (rc2-notes-b2-b3.md); v1.6.1 goal label (rc1-upgrade-value.md v1.6.1 §4).
