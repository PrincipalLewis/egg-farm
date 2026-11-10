# M5.0 Collect streak: visual tier ladder (combo tiers) · v0.3 · 2026-10-24 · Head of Art & UX
**Status:** v0.2 PAPER (rulings applied 17:10) (2026-10-24, Europe/Budapest). The build hold stands: no code, assets wired or PRs. This is the one visual ladder that UI, Engineering and Audio follow for the streak tiers.
**Sources:**
- `product/collection/m5-streak-tap-coins-spec.md` **v1.1**: §3.2 R5–R13, §3.3 tiers, §3.5 UI, R16 coin pop, ST-AC9/10/11/17/21/24–28. It **supersedes** `m4-collect-streak-spec.md` v0.3, so where they differ, v1.1 wins (§10).
- `product/collection/m4-collect-streak-spec.md` v0.3 §4: the base meter, chips and states, kept where v1.1 doesn't change them.
- `art-ux/m4-collect-streak.md` U-S1–U-S3, `number-pop-spec.md` v1.0, `juice-spec.md` v1.1 §0, `m5-sound-spec.md` v0.3 §2–§3, `audio-hooks.md` v1.4, `style-direction.md`, `layout-spec.md` §1 tokens.
- `m4-timed-collectible.md` v1.1 §2: the measured rects on RC `5d9efa6` (`scratch/m5-layout-recheck-5d9efa6/rects.json`).
- `decisions.md` 2026-10-24 16:14 (ruling 1: 1:1 sound mapping), 16:41 (coin floater, no tier emphasis), 16:47 (sales-stopped chip in the goal slot), 16:52 (sound set signed off).

**Tunables used (no numbers invented):**

| Tunable | Value | Status |
|---|---|---|
| `tc_streak_cap` | 0.28 | [P1-PENDING]; CSV and v0.3 still say 0.40 |
| `tc_streak_tier_count` | 4 | |
| `tc_streak_per_tap` | 0.01 | |
| `tc_streak_max_taps_per_s` | 1 | |
| `tc_streak_hold_s` | 3 | focus clock |
| `tc_streak_decay_per_s` | 0.03 | focus clock |
| `tc_streak_unlock_farm` | 8 | |

Thresholds are `T_k = round_to_step(tc_streak_cap × k / tc_streak_tier_count)`: 0.07 / 0.14 / 0.21 / 0.28 at cap 0.28, or 0.10 / 0.20 / 0.30 / 0.40 at cap 0.40 (ST-AC11). Everything below is **cap-relative**: tick positions are k/4 of the bar, and every % in copy is floor(T_k × 100) or floor(s × 100).

**Design intent.** The streak meter carries the tier, as decided at 16:41. Tiers 0–3 keep **one** fill colour (`--c-meadow`, matching the meadow `+N%` price chip). Escalation is carried by **lit tick count** (shape), the tier pop-up copy, and the +1 semitone pitch step. Only MAX changes colour (gold), and it also adds the `MAX` text and 4/4 ticks. Calm by default, like the audio: no loops, no layers, one short one-shot per tier.

---
## 0. Meter anatomy (applies to every tier)
| Part | Spec |
|---|---|
| Row | **Under Collect, 4px gap, 20px tall**, left/right edges = Collect's. Contents: the bar (flex) + 8px gap + a **label column 80px**, right-aligned. The row is **always reserved** (`visibility:hidden` at s = 0), so there is no layout shift and the golden-egg / Broody exclusion box is stable. RESOLVED v0.2: Collect goes from 64 to 48px, which frees the 24px row (see the rulings section). |
| Bar | 12px outer: an 8px track inside a 2px `--c-outline` border, `--r-pill`, vertically centred in the row. Track `--c-cream` #FFF6E5. |
| Fill | `transform: scaleX(s / tc_streak_cap)`, origin left, with **no width animation**. It has a **2px `--c-text` leading edge**: meadow vs cream is 2.12:1 and gold vs cream is 1.84:1, so the edge (12.31:1 on cream) is the ≥3:1 boundary. |
| Ticks | 4 ticks at 25/50/75/100% of the track; the 100% tick sits at the inner end cap. **Unlit:** a 2px × 8px `--c-muted` #6B5D52 line inside the track (5.91:1 on cream; unlit ticks only ever sit over the track, because the fill is below them). **Lit:** a **4px × 16px `--c-text` tab** (2px past the bar's outer edge, top and bottom) with a **1px `--c-cream` keyline**. That gives soil vs meadow 5.80:1, vs gold 6.71:1, vs the cream panel 12.31:1, and the keyline keeps it ≥3:1 against the muted cooling fill (cream vs muted 5.91:1). **Lit ⇔ s ≥ T_k** at all times. |
| Label | Nunito 14/700, tabular-nums, `--c-text` on the cream panel (12.31:1), one line. Copy: `+N% price` (N = floor(s×100), ST-AC21) or `MAX +N%` at the cap. Measured advance widths at 14px: `+27% price` 73.9px, `MAX +28%` 74.2px, `MAX +40%` 74.2px, so it fits the 80px column at both caps. |
| Pointer | The whole row is `pointer-events:none`. It is a readout, not a tap target, and it adds **no** tap targets. Collect is 48px tall (v0.2; layout-spec v1.5 §3.3a). |

## 1. Per-tier table
Easing tokens are from juice-spec §0: `--ease-pop` cubic-bezier(.34,1.56,.64,1), `--ease-out` cubic-bezier(.22,1,.36,1), `--ease-in` cubic-bezier(.55,0,1,.45). t = 0 is the frame the credited tap is applied.

| Tier | s range | Fill / colour token | Non-colour cue | Label | One-shot entry (on an eligible upward crossing) | Sound (m5-sound-spec §2) | Cool-down / decay visual |
|---|---|---|---|---|---|---|---|
| **none** | s = 0 | none (row hidden, still reserved) | no bar | none | First credited tap: the row fades in, opacity 0→1 over 150ms `--ease-out`. No pop-up. | none (normal `egg.collect`) | Reaching 0: opacity 1→0 over 200ms `--ease-in`, silent. |
| **0** | 0 < s < T1 | `--c-meadow` #6BBF59 + 2px `--c-text` leading edge | 0 of 4 ticks lit (4 unlit lines) | `+N% price` | Per credited tap (every tier): fill scaleX eases over 120ms `--ease-out`, and the label number pops 1→1.1→1 over 120ms `--ease-pop` (U-S1). | counted-tap `egg.collect` at **0 st** | Cooling: stripes (§3); the label keeps the live %. |
| **1** | T1 ≤ s < T2 | `--c-meadow` | **1 lit tab** (25%) | `+N% price` | Tier-up §2, with **2** spark dots. Pop-up `Warm streak! +7% price` with pips ●○○○. | `sfx-streak-tier-01` (replaces that tap's collect); then collect **+1 st** | Cooling stripes; tab 1 unlights when s < T1 (§3). |
| **2** | T2 ≤ s < T3 | `--c-meadow` | **2 lit tabs** (25/50%) | `+N% price` | Tier-up §2, with **3** dots. Pop-up `Hot streak! +14% price`, pips ●●○○. | `sfx-streak-tier-02`; then **+2 st** | Cooling stripes. `sfx-streak-cool-01` plays once at decay start (tier ≥ 2 was reached). |
| **3** | T3 ≤ s < cap | `--c-meadow` | **3 lit tabs** (25/50/75%) | `+N% price` | Tier-up §2, with **4** dots. Pop-up `On fire! +21% price`, pips ●●●○. | `sfx-streak-tier-03`; then **+3 st** | As tier 2. |
| **MAX** (tier 4) | s = cap | **`--c-gold` #E8B020**, full width (+ leading edge at the end cap) | **4 lit tabs** + the **`MAX`** word | `MAX +N%` (N = floor(cap×100)) | Tier-up §2, with **6** dots (= the U-S1 "cap sparkle", one-shot). Gold cross-fades in over 160ms, then the label swaps to `MAX +28%` with a 120ms pop. Pop-up `MAX +28%!`, pips ●●●●, gold pill. **No pulse** while capped (§10 C4). | `sfx-streak-max-01` (cap chime, once per climb); then **+4 st** (ceiling). −3 dB after 60s at MAX (audio rule, no visual change). | At decay start s < cap: gold → muted stripes over 200ms, and the label returns to `+N% price` on that frame. `sfx-streak-cool-01` once. |

Pop-up copy is product §3.3 verbatim, with % = floor(T_k×100), so it follows the cap. Art & UX approves it as final (answers product Q2). At cap 0.40 it reads `Warm streak! +10% price` / `Hot streak! +20% price` / `On fire! +30% price` / `MAX +40%!`.

## 2. Tier-up moment (one-shot only; all motion ≤400ms)
It fires on an **eligible upward crossing** of T_k, per product hysteresis: tier k can fire again only after s < T_(k−1). This is the same trigger as the sting, so visual, sound and aria always agree. On the crossing tap:

| t (ms) | Element | Motion |
|---|---|---|
| 0–240 | Tick k tab | appears `scaleY(0.4 → 1.25 → 1)`, `--ease-pop`, origin centre |
| 0–200 | Fill | a cream sheen overlay over the fill, opacity 0 → 0.5 → 0, `--ease-out` (the product "meter flashes the tier tick") |
| 0–260 | Spark dots | k dots for tiers 1–3, 6 at MAX. 4px `--c-gold`, from tick k, 120° upward cone, 12–20px travel, opacity out over the last 120ms (juice-spec sparkle). They count in the 30-element FX budget and are dropped first if it's full. |
| 0–160 | MAX only: gold layer | opacity 0 → 1 over the meadow fill, `--ease-out` |
| 0–120 | Label | number pop 1 → 1.1 → 1, `--ease-pop` (text swaps on frame 1) |
| 0–200 | **Tier pop-up pill** | scale 0.6 → 1.1 → 1.0 over 0–120ms `--ease-pop`, plus translateY 8 → 0px over 0–200ms `--ease-out`. **No rise or drift after 200ms.** |
| 200–600 | Pill | static hold (no motion) |
| 600–900 | Pill | opacity 1 → 0, `--ease-in`. The 900ms lifetime is product §3.3; it's an opacity-only exit, not part of the ≤400ms motion budget (§10 C8, Q4). |

**Pill style:**
- Fredoka 18/700, `--c-text`, padding 4×12, 2px `--c-outline`, `--r-pill`, `pointer-events:none`, `aria-hidden="true"`.
- Background: `--c-white` for tiers 1–3 (13.21:1) and `--c-gold` at MAX (6.71:1). Never white text on yellow/gold.
- **Tier pips** to the left of the text: 4 × 8px CSS circles, 4px gap. Filled `--c-text`, empty = 1.5px `--c-muted` ring (6.34:1 on white). At MAX all 4 pips are filled, so no empty ring ever sits on gold.
- Measured widths (Fredoka 700 advance widths at 18px): the longest is `Warm streak! +10% price` at 199.4px, so the pill is ≈ 199 + 44 pips + 8 gap + 24 pad + 4 border ≈ **280px**. That is ≤ 344px usable at 360 and fits on one line at every matrix viewport. No smaller size is needed (floor 12px).

**Pill position:**
- Centred on Collect's x, clamped with `left = clamp(x − w/2, 8, vw − 8 − w)` (the golden R25a clamp).
- **Bottom edge = coop-fill `#meter.top − 8px`**. On RC `5d9efa6`: 360×640 → bottom 424; 1280×800 → bottom 640; 1024×474 → bottom 314.
- So it never covers Collect, the goal strip (or the sales-stopped chip in that slot), Buy, Activate-all or the coop-fill meter. It may overlay yard art for ≤900ms. z-order: above the scene and hens, below toasts, sheets, modals and the scrim.
- Never merged with another floater (product §3.3).

**One per tap, no stacking:** at most 1 tier pill live. Because tiers are ≥ (T_k − T_(k−1)) / `tc_streak_per_tap` credited taps apart (7s at cap 0.28), two pills can't overlap in normal play. If a new pill does fire while one is live (a config clamp edge), it **replaces** the old one.

## 3. Decay and reset visuals
All timing is on the **focus clock** (R6/R7). Nothing drains while frozen.
- **Hold (`tc_streak_hold_s` after the last credited tap):** no visual change.
- **Cooling starts** (hold over; `sfx-streak-cool-01` once if tier ≥ 2 was reached):
  - fill → `--c-muted` #6B5D52 with **static** 45° diagonal stripes: CSS `repeating-linear-gradient(45deg, var(--c-muted) 0 4px, var(--c-cream) 4px 8px)`, cream-on-muted 5.91:1;
  - it cross-fades from meadow/gold over 200ms `--ease-out` (opacity of the stripe layer);
  - **the stripes never move** (no marching or loop).
- **Draining:** scaleX tracks s every frame (linear, follows `tc_streak_decay_per_s`). The label shows the live floor(%).
- **Tier drop** (s falls below T_k): tab k shrinks to the unlit line (`scaleY 1 → 0.5` + opacity 1 → 0 on the tab layer over 160ms `--ease-in`). **Silent**: no dots, pop-up, sound or aria.
- **Credited tap during cooling:** the stripes fade out over 120ms and the fill returns to meadow, or gold if that tap reaches the cap. The hold restarts. Ticks re-light per "lit ⇔ s ≥ T_k":
  - a hysteresis-**eligible** crossing plays §2;
  - a non-eligible re-light (e.g. 0.20 ↔ 0.21 jitter, ST-AC10) is opacity 0 → 1 over 150ms only: no scale, dots, pop-up, sting or aria.
- **Reaching 0:** row opacity → 0 over 200ms `--ease-in`, then hidden (the row stays reserved). Silent.
- **Frozen (menu or hidden, R10/R12):**
  - the meter holds its exact state: the fill doesn't move, and the stripes (already static) stay;
  - no tier changes can happen, so nothing animates;
  - under a scrim the meter is just covered (no extra badge).
- **Reset to 0 without decay:**
  - offline return ≥ 60s or reload (R11): the row is hidden **instantly** on return/load, with no fade, sound or pop;
  - config clamp (K18): fill and ticks jump to the new state on the next tick, with no pop, flash or sound.

## 4. Interactions
### 4.1 Golden egg and Frenzy
- The Frenzy doesn't change s, so the meter, ticks and label are **unchanged** during a Frenzy.
  - The Frenzy is carried by the HUD pill `2× m:ss` and the gold `2×` price chips (m4-timed-collectible §5).
  - The meadow `+N%` chip still follows the gold `2×` chip, or both collapse to `2×+` at 360 (v0.3 4.5 / ST-AC22).
  - **No tier-based change to chips.**
- **MAX gold vs Frenzy gold:** they never rely on colour.
  - MAX = full bar + 4 tabs + the `MAX` word, in the meter row under Collect.
  - Frenzy = the `2×` text pill in the HUD and the `2×` chips.
  - They sit in different places with different shapes.
- **Tier pop-up vs golden reward pop-ups:** while a golden collect pop-up (`+$X!` / `+N free eggs!`) or the `Frenzy! 2× price` pop-up is live (≤1.2s, m4-timed-collectible §5):
  - a tier-up **drops its pill**: not queued or replayed;
  - the meter part of §2 (tab, sheen, dots, label) still plays, and the aria announcement still fires;
  - this mirrors audio's rule that stings are suppressed or ducked under rank 0.5 sounds (m5-sound-spec §1–§2).
- A golden egg tap is never a credited tap (R3), so it can't cause a tier-up on the same tap.
- The meter row box + 16px stays a golden-egg no-spawn zone, and Broody slots keep ≥8px from it, **including while hidden** (R14 / ST-AC21). The reserved 20px row is that box.

### 4.2 Tap-coin floater (R16, decided 16:41)
- **No per-tier glow, size, colour or motion change** (ST-AC17 "Tiers").
- A separate source from the egg pop and the tier pill. It never merges with either.
- **On a tier-up tap:** the coin pop spawns with its bottom 8px **above the tier pill's top**, so the pill and the coin pop never overlap. The next coin pop comes ≥1s later, after the pill's motion has ended. The same-frame +20px egg-pop offset rule still applies.
- The coin pop stays ≥8px clear of the meter row (R16). See §10 C7 for its spawn anchor.

### 4.3 Sales-stopped chip (goal slot, decided 16:47)
- The chip replaces the next-goal bar in the goal slot. The meter row (under Collect) and the pill anchor (above the coop-fill meter) are both outside that slot, so **the chip is never covered** and the meter needs no change.
- The streak still builds and pays tap coins while sales are stopped (R17 / K13c). There is no streak-side stall cue: the chip owns that message.

## 5. Reduced motion (OS `prefers-reduced-motion` or the in-game toggle)
Opacity only; no scale, translate, sparkle, sheen or loops.
- **Fill:** changes instantly in 1% steps (ST-AC24).
- **Meter row:** fades in over 150ms, out over 200ms.
- **Tier-up:** tab k appears with opacity 0 → 1 over 150ms. MAX gold appears instantly. Label text swaps with no pop.
- **Pill:** opacity 0 → 1 over 150ms, static hold, 1 → 0 over 200ms, ending at 900ms. Same anchor, no translate.
- **Cooling:** static stripes appear with a 150ms opacity cross-fade. Tier drops are opacity-only, over 150ms.
- **Cues:**
  - **MAX** is gold + `MAX` + 4 tabs; there was never a pulse, so there's nothing to remove;
  - **cooling** is muted + stripes;
  - each **tier** is its lit-tab count.
  None relies on motion.
- Audio is unchanged (m5-sound-spec §3).

## 6. Accessibility
- **Meter semantics:**
  - `role="meter"`, `aria-valuemin="0"`, `aria-valuemax` = floor(cap×100), `aria-valuenow` = floor(s×100);
  - `aria-valuetext` = `Streak +18% price, tier 2 of 4` (`Streak max, +28% price` at MAX; append `, cooling` while cooling);
  - visible text is the label, with no aria-label on it. It is hidden from AT while s = 0. It is not focusable (a readout).
- **Live announcements:** a dedicated `#streak-live` region (`aria-live="polite"`, `aria-atomic="true"`), separate from the coin `fmtMoneyAria` region.
  - On an **eligible upward crossing** only: `Warm streak, +7% price` · `Hot streak, +14% price` · `On fire, +21% price` · `Streak max, +28% price` (%s cap-relative).
  - At cooling start, only if tier ≥ 2 was reached (parity with `sfx-streak-cool-01`): `Streak cooling`.
  - **Throttle:** ≥2s between announcements. A newer message replaces a pending one (latest wins).
  - **Never** per tap, on tier drops, at 0, on clamp or reset, or while frozen.
  - The pill and spark dots are `aria-hidden="true"`.
- **Never colour alone:**
  - tiers = lit-tab count + pips + copy;
  - MAX = `MAX` text + 4/4 + full bar;
  - cooling = stripes + `, cooling` in valuetext.
- **Contrast:**
  - text ≥4.5:1: label 12.31:1; pill text 13.21:1 on white, 6.71:1 on gold;
  - non-text ≥3:1: leading edge 12.31:1; unlit tick 5.91:1; lit tab ≥5.80:1 on fill, plus a cream keyline ≥5.91:1 vs muted; stripes 5.91:1.
- **Sizes:** text floor 12px (smallest here is 14px). No new tap targets. Collect is 48px (the primary minimum).
- **Mute:** every tier stays identifiable from the tabs, label, pill and aria (m5-sound-spec §3).

## 7. Assets
- **CSS only; no new SVG files.**
  - Bar, fill, leading edge, ticks and tabs, stripes (`repeating-linear-gradient`), sheen, pips, pill and spark dots are all CSS on `#fx-layer` / the meter row.
  - The existing `icon-coin.svg` is used by the coin pop (unchanged).
- Fallback only if Engineering can't use gradients: `fx-streak-stripes.svg`, an 8×8 tileable 45° muted/cream stripe. Not drawn; not expected.
- **Tokens:** existing ones only (`--c-meadow`, `--c-gold`, `--c-muted`, `--c-cream`, `--c-white`, `--c-text`, `--c-outline`, easing tokens). No new token.

## 8. Acceptance criteria (CT-AC)
All values are read from config; ±1 tick (100ms) / ±1px. Run at `tc_streak_cap` 0.28 **and** 0.40 (ST-AC28), at 360×640, 375×667, 390×844, 1024×474 and 1280×800, in Chromium, Firefox and WebKit.
- **CT-AC1 (tiers by ticks):** Given s just below T1, at T1, T2, T3 and cap, then 0/1/2/3/4 ticks show the lit tab (4×16px, `--c-text`), and the fill is meadow for all but cap, which is gold.
- **CT-AC2 (label):** Given s = 0.187 at cap 0.28, then the label reads `+18% price` and the fill scaleX = 0.668 (±0.005). Given s = cap, then it reads `MAX +28%` (`MAX +40%` at cap 0.40). The label is ≤80px wide, on one line, unclipped.
- **CT-AC3 (no loops):** Given s = cap held for 10s, then `getAnimations()` on the meter row is empty after 400ms of reaching the cap: no pulse or loop. This supersedes the 1 Hz pulse in ST-AC21 (§10 C4).
- **CT-AC4 (tier-up timing):** Given an eligible upward crossing of T_k, then tab k, the sheen, k spark dots (6 at MAX) and the label pop all end by 400ms. The pill reaches its final position by 200ms, is static 200–600ms, and is fully transparent and removed at 900ms. It starts on the same frame as the credited tap.
- **CT-AC5 (one-shot / hysteresis):** Given s oscillating between T3 − 0.01 and T3 (ST-AC10), then exactly one tier-3 tier-up (pill, dots, sting, announcement) occurs. Re-lights of tab 3 are opacity-only with no pill. It fires again only after s < T2 and a re-cross of T3.
- **CT-AC6 (sound parity):** Given s rising 0 → cap, then each of the 4 visual tier-ups coincides (same frame) with exactly `sfx-streak-tier-01`, `-02`, `-03` and `sfx-streak-max-01` in order, and the counted-tap collect pitch after tier k is +k st (≤ +4). With sound off, all 4 visual tier-ups still occur.
- **CT-AC7 (pill copy and fit):** Given cap 0.28 and then 0.40, the pills read exactly the §1 copy with 1/2/3/4 filled pips. At 360×640 every pill is on one line and ≥8px inside both screen edges.
- **CT-AC8 (no cover):** At every matrix viewport, through a full climb including a tier-up tap with a coin pop, the pill and coin-pop rects never intersect Collect, Buy, Activate-all, the goal slot (next-goal bar **or** sales-stopped chip) or the coop-fill meter, and the pill and the coin pop never overlap each other.
- **CT-AC9 (coin pop untouched):** Given s = T1 vs s = cap, the coin pop's computed font size, fill, stroke, scale curve and glow are identical (ST-AC17 Tiers).
- **CT-AC10 (golden suppression):** Given a golden collect or Frenzy pop-up is live, when a tier-up occurs, then no pill renders, and the tab/label change and the `#streak-live` announcement still occur.
- **CT-AC11 (cooling):** Given 3.0 focus-seconds without a credited tap, the fill is `--c-muted` with static 45° stripes within 200ms, and the stripe layer has no running animation. Each tab unlights within 160ms of s < T_k with no sound or pill. At 0 the row is invisible within 200ms and its box is unchanged (no layout shift, CLS = 0).
- **CT-AC12 (frozen):** Given s = cap − 0.05 while cooling, when a menu opens for 10s or the tab is hidden 5s, then the fill scaleX and the tick states are identical at close/return (±1 frame), and no announcement fired.
- **CT-AC13 (reset):** Given a reload or a ≥60s hide with s > 0, then the row is hidden on the first visible frame with no fade, pill or sound. Given a config cap lowered below s (K18), then no pill, sheen or sting plays.
- **CT-AC14 (reduced motion):** Given reduced motion, then no transform or scale animates in the meter row, `#fx-layer` pill or spark dots during a full climb and decay. Only opacity transitions (≤200ms) run, the fill steps in 1% increments, and every tier is still distinguishable by the tab count, label and pill copy.
- **CT-AC15 (aria):** Given a full climb at 1 credited tap/s, `#streak-live` receives exactly 4 messages (the §6 copy), ≥2s apart. On cooling from tier ≥ 2 it receives `Streak cooling` once. There are 0 messages per plain tap or tier drop. The meter's `aria-valuetext` matches floor(s×100) and the tier at every sampled tick.
- **CT-AC16 (contrast):** axe and pixel sampling show label and pill text ≥4.5:1, and the leading edge, ticks, tabs and stripes ≥3:1 against their adjacent colours (§6 values).
- **CT-AC17 (layout):** At every matrix viewport the meter row is 20px tall, 4px under Collect, spanning Collect's left/right edges, with the band bottom ≤ the nav top (phone) or the viewport bottom (docked), and the 12px bar ≥4px clear of them (v0.3, per layout-spec v1.5). It is never in the docked column. Golden-egg hit boxes stay ≥16px from it, and Broody slots ≥8px, while hidden too.

## 9. Open questions (for Head of Art & UX / HoE / PM Collection)
- **Q1 (RESOLVED v0.2: Collect 64→48px, scene unchanged; see the rulings):** ~~ the row needs 24px under Collect (4 gap + 20 row). RC `5d9efa6` has only 8px at phone (Collect.b → nav.t: 568→576 at 360×640, 772→780 at 844 tall) and 12px at docked (788→800 at 1280×800, 462→474 at 1024×474).~~
  - Proposal: the Collect block moves up 20px (phone) or 16px (docked), and the flex `#scene` absorbs it.
  - The golden spawn rules are anchored to live rects, so the runtime stays correct. The §2.2/§2.3 tables and the Broody slot check must be re-measured by the UI/Visual Designer.
  - HoE to confirm.
- **Q2:** the label sits **inline** to the right of the bar, not "above the bar's end" (v0.3 4.2 / U-S1 / ST-AC26 "as wide as the Collect button"). Stacking it above needs ≈32px, or it covers Collect. PM to restate ST-AC26 as "row spans Collect; track 8px".
- **Q3 (coin-pop anchor, ours from 16:41):** "spawn 12px above Collect" lands **inside the goal strip**, which ends 4px above Collect at every measured layout. That contradicts R16's own "8px clear of the next-goal bar". Proposal: anchor the coin pop like the pill, bottom at coop-fill `#meter.top − 8`, and on tier-up taps 8px above the pill (§4.2). PM to amend R16 / ST-AC17 if approved.
- **Q4:** confirm that the "≤400ms tier-up" rule covers the motion only, and that product's 900ms pill lifetime (static hold + opacity exit) stands. If the Head wants a strict 400ms total, the pill becomes a 400ms one-shot and the copy moves to aria + the label only.
- **Q5:** PM Collection to drop "pulse 1 Hz" from v1.1 §3.3 and ST-AC21 (§10 C4). Art to mark U-S1's pulse as superseded in `m4-collect-streak.md` v1.1.
- **Q6:** two polite live regions (coin `fmtMoneyAria` ≤1/s per R16, plus `#streak-live`) may be chatty at 1 tap/s. Suggest the coin region summarises at most every 5s. Product owns this.
- **Q7:** the widths here are font advance-width measurements (Fredoka/Nunito 700 woff2, not tabular-adjusted). Re-measure rendered widths in the first build at 360×640 and 1280×800.

## 10. Spec conflicts found (product v1.1 followed where they differ)
- **C1 Tier source:** the brief points at `m4-collect-streak-spec.md` for "the tiers", but v0.3 has **no tiers**: it has a "pitch step-up on each 10%" (4.6) and `streak_*` names. The 4 tiers, `tc_streak_tier_count` and T_k live only in `m5-streak-tap-coins-spec.md` v1.1 §3.3, which supersedes v0.3. I used v1.1 and its canonical `tc_*` names (v1.1 §5 retires `streak_step` / `streak_credit_interval_s` / `streak_grace_s`).
- **C2 Cap:**
  - 0.40 in v0.3, economy.csv, our U-S1/U-S3 (`MAX +40%`) and decisions 2026-10-16 13:11;
  - 0.28 [P1-PENDING] in v1.1.
  This ladder is cap-relative, so it holds for either.
- **C3 Decay and hidden:**
  - v0.3 has 16.3s to 0 from the cap and drains while hidden (0.40 → 0.34);
  - v1.1 has ≈12.3s from 0.28, freezes when hidden < 60s and in menus, on the focus clock.
  I followed v1.1.
- **C4 Cap pulse:** v1.1 §3.3 table, ST-AC21, v0.3 4.3 / S-AC17 and our U-S1 all specify a 1 Hz pulse while capped. That breaks the decided "no looping pulses on persistent UI". It's dropped here: MAX is static gold + `MAX` + 4/4.
- **C5 Pitch steps:** v0.3 4.6 / U-S3 "every 10%" vs v1.1 "per tier" (+1 st per tier, cap +4, m5-sound-spec §2). v1.1 wins.
- **C6 Meter placement vs measured layout:** see Q1/Q2. Also:
  - `m4-timed-collectible.md` §2 says the streak box is "8px under Collect";
  - the `v11.py` zone uses Collect.b → +12px;
  - this spec makes it Collect.b → +24px.
  Update §2's zone list when the layout lands.
- **C7 Coin-pop spawn vs goal clearance:** see Q3.
- **C8 Pop-up lifetime:** product §3.3 900ms vs juice-spec §0 (effects ≤400ms, number pops ≤800ms). Resolved as motion ≤400ms + opacity exit to 900ms. Q4.
- **C9 (wording only):** v1.1 R16 still says "a light coin tick sound". Per HoP ruling 7 the cue is the per-tier pitched collect. This was already raised by Audio (m5-sound-spec §8 Q2).

## 11. Sound alignment (answers m5-sound-spec §8 Q1)
The **1:1 mapping still holds**:
- 4 product tiers (T1, T2, T3, cap) ↔ `sfx-streak-tier-01`, `-02`, `-03`, `sfx-streak-max-01`;
- counted-tap pitch +1/+2/+3/+4 st (capped at +4);
- `sfx-streak-cool-01` ↔ the cooling-stripes start (tier ≥ 2 only);
- triggers are identical: the eligible upward crossing with hysteresis.

There are no copy or reduced-motion differences against m5-sound-spec §2–§3. One addition for Audio to note: under a live golden/Frenzy pop-up the **pill** is dropped while the sting follows its own rank-0.5 rule. Both are suppressions, so they don't contradict. No audio change is needed.

## Changelog
- v0.1 (2026-10-24): first version.
- v0.3 (2026-10-24 17:26): CT-AC17 is now band ≤ nav top with the bar ≥4px clear; the Collect 64px references are replaced with 48px (layout-spec v1.5).
- v0.2 (2026-10-24 17:10): Head rulings on Q1–Q4 and C4; product answers on C2, C3 and C9.

## Head of Art & UX rulings, 2026-10-24 17:10 (v0.1 → v0.2)
- **Q1 / C6 (row room):** the Collect button shrinks from 64px to **48px** tall (the primary minimum; it stays full width), which frees a 24px streak row directly under it: 360×640 Collect 504–552, meter row 552–576; 1280×800 Collect 724–772, row 772–796. **The scene does not change**, so the golden egg §2 and Broody slot tables stand and nothing needs re-measuring. Collect's label stays one line at 48px (Fredoka 18px).
- **Q2:** inline label to the right of the bar is approved.
- **Q3 / C7:** approved. The tap-coin and tier pop-ups anchor 8px above the coop fill meter (360: bottom edge y 424) and rise into the yard (z above hens, below sheets/toasts). This supersedes the 16:41 "12px above Collect".
- **Q4 / C8:** approved. Motion ≤400ms, then a still hold, then a fade out by 900ms. The 800ms limit applies to number pops, not the tier label.
- **C4:** no pulse at MAX (house rule). PM Collection edits ST-AC21.
- C2 (cap 0.28 vs 0.40), C3, C5 and C9 are product calls; the ladder works either way.
- Product answers (17:12): C2 cap 0.28 (D-HOP-04/16), so the ladder thresholds are 7/14/21/28%. C3 freeze while hidden or in menus; a ≥60s offline return resets to 0. C9 closed (no coin-tick file).
