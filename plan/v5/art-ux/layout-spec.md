# M1 Layout Spec (DOM/CSS) — Art & UX · v1 · 2026-10-15
Buildable spec for Engineering. Sources: product/core-loop-spec.md (AC1–AC11), screen-flow.md, style-direction.md, engineering/stack-and-architecture.md. All numbers in the UI come from config (AC9); this file only fixes layout and visuals.

> **Scope:** Welcome-back modal IN (Product confirmed). SFX IN, music OUT (CEO).

## 1. Tokens (`:root`)
```css
:root{
  /* palette */
  --c-yolk:#FFC93C; --c-yolk-dark:#F29E1F; --c-barn:#D9534F; --c-meadow:#6BBF59;
  --c-sky:#8FD3F4; --c-cream:#FFF6E5; --c-white:#FFFFFF; --c-wood:#A86B3C;
  /* M3 AA tokens (2026-10-15): use these for text/UI; the originals stay for illustration fills */
  --c-meadow-strong:#3D7F33; --c-barn-ui:#B83B37; --c-wood-text:#8A5528; --c-focus:#2B79A8; --c-slot-outline:#6B5D52;
  --c-text:#3E2C23; --c-muted:#6B5D52; /* M3 AA: was #8A7B6E */ --c-gold:#E8B020; --c-disabled:#CFC6BA;
  --c-meadow-text:#2F6B27; --c-meadow-tint:#E8F4E4; --c-danger:var(--c-barn-ui); /* rc1 v1.4 */
  --c-outline:rgb(62 44 35 / .8); --c-scrim:rgb(62 44 35 / .55);
  /* spacing (4px base) */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px; --s-6:32px;
  /* radii */
  --r-sm:8px; --r-md:12px; --r-lg:16px; --r-pill:999px;
  /* borders/shadow */
  --bw:2px; --shadow:0 4px 0 rgb(62 44 35 / .25);
  /* fonts */
  --f-display:"Fredoka",system-ui,sans-serif; --f-body:"Nunito",system-ui,sans-serif;
  --fs-xl:32px; --fs-lg:24px; --fs-md:18px; --fs-base:16px; --fs-sm:14px; --fs-xs:12px;
  /* layout */
  --hud-h:56px; --nav-h:64px; --tap-min:44px; --panel-max-w:480px;
  /* farm hint */ --c-hint:var(--c-muted); --fs-hint:var(--fs-xs); --hint-h:16px;
  /* motion */
  --t-fast:120ms; --t-med:240ms; --ease-pop:cubic-bezier(.34,1.56,.64,1);
}
@media (prefers-reduced-motion:reduce){:root{--t-fast:0ms;--t-med:0ms}}
```
Fonts: self-hosted woff2, `font-display:swap`. Numbers use `font-variant-numeric:tabular-nums`; format K/M/B (Engineering formatter); coins always 2 decimals under 1K (e.g. `$12.40`).

## 2. App shell & breakpoints
```
#app (100dvh, grid)
├─ header.hud        (row 1, --hud-h)
├─ main.farm         (row 2, 1fr)
└─ nav.actions       (row 3, --nav-h; portrait only)
 + #panel-layer      (fixed, overlays: Market, Upgrades, Settings)
 + #modal-layer      (fixed, z above panel: Onboarding, Welcome-back, Confirm)
 + #fx-layer         (fixed, pointer-events:none, z top: particles)
```
```css
#app{display:grid;grid-template-rows:var(--hud-h) 1fr var(--nav-h);height:100dvh;
     min-width:360px;min-height:640px;background:var(--c-cream);color:var(--c-text);font-family:var(--f-body)}
```
| Breakpoint | Rule | Layout |
|---|---|---|
| base (360–599 wide, portrait) | default | HUD top, farm middle, bottom nav 3 buttons; panels = bottom sheet, height 75%, full width |
| `min-width:600px` | tablet | panels = centered sheet max-w 480px; farm scene max-w 560px centred |
| `min-width:960px and orientation:landscape` (ref 1280×720) | desktop | `grid-template-columns:1fr 400px; grid-template-rows:var(--hud-h) 1fr`; nav hidden; **right column shows Market + Upgrades docked** (no sheet, tabs at top of column); Settings stays a modal |
Safe areas: pad with `env(safe-area-inset-*)`.

## 3. Screens
### 3.1 Loading / Tap to start
Full-screen flex column, centred, gap `--s-5`. Logo (text, Fredoka 32px, `--c-yolk-dark`, 2px outline via text-shadow) + `char-chicken.svg` 96px, progress bar 240×12px (`--r-pill`, track `--c-disabled`, fill `--c-yolk`). When loaded: replace bar with Primary button "Tap to start" (240×56). This tap = audio unlock (Engineering). States: loading / error ("Couldn't load — Retry", secondary button) / ready.

### 3.2 HUD (`header.hud`)
`display:flex;align-items:center;gap:var(--s-2);padding:0 var(--s-3);background:var(--c-wood);border-bottom:var(--bw) solid var(--c-outline)`
Order: **Coins pill** · **Basket pill** · spacer · **Settings button**.
- Counter pill: `height:40px;padding:0 var(--s-3) 0 var(--s-1);border-radius:var(--r-pill);background:var(--c-white);border:var(--bw) solid var(--c-outline);display:flex;gap:var(--s-2);align-items:center`; icon 32px; value Fredoka 18px bold; min-width 96px (coins), 88px (basket).
  - Coins: `icon-coin.svg`, value `$1,234.50`/`$12.3K`.
  - Basket: `icon-egg.svg`, value = basket count.
  - Change: `.pulse` = scale 1→1.12→1 over `--t-med`, `--ease-pop`. Decrement = brief `--c-barn-ui` text tint 240ms.
- Settings: 44×44 icon button, `icon-settings.svg` 28px.
At 360px width: both pills + gear fit (96+88+44+gaps ≈ 260px).

### 3.3 Farm View (`main.farm`)
`display:grid;grid-template-rows:auto 1fr auto;padding:var(--s-3);gap:var(--s-3);background:linear-gradient(var(--c-sky) 0 35%, #BFE6A8 35%)` (sky / grass; #BFE6A8 = light meadow tint).
Rows:
1. **Customer queue strip** (height 72px): flex row, gap `--s-2`. **Capacity (P1q):** `queue_max = min(10, 6 + floor(F/5))` — starts at 6, rises by 1 at Farm F5 / F10 / F15 / F20, caps at 10 (balance.json / economy.csv / m3-customer-queue-spec.md). **Rendering (phone strip; m3-customer-queue-spec §0 / §1.2):** max 5 chips; if queue > 5 the 5th chip becomes a "+N" chip (56×64, Soil Brown #3E2C23 / white = 13.21:1, N = queue.length − 4), tap opens Market; otherwise show present customers (up to 5). Never render locked / beyond-capacity slots. Chips are 64×72 for ≤4 chips; at 5 chips they shrink to 56×64 (5×56 + 4×8 = 312px, fits 360 − 24 padding). **Queue step (F5 / F10 / F15 / F20):** no slot grow-in; on landing, the strip "+N waiting" chip pulses once per §4.6b (scale 1→1.12→1 over 600ms, `--ease-pop`; `prefers-reduced-motion` = color flash brown → Yolk → brown). If the chip isn't shown (≤4 customers), skip it. **Coop tier toast (L5 / L10 / L20 only):** **"Coop upgraded!"** per §4.7 (≤2.5 s, non-blocking, above any open sheet) — not merged with a customer-slot line. Chip 64×72: `icon-customer.svg` 40px over a demand tag "🥚 N" → use `icon-egg.svg` 16px + N (Fredoka 14px), white pill. Patience ring: chip border via `conic-gradient` from `--c-meadow` → `--c-yolk-dark` over 30 s (no red: leaving is normal demand). Tap chip → opens Market. **"Queue full" tag (rc1, S2-6):** `.qtag{top:-9px;right:8px;height:18px;line-height:16px;z-index:1;pointer-events:none;white-space:nowrap}`: it straddles the strip's top outline and never covers a chip or the "+N" tile; below 380px wide it reads "Full". #3E2C23 on #F29E1F = 6.3:1. Empty slot: dashed 2px `--c-slot-outline` outline (5.91:1 on cream). Arrive: slide in from right 240ms.
   - **Exits are neutral and friendly** (unmet demand is ~20% by design; economy.md). Partial fill (bought ≥1 egg): content wave 👋 (customer bobs + tilts 8°, 300 ms), then slides out left 240 ms. Leaves empty-handed (patience up / basket empty): small "Sold out!" tag (12px Fredoka, `--c-text` on `--c-cream` pill, outline) pops above the chip for 800 ms, and the customer waves and slides out. No red, shake, sad face, or error sfx; uses `sfx-customer-leave.mp3` (soft).
   - **Queue full cue (amber):** when all unlocked slots are filled, the strip gets a 2px `--c-yolk-dark` (amber) outline and a "Queue full" tag at the right end (12px, `--c-yolk-dark` bg, `--c-text` text). It clears when a slot frees. Informational, not an error.
2. **Coop scene** (1fr, min-height 260px): see §4.3.
3. **Collect bar**: Collect button (Primary, full width, **height 48px** — M5.0, was XL 64px; see §3.3a) with label "Collect +k" where k = min(coop, eggs_per_tap), then the **24px streak row** directly beneath it (§3.3a); under the coop: fill meter.

Coop fill meter (above Collect): 100%×16px, `--r-pill`, track `--c-white`, fill `--c-yolk`, label centred "x / cap" Fredoka 14px (AC10). At cap: fill `--c-yolk-dark`, "Full!" badge (`--c-barn-ui`, white text, 12px) pinned top-right of coop, wiggle 2° loop every 2s.

### 3.3a M5.0 Collect 48px + streak row (m5-combo-tiers.md v0.2, Q1/C6 ruling)
- **Collect** (`#collect`): `height:48px;min-height:48px` (Primary minimum; full width unchanged), **Fredoka 18px / 700**, `white-space:nowrap`, one line. **Collect.top does not move** at any size, and the scene/coop/hens/golden-egg/Broody geometry is unchanged.
- **Streak row band** = Collect.bottom → +24px: 4px gap (this is exactly where Collect's `--shadow` 0 4px lands, so nothing collides) + the **20px meter row** (m5-combo-tiers §2: bar 12px centred, 80px label column, `pointer-events:none`, always reserved, `visibility:hidden` at s = 0). Left/right edges = Collect's. Never in the docked column.
- **How the 24px is found (CSS):** Collect −16px, row +20px, flex gap +4px net (`#streak{height:20px;margin-top:-4px}` inside `.collectbar{gap:8px}`), so `.collectbar` grows by 8px; take the 8px from `.farm` bottom padding: 12→**4px** (default), 8→**0px** (≤390 phones). `.btn.xl` must drop from 22px to 18px (at 22px, 11 measured label/width cases wrap to 2 lines at 360–390 — see fit table).
- **Per-size table** (RC 5d9efa6 measured rects, Chromium; y in CSS px; "bottom" = nav.top on phone, viewport bottom on docked):

| Viewport | Mode | Collect x (w) | Collect y (was → now) | Streak row band | Bar row (20px) | Bottom | Clear below band | #goal.b → Collect.t |
|---|---|---|---|---|---|---|---|---|
| 360×640 | phone | 8–328 (320) | 504–568 → **504–552** | 552–576 | 556–576 | nav 576 | 0 | 500 → 504 (4) |
| 375×667 | phone | 8–343 (335) | 531–595 → **531–579** | 579–603 | 583–603 | nav 603 | 0 | 4 |
| 360×844 | phone | 8–328 (320) | 708–772 → **708–756** | 756–780 | 760–780 | nav 780 | 0 | 4 |
| 390×844 | phone | 8–358 (350) | 708–772 → **708–756** | 756–780 | 760–780 | nav 780 | 0 | 4 |
| 430×844 (≈430×932) | phone | 12–394 (382) | 704–768 → **704–752** | 752–776 | 756–776 | nav 780 | 4 | 4 |
| 959×600 | phone (landscape <960) | 12–923 (911) | 460–524 → **460–508** | 508–532 | 512–532 | nav 536 | 4 | 4 |
| 960×1280 | phone (portrait) | 12–948 (936) | 1140–1204 → **1140–1188** | 1188–1212 | 1192–1212 | nav 1216 | 4 | 4 |
| 1024×1366 | phone (portrait) | 12–1012 (1000) | 1226–1290 → **1226–1274** | 1274–1298 | 1278–1298 | nav 1302 | 4 | 4 |
| 960×600 | docked-compact* | 24–536 (512) | 524–588 → **524–572** | 572–596 | 576–596 | vp 600 | 4 | 516 → 524 (8) |
| 1024×474 | docked-compact | 32–592 (560) | 398–462 → **398–446** | 446–470 | 450–470 | vp 474 | 4 | 8 |
| 1280×720 | docked | 160–720 (560) | 644–708 → **644–692** | 692–716 | 696–716 | vp 720 | 4 | 8 |
| 1280×800 | docked | 160–720 (560) | 724–788 → **724–772** | 772–796 | 776–796 | vp 800 | 4 | 8 |
| 1366×768 | docked | 203–763 (560) | 692–756 → **692–740** | 740–764 | 744–764 | vp 768 | 4 | 8 |

  \*docked-compact is defined in m4-timed-collectible.md v1.1 (dock = min-width 960 **and** landscape; vh <700 → compact), not in this spec's §2; rows added for completeness. 375×667 and 430 rows: 430×932 behaves as 430×844 (Collect is bottom-anchored to the nav; only the scene grows). Source: scratch/m5-layout-recheck-5d9efa6/rects.json, shots/ge16-17/rects-chromium.json.
- **Vertical stack check (all sizes above):** HUD 56 → scene (unchanged) → coop-fill meter 16 → 8 → #goal 44 → 4 (phone) / 8 (docked) → Collect 48 → 4 shadow gap → row 20 → 0 (≤390 phones) / 4 → nav 64 or viewport bottom. No overlaps. Tap targets: Collect 48 (≥48 ✔), #goal 44 ✔, nav 64 ✔; the row adds none. The 12px bar sits 4px above the nav even where the band is flush (bar 560–572 vs nav 576 at 360×640); lit tabs (16px) reach 574, 2px clear. Collect `:focus-visible` ring (3px + 2px offset) reaches Collect.b+5, 3px above the bar, 1px above a lit tab — acceptable (ring is transient, row is non-interactive). `:active` translateY(2px) stays inside the shadow gap.
- **Label fit at 48px** (Fredoka 18px; the build ships only the 500 and 700 faces, so a 600 request resolves to 700 per CSS font matching — measure and specify 700). Content box = Collect w − 48 padding − 4 border (268px at 360, 508 at 1280). Line box 21px (Chromium) / 22px (Firefox, WebKit) → 11–11.5px vertical room each side. Widths at 360 (Cr / Fx / WK, fonts served over http):

| Label | Width px | Lines @360 / @1280 |
|---|---|---|
| `Collect` | 58.5 / 58.4 / 58.5 | 1 / 1 |
| `Collect +30 · 17 ready` | 171.8 / 171.8 / 171.8 | 1 / 1 |
| `Collect +9,999 · 9,998 ready` | 218.6 / 218.7 / 218.6 | 1 / 1 |
| `Collect +999.9K · 999.8K ready` | 240.0 / 240.1 / 240.0 | 1 / 1 |
| `Collect +88.88M · 88.87M ready` | 249.8 / 249.8 / 249.8 | 1 / 1 |
| `Collect +1.23e36 · 1.22e36 ready` | 255.9 / 255.9 / 255.9 | 1 / 1 |
| **`Collect +999.9Dc · 999.8Dc ready` (worst)** | **260.2 / 260.3 / 260.2** | 1 / 1 (7.7px spare at 360) |

  No clipping in any engine at 360/375/390/1280. At the old 22px the worst string is 318px and wraps at 360, 375 and 390.

### 3.4 Bottom nav (`nav.actions`, portrait/tablet)
3 equal flex buttons, height 64px, icon 28px + label 12px: **Market** (`icon-market.svg`), **Upgrades** (`icon-upgrade.svg`), **Farm** (`icon-coop.svg`, closes panels). Badge: 12px `--c-barn` dot top-right when Market has customers & basket>0, or Upgrades has an affordable row. **rc1 (build nav = Market · Upgrades · [Refill, conditional] · Farm; there is no Workers button):** asleep/unpaid count badge goes on **Upgrades** (18px min, `--c-danger`, white 12px count, 5.65:1) and on the Workers tab inside Upgrades; it replaces the dot while count > 0 (rc1-upgrade-value.md §7).

### 3.5 Panels (bottom sheet portrait / docked column desktop)
Sheet: `position:fixed;inset:auto 0 0 0;height:75dvh;border-radius:var(--r-lg) var(--r-lg) 0 0;background:var(--c-cream);border-top:var(--bw) solid var(--c-outline);box-shadow:0 -4px 0 rgb(62 44 35/.15)`; slide up `--t-med`. Header 56px: title Fredoka 24px + close button 44×44 (`icon-close.svg` 32px). Body: scroll, padding `--s-4`, gap `--s-3`. Scrim `--c-scrim` behind (tap = close). Desktop docked: no scrim, no close, always visible; Market on top half, Upgrades below (each `overflow:auto`).

**Market panel** (§4.4 rows): list of up to 3 Customer rows + footer "Sell all" (Primary, full width, 56px), sticky bottom. Empty: `icon-customer.svg` 64px muted + "Next customer soon…" (Engineering may show a countdown if exposed).

**Upgrades panel**: segmented tabs (Collection | Farm), 44px tall, pill track `--c-white`, active pill `--c-yolk`. Collection tab = 1 row; Farm tab = 1 row (§4.5). Tab icons: Collection `icon-nest.svg`, Farm `icon-coop.svg`.
**Desktop ≥960px (PT1-8, 2026-10-15):** each tab `button` hit area is **≥44px tall and ≥44px wide** (`min-height:44px;min-width:44px;box-sizing:border-box`). If the visual pill must stay smaller (e.g. 36px), keep the pill visual on an inner `span` and pad the button (`padding-block:4px` around a 36px pill) so the clickable box is 44px without changing the visual size. Label padding `0 var(--s-3)`; no adjacent hit areas overlap. QA check: `getBoundingClientRect()` of each tab button ≥44×44 at 1280×720 and 960×600.

**Settings** (modal, 320px wide, centred): SFX toggle (no music in M1), Reduced motion toggle, "Reset save" (Danger button → Confirm modal "Reset all progress?" Cancel/Reset), version text 12px muted.

### 3.6 Welcome-back modal (AC11) — IN for M1
Card 320×auto, `--r-lg`, padding `--s-5`, centred; `icon-offline-earnings.svg` 64px, title "Welcome back!" 24px, "You were away 1h 12m" (cap shown "2h+"), egg icon + "+N eggs" Fredoka 32px; no rate text (Design: show only time away + eggs earned); Primary "Collect" (full width). Close button (`icon-close.svg`, 44×44 top-right) and scrim tap also close it; **closing without tapping Collect still grants the eggs** (same Basket credit, same feedback minus flyers). Shown once per absence (AC11). Skipped < 60s.

### 3.7 Onboarding overlay (3 steps, once, skippable)
Scrim with a spotlight cutout (`box-shadow:0 0 0 9999px var(--c-scrim)` on a highlight ring around the target, `--r-md`). Caption bubble (max-w 280px, white, `--r-md`, 16px body) placed above/below target; "Skip" text button top-right. Steps: 1 Collect button → 2 Customer chip / Sell → 3 Upgrade row buy button. Pointing hand: `assets/ui-pointer-hand.svg` (M3; full FTUE spec in m3-ftue-spec.md).

## 4. Components
### 4.1 Buttons
| Variant | Size | Style |
|---|---|---|
| Primary | h 48 (XL 64 — retired for Collect in M5.0, §3.3a), min-w 120, pad 0 `--s-5`, `--r-pill` | bg `--c-yolk`, text `--c-text` Fredoka 18 bold, border `--bw` `--c-outline`, `--shadow` |
| Buy (affordable) | h 48, min-w 112 | bg `--c-meadow-strong`, text white (4.90:1), coin icon 20px + cost |
| Secondary | h 44 | bg `--c-white`, text `--c-text` |
| Danger | h 44 | bg `--c-barn-ui`, text white (5.65:1) |
| Icon | 44×44, `--r-pill` | transparent; icon 28–32px |
States (all): `:active` → `translateY(2px) scale(.97)`, shadow 2px; `:focus-visible` → 3px `--c-focus` ring offset 2px (4.77:1 on white); **disabled** → bg `--c-disabled`, text `--c-muted`, no shadow, `aria-disabled="true"` (keep tappable to trigger shake 4px ×3 / 240ms, no state change); **affordable** (Buy) → meadow + glow `0 0 0 3px rgb(107 191 89/.35)` pulsing 1.6s; **maxed** → bg `--c-yolk`, `--c-text` label "MAX", not tappable, no cost. Never white text on yolk.

### 4.2 HUD counter — see §3.2.

### 4.3 Coop scene (one coop, up to 12 hens)
Container `position:relative;aspect-ratio:4/3;max-height:100%;margin-inline:auto;width:min(100%,560px)`.
- Coop: absolutely placed, width 46%, centred, bottom 38%. Sprite by Farm L (feature-spec §3, F3): L0–4 `coop-l1.svg`, L5–9 `coop-l5.svg`, L10–19 `coop-l10.svg`, L20–30 `coop-l20.svg` (96×96 viewBox, bottom-aligned ground line, so a swap doesn't shift the layout). **rc1 tiers (S2-1):** each tier differs from the last by silhouette **and** dominant color at a glance: l1 small brown hut, red gable · l5 **red barn**, gambrel dark-brown roof, white X door · l10 **two-storey cream coop, blue roof #2B79A8 + grey silo** · l20 **golden (Yolk) coop with a centre tower, flag and two wings**. Previews mockbuild/coop-l{1,5,10,20}-{64,96}.png, strip mockbuild/coop-tiers-v2.png. Derived from the saved level on load; see §4.7 for the tier-change celebration.
- Nest (collect target): `icon-nest.svg` 72px under coop door; shows 0–3 egg stack visual by fill (0%, >0, ≥50%, Full).
- Hens: `char-chicken.svg`, rendered count = `min(hens,12)` (Product). 12 fixed slots in a CSS grid overlay over the yard (lower 40% of scene): `grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(2,1fr)`; hen size 15% of scene width (≈48px at 360); slot order fills front row centre-out. Each hen: idle bob `translateY(-2px)` 1.2–2s loop with per-slot `animation-delay` (nth-child × 0.15s); every 3rd hen `scaleX(-1)`. If hens > 12: small pill "×N hens" bottom-left (14px).
- Whole coop+nest area is also a tap target for Collect (same action as button).

### 4.4 Market row (customer)
Grid: `grid-template-columns:48px 1fr auto;gap:var(--s-3);align-items:center;padding:var(--s-3);background:var(--c-white);border:var(--bw) solid var(--c-outline);border-radius:var(--r-md);min-height:72px`.
- Col 1: `icon-customer.svg` 48px + patience ring (as chip).
- Col 2: "Wants N eggs" 16px bold; price line 14px muted "$1.80 per egg · paid as you sell" (P2: order value = N×egg_price, have/want shown; see product/market/s2-p1-zero-pay.md, MK-23–25). At ≤375 wraps to two lines: "$1.80 per egg" / "paid as you sell" (never truncate). Coin icon 16px.
- Col 3: Buy-style button. Full order: **"Sell N · +$X.XX"**; partial **"Sell k · +$X.XX"** (k = min(basket,N)). At ≤375 the label stacks on two lines ("Sell 28" over "+$50.40", value 14px), min 44px tall; one line from 390 if it fits. States: k=N → affordable (meadow); 0<k<N → Primary yolk (partial fill allowed); basket=0 → disabled "Sell 0/N".
- On sell: row collapses (height→0, 240ms), coin burst from button to HUD coins.
- Footer **"Sell all"**: Primary full width; label "Sell all (k eggs · $X)"; disabled if basket=0 or queue empty; serves front-to-back.

### 4.5 Upgrade row (Collection / Farm, L0–L30)
Card grid `grid-template-columns:56px 1fr;grid-template-rows:auto auto auto;gap:var(--s-2) var(--s-3);padding:var(--s-4)`; white, `--r-md`, outline.
- Icon 56px: Collection `icon-nest.svg`; Farm `icon-coop.svg`. Level badge "L12" bottom-right of icon, yolk pill 12px bold.
- Title 18px Fredoka: "Collect per tap" / "Farm level".
- Effects list (14px): `current → next`, arrow `→` in `--c-meadow-strong` bold. Collection: 2 lines showing actual values (no % deltas): "Eggs per tap 15 → 20" and "Egg price $1.50 → $1.68" (example at Farm L10, C0→1: egg price = (1.00 + 0.05F) × (1 + 0.12C), rounded to cents; values come from config/economy.csv, never hard-coded). Fit at 360px: col 2 = 360 − 24 (panel pad) − 32 (card pad) − 56 (icon) − 12 (gap) = 236px; the longest realistic line "Egg price $12.34 → $13.82" at 14px Nunito ≈ 175px, and "Eggs per tap 150 → 155" ≈ 160px. Each fits on one line ✔ (K/M formatter beyond 4 digits; `white-space:nowrap`, ellipsis fallback). Farm: 4 lines — Hens, Coop capacity, Egg price, Customers (interval / demand) (AC10).
- Progress: 30-segment bar not needed; show "Level 12 / 30" 12px muted.
- Buy button (full width of col 2 on 360; right-aligned 160px at ≥600): icon-coin + cost.
States: **affordable** (meadow glow), **disabled** coins<cost (AC5) with "Need $X more" 12px muted under button, **maxed** L30 → gold "MAX", effects show current only. On buy: `icon-upgrade.svg` 40px rises from button (translateY −48px, fade, 480ms) + 6 sparkle dots; level badge pops (scale 1.3); Farm buy also bumps coop scene (scale 1.05 bounce) and adds hens with pop-in.

### 4.6 Tap-to-collect feedback (≤ 30 DOM effect elements total)
Global budget in `#fx-layer`: **max 30 live elements** across all effects (pool & reuse; oldest recycled first).
Per Collect tap (k>0):
1. Button/coop squash: scale .95 → 1.05 → 1 (`--t-fast`+`--t-med`), no extra element.
2. Egg flyers: `min(k, 5)` `<img src=icon-egg.svg>` 24px from nest to HUD Basket pill, curved path (CSS `offset-path` or two-axis keyframes translateX linear + translateY ease-in), 500ms, stagger 40ms.
3. One floating "+k" text (Fredoka 24px, fill `--c-text`, 2px `--c-yolk` text-stroke; `aria-hidden="true"`, decorative: the HUD counter carries the value) rising 40px, fade 700ms.
4. On first flyer arrival → Basket `.pulse`.
Per tap = ≤6 elements; rapid tapping (≥5 taps live) → drop flyers, keep only the "+k" text (merged: update the existing number instead of spawning). k=0 (coop empty) → button shake + "Empty" text, no flyers.
Sell: `min(sold,6)` `icon-coin.svg` 20px flyers row → HUD coins + "+$X" text. Upgrade: §4.5 (≤8). Reduced motion: no flyers; counters update + "+k" fade only.

### 4.6b Farm row: time-to-afford hint (feature-spec §4, P4, F7)
- Placement: inside the Farm upgrade row, directly under the Buy button (on 360px it's full-width; at ≥600px it's right-aligned, 160px), replacing the generic "Need $X more" line on the Farm row. One line, `--fs-xs` (12px) Nunito 700, `--c-muted`, icon `icon-offline-earnings.svg` (clock) 14px leading, gap `--s-1`, `min-height:16px` (reserve the space so the row doesn't jump between states).
- Value: t = (cost − coins) / rate s, where rate = coins earned over the last 60 s of play ÷ 60 (rolling; Engineering). Updates at 1 Hz; the text swaps without animation (no flicker or pulse).
- Format (Farm PM decision 2026-10-15), from raw seconds t = (cost − coins) / rate: t < 60 s → `~X s` ("~45 s"); seconds and minutes round to nearest in all ranges (never up); 60 s ≤ t < 10 min → `~M min S s` ("~1 min 5 s"); 10 ≤ t < 60 min → `~M min`, whole minutes **rounded to nearest** ("~23 min"); t ≥ 60 min → `~H h M min` ("~1 h 5 min"). **rc1 card copy (supersedes the "Ready in" prefix below): `Affordable in ~m:ss` = build fmtAffordableIn (`Affordable in a moment` <10 s, `~1:05`, `~1:59:00` ≥1 h, `Affordable in —`), Collection and Farm rows.** Legacy: prefix "Ready in", e.g. "Ready in ~1 min 5 s".
- States:
  | State | Condition | Display |
  |---|---|---|
  | Affordable now | coins ≥ cost | hint hidden (`hidden` attr, space kept); buy state shown (meadow, affordable glow) |
  | Waiting | rate > 0, coins < cost | `Affordable in ~m:ss`, `--c-muted` |
  | No income | rate = 0 over the last 60 s | `Affordable in —`, `--c-muted`, clock icon |
  | Very long | t ≥ 60 min | `Affordable in ~1:05:00`, `--c-muted` |
  | Maxed | L30 | no hint, no cost, no button: "MAX" (`--c-yolk` pill, `--c-text`) |
- Tokens: add `--c-hint:var(--c-muted); --fs-hint:var(--fs-xs); --hint-h:16px;`
- The cost shown in a disabled state uses `--c-muted` (feature-spec §4).
- **Next-level preview lines (rc1, S2-3b + S2-1, agreed with PM Farm Upgrades 2026-10-16):** in the Farm row effects list, when buying would cross a step:
  - **Queue step** (F4→5, F9→10, F14→15, F19→20): lead line `icon-customer.svg` 16px + **"+1 customer (max N)"**, e.g. "+1 customer (max 9)", where N = that step's new queue_max (7, 8, 9, 10). Nunito 800 14px #3E2C23 (13.21:1). This replaces "+1 customer slot (a → b)" (Product ruling 2026-10-16, which overrides the interim "Queue holds N customers (+1)"). The order-size secondary line stays as in m3-customer-queue-spec §6.
  - **Coop step** (F4→5, F9→10, F19→20): line `icon-coop.svg` 16px + **"New coop look"**, same style. At steps that are both (5/10/20) show "New coop look" first, then the queue line. Both fit 236px at 360 ("+1 customer (max 10)" ≈ 150px at 14px).
  - **On landing a queue step:** the strip "+N waiting" chip pulses **once**: scale 1→1.12→1 over 600ms (`--ease-pop`). With `prefers-reduced-motion`, no scale; instead a color flash: background #3E2C23 → Yolk #FFC93C (text swaps to #3E2C23, 8.6:1) → back, 600ms. If the chip isn't shown (≤4 customers), skip it. This is the only chip animation allowed (anti-churn §5 of the queue spec).
- Row extras: next-tier label under the title, "Coop upgrade at L5 / L10 / L20" (next one only; hidden from L20), 12px, `--c-wood-text`, with a 12px `icon-coop.svg`.

### 4.6c Collection row: "Limited by coop" hint (economy.md Collection checks)
- Trigger: next-level eggs_per_tap > 50% × current coop_capacity (same rule as the economy_sim check; recomputed on every Collection/Farm level change, not per tick).
- Copy: ~~"Limited by coop · Upgrade Farm →"~~ **rc1: "Limited by collecting ›" on the Farm row, opens Collection upgrades (PM UC12). The whole line is one `button.link`; visual 16px, hit area 44px via `padding-block:14px;margin-block:-14px` (rc1-upgrade-value §2).**
- Styling: the same slot, tokens and layout as §4.6b (`--fs-hint`, `--hint-h`, line under the Buy button) but in `--c-wood-text` with a 14px `icon-coop.svg` leading. Doesn't disable buying (advisory only).
- Precedence: if the row is unaffordable, the time-to-afford text shows and the coop line is added as a 2nd hint line (row grows 16px; reserve 2 × `--hint-h` when the trigger is true). At MAX: hidden.
- Action (rc1: mirrored, opens Collection tab and pulses Collection Buy): tapping "Upgrade Farm →" switches the Upgrades panel to the Farm tab and pulses the Farm Buy button (2 glows, 1.2 s). On desktop docked, it scrolls the Farm row into view.

### 4.7 Coop tier-change celebration (feature-spec §3, F3)
On first reaching L5/10/20 (persist a `celebratedTier` flag; never replay on reload): sprite cross-fade, 200 ms + scale bounce 1→1.15→1 (400 ms, `--ease-pop`) + 8 sparkle dots (counted in the 30-element FX budget) + toast **"Coop upgraded!"** (rc1, Product S2-1: the toast shows **above any open sheet** (z-index over panels), or, if it would be hidden, right after the sheet closes; the bounce + sparkle play when the coop is visible; desktop docked plays at once. Top-centre under the HUD, pill, `--c-meadow-strong` bg, white Fredoka 16px, slides down; auto-hides by 2.5 s). Total ≤ 2.5 s, `pointer-events:none`, never blocks input. Reduced motion: instant swap + toast only.

## 5. Asset map
| Element | File |
|---|---|
| Coins counter, costs, coin flyers | assets/icon-coin.svg |
| Basket counter, demand tag, egg flyers | assets/icon-egg.svg |
| Hens, loading logo | assets/char-chicken.svg |
| Coop scene, Farm tab/row, nav Farm | assets/coop-l1/l5/l10/l20.svg (scene); icon-coop.svg (tab/row/nav icon) |
| Nest (empty base), Collection tab/row | assets/icon-nest.svg (no eggs) |
| Nest eggs overlay (coop > 0) | assets/nest-eggs.svg: same 48×48 viewBox, stack exactly on top of icon-nest.svg |
| Nav Upgrades, upgrade burst | assets/icon-upgrade.svg |
| Nav Market | assets/icon-market.svg |
| Customer chips/rows | assets/icon-customer.svg |
| Settings button | assets/icon-settings.svg |
| Panel/modal close | assets/icon-close.svg |
| Next-goal strip (M3) | assets/icon-goal.svg (see m3-next-goal-spec.md) |
| FTUE pointer (M3) | assets/ui-pointer-hand.svg (see m3-ftue-spec.md) |
| Welcome-back modal | assets/icon-offline-earnings.svg |

## 6. Audio (SFX in M1, music out)
mp3 only, <50 KB, 44.1 kHz mono, `art-ux/assets/audio/`, kebab-case; unlocked on "Tap to start". 11 files sourced (procedural, CC0): see screen-flow.md table and assets/audio/LICENSES.md.

## 7. Accessibility
Tap targets ≥44px; all icon buttons have `aria-label`; counters in `aria-live="polite"` region throttled to 1/s; colour never the only state signal (MAX/disabled have text); contrast AA.

## 8. Farm Upgrades AC check (feature-spec v0.2)
| AC | Art & UX coverage |
|---|---|
| F1 MAX at L30, no purchase | §4.1/§4.5 maxed: gold "MAX", no cost or button ✔ |
| F2 within-tick stats | logic (Eng); row shows the new current→next immediately ✔ |
| F3 tier per L + reload, celebration once | coop-l1/l5/l10/l20 mapping §4.3; §4.7 once-flag ✔ |
| F4, F6, F8 | logic only; queue strip shows 3–5 chips: **§3.3 updated: chip strip holds up to 5 (chips shrink to 56px at 5 on 360px width)** ✔ |
| F5 no double buy | Buy button goes disabled for the same frame on tap (Eng); visual ✔ |
| F7 hint hidden at affordable/MAX, ±10% | hidden states ✔; format gives at most 0.5 s error under 10 min (round to nearest), ≤30 s (≤5%) from 10–60 min, ≤1 min (<2%) at 60 min+ → within ±10% ✔ **Met** (PM format decision 2026-10-15) |


## 9. Narrow phones 360-390px (Bug 9, PT1 2026-10-15)
Patch suggestion: `art-ux/fixes/bug9-375.css`. Screenshots: `art-ux/screenshots/bug9-375-{before,after}-{farm,market,upgrades}.png` (late-game seeded save, Farm L15, 5-order queue, 3 workers).
**Diagnosis (m3-pt1+0345680, src/ui/styles.css):**
- Reproduced at a true 375px mobile viewport: Market sheet rows. `.row{grid-template-columns:48px 1fr auto}` + `.row .btn{min-width:112px}` + nowrap button text "Sell 20/120": the `auto` column takes its full width and the `1fr` text column (no `minmax(0,…)`, no `min-width:0`) is squeezed to ~150px, so "Wants 120 of 140 eggs" wraps word by word.
- NOT reproduced in our emulation at 375 (scrollWidth = 375 on Farm, Market and Upgrades; tabs "Collection/Farm/Workers" fit at 112px each). Likely cause of the two-way scroll + "Worke"/"Farm"/Ready-pill cut-offs in the tester's device toolbar: `#app{min-width:360px;min-height:640px}`. With a desktop-style scrollbar (~15px) or safe-area insets the usable width falls below 360, so #app overflows sideways and everything right-aligned (Queue-full badge, Ready pill, last nav label, Workers tab) clips; min-height:640 does the same vertically. Plus `.btn{min-width:120px}` and `.pill.coins{min-width:96px}` stop flex items shrinking. Engineering must confirm in a real 375px window.
**Rules:**
1. No horizontal overflow, ever: `html,body{overflow-x:hidden}` as a guard only; the root fix is `#app{min-width:0;width:100%}` and `min-width:0` on every grid/flex child that holds text. No `100vw` widths (use %/`dvw`); `box-sizing:border-box` stays global. QA check: `document.documentElement.scrollWidth === innerWidth` at 360, 375, 390 on every screen.
2. Tab labels (Collection / Farm / Workers): icon 20px + label, `font-size:clamp(13px,3.8vw,16px)`, floor 13px, never ellipsis. If a label still doesn't fit at the floor (<340px wide), go icon-only with `aria-label` kept. Nav labels same floor.
3. Market sheet row: `grid-template-columns:40px minmax(0,1fr) auto`, avatar 40px (ring inside the 40px, never outside the card), gap 8px. Sell button `min-width:88px`, padding 12px, 16px text, max 42% of the row; it must sit fully inside the card (≥8px from the edge). Order text wraps to at most 2 lines; shorten copy at <=390px to "Wants 87/113" (partial) and "Wants 113" + egg icon instead of "eggs", so it fits on one line.
4. Farm: Queue-full badge, Ready pill and hens stay inside the viewport (badge inset 8px, not negative offsets). Stats truncate only the value text, never the label. "Manage all (3 need it)" drops the count text at <=390px (count goes to the badge) so it never wraps.
5. Floors: body 14px, buttons 16px, tabs 13px; hit areas ≥44px.

## Changelog
- 2026-10-15 — §3.5 PT1-8: desktop (≥960px) Upgrades tab buttons get a ≥44×44px hit area (padding allowed, visual size unchanged). For rc0.
- 2026-10-15 — AC14g iOS Home Screen tip: see m3-ios-homescreen-tip.md (Settings line next to Export).

- 2026-10-15 23:45: §9 Narrow phones 360-390px (Bug 9).
- rc1 (2026-10-16, with PM Farm Upgrades; S2-3b, S2-1): §4.6b Farm row preview "+1 customer (max N)" (Product ruling, final) replaces "+1 customer slot (a → b)"; "New coop look" preview line at coop steps; one-time "+N waiting" chip pulse (1→1.12→1, 600ms; reduced motion = color flash) on a queue step. §4.7 toast stays "Coop upgraded!", shown above any open sheet or right after it closes. §4.3 coop tiers redrawn (l5 red barn, l10 blue-roof coop + silo, l20 golden coop with tower and wings: distinct silhouette + color). S2-6: the "Queue full" tag sits on the strip top edge (§3.3).
- rc1 (2026-10-16): §3.3 Customer queue strip formula → P1q `queue_max = min(10, 6+floor(F/5))` (was `min(5, 3+floor(FarmL/10))`); phone strip draws ≤5 chips with 5th as "+N waiting" when queue > 5 (m3-customer-queue-spec §0/§1.2); queue-step feedback is the §4.6b chip pulse (not slot grow-in); coop toast stays "Coop upgraded!" (§4.7 only).

- rc1 v1.4 (2026-10-16 14:30, UX review): tokens --c-meadow-text/--c-meadow-tint/--c-danger; ETA copy `Affordable in ~m:ss` (§4.6b); "Limited by collecting" 44px hit (§4.6c); asleep badge on Upgrades nav (§3.4); MAX on --c-yolk.
- M5.0 v1.5 (2026-10-24 17:23 CEST, UI/Visual Designer; m5-combo-tiers.md v0.2 Q1/C6 ruling): Collect 64→**48px** (Fredoka 18/700, nowrap; `.btn.xl` 22→18px), new 24px streak row band under Collect (4px shadow gap + 20px row), `.farm` bottom padding −8px (12→4, 8→0) so Collect.top and the scene don't move; new §3.3a with per-size table (incl. 959×600, 960×600 docked-compact, 960×1280, 1024×1366), vertical-stack check and label-fit table; §3.3 item 3 and §4.1 Primary row updated. Mocks: mocks/m5-collect-streak-360.png, -1280.png.
- **M5.1 v1.6 amendment** (2026-10-25 03:41 CET (UTC+1), UI/Visual Designer). Notes only: the text above is left as is, with no layout or rect change. Source: `m5.1-ui-consistency-pass.md` (sha1 `1cafe530…`), accepted by HoAUX at 03:41 CET.
  - **MT-2 (note only, HoAUX ruling):** §4 :148 "**disabled** → bg `--c-disabled`, text `--c-muted`" and §4.6b :199 "The cost shown in a disabled state uses `--c-muted`" are **superseded by m10** (`m4.1-ui-minors.md`, SIGNED 03:26/03:31). Disabled text is `var(--c-muted-strong)` #5A4C42 on `--c-disabled` #CFC6BA, **4.88:1** (was 3.76). Add `cursor:not-allowed`. Everything else in :148 is unchanged: no shadow, `aria-disabled="true"`.
  - **MT-3 (token block, :12–16):** add `--c-muted-strong:#5A4C42;` after `--c-muted` (as in the patch-2 CSS, `styles.css:7`). `--c-meadow-text` / `--c-meadow-tint` (:15) are **defined but unused** in the 30b29d3 build (flagged, not removed).
  - **TN-1 (HoAUX ruling: claim dropped):**
    - The :34 sentence "Numbers use `font-variant-numeric:tabular-nums`" is **withdrawn**: neither shipped font has `tnum`. Nunito digits are fixed-width by design; Fredoka digits are proportional.
    - **Ticking Fredoka numbers reserve a min-width** on their control instead. Size it from the longest label with every changing digit set to `2`, measured in Cr/FF/WK, ceiled, plus ≥ 5px headroom. Example: Refill `min-width:208px`.
    - The K/M/B formatter and 2-decimals rule in :34 stand.
  - **Timers (TM-1/TM-3):**
    - §4.6b estimates keep the F7 `~` words (`~45 s`, `~1 min 5 s`).
    - Ticking countdowns use `m:ss` below 1 h and `h:mm:ss` from 1 h, with ceil and no `0:00` end state.
    - Full rules: `proposals/style-direction-m51-conventions.md`, pending HoAUX paste into style-direction.

