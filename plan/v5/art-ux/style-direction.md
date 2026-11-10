# Egg Farm Studio — Visual Style Direction (M1 draft)
Owner: Head of Art & UX · 2026-10-15 · Status: draft for Product/Eng review

## Mood
Cozy, sunny, toy-like countryside. Warm morning light, soft rounded forms, gentle humor (chickens with personality). Satisfying "number goes up" idle feel without visual noise. References: cozy idle/tycoon games, children's picture-book farms.

## Platform & resolution (web-first per decisions.md; confirmed by Engineering 2026-10-15)
- Primary reference frame: **portrait phone 360×640 (minimum)**; scales up responsively to tablet and desktop landscape (secondary reference 1280×720).
- Rendering: plain DOM + CSS, no canvas/engine in M1. Juice = CSS animations / small DOM elements, **max ~30 on screen**.
- No hover-only interactions; min tap target 44×44 px.
- Assets: SVG for icons, UI and characters (one file each, kebab-case, viewBox, no embedded raster). PNG @2x only for complex painted art; no atlases. Stored in `art-ux/assets/`.
- Fonts: self-hosted Fredoka + Nunito woff2, `font-display: swap`.
- Respect `prefers-reduced-motion`.

## Palette
| Role | Name | Hex |
|---|---|---|
| Primary | Yolk Yellow | #FFC93C |
| Primary dark | Deep Yolk | #F29E1F |
| Secondary | Barn Red | #D9534F |
| Accent / success | Meadow Green | #6BBF59 |
| Sky / info | Sky Blue | #8FD3F4 |
| Background | Eggshell Cream | #FFF6E5 |
| Surface | Warm White | #FFFFFF |
| Wood / panels | Coop Brown | #A86B3C |
| Text | Soil Brown | #3E2C23 |
| Text muted | Hay Gray | #6B5D52 (M3 AA; was #8A7B6E) |
| Currency (coins) | Coin Gold | #E8B020 |
| Disabled | Dust | #CFC6BA |
**M3 AA tokens (text/UI use):** Meadow Strong #3D7F33 (button bg, arrows, toasts), Barn UI #B83B37 (badges, Danger, close), Wood Text #8A5528 (hint text), Focus #2B79A8 (focus ring), Slot outline #6B5D52. Original Meadow/Barn/Wood stay for illustration fills only. Full before/after table: m3-next-goal-spec.md §A.
**rc1 tokens (2026-10-16, rc1-upgrade-value v1.4):** `--c-meadow-text:#2F6B27` (green text on tint, 5.68:1 on `--c-meadow-tint:#E8F4E4`); `--c-meadow-tint:#E8F4E4` (effect chip bg); `--c-danger:var(--c-barn-ui)` #B83B37 (asleep/unpaid banner + count badge, white text 5.65:1). Best buy outline uses `--c-yolk-dark`; `--c-focus` is reserved for keyboard focus.
Contrast: body text Soil Brown on Cream/White (AA+). Never put white text on Yolk Yellow; use Soil Brown.

## Shape language
- Rounded everything: egg/oval and pill shapes; corner radius 12–16 px on panels, full pill on buttons.
- Thick soft outlines (2–3 px, Soil Brown at ~80%), subtle drop shadow beneath (chunky "toy" depth, 4 px offset).
- Buildings chunky and squat; chickens round and bouncy. Avoid sharp angles except for warnings.

## Typography
- Display/numbers: Fredoka (rounded, bold) — currency counters, titles, buttons.
- Body/UI: Nunito — descriptions, tooltips, stats.
- Both free (Google Fonts / OFL). Tabular numerals for counters; abbreviate big numbers (1.2K, 3.4M, 5.6B).
- Scale: 32 / 24 / 18 / 16 / 14 px.

## Iconography
- Flat, filled, rounded icons with the same outline style; 24 px grid, 2x export.
- Core set M1: egg, coin, basket (collect), cart/stall (sell), customer, upgrade arrow, coop/farm, lock, settings, close, offline/clock.
- Color-coding: eggs = Yolk, coins = Coin Gold, upgrades = Meadow Green, locked = Dust.

## Animation & juice principles
1. Every tap responds within 100 ms (squash-and-stretch press, 0.95 scale).
2. Collect: eggs pop out with a bounce, fly to the egg counter; counter ticks up with a short scale pulse.
3. Sell: coins burst from customer/stall and arc to the coin counter; light "cha-ching" sfx.
4. Upgrade: button glows green when affordable; on purchase, sparkle burst + building/stat level-up bump.
5. Floating "+N" numbers for gains; batch/aggregate when rates are high (avoid particle spam, cap ~20 particles, hard limit 30 DOM elements).
6. Easing: ease-out-back for pop-ins, 150–300 ms; idle ambient loops (chicken bob, clouds) are slow and subtle.
7. Reduced motion: replace flights/bursts with fades and counter ticks.

## Open style questions
- Resolved: flat 2D farm view in DOM/SVG (no isometric) for M1, following Engineering stack.

**Icons on dark surfaces (2026-10-16, Head of Art & UX):** icons always sit on light surfaces; the HUD puts them in Eggshell pills even on the brown bar, so there is no dark-outline icon variant. If an icon must sit directly on a dark surface, add a 2px Eggshell Cream #FFF6E5 outer stroke outside the 2px Soil Brown outline (sticker style).

## Token addition (HoAUX 2026-10-25 03:26 CET, m10)
- `--c-muted-strong: #5A4C42`: text on disabled or aria-disabled controls (4.88:1 on the disabled fill #CFC6BA). It replaces the PT1-14 literal. Use `--c-muted` #6B5D52 for secondary text on cream/white, and `--c-muted-strong` wherever muted text sits on a darker fill.

## M5.1 conventions (HoAUX, SIGNED 2026-10-25 03:45 CET; from the M5.1 UI consistency pass)

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
- **Estimate exception confirmed (HoAUX 03:45):** `Affordable in ~m:ss` / `~h:mm:ss` stays in digits. The `~` is the estimate marker in every format, so any estimate must start with `~` and a ticking countdown never does.
