# Proposal: "M5.1 conventions" block for style-direction.md · UI/Visual Designer · 2026-10-25 03:40 CET · DRAFT for HoAUX

**Source:** `art-ux/m5.1-ui-consistency-pass.md` (sha1 `1cafe530…`), accepted by HoAUX at 03:41 CET with rulings TM-1, TM-3, TN-1 and MT-1/2. The block settles findings CH-1, IC-1, MT-3, TM-1, TM-3, TM-4 and TN-1, and it also records DB-1 and CH-4.

**Instructions:** `style-direction.md` is Head's file and has **not** been edited. Paste everything between the two rules below at the end of `style-direction.md`, after "Token addition (… m10)".

---

## M5.1 conventions (HoAUX 2026-10-25 03:41 CET; from the M5.1 UI consistency pass)

**Chips** (1px border or none, radius pill). The three sizes are deliberate; pick one by where the chip sits:
| Size | Use | Type | Height / padding | Background | Border |
|---|---|---|---|---|---|
| **xs** | HUD Present badge `.pchip` (breeds §7a) | Nunito 700 11/12 | 14 / 0 4px | `--c-white` | active 1px solid `--c-meadow-strong`; paused 1px **dashed** `--c-muted` + line-through on `+X%` |
| **sm** | Row status chip `.zg-chip` `No gain now` (ZG §1) | Nunito 700 12/16 | 18 / 0 8px | `--c-cream` | 1px **dashed** `--c-muted` |
| **md** | Goal status `.goal-status.chip` (styles.css:229) | Fredoka 600 12 | 24 / 0 10px | `--c-meadow-strong`, text white | none |
- New chips use one of these three sizes. Chip text stays ≥ 4.5:1 (xs 6.34 / 4.9, sm 5.91 on cream).

**Dashed = "not contributing now / not yet yours".**
- **1px dashed `--c-muted`** on chips means paused or zero-gain: the Present paused chip and the ZG chip. It's a shape cue, so it is never the only one: always pair it with text (`No gain now`) or a strike.
- **2px dashed `--c-slot-outline`** on cells and placeholders: the album unowned cell, and the **locked slot placeholder** (breeds §2 "Slot 2 · Farm 14").
- Dashed is **not** used for disabled buttons (m10: disabled = flat fill, `--c-muted-strong` text, no shadow).

**Muted text tokens** (both are already defined):
| Token | Value | Use | Contrast |
|---|---|---|---|
| `--c-muted` | #6B5D52 | Secondary text, hints, meta and chip text on **white / cream / #FFF8EE**; dashed chip borders | 6.34 white · 5.91 cream · 6.01 #FFF8EE |
| `--c-muted-strong` | #5A4C42 | Text on the **disabled fill** `--c-disabled` #CFC6BA (`.btn[aria-disabled=true]`, Manage all PT1-14); any muted text on a darker fill | 4.88 on #CFC6BA |
- **Write token first, literal second** in docs, e.g. `--c-muted` (#6B5D52). In CSS, use the token. The remaining `#5A4C42` CSS literals are backlog m11.
- **Don't dim text with opacity.** Only non-text parts may dim (`.wk-body>.ebar`, a future `.wk-portrait`; silhouette asset 0.55). Text nodes stay at opacity 1 (m9).

**Token table additions** (rows for the colour table above):
- `--c-muted-strong` | Hay Gray Strong | #5A4C42 | text on the disabled fill (m10, 03:26).
- **Defined but unused in the M4.1/M5.1 build** (30b29d3, grep 0 in `src/ui`): `--c-meadow-tint` #E8F4E4 ("effect chip bg") and `--c-meadow-text` #2F6B27. Keep them reserved, but don't cite them as shipped. Use them or drop them at the next token sweep.

**Icons inline with text** (`.wi`, inline SVG with `fill/stroke="currentColor"`, `aria-hidden="true"`, `focusable="false"`; never `<img>` when the colour must follow text):
- **Card state:** the icon goes **after the state word**: `'Unpaid' + WARN_SVG`, `'Asleep' + MOON_SVG` (`.wk .st .wi` 14px, `vertical-align:-2px`, `margin-left:4px`; `.wi-moon{color:inherit}` is required). The word is read first.
- **HUD value:** when there's no state word, the icon **leads the value**: `#rate` = `WARN_SVG` + `$0/s` (`.rate .wi` 11px, `vertical-align:-1.5px`, `margin-right:2px`; m6).
- Pictograph emoji (⚠ 💤) are not used as state cues in UI text.

**Time formats** (TM-1, TM-3):
| Kind | Format | Examples | Rule |
|---|---|---|---|
| **Ticking countdown** (exact, updates every second) | `m:ss` below 1 h; `h:mm:ss` from 1 h | `Ready in 1:00`, `Refill in 2:22`, `Settling 4:12`, `1:05:00` | Minutes are unpadded below 1 h, and seconds are always 2 digits. Hours are unpadded, with minutes and seconds padded to 2 digits. Round with **ceil**. **Never show `0:00`**: the last frame is `0:01`, then the state changes (breeds §2). Never show `60:00` or more as m:ss |
| **Estimate** (not ticking; marked `~`) | the F7 words | `~45 s`, `~1 min 5 s`, `~12 min`, `~1 h 5 min` | layout-spec §4.6b / `fmtTimeToAfford`. Exception: `Affordable in ~m:ss` / `~h:mm:ss` follows the countdown digits rule, with `~` |
| **Elapsed duration** (e.g. "slept {t}") | as a ticking countdown: `m:ss` / `h:mm:ss` | `slept 4:12`, `slept 1:05:00` | same padding rules |
- **Legacy seconds format** (`Ready in 30s`, nav `Ready in 30s` / `0:30`): migrate it to m:ss **when that code is next touched**. No standalone change.

**Numerals** (TN-1):
- **There is no tabular-figures claim.** Neither shipped font has `tnum`.
  - **Nunito** digits are all 600/1000 em, so its figures are fixed-width by design.
  - **Fredoka** digits are proportional (700: `1` 379 to `2` 566; 500: `1` 388 to `2` 587).
  - `font-variant-numeric:tabular-nums` is harmless but does nothing, so never rely on it.
- **Ticking Fredoka numbers reserve a min-width** on their control, so the box never jumps.
  - **How to size it:**
    1. Take the longest realistic label in the range.
    2. Set every changing digit to `2`, the widest glyph (`0`/`3` are within 1/1000 em).
    3. Measure the natural width in the shipped font at the used size, in Cr, FF and WK.
    4. Ceil it, then add **≥ 5px** of headroom against font drift.
  - Example: `Refill in 2:22` = 202.58px at Fredoka 700 18px → `min-width:208px` (clock-wage amendment 23:31).
  - Text is never truncated inside the reserved box: `scrollWidth ≤ clientWidth`.
- Ticking Nunito numbers need no reservation. Check their fit at the widest label anyway.

---

**Files cited:** `m5.1-breeds-ui.md` v0.2.6 §2/§7a; `m5.1-zero-gain-ui.md` §1; `reviews/m51-clock-wage-fit-30b29d3.md` R3 + amendment 23:31; `m4.1-ui-minors.md` m6/m9/m10/m11; `layout-spec.md` §4.6b; build 30b29d3 `styles.css:22, 229`, `format.ts:61–70, 125–131`, `workers-ui.ts:139`, `dist-qa/fonts/*.woff2` (digit widths from fontTools).
