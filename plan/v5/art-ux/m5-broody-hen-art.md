# M5.0 Broody Hen: Art & UX spec · v0.1 · 2026-10-24 · Head of Art & UX
**Status:** PAPER (the build hold stands; no code). Answers PM Collection's `product/collection/m5-broody-hen-spec.md` v1.0 Q1 / §7 "Art & UX" items and review R2.
**Sources:** broody spec v1.0 (R3–R5, R11–R14, BH-AC13/14/17), its review, `m4-timed-collectible.md` v1.1 (golden egg, same overlay framework), `decisions.md` 2026-10-24 16:14 (sound call 4), `m5-workers-ui-signoff.md` (icon and aria rules), RC `5d9efa6` code (`src/ui/app.ts:79-80, 210, 544-550`, `src/ui/styles.css:83-86` tokens), PR #69 (`min(hens[H],12)` sprites, same slot order).
**Measured:** live `getBoundingClientRect()` on a `build:qa` of `5d9efa6` (Chromium 156, headless) at 10 viewports, F12 so all 12 slots are drawn. Data and scripts: `scratch/m5-layout-recheck-5d9efa6/` (`rects.json`, `v11.py`). Wireframes: `wireframes/m5-broody-{360x640,1280x800}.svg` (+ `.png` previews).

## 1. What she is (and #69 interplay)
- **She takes a slot; she's not an extra hen.** The broody hen is one of the hens already drawn in the yard (`#yard > span`, slots Y0–Y11, draw order `[2,3,1,4,0,5,8,9,7,10,6,11]`). The sprite count stays `min(hens[H],12)` (#69). No 13th sprite, and the `×N hens` pill keeps counting every hen, including her.
- The hen keeps the same `char-chicken.svg` sprite (and its `flip` for slots where `i % 3 === 2`). The broody look comes from added layers: a nest under her, plus a glow and ring behind her (§3).
- Decorative layers go **inside her yard slot**. `#scene` is `aria-hidden` and a click anywhere on it collects (`app.ts:210`). The **interactive hit button lives in the overlay layer** (HoE F6 `ui/overlay.ts`, the golden egg's layer), positioned from the live slot `<img>` rect.
- **#69 m1 follow-up dependency:** RC/#69 rebuild `yard.innerHTML` on every count change (`app.ts:546-548`), and that wipes the slot layers. The Broody UI PR must either land the m1 follow-up (build the 12 slots once, fill only new ones) or re-apply `.is-broody` and the nest after every rebuild. Either way, re-position the overlay button after any yard change or resize (R19).
- On a Hens buy, the current broody stays in place if her slot is still drawn and eligible (B10). Slots only ever get added in draw order, so her index stays valid.

## 2. Placement rule (R4 for Art; runtime live-rect check, re-run every 500 ms of active time and on layout change)
**Hit box:** 56×56 CSS px, centred on the slot `<img>` centre at rest (ignore the 2px bob). That's ≥44 (tap floor) and the same size as the golden egg.
A drawn slot is **eligible** only if its hit box is:
1. **≥16 px from every tap target and the toast:** `#collect`, the coop `<img>` box (clipped to `.farm`), the `.nest` box, `#goal`, `#queue` (order chips), the HUD, the bottom nav, the docked column, the toast strip, the on-screen golden-egg hit box, and any open sheet/modal/scrim.
2. **≥8 px from non-interactive readouts:** the coop fill `#meter`, the streak meter box (8px bar under Collect, still reserved while hidden), the `Full!` badge, and the `×N hens` pill while it's visible.
3. **≥8 px inside the viewport and safe-area insets.** That matches the 8px farm padding at ≤390 and keeps her out of OS edge-swipe zones.

Choose uniformly among eligible slots with `evRng` (PM R4), and never re-pick the current slot when another is eligible.
**Yard full (12 drawn, hens > 12):** nothing moves. She's still one of the 12. The `×N hens` pill now shows, so any slot it covers drops out while it's visible: Y6 at all phone widths, Y6–Y7 at ≤430, Y6 at docked, Y0 at 1024×474.
**No eligible slot:** no hen is marked and the nest keeps filling invisibly (PM R5). She's **never** placed outside the yard, never on the coop/nest/Collect, and never as an extra sprite. On every matrix viewport below, that case can't happen with ≥5 hens drawn.

**Measured eligible slots (RC 5d9efa6):**
| Viewport | Pill hidden (≤12 hens) | Pill shown (>12 hens, all 12 drawn) | Why the others drop |
|---|---|---|---|
| 360×640, 375×667, 360/375/390/430×844 | Y0 Y5 Y6 Y7 Y8 Y9 Y10 Y11 | Y0 Y5 Y8 Y9 Y10 Y11 | Y1–Y4: hit box overlaps the coop box bottom (−9/−10 px) and the nest (Y2/Y3) |
| 1280×800, 1280×720, 1366×768 | Y0 Y5 Y6–Y11 | Y0 Y5 Y7–Y11 | Y1–Y4: 0–3 px from the coop box (<16) |
| 1024×474 (docked, short) | Y0 Y5 | Y5 | Y1–Y4 under the coop; Y6–Y11 overlap the meter/goal (−31 px) |
- **Few hens:** at H0 (#69: 5 hens drawn = Y2 Y3 Y1 Y4 Y0), **Y0 is the only eligible slot**, and it is eligible at every viewport. So BH-AC13 (≥1 eligible slot with ≥6 hens drawn) passes everywhere, and the review's R2 low-Hens worry is closed: 360×844 with 5 hens gives Y0.
- **360×640 note:** row-2 slots clear the meter by 15 px. That fails a 16 px rule, which is why readouts get 8 px (rule 2): the meter isn't tappable, so there's no misclick risk.
- **A near-miss is a Collect tap, and that's harmless.** `#scene` collects on click. A `brooding` hen's button is `pointer-events:none`, so a tap on her falls through to the scene and collects (BH-AC5: the hen pays nothing). A `ready` hen's button handles the tap with `stopPropagation()`, so one tap gives exactly one payout and never also collects.
- **Golden-egg interplay (R15):** the broody hit box + 16 px is a golden-egg no-spawn zone. In the worst case (broody at Y5, top-right outer slot) the golden egg keeps **≥4 of 8 spots on phones, 7/8 docked, and 3 of 6 at 1024×474** (m4-timed-collectible.md v1.1 §2). So no slot preference is needed.

## 3. States (`data-broody-state`), matched to PM R11
Layers, back to front, inside the slot: `glow` (CSS) → `ring` (CSS) → nest `back` → coins → hen sprite → nest `front`. All of them are `pointer-events:none`.
| State | Condition (PM) | Nest | Glow (decorative) | Ring (the real cue, ≥3:1) | Hen motion | Button |
|---|---|---|---|---|---|---|
| (none) | not unlocked / no eligible slot | none | none | none | normal bob 1.6s | none |
| unlock (enter `brooding`) | first Coop Hand hire / re-pick after a payout | pops in: scale 0→1, **300ms `--ease-pop`**, once (200ms delay after a payout) | – | – | bob | present, `pointer-events:none`, `aria-hidden` |
| `brooding` | nest < ready | coins by fill: 0 at <25%, **coin-1** at ≥25% (scale-in 200ms ease-out) | none | none | normal bob | as above |
| `ready` | nest ≥ ready | **coin-1 + coin-2** | 60px radial `--c-yolk` #FFC93C at 75%→0 behind the hen, opacity .55↔.85, **1.6s** ease-in-out loop; it fades in over **400ms** at the transition | **one ring**, 54px circle, 2px `--c-text` #3E2C23 (9.5:1 on the yard grass #BFE6A8) | **wobble** replaces the bob: rotate −4°→+4°→0 around the bottom centre, in the first 30% of a **2.4s** cycle, then still (ease-in-out) | focusable, tappable |
| `full` | nest ≥ cap | **coin-1..3** | the same glow, pulse slowed to **3.2s** ("settled") | **double ring**: the 54px ring plus a 2px `--c-text` outer ring 4px outside it (`box-shadow:0 0 0 2px var(--c-cream),0 0 0 4px var(--c-text)`, 62px; it clears the neighbour hens, which sit ≥33px from her centre at 360) | no wobble; hen sits still (bob off) | tappable |
| `frozen` | a D-HOP-04 #4 menu is open | as before | as before, `animation-play-state:paused` | as before | paused | `inert`, `pointer-events:none` |
| collected (transition) | tap while `ready`/`full` | coins clear instantly; the nest fades out over 150ms, then pops in at the new slot (300ms `--ease-pop`, 200ms delay) | fades out over 150ms | removed | hen squash: scale 1→.92→1 over **150ms** ease-out | removed, re-created at the new slot |
- **Coin fly:** 3 coins fly from the nest to `.pill.coins` using the existing `fly()` (the same feel as the egg flyers), and the coin pill pulses.
- **Feather puff** (from `full` only, PM R14): 6 `--c-cream` #FFF6E5 dots, 6px with a 1px `--c-outline`, radiate 20px over 300ms ease-out. They count toward the 30-element FX budget.
- **Popup:** `+$61.88` at the hen, using the §5 format rule of m4-timed-collectible.md v1.1 (**short money**: `+$61.88`, `+$1.2K`, `+$1.2M`). Fredoka **20**/700 `--c-text` on a `--c-cream` pill (padding 4×10, 2px `--c-outline`). That ranks it below the golden egg's 24px yolk pill. It rises 24px and fades over 1.0s ease-out, `pointer-events:none`, **clamped inside the viewport** (left = clamp(x − w/2, 8, vw − 8 − w)). Realistic range: F7 ready ≈ `+$40.50`, F30 cap `+$581.25`, F30 cap with an ×8 price stack `+$4.7K`. Longest under-$1K form is `+$999.99` (8 chars); longest short form is `+$999.9K` (8 chars). Both are under 130px at 20px, so they fit at 360 with the clamp. No `!` (that's golden egg only).
- **Colour-blind safe (WCAG 1.4.1):** the state never depends on colour alone. brooding = no ring; ready = 1 ring + 2 coins + wobble; full = 2 rings + 3 coins + still. The yolk glow is decoration (1.1:1 on grass, so it's never the only cue).
- **Reduced motion** (`prefers-reduced-motion` or the in-game toggle, `.rm`): no bob, wobble, glow pulse, coin scale-ins, coin fly or puff. The glow is static at .7. Ready = **solid single ring**, full = **double ring** (PM R11, BH-AC17). The nest swaps instantly. Collect = instant hide plus a popup that holds 1.0s and fades over 150ms with no rise. `getAnimations()` on the broody layers is empty except that 150ms fade.
- **Sound (decided 16:14, call 4):** the ready glow is **silent**. `sfx-broody-ready` is **one soft one-shot when she becomes ready** (≤350ms, gain 0.35, below the golden spawn's 0.6), once per ready episode, never repeated, and **not** played on `restored:true` at load. On collect: `sfx-broody-collect` (soft cluck + coin, m5-sound-spec v0.2). Both follow mute.

## 4. Accessibility and the button
- `<button class="broody" aria-label="Collect broody hen nest, $61.88">`. It's icon-only (no visible text), so `aria-label` is allowed (WCAG 2.5.3 rule: no aria-label only on visible-text controls). The amount comes from `fmtMoneyAria`.
- It's focusable **only** in `ready`/`full`; otherwise `tabindex=-1` and `aria-hidden`. Tab order: after Collect and the golden egg. Enter/Space collects. Focus ring is 3px `--c-focus` #2B79A8, offset 2.
- The polite live region says "Broody hen ready, $X" once per ready episode (PM R11). On payout, focus moves to Collect if it was on the hen.
- No emoji or glyph text anywhere. Every image is SVG.

## 5. Nest asset: `public/assets/overlay-broody-nest.svg` (source `art-ux/assets/overlay-broody-nest.svg`, drawn, FINAL 2026-10-24 Head of Art & UX; group ids `broody-nest-back`, `broody-coin-1`/`-2`/`-3`, `broody-nest-front`)
- **Name:** kebab-case with the `overlay-` type prefix, the same family as `overlay-yawn.svg`: a sprite layered over a scene element.
- **viewBox `0 0 56 24`, rendered 56×24 CSS px.** Centred on the hen's x, with its top at the sprite's top + 28px. At 360 the row-1 nest ends at 362, clear of the row-2 hen tops at 365. Drawn in the `icon-nest.svg` style (q-curve bowl, round joins and caps).
- **Palette (tokens only):** straw `--c-wood` #A86B3C fill; 2px `--c-text` #3E2C23 outline; weave strokes `--c-wood-text` #8A5528 1.2px at 50% opacity; coins `--c-gold` #E8B020 r4 with a `--c-yolk` #FFC93C highlight dot and a 1.5px `--c-text` outline.
- **Layers (`<g id>`; engineering inlines the file once and references the groups with `<use>`):**
  - `broody-nest-back`: the rear rim and bowl interior, drawn **behind** the hen;
  - `broody-coin-1`, `-2`, `-3`: coins peeking left (x≈10), right (x≈46) and front-centre-left (x≈20) above the rim, toggled by `data-fill` = 0/1/2/3;
  - `broody-nest-front`: the front rim arc plus 2 weave strokes, drawn **in front of** the hen, so she looks like she sits in it.
- No text, no gradients, no filters. ≤1.5 KB. Glow and rings are CSS (no asset).

## 6. Wireframes
- `wireframes/m5-broody-360x640.svg` and `wireframes/m5-broody-1280x800.svg` (PNG previews beside them). They draw the live zones, all 12 slot hit boxes (green = eligible, red dashed = not), a sample broody at Y8 with its 56px hit box + 16px margin, nest and ring, and the golden-egg v1.1 spots.
- 360×640 (phone, one thumb): she sits in the yard band between the coop's ground line and the meter, never under the Collect button (bottom), the coop/nest (centre), or the nav.
- 1280×800 (docked): the same yard inside the centred 560px scene. The docked column (880–1280) is never used.

## 7. Open / for PM Collection
- PM R4's zone list should add the `Full!` badge and the `×N hens` pill (8px, readouts), and split margins: 16px for tap targets and the toast, 8px for the meter and streak box. Without the split, 360×640 row 2 fails by 1px (meter 15px).
- BH-AC17 is unchanged. Under the v1.1 short-money call (m4-timed-collectible.md §5, `fmtMoneyShort`), BH-AC16/B12 change: 6,188 / 123,456 / 120,000,000 cents read `+$61.88` / **`+$1.2K`** / `+$1.2M` (was `+$1,234.56`). Aria stays the exact `fmtMoneyAria`. Please restate R14, B12 and BH-AC16.
- Pre-existing layout finding (not M5): at docked short heights the coop sprite overflows the squashed `#scene`. At 1024×474 the coop box runs to y −7 (clipped under the HUD) and its roof covers the 4th queue chip; at 1280×720 it touches the queue (148 vs 149). Logged for an M4.2/M5 layout fix: cap the coop by scene height.
- Assets to draw before the UI PR: `overlay-broody-nest.svg` (≈0.25d). The CSS states need no art. Art total for Broody is about 0.5d plus the PR review.

## Change log
- v0.1 (2026-10-24): first spec. States, nest asset, placement rule with live-measured eligible slots, wireframes, #69 interplay.
- v0.2 (2026-10-24): §5 nest drawn and signed off FINAL; group ids confirmed: `broody-nest-back`, `broody-coin-1..3` (approved, matching §3 brooding/ready/full), `broody-nest-front`. Weave stays #8A5528.
