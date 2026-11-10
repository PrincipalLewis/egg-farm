# M5.1 clock-wage copy fit check — build 30b29d3 (m4.1+30b29d3)

UI/Visual Designer · 2026-10-24 23:05 CEST · paper only (no repo changes, no posts)
Method: dist-qa served locally; Playwright with Chromium (google-chrome), Firefox and WebKit at 360×640 / 390×844 / 1280×800; state F30, MH+CH at energy 0 (`.wk.asleep.is-off`), Workers tab. Each string was injected into the real DOM slot (h3 `.st`, `.wk-cap.num`, `.btn.manage span`, `.toast`, `.cooptip`) and kept there by a MutationObserver. Lines are counted with Range.getClientRects. All renders ran under `flock .browser-test.lock`, one engine at a time; all servers were stopped afterwards (verified).
Shots: `art-ux/shots/m51-clock-wage/` (231 PNG, `manifest.json` with sha256 per file + manifest-<engine>.json). Raw data: `art-ux/scratch/m51-clockwage/cw-<engine>.json`.
The three engines agree within 0.6px. Values below are Chromium, with the FF/WK spread where it is larger than 0.05px.

## Scope notes
- 'Resting' was dropped (D-HOP-45) and not measured.
- Caption precedence (decisions.md 22:57): **Unpaid > Still paid > Ready in > Rested**. When a worker is Asleep and on cooldown, the disabled button shows ~~'Refill in Ns'~~ 'Refill in m:ss' [A 03:41] and 'Ready in' is removed from aria-describedby.
- 'On break' / 'No wage' were measured as **Info only**, because that copy is deferred to an M5.1 CR (pause spec frozen).
- Text floor of 12px: captions 12, h3/state 15, toast 16, tip 16 (see item 4). **Holds everywhere.**

## 1. Caption slot `.wk-cap` (400 12px/16px Nunito, nowrap)
Real slot = the `.wk-refill` column width: **308 / 338 / 346** px at 360 / 390 / 1280 (x 26 / 26 / 908). The 128px figure from rc1-asleep-state-spec:126 is an old budget, not the real slot.

| Caption | text w (px) | lines | fits 308/338/346 | vs 128 budget |
|---|---|---|---|---|
| **Still paid $15.00/min** (AC-FC8 worst) | 112.14 | 1 | yes, all 9 runs | ok |
| Still paid $150.00/min (headroom) | 119.34 | 1 | yes | ok |
| Resumes at $9,999.99 (ref) | 121.84 | 1 | yes | ok |
| Ready in ~~30s / 599s~~ / 9:59 [A 03:41]: 's' format dropped 23:10 | ~~69.78 / 76.97~~ / 73.94 | 1 | yes | ok |
| **Rested, refill below 50%** (widest in the precedence set) | 133.08 | 1 | yes | **+5.1 over 128** |
| No wage (Info, deferred) | 48.41 | 1 | yes | ok |
| Candidate: $15.00/min while asleep | 132.44 | 1 | yes | +4.4 |
| Candidate: $150.00/min while asleep | 139.64 | 1 | yes | +11.6 |
| Candidate: Paid $15.00/min | 87.84 | 1 | yes | ok |
| Candidate: Paid $150.00/min | 95.03 | 1 | yes | ok |

All captions stay inside the card, with no overlap and no ellipsis (`text-overflow:clip`, nothing overflowing).
**Verdict: PASS.** 'Still paid $X/min' stands; the fallback candidates are not needed. The widest caption in the precedence set ('Rested, refill below 50%', 133.08) uses 43% of the 308 slot. If anyone still applies the 128 budget, retire it, because it is already exceeded by shipped copy.

## 2. 'Asleep' state with moon (h3 `.st`, 15px/20px Nunito 400)
The build has no pill element. The state is the text after "Name ·" in the h3, so "pill" below means that span.

| State | span w | h3 text w (CH / MH) | h3 lines | h3 h |
|---|---|---|---|---|
| ~~☾ Asleep (14px SVG + 4px gap)~~ moon-first order superseded 02:10 | 65.14 | 154.59 / 167.50 | 1 | 20 |
| **Asleep ☾** (MOON_SVG `.wi.wi-moon`, 4px gap after the word; HoAUX 02:10) | 65.14 (FF 65.15, WK 65.13) | CH 1 line at 360 in Cr/FF/WK | 1 | 20 |
| Asleep 💤 (RC ref) | 69.72 (FF 70.02) | 159.17 / 172.08 (FF 172.37) | 1 | 20 |
| On break (Info) | 61.36 | 150.81 / 163.72 | 1 | 20 |

The narrowest h3 is 308, so there is about 140px of headroom. (Range reports 2 rects for the moon span: one for the inline img and one for the text. The h3 is 1 line, 20px tall, in all runs.)
**Verdict: fit PASS. Asset FAIL:** `assets/icon-moon.svg` is `fill="#fff"`, made for the red banner, so it is **invisible on the cream card**. The shots show it with `filter:brightness(0)` only to illustrate the fix. It also sits inside `.wk.is-off .wk-body{opacity:.5}`.
**Fix:** ship an ink variant (`icon-moon-ink.svg`, ~~fill #5A4C42~~ `fill/stroke="currentColor"` as shipped, R2 [A 03:41]), or make the moon `fill="currentColor"` inline SVG so it inherits the `.st` colour.

## 3. Toast (700 16px display, padding 6/16, pill radius, nowrap, max-width calc(100vw − 24px))

| Toast | natural w | 360 box w×h, lines | 390 box | 1280 box | clip |
|---|---|---|---|---|---|
| **Coop Hand fell asleep. Collecting stopped, wage still running.** | 470.78 | 336×32, 1 line, **text overflows to x≈467** | 366×32, overflows | 470.78×32, fits | **CLIPPED at 360 & 390** |
| Market Hand fell asleep. Auto-selling stopped, wage still running. | 501.67 (FF 502.25) | 336×32, overflows | 366×32, overflows | 501.67×32, fits | **CLIPPED at 360 & 390** |
| Short: Coop Hand fell asleep. Wage still running. | 330.89 | 330.89×32, 1 line | fits | fits | no |
| Short: Market Hand fell asleep. Wage still running. | 346.03 | 336×32: text 28→342, **right padding 6 vs 16 left** | fits | fits | marginal FAIL at 360 |
| Ref: Coop upgraded! +1 customer slot | 265.44 | fits | fits | fits | no |
| **Proposed wrap fix**, CH full | — | **336×52, 2 lines, centered** | 366×52, 2 lines | 1 line | **none** |
| **Proposed wrap fix**, MH full | — | **336×52, 2 lines** | 366×52, 2 lines | 1 line | **none** |

At 360 the toast is at 12,147 (390: 12,155; 1280: top 64). The shots show the cut text: `<engine>-360-toast-ch.png`, and `-toast-wrap-*` for the fix.
**Verdict: FAIL at 360 and 390 in all 3 engines.** Nowrap pushes the text past the viewport, so "…wage still running." is lost. That is the exact part AC-FC9 needs.
**Fix (preferred, keeps the approved copy):** for the toast, use `white-space:normal; text-align:center; border-radius:16px; width:max-content; max-width:calc(100vw - 24px)`. This gives 2 lines and 52px at 360/390, 1 line at 1280, with no clipping in any engine. Short copy alone fixes CH but not MH at 360, so it is not enough on its own.

## 4. One-time tip 'Sleeping workers still get paid. Refill to wake them.'
It renders as `<button class="cooptip" role="status">`, appended to `body` (app.ts:156, COOP_TIP_TEXT), fixed at bottom calc(nav-h + 60px), centred with left:50% + translateX(-50%).

| Width | box (l,t,w,h) | lines | font computed | clip |
|---|---|---|---|---|
| 360 | 90,430,180×86 | 3 | 16px 400 Nunito, lh normal | no |
| 390 | 97.5,634,195×86 | 3 | same | no |
| 1280 | 480,612,320×64 | 2 | same | no |

**Verdict: PASS on fit and floor, with 2 build defects (fix recommended):**
- (a) `font:600 14px/1.3 inherit` (styles.css:186) is an **invalid shorthand**. `inherit` can't sit inside `font`, so the whole declaration is dropped and the tip renders at 16px/400/normal instead of the specced 14/600/1.3.
- (b) With `left:50%`, the shrink-to-fit width is capped at half the viewport (180 at 360), so the tip wraps to 3 lines even though max-width is 320.

**Fix:** `font:600 14px/1.3 var(--f-body); width:max-content; max-width:min(320px, calc(100vw - 32px))`. This has not been measured. Re-measure on the build that carries it.

## 5. Disabled Refill button (steering 22:55), `.wk .btn.manage` (18px 700, min-h 44, min-w 88)

| Label | w × h (all 3 engines, all 3 widths) | label lines |
|---|---|---|
| Refill | 144.86 × 48 | 1 |
| ~~Refill in 42s~~ [A 03:41]: m:ss `Refill in 0:42` = 202.28, R3 | ~~196.36 × 48~~ | 1 |
| **Refill in 9:59** (worst) | 199.64 × 48 | 1 |
| With min-width:200px → all three | **200 × 48** | 1 |

The height is ≥44 everywhere and no label wraps. **Width delta Refill → 'Refill in 9:59' = 54.78px**, which is the jump.
**Verdict: PASS on target and wrap, FAIL on "nothing jumps" as built.**
**Fix:** `.wk .btn.manage{min-width:200px}` (= ceil 199.65). At 360 that's 200 of 308, which still fits.
Note: this assumes the m:ss format above 59s. ~~'Refill in 599s' would need re-measuring.~~ Moot: every countdown is m:ss (23:10) [A 03:41].

## Summary
| Item | Verdict | Fix |
|---|---|---|
| Caption 'Still paid $15.00/min' (+$150 headroom), precedence set widest 133.08 | PASS | none. Retire the 128 budget; the real slot is 308+ |
| 'Asleep' + moon | Fit PASS / asset FAIL | ink or currentColor moon |
| Toasts CH/MH | **FAIL 360 & 390** (clipped) | toast wrap rule (2 lines, 52px) |
| Tip | PASS (with defects) | fix font shorthand + width:max-content |
| Refill disabled labels | PASS h/wrap; jump 54.78px | min-width:200px |
| On break / No wage | Info: fits | deferred to M5.1 CR |

---
## Rulings 23:06 (+ Head addendum 23:10): re-measure, 2026-10-24 23:12 CEST
Script `scratch/m51-clockwage/cw2.mjs` (run2.sh). It ran under the flock in Chromium, Firefox and WebKit at 360/390/1280, with the 360 runs at DPR 1 and 2. All servers were stopped and verified. Raw data is in `cw2-<engine>.json`. The three engines agree within 0.6px; values below are Chromium.

### R1. Toast: min(320px, 100vw − 32px), white-space:normal, centred, radius 16px, copy unchanged
| Toast | natural (1 line) | exact 23:06 props: 360 / 390 / 1280 | **+ width:max-content**: 360 / 390 / 1280 | wraps at 1280? |
|---|---|---|---|---|
| Coop Hand fell asleep. Collecting stopped, wage still running. | 470.78 | 180×92 **4 lines** / 195×72 **3** / 320×52 2 | **320×52 2 / 320×52 2 / 320×52 2** | **yes, now 2 lines** (was 1) |
| Market Hand fell asleep. Auto-selling stopped, wage still running. | 501.67 (FF 502.25) | 180×92 **4** / 195×92 **4** / 320×52 2 | **320×52 2 / 320×52 2 / 320×52 2** | **yes, now 2 lines** (was 1) |
| Auto-refilled 2 workers | 201.39 | 180×52 **2** / 195×52 2 / 201×32 1 | 201.39×32 1 / 1 / 1 | no |
| Auto-refilled Market Hand | 223.81 | 180×52 2 / 195×52 2 / 224×32 1 | 223.81×32 1 / 1 / 1 | no |

Nothing clips and nothing goes offscreen in any case. Boxes at 360: l=20 (asleep) / 79–68 (auto); at 390: l=35; at 1280: l=480, top 64.
**Verdict:** the ruling's props on their own **FAIL** the "≤2 lines" cap at 360/390. `.toast` is centred with left:50% + translate, so with wrapping allowed its shrink-to-fit width is capped at half the viewport (180/195px). That is the same defect as the tip.
**Fix: add `width:max-content`.** Then the box = min(text, 320), and every toast is ≤2 lines, unclipped, in all 3 engines at all widths. Shots: `*-toast-ruled-*` (exact props) and `*-toast-ruled-mc-*` (with max-content).
Final rule: `.toast{white-space:normal;text-align:center;border-radius:16px;width:max-content;max-width:min(320px,calc(100vw - 32px))}`. The 1280 change: both asleep toasts now wrap to 2 lines (320×52). The Auto-refilled toasts stay on 1 line.

### R2. Moon: `art-ux/assets/icon-moon-ink.svg`
- **Shape:** the same viewBox 0 0 14 14 and the same crescent path as the build's `icon-moon.svg`. `fill="currentColor"`, `stroke="currentColor"`, 2px outline with round joins and caps (house outline). The round joins soften the crescent horns ("avoid sharp angles").
- **Bounds:** the stroke adds 1px all round and stays inside the viewBox (rsvg bbox 1..136 of 140 at 10×, so no edge clipping).
- **Licence:** CC0, studio-owned, entry added to `assets/LICENSES.md`.
- **Implementation:** `currentColor` only inherits when the SVG is **inlined**, or used as a CSS `mask` with `background:currentColor`. It does not inherit through `<img src>`. Per the 23:10 build note it goes in the `.st` span (aria-hidden, focusable=false, 14px, vertical-align −2px, 4px gap).
- **Previews:** `<engine>-360-moon-ink-card-1x.png` / `-2x.png` (as built, dimmed) and `-2x-h3undimmed.png` (the fix below). **Superseded 02:10 for the order** by `<engine>-360-moon-ink-card-{1x,2x}-after-word.png` ('Asleep' then the moon; see the amendment at the end).
- **Contrast against the card #FFF8EE** (ink #3E2C23 inherited from `.st`), from computed styles and pixel-sampled, the same in all 3 engines at 1x and 2x:
  - **As built: ~~2.94:1~~ 2.87:1 [A 03:41], FAIL ≥3:1.** The asleep card is `.wk.asleep.is-off`, and `.wk.is-off .wk-body{opacity:.5}` blends the ink to #9D9087. This also puts the "Coop Hand · Asleep" text at ~~2.94:1~~ 2.87:1, below 4.5:1 for text. That is a pre-existing build issue, not caused by the icon.
  - **With the h3 left undimmed** (~~`.wk.is-off .wk-body{opacity:1}.wk.is-off .wk-body>:not(h3){opacity:.5}`~~ → signed m9 `.wk.is-off .wk-body{opacity:1}.wk.is-off .wk-body>.ebar{opacity:.5}` [A 03:41]): **~~12.71:1~~ 12.53:1, PASS**. ~~This is the proposed fix: dim the bar and the meta, not the name/state line.~~ m9 dims only the energy bar (and a future portrait). The meta stays at 1.
  - Fallback, if the dim must stay on the h3: opacity ≥.70 gives 4.99:1, which passes both icon and text (.60 = 3.73, icon only).

### R3. Refill min-width (all countdowns m:ss per 23:10; the 's' format is dropped)
- **tnum:** the shipped `fredoka-latin-500/700-normal.woff2` have GSUB features **ccmp, frac, liga only, so no `tnum`**. Their digits are proportional (700: 1=379, 5=493, 6/9=521, 7=522, 8=541, 4=551, 0/3=565, 2=566 /1000 em). `font-variant-numeric:tabular-nums` is therefore a **no-op** in all 3 engines. Nunito 400/700 has no tnum either, but its digits are already 600 wide, i.e. tabular by default.
- **Fallback, used for the number below:** size the min-width to the widest realistic label instead of relying on tnum. I measured every label from `Refill in 0:00` to `Refill in 2:30` (151 labels). The widest is `Refill in 2:22` at 202.58, against 202.52 for 0:00. Rounding up gives the same whole px.
  - Optional: to stop the digits shifting inside the fixed box, set the timer span to `display:inline-block;min-width:2.65em` (4 glyphs), or ship a Fredoka build with tnum. I have not measured either.
- **Breakdown** (`.wk .btn.manage`, Fredoka 700 18px, padding 24+24, border 2+2, icon 44, gap 6): `Refill in 0:00` natural = **202.52px** (FF 202.517).
- ~~**min-width: 203px** (ceil).~~ **Superseded 23:31 → 208px (see the amendment below).** At 203: All four labels render at **203×48, 1 line**, with no jump, in all 3 engines and at all 3 widths:
  - Refill 144.86 → 203
  - Refill in 0:42 202.28 → 203
  - Refill in 0:00 202.52 → 203
  - Refill in 2:30 202.53 → 203
  - None of the 151 labels exceeds 203.
- **360 card:** 203 of the 308px `.wk-refill` column, so it fits (105px spare; fitsCard true at 360/390/1280).
- **The 's' format:** under the 22:55 run, '42s' = 196.36 and the widest 's' label '22s' = 196.64, both inside 203. That is moot now that every countdown is m:ss (23:10).

### R4. .cooptip fix (Minor m8): `font:600 14px/1.3 var(--f-body); width:max-content; max-width:min(320px, calc(100vw - 32px))`
| Width | rect l,t,w×h | text w | lines | computed font / line-height | clip / offscreen / over nav |
|---|---|---|---|---|---|
| 360 | 20, 459.63, 320×56.38 | 257.91 | 2 | 14px 600 Nunito / 18.2px | no / no / no (nav top 576) |
| 390 | 35, 663.63, 320×56.38 | 257.91 | 2 | same | no / no / no |
| 1280 | 480, 619.63, 320×56.38 | 257.91 | 2 | same | no / no / n/a (no bottom nav) |

FF: 56.4 tall, 257.88 text. WK: line-height 18.199999px.
**PASS:** the declaration is now valid, and the tip went from 3 lines to 2 at 360/390.
Note: only Nunito 400/700 ship, so weight 600 renders with the **700 face**, as the CSS font-matching rules require. If a true 600 is wanted, it needs a 600 woff2; otherwise spec it as 700 to say what ships.

### R5. Auto-refill switch row, 360 wireframe: `art-ux/wireframes/m51-autorefill-row-360.png`
- **Where:** the Manage/Shift sheet is **spec-only, not in build 30b29d3**: rc2-refill-proposal v1.1 + rc2-workers-copy §3, a 328px content width, one row per worker, line 1 name+pill+at-risk, line 2 the 280px Refill button. The Auto-refill row is drawn as line 3 of each worker row, per LR-G6 / AC-LR17 / Art 23:10 (not on the card action row).
- **Tap target:** the whole row is one target, `role="switch"`, `aria-checked`, Space/Enter toggles. Measured **304×52px** (≥44). The switch visual is 44×26 (knob 18).
- **Text:** label 'Auto-refill' in Nunito 700 15/20 and sub-line 'Uses a charge at 20%' in Nunito 400 12/16, #6B5D52. Each is 1 line, in a 214px text column.
- **Accessible name:** 'Auto-refill, Market Hand' (the worker name is needed because there is one row per worker). Description: the sub-line, with its % read from data.
- **Off:** white track with a 2px #3E2C23 outline (12.31:1 on cream / 13.21:1 on white), knob left #6B5D52 (6.34:1 on track), word "Off".
- **On:** #3D7F33 track (4.57:1 on cream / 4.90:1 on the white row), knob right in white with an ink ring and a ✓ (4.90:1), word "On".
- **Contrast:** every state-carrying part is ≥3:1.
- **Not colour alone:** knob position + ✓ glyph + On/Off word (the word is aria-hidden; the state comes from aria-checked).
- **Focus:** a #2B79A8 3px ring with a 2px offset (shown on the On row).

### Summary after rulings
| Item | Result |
|---|---|
| Toasts (asleep ×2, Auto-refilled ×2) | PASS ≤2 lines, no clip, **only with width:max-content added**. Both asleep toasts now wrap at 1280 |
| Ink moon | Drawn + CC0. Contrast **~~2.94:1~~ 2.87:1 FAIL as built** (card dim .5), **~~12.71:1~~ 12.53:1 with the h3 undimmed** [A 03:41] |
| Refill min-width | **208px** (23:31; was 203). tabular-nums is a no-op (no tnum in Fredoka). 208 covers every label up to 2:30 with 5.42px headroom and no jump. 360 fits |
| .cooptip m8 | PASS: 320×56.38, 2 lines, 14px Nunito (600 → 700 face), no clip |
| Auto-refill row | Wireframe done: 304×52 row switch, ≥3:1, not colour-only |

### Final rulings: SIGNED (Head, art-ux/decisions.md 23:15), recorded 2026-10-24 23:20 CEST
- **Toast:** `width:max-content` APPROVED. Final rule: `white-space:normal; text-align:center; border-radius:16px; width:max-content; max-width:min(320px, calc(100vw - 32px))`. 2 lines at 1280 for the asleep toasts is accepted.
- **Moon:** `icon-moon-ink.svg` (CC0) goes inline in `.st`, not via `<img>`. The asleep card leaves the name/state line undimmed (~~12.71:1~~ 12.53:1 [A 03:41]); only the portrait and the energy bar may dim. The live build's ~~2.94:1~~ 2.87:1 is logged as **Minor m9**.
- **Refill:** ~~`min-width:203px`~~ → **`min-width:208px`** (amended 23:31, below). Drop `tabular-nums`, because the shipped Fredoka has no tnum. No timer span.
- **.cooptip (Minor m8):** specced as **700**, since 600 isn't shipped and would render with the 700 face anyway: `font:700 14px/1.3 var(--f-body); width:max-content; max-width:min(320px, calc(100vw - 32px))`.
- **Auto-refill row:** APPROVED as wireframed (304×52 row switch; state shown by knob position + On/Off). The ✓ must be an SVG, not a glyph.
  - Checked: v1 drew the ✓ with a rotated CSS border on a `::after` pseudo-element, so neither a text glyph nor an SVG.
  - It is now redrawn as an inline SVG, new `assets/icon-check.svg`: 12×12 viewBox, 2px stroke with round caps and joins, currentColor, #3D7F33 on the white knob (4.9:1). Added to LICENSES.md as CC0.
  - `wireframes/m51-autorefill-row-360.png` was re-rendered under the lock (Chromium, DPR 2), and the manifest sha256 is updated (025cd2ce…). v1 is kept at `scratch/m51-autorefill/row-360-v1-cssglyph.png`.
  - Note for the build, outside this ruling: the sheet's at-risk `⚠︎` is still the U+26A0 text glyph from the rc2 copy spec. `icon-warning.svg` exists if Head wants the same SVG-only rule applied there.

### Amendment 23:31 (decisions.md 23:31): Refill min-width 203 → **208px**
PMW measured only 0.42px headroom at 'Refill in 2:22' (203 − 202.58), which is too thin against font drift. I re-measured on 30b29d3 with `.wk .btn.manage{min-width:208px}` (script `scratch/m51-clockwage/cw3.mjs`, under the lock, Cr/FF/WK, 360/390/1280; data `cw3-<engine>.json`; shots `<engine>-<w>-btn208-*.png`, `manifest-r2331-<engine>.json`):

| Label | natural (Cr / FF / WK) | at 208: w × h, lines | fits the card |
|---|---|---|---|
| Refill | 144.86 / 144.87 / 144.86 | 208 × 48, 1 | yes |
| Refill in 0:42 | 202.28 / 202.28 / 202.28 | 208 × 48, 1 | yes |
| Refill in 0:00 | 202.52 / 202.52 / 202.52 | 208 × 48, 1 | yes |
| Refill in 2:30 | 202.53 / 202.53 / 202.53 | 208 × 48, 1 | yes |
| widest of all 151 (0:00–2:30): Refill in 2:22 | 202.58 / 202.57 / 202.58 | — | **headroom 5.42px** |

- **Column:** 308 / 338 / 346 at 360 / 390 / 1280. At 360, 208 of 308 leaves 100px spare. No label exceeds 208, so nothing jumps, in any engine at any width.
- **Final:** `.wk .btn.manage{min-width:208px}`; no tabular-nums, no timer span.

### Refill 208px full-row check for PM Workers, 2026-10-24 23:37 CEST
Spec: **PMW failure-cost v0.3.6** (`product/workers/m5.1-worker-failure-cost-proposal.md`, sha1 `b6f4fe5f01a6acad08a1b7d3ef65897be4681c0e`), **B-4** (min-width 208px) and **AC-FC13** (constant-width countdown, `scrollWidth ≤ clientWidth`) / **AC-FC17** (fonts/build note).
- **Method:** `scratch/m51-clockwage/cw4.mjs` under the lock, on 30b29d3 with `.wk .btn.manage{min-width:208px}`, in Cr/FF/WK at 360/390/1280. Data in `cw4-<engine>.json`, shots `<engine>-<w>-row208-*.png`.
- **What was audited:** every descendant of **all 4 worker cards** on the Workers tab: MH and CH asleep (`.wk.asleep.is-off`), Hawker and Grader working. That was done for 6 combinations each: the button `Refill` / `Refill in 2:30` × the caption `Still paid $15.00/min` / `Rested, refill below 50%` (the widest in the precedence set) / `Resumes at $9,999.99`.
- **Checks:** text wrapping to >1 line, `scrollWidth > clientWidth` (non-visible overflow), ellipsis, element outside the card, text outside the card's inner box, and card overflow.

| Width | Card (CH) | `.wk-refill` column | Button | Caption | Issues (4 cards × 6 combos × 3 engines) |
|---|---|---|---|---|---|
| 360 | 16,355 328×164 | 308 | 208×48, 1 line | 1 line at y 493 (button bottom 493, no overlap) | **0** |
| 390 | 16,482 358×164 | 338 | 208×48, 1 line | 1 line at y 620 | **0** |
| 1280 | 898,569 366×164 | 346 | 208×48, 1 line | 1 line at y 707 | **0** |

- **Fit:** the card height stays 164 in every combination, with nothing wrapping, clipping or overflowing in any card in any engine.
- **Headroom:** the widest label 'Refill in 2:22' is 202.58, so there's 5.42px inside 208 (vs 0.42 at 203). At 360, 208 of the 308 column leaves 100px spare.
- **AC-FC13:** all four labels (Refill / 0:42 / 0:00 / 2:30) are 208 wide, so the width is constant. `scrollWidth ≤ clientWidth` holds on the button label.
- **AC-FC17:** the fonts measured are the shipped Fredoka 700 / Nunito 400 woff2 from `dist-qa/fonts` (no fallback face in any engine).
- **Verdict: PASS.**

### Amendment 2026-10-25 02:10 (HoAUX, decisions.md 02:10, Q-M5-1 / Q-M5-2): moon after the word, one implementation
- **Why:** Minor m5 is SIGNED (`m4.1-ui-minors.md` 32981c8d). Every card puts the state icon **after** the state word, the same as P-ICON-WARN ('Unpaid' + warn), so the word stays first and is read first. M5.1 doesn't get a second moon implementation; it reuses m5's.
- **Changes** to this package (paper only):
  - The `.st` moon is now `'Asleep' + MOON_SVG`, where MOON_SVG is the inline copy of `assets/icon-moon-ink.svg` with `class="wi wi-moon" aria-hidden="true" focusable="false"`.
  - CSS is m5's: `.wk .st .wi{display:inline-block;width:14px;height:14px;vertical-align:-2px;margin-left:4px;color:#fff}` + `.wk .st .wi.wi-moon{color:inherit}`. The override is required, otherwise the moon is #FFF on #FFF8EE at 1.05:1.
  - This replaces the R2 implementation note's moon-before-text `margin-right:4px` placement.
- **Re-shot** under the lock with `scratch/m51-clockwage/cw5.mjs`: 360, 1x + 2x, Cr/FF/WK, on a real asleep CH card with the m9 after-CSS and caption 'Still paid $15.00/min'. Shots `<engine>-360-moon-ink-card-{1x,2x}-after-word.png`, `manifest-r0210-<engine>.json`, indexed in `manifest.json` → `amend_0210`.

| Engine | `.st` | moon | h3 | card | moon colour |
|---|---|---|---|---|---|
| Chromium | 115.45,497 65.14×20 'Asleep' | 166.59,500 14×14 | 308×20, 1 line, no overflow | 16,455 328×164 | #3E2C23 |
| Firefox | 65.15×20 | 166.60,500 14×14 | 1 line | 328×164 | #3E2C23 |
| WebKit | 65.13×20 | 166.56,500 14×14 | 1 line | 328×164 | #3E2C23 |
- **Contrast:** the moon is 12.53:1 on #FFF8EE. Corrected figures per HoAUX 02:00: the exact values are 12.53:1 undimmed and 2.87:1 dimmed. They replace the 12.71 / 2.94 quoted in the R2, Summary and Final-rulings sections above; no verdict changes.
- **Accessible name:** the h3 reads 'Coop Hand · Asleep'. The moon is aria-hidden.
- The fit is unchanged: the same 65.14 span width as the moon-first order, and the h3 stays on 1 line.
- **FYI for PM Workers (not edited, other team's file):** `product/workers/m5.1-worker-failure-cost-proposal.md:34/67/88` say '"Asleep" + inline icon-moon-ink.svg', which already matches the word-first order. Its 12.71:1 at :34 is superseded by 12.53:1.

### Amendment 2026-10-25 03:41 CET (UTC+1): consistency-pass strike-throughs
Source: `art-ux/m5.1-ui-consistency-pass.md` (sha1 `1cafe530…`), accepted by HoAUX at 03:41 CET. In-place edits are strike-throughs marked `[A 03:41]`. The signed text stays readable under the strike, and no verdict, rect or min-width changes.
- **TM-2 (seconds labels):** :10 `Refill in Ns`, :22 `Ready in 30s / 599s`, :83 `Refill in 42s` and :90 `Refill in 599s` are struck. Every countdown is `m:ss` (23:10, R3). The 208px Refill min-width (23:31) stands.
- **MT-6 (moon fill literal):** :45 "fill #5A4C42" is struck. The shipped `assets/icon-moon-ink.svg` uses `fill`/`stroke="currentColor"` (R2 :120) and renders ink #3E2C23 = 12.53:1 on #FFF8EE.
- **OP-1 (`:not(h3)`):** :127's proposed `.wk-body>:not(h3){opacity:.5}` is struck in favour of the signed m9 `.wk-body>.ebar{opacity:.5}`. `:not(h3)` would have left 'Energy 0%' at 2.15:1.
- **CF-1 (12.71 / 2.94):** :126, :127, :170 and :177 now read 12.53 / 2.87, as already stated in the 02:10 amendment (:231). `decisions.md` :330/:334 (append-only) and PMW's proposal :34 (not ours) are left as they are.
- **Timer rules:** ticking countdowns use `m:ss` below 1 h and `h:mm:ss` from 1 h, with ceil and no `0:00` end state. The `Refill in 0:00` rows here are width-measurement cases only. See `proposals/style-direction-m51-conventions.md` and `notes/pmw-m51-timer-note.md`.

