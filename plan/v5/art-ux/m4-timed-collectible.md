# M4 Timed collectible ("Golden egg"): Art & UX spec · **v1.1 · 2026-10-24** (v1.0 2026-10-16) · Head of Art & UX
**v1.1 (2026-10-24):** §2 spawn spots re-verified on live RC `5d9efa6` rects, with corrected rules and coordinates (delta table §2.4). §5 popup format (short money) and the viewport clamp. The build hold stands; this is paper only.
Sources: product/collection/m4-timed-collectible-spec.md v0.2, art-ux/decisions.md 2026-10-16 12:37 (U1–U6), layout-spec.md §1–§4. Spawn diagrams: `mocks/m4-spawn-{360,375,1280}.png` (generator `mocks/spawn.py`; it asserts the clearances).
Supports QA **M4-AC5** (state timeline, §3), **M4-AC15** (spots and sizes, §2), and **M4-AC22** (reduced motion and keyboard, §4).

## 1. Object
- **Golden egg only** (U1). Asset `assets/golden-egg.svg (renamed 2026-10-24 from fx-golden-egg.svg; already drawn 2026-10-16 by UI/Visual Designer, in art-ux/assets)` (to draw: 40×48 viewBox egg, `--c-gold` #E8B020 body, `--c-yolk` #FFC93C highlight, 2px `--c-outline` stroke, white glint).
- **Visual 40px** (egg 40 wide × 48 tall, centred) in a **56×56 CSS px hit box** (`tc_visual_px`=40, `tc_hit_px`=56). `<button class="tc" aria-label="Golden egg, tap to collect">` positioned with `left:x−28px; top:y−28px` in viewport px. z-index: above the farm scene and hens, below sheets, modals, scrim and toasts.
- Ring layer: a 52px SVG circle centred on the egg, 3px stroke, drawn inside the hit box.

## 2. Spawn spots (visual centre x,y in CSS px, viewport origin top-left, safe-area insets 0) · **v1.1, 2026-10-24**
**v1.1 is live-measured.** v1.0 derived the boxes from layout-spec (Oct 16 layout). v1.1 measured live `getBoundingClientRect()` on a `build:qa` of RC `5d9efa6` (Chromium 156; F12 with all 12 yard slots drawn) at 10 viewports. Data and scripts: `scratch/m5-layout-recheck-5d9efa6/` (`rects.json`, `v11.py` = these rules, `v10check.py` = the v1.0 check). Wireframes: `wireframes/m5-broody-{360x640,1280x800}.svg`.
**Clearance rule (unchanged):** hit box (56) + 16px clear of every no-spawn zone, and hit box ≥16px inside the viewport.
**No-spawn zones (v1.1 list):**
- HUD;
- toast strip (at phone layouts toasts now sit **below the queue**, F1: 360×640 `47,147–313,179`, not v1.0's 60–104 under the HUD; docked HUD+8: `507,64–773,96` at 1280);
- `#queue`;
- coop `<img>` box (clipped to `.farm`), `.nest`, and the **`Full!` badge** (new; v1.0 Open item);
- `#meter`, the streak meter box (8px under Collect, kept while hidden), `#goal`, `#collect`;
- nav, docked column;
- the **Broody Hen hit box** when unlocked (new, m5-broody-hen-art.md §2);
- open sheet/modal/scrim.
The **`×N hens` pill** (new) must not be overlapped (0px) while it's visible. It only shows when hens > 12. Yard hens stay non-interactive, and the egg draws above them.

### 2.1 Layout keys and placement rules (replace v1.0 rule 3)
- **phone** (NOT (min-width 960px AND orientation landscape), so this includes portrait at vw ≥ 960 (ruling 2026-10-24 17:06); telemetry `layout` stays `phone-360` for vw < 368 and `phone-375` for vw ≥ 368). The spots are **anchored to the live `#scene` rect** (s), because the scene is centred between the queue and the Collect bar and its offset isn't linear in vh:
  - x: S1–S4 at `s.left + 42`, S5–S8 at `s.right − 42`;
  - y: `s.top + round(f × s.height)`, with f = **0.32 / 0.50 / 0.68 / 0.86** for S1/S5, S2/S6, S3/S7, S4/S8.
- **docked** (landscape, vw ≥ 960, farm column FW = vw − 400 ≥ 880, vh ≥ 700): the 1280×800 table below with `x′ = x + (FW − 880)/2` (it follows the centred scene; v1.0 kept it left-aligned) and **`y′ = 56 + (y − 56) × (vh − 56)/744`**. That is PM's reading, confirmed: the HUD band stays fixed.
- **docked-compact** (new key; landscape vw ≥ 960 with FW < 880 or vh < 700, e.g. 1024×474). Linear y-scaling fails here because the queue (≈73–81px) and the Collect bar (140px) don't scale, and the 560px-wide scene gets squashed. Spots are anchored to live rects:
  - L = `s.left + 58`, R = `s.right − 44`;
  - yt = `queue.bottom + 48`, yb = `meter.top − 48`, ym = `round((yt + yb)/2)`;
  - S1 (L,yt) · S2 (L,ym) · S3 (L,yb) · S5 (R,yt) · S6 (R,ym) · S7 (R,yb). **S4 and S8 aren't used.**
- All values are rounded to whole px, then safe-area insets are added (rule 1).

### 2.2 Reference tables (expected centres; ✓ valid / ✗ dropped by live rects, `×N` pill visible)
**360×640 (phone-360):** zones measured: HUD 0,0–360,56 · queue 8,66–352,139 · toast 47,147–313,179 · scene 8,156–352,414 · coop 101,158–259,316 · nest 144,265–216,337 · Full! 257,172–297,191 · ×N pill 12,390–91,410 · meter 8,432–328,448 · goal 8,456–328,500 · Collect 8,504–328,568 · nav 0,576–360,640.
| S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 |
|---|---|---|---|---|---|---|---|
| 50,239 | 50,286 | 50,332 | 50,378 (✗ while ×N pill shows) | 310,239 | 310,286 | 310,332 | 310,378 |
Valid: **8/8** (pill hidden), **7/8** (pill shown). Worst case with the Broody at Y5: **4/8**. Min clearance of valid spots: 20px.

**375×667 (phone-375):** HUD 0,0–375,56 · queue 8,66–367,139 · toast 55,147–320,179 · scene 8,164–367,434 · coop 105,166–270,331 · nest 152,281–224,353 · Full! 270,180–310,200 · ×N pill 12,409–91,430 · meter 8,459–343,475 · goal 8,483–343,527 · Collect 8,531–343,595 · nav 0,603–375,667.
| 50,251 | 50,299 | 50,347 | 50,396 (✗ pill) | 325,251 | 325,299 | 325,347 | 325,396 |
|---|---|---|---|---|---|---|---|
Valid: **8/8** / **7/8**. Worst with Broody: **4/8**. Min clearance 22px.

**1280×800 (docked):** HUD 0,0–1280,56 · queue 12,68–868,149 · toast 507,64–773,96 · scene 160,188–720,608 · coop 311,191–569,449 · nest 404,410–476,482 · Full! 591,214–630,233 · ×N pill 164,584–243,604 · meter 160,648–720,664 · goal 160,672–720,716 · Collect 160,724–720,788 · **docked column 880,56–1280,800 (never spawn there)**.
| 110,240 | 230,330 | 110,440 | **230,540** | **680,240** | 770,330 | 650,440 | 770,560 |
|---|---|---|---|---|---|---|---|
Valid: **8/8** / **8/8**. Worst with Broody: **7/8**. Min clearance 21px.

**1024×474 (docked-compact):** HUD 0,0–1024,56 · queue 12,68–612,141 · scene 32,153–592,310 (squashed) · coop 183,56–441,250 visible (box runs from −7, under the HUD) · nest 276,191–348,263 · Full! 463,162–502,181 · ×N pill 36,285–115,306 · meter 32,322–592,338 · goal 32,346–592,390 · Collect 32,398–592,462 · docked column 624,56–1024,474.
| S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 |
|---|---|---|---|---|---|---|---|
| 90,189 | 90,232 | 90,274 (✗ pill) | – | 548,189 | 548,232 | 548,274 | – |
Valid: **6/6** (pill hidden), **5/6** (pill shown). Worst with Broody: **4** (pill hidden, at Y0/Y5) / **3** (pill shown, at Y5). Min clearance 17px. GE-AC15's "≥ 2" holds. **v1.0 rules gave 1/8 here (0/8 with the pill shown).**

### 2.3 QA matrix (GE-AC15 / BH-AC13): expected centres under 2.1
| Viewport | Key | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | Valid: pill hidden / shown / worst with Broody |
|---|---|---|---|---|---|---|---|---|---|---|
| 360×844 | phone-360 | 50,345 | 50,392 | 50,438 | 50,484 | 310,345 | 310,392 | 310,438 | 310,484 | 8 / 7 / 4 |
| 375×844 | phone-375 | 50,343 | 50,392 | 50,440 | 50,488 | 325,343 | 325,392 | 325,440 | 325,488 | 8 / 7 / 4 |
| 390×844 | phone-375 | 50,341 | 50,392 | 50,442 | 50,493 | 340,341 | 340,392 | 340,442 | 340,493 | 8 / 7 / 4 |
| 430×844 | phone-375 | 54,336 | 54,391 | 54,445 | 54,500 | 376,336 | 376,391 | 376,445 | 376,500 | 8 / 7 / 4 |
| 1024×474 | docked-compact | 90,189 | 90,232 | 90,274 | – | 548,189 | 548,232 | 548,274 | – | 6 / 5 / 3 |
| 1280×720 | docked | 110,220 | 230,301 | 110,399 | 230,488 | 680,220 | 770,301 | 650,399 | 770,506 | 8 / 8 / 7 |
| 1280×800 | docked | 110,240 | 230,330 | 110,440 | 230,540 | 680,240 | 770,330 | 650,440 | 770,560 | 8 / 8 / 7 |
| 1366×768 | docked | 153,232 | 273,318 | 153,423 | 273,519 | 723,232 | 813,318 | 693,423 | 813,538 | 8 / 8 / 7 |
At phone layouts S4 is the spot the pill drops. "Worst with Broody" is the pill-shown case: the Broody at Y5 knocks out up to 3 right-column spots. Engines: Chromium measured. Scene geometry is pure CSS, so Firefox/WebKit should match within ±1px; GE-AC15 re-measures live in all 3.

### 2.4 Delta v1.0 → v1.1
| Item | v1.0 (Oct 16 layout, derived) | v1.1 (RC 5d9efa6, measured) | Why |
|---|---|---|---|
| Phone rule | 360: table as-is at any height. 375: x + (vw−375)/2, y + (vh−667)/2 | scene-anchored (2.1) | 360×844 had S1/S5 on the queue/toast and S6/S7 on the Full! badge (4/8); 430×844 pushed the left column into the coop (2/8) |
| 360×640 S1/S5 | 50,190 / 310,190 | 50,239 / 310,239 | toast below the queue (147–179) and Full! badge (S5: −15px) |
| 360×640 S2–S4, S6–S8 | y 250 / 310 / 366 | y 286 / 332 / 378 | re-spaced in the scene (f grid); S4 vs ×N pill is now conditional |
| 375×667 x | 55 / 320 | 50 / 325 | the scene edge ± 42 rule |
| 375×667 y | 192 / 258 / 324 / 390 | 251 / 299 / 347 / 396 | toast (S1/S5 −15px) and Full! (S5 −18px) |
| 1280×800 S4 | 230,560 | 230,540 | overlapped the ×N pill by 4px |
| 1280×800 S5 | 650,240 | 680,240 | overlapped the Full! badge by 8px |
| Docked x at FW > 880 | left-aligned | + (FW−880)/2 (centred with the scene) | 1366×768 S5/S7 were 10px from the coop |
| Docked y | "scale y by (vh−56)/744" | `56 + (y−56)(vh−56)/744` (PM reading, confirmed), only for vh ≥ 700 and FW ≥ 880 | the linear rule doesn't hold for short heights |
| 1024×474 | v1.0 rule: 1/8 valid (S3 only) | docked-compact: 6 spots, ≥3 valid in the worst case | queue (S1), coop (S2), meter/goal (S4), docked column (S5–S8) |
| Zones | coop+nest box, toast 60–104 | + Full! badge, ×N pill, Broody box, toast as measured | v1.0 Open items |
| v1.0 counts (pill hidden / shown) | 360×640 6/5 · 375×667 6/5 · 1280×800 7/6 · 1024×474 **1/0** · 360×844 4/4 · 375×844 7/6 · 390×844 7/7 · 430×844 **2/2** · 1280×720 7/6 · 1366×768 6/6 | all ≥ 7/8 except 1024×474 at 5–6/6 | |

**Runtime rules (Engineering):** (1) Add `env(safe-area-inset-left/top)` to x/y. (2) Before each spawn, compute the layout's spots from 2.1, then check each against the **live** rects of the zones above (plus the boost chip/frenzy pill in the HUD, worker cards, open sheet/modal). Drop any spot within 16px (0px for the ×N pill) and pick with `evRng` from the rest. If none is valid, defer (GE-AC16). At phone layouts an open sheet (75dvh) blocks every spot, so the spawn is deferred. (3) Layout keys and formulas: 2.1. A golden egg's tap calls `stopPropagation()`, because `#scene` collects on click (`app.ts:210`).

## 3. States (M4-AC5). Times are collectible visible-age, paused per §6.
| State | Age | Visual | Motion (easing) | Ring |
|---|---|---|---|---|
| Spawn | 0–300ms | scale 0→1.15→1, opacity 0→1 | 300ms `--ease-pop` cubic-bezier(.34,1.56,.64,1) | – |
| Idle | 0–20s | egg 40px | bob translateY 0→−4px→0, **2s** period, ease-in-out, infinite. Sparkle: 4-point star 12px `--c-white` with `--c-yolk` core at the top-right of the egg, scale 0→1→0 over 400ms ease-out, **every 3s** | none |
| Warning | 20–27s | + soft pulse ring | bob −4px at a **1s** period, ease-in-out | 52px ring `--c-yolk` #FFC93C at 60% opacity, scale 1→1.25 and opacity .6→0, 1s ease-out loop. Label badge "!" 16px (`--c-text` on `--c-yolk`) top-right, not colour-only |
| Urgent | 27–30s | blink | opacity 1↔.35 at **4Hz** (125ms on / 125ms off, steps(1)), bob stops | **time-left ring**: 52px, 3px `--c-yolk-dark` #F29E1F stroke, `stroke-dashoffset` linear from full to 0 over 3s (shrinks clockwise from 12 o'clock) |
| Fade | 30.0–30.3s | out | opacity 1→0 + scale 1→.8 over **300ms** ease-in, with a **puff**: 6 cream #FFF6E5 dots (8px) radiating 24px over 300ms ease-out (counted in the 30-element FX budget). Not tappable (`pointer-events:none`, `aria-hidden`) | – |
| Collected | tap | gone | egg scale 1→1.3, opacity →0, 150ms ease-out + reward popup (§5) | – |
Non-colour cues (WCAG 1.4.1): warning = faster bob + "!" badge + ring; urgent = blink + depleting ring shape.

## 4. Reduced motion (`prefers-reduced-motion` or the in-game toggle) (M4-AC22)
No bob, sparkle, blink or puff. The egg is static. The ring around it always shows, 3px `--c-text` #3E2C23 (≥3:1 on sky/grass):
- Idle 0–20s: **solid** ring.
- Warning 20–27s: **dashed** ring (6px dash / 4px gap) + "!" badge.
- Urgent 27–30s: **thin outline** (1.5px solid) + "!" badge.
- Expire: **300ms opacity fade**, linear. Collect: instant hide + popup (fade 150ms, no rise).
Keyboard: the button is in tab order after Collect. Enter/Space collect it, with a focus ring of 3px `--c-focus` offset 2. On spawn, a polite live region announces "Golden egg appeared"; at 27s, "Golden egg leaving soon". When it expires, focus moves to Collect if it was on the egg.

## 5. Reward popups and frenzy
- Approved M4 values (Product, 2026-10-16 13:01): frenzy = egg price ×2 for **30s**; collectible spawns every **2–5 min from F8**, despawns after 30s.
- Popup at the egg position: Fredoka 24/700, `--c-text` on a `--c-yolk` pill (padding 4×12, 2px outline). It rises 32px and fades over 1.2s (ease-out), `pointer-events:none`. In reduced motion it holds 1.2s and fades 150ms. Copy: cash **"+$1.2K!"** (standard short form; coins fly to the coin pill as usual), frenzy **"Frenzy! 2× price"**, eggs **"+25 free eggs!"** ("+1 free egg!" when n=1; eggs fly to the Basket).
- **v1.1 money format (2026-10-24, answers PM golden spec Q4/R25):** reward popups use **short money, `fmtMoneyShort`** (the format.ts "compact money for pops/cards"; number-format-big.md "Compact money (pops, cards, Sell preview)"). So: `+$812.40!`, `+$1.2K!`, `+$27.9K!`, `+$3.4M!`. This supersedes popMoney's full-digit form for the golden egg and Broody popups. The aria-label keeps the exact `fmtMoneyAria`.
  - A full-digit `+$999,999.99!` can't appear under this rule: $999,999.99 shows as `+$1M!`. It also can't be reached on the CSV under popMoney. The max realistic cash is about `+$27.9K!` (F30, ×8 price stack) and eggs_cash about `+$37.2K!`.
  - **Fit at 360 (measured, Fredoka 24/700, pad 4×12, 2px):** `+$999.9K!` 126×41 · `+$37,200.00!` 161 · `+$999,999.99!` 167 (so HoP's popMoney also fits, if kept) · `Frenzy! 2× price` 200.5 · `+1,860 free eggs!` 206. Every one fits the 344px usable width at 24px, one line, no clip; no smaller size is needed (floor 12).
  - **Clamp rule (new, required):** popup left = clamp(x − w/2, 8, vw − 8 − w), and it never rises above HUD bottom + 8. The left-column spots sit at x = 50, so a centred 126–206px popup would otherwise clip by 13–53px.
- **Frenzy pill "2× 0:30"** (m:ss countdown, tabular-nums): HUD, 32px tall, pill, `--c-gold` #E8B020 bg, `--c-text` Fredoka 16/700 (AA ≥7:1), egg icon 16px. It sits **immediately left of the M4-B boost timer with a 6px gap**, or takes that slot when there's no boost. Below 360px wide it stacks under the boost timer (6px gap). At ≥360 it never stacks. `aria-label="Frenzy, double egg price, 30 seconds left"`, updated every 5s. It leaves with a 200ms fade.
- **Price during frenzy (replaces the old 'Full!' tint, dropped 2026-10-16):** 'Full!' is unchanged. Instead every on-screen egg price (customer card price line, Sell button value, Sell all) shows in `--c-gold` text-outline style with a 2× chip (14px circle, `--c-text` bg, white "2×" 10px Fredoka) before the value; values show the doubled price. Sell number pops use the gold pill. Reduced motion: same, no pop. Reverts when frenzy ends (M4-AC10b).

## 6. Sound and pause
- Hooks (Engineering): `sfx-golden-spawn` (soft chime, 0.4s) on spawn; `sfx-golden-warn` (2-note chime) at 27s; `sfx-golden-collect` = pop + coin layered, on tap. Expiry is silent. Sounds are **on by default** and follow the SFX/mute setting (M4-AC25). Assets go in assets/audio (procedural, CC0, Art & UX to supply).
- Any menu, sheet or modal open: the lifetime and spawn timer pause. The egg stays **visible under the scrim**, frozen in its current state (animations `animation-play-state:paused`), `pointer-events:none`, `inert`. It resumes at the same age when the menu closes (M4-AC26). On a hidden tab: the same pause.

## 7. QA hooks
- M4-AC5: expose `data-tc-state` = `idle|warning|urgent|fade` on the button. Assert the transitions at 20.0/27.0/30.0s ±1 tick, and that it's removed by 30.3s.
- M4-AC15 / GE-AC15: `data-tc-spot` = S1–S8 and the layout key (`phone-360|phone-375|docked|docked-compact`); expected centres per §2.1/§2.3. Assert the centre matches the table above ±1px (after safe-area offset), getBoundingClientRect 56×56, visual 40px wide, and ≥16px to every §6.2 rect, over 500 spawns per layout.
- M4-AC22: with reduced motion, there are no running CSS animations on `.tc` (`getAnimations()` is empty except the 300ms fade), the ring style goes solid→dashed→thin, and Enter collects.

## Open
- ~~Coop/nest box computed from layout-spec~~: verified live in v1.1. The Full! badge sits outside the coop box and is now a zone (§2).
- ~~Toast strip extent assumed 60–104px~~: measured in v1.1; at phone widths toasts sit below the queue.
- Pre-existing layout defect (not M5): at docked short heights the coop overflows the squashed scene (1024×474: box top −7, roof over the 4th queue chip). An M4.2/M5 layout fix is recommended. Spots are unaffected because they check the clipped coop box.
- The 2× price chip, the golden-egg SVG and the 3 SFX are still to be produced (Art & UX, by Tue Oct 20).
- From Farm L20 the free-eggs reward pays cash: it uses the standard cash popup "+$X!" (e.g. "+$1.2K!") with the coin fly. No 'coins' wording. (2026-10-16)
