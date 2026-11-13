# Juice spec v1 — tap / collect / sell (2026-10-16), Audio & Juice Designer
Status: v1.1 (2026-10-16): §6–§9 added, **signed off by Head of Art & UX 2026-10-16**; v1 §0–§5 **signed off by Head of Art & UX 2026-10-16**; to Engineering behind a feature flag; listening/feel check in first build with it (Player + Game Critic).
Visuals are owned by the UI/Visual Designer and are **referenced, not redefined** here: number pops → `art-ux/number-pop-spec.md` v1.0 (font, size, colour, icons, rise, drift, stacking, clamping — **styling pending coordination with UI/Visual Designer**); tokens → `layout-spec.md` §1, `style-direction.md`. Sounds → `audio-hooks.md`.

## 0. Global rules (all effects)
- **Start within 1 frame:** start the visual on the same `pointerdown` handler / rAF as the event (≤16.7 ms at 60 fps). Sound starts in the same handler (`AudioBufferSourceNode.start(0)`).
- **End by 400 ms** for squash/particles/flash; **number pops end by 800 ms**.
- **No layout shift:** animate `transform` and `opacity` only (no width/height/top/left/margin/font-size). Particles + pops live in `#fx-layer` (fixed, `pointer-events:none`, layout-spec §2). Use `will-change:transform` only during the animation.
- **Performance:** 60 fps at 360×640 on a mid-range phone (reference: ~Moto G Power / Galaxy A14 class, 4× CPU throttle in DevTools). FX budget **30 live elements total** (layout-spec §4.7) incl. pops; pool DOM nodes, no per-frame allocation. If budget is full, drop new particles first, never pops.
- **Docked ≥960px:** same px sizes/durations (no scaling with viewport); origins follow the element's on-screen rect, so effects appear in whichever panel holds the source.
- **Easing tokens:** `--ease-pop: cubic-bezier(.34,1.56,.64,1)` (ease-out-back, existing), `--ease-out: cubic-bezier(.22,1,.36,1)`, `--ease-in: cubic-bezier(.55,0,1,.45)`.
- **Never colour-only or sound-only:** every effect pairs motion + a value change in text (HUD counters, pops); sound mirrors, never replaces. HUD counters remain the a11y source (`aria-live` polite, throttled 1/s, layout-spec §7); pops/particles are `aria-hidden="true"`.
- **Reduced motion** = OS `prefers-reduced-motion: reduce` OR Settings "Reduced motion" on: no scale, no translate, no particles; opacity only. Sound unchanged (respects mute).
- **Number pop timing (shared, used by number-pop-spec):** scale 0.6 → 1.1 → 1.0 over 0–120 ms (`--ease-pop`; 1.1 at ~80 ms); rise + hold to 500 ms; opacity 1 → 0 from 500–800 ms (`--ease-in`). Reduced motion: opacity 0 → 1 over 150 ms, hold, 1 → 0 over 200 ms (ends 650 ms). Stacking/merge (4 per source, 60 ms tap merge), big-sale 1.25× — see number-pop-spec.

## 1. Tap (egg / hen / coop tap target)
| Part | Spec |
|---|---|
| Squash | target `transform: scale(1.08, 0.90)` at 0–50 ms (`--ease-out`), stretch `scale(0.96, 1.05)` at 50–110 ms, settle `scale(1,1)` 110–200 ms (`--ease-pop`). `transform-origin: 50% 100%` (bottom). Retrigger mid-animation restarts from current value (no jump). |
| Particles | 3 "crumb" dots, 6×6px circle, `--c-yolk` + `--c-cream` alternating, spread 120° cone upward, distance 18–28px random, lifetime 260 ms, opacity 1→0 last 120 ms, `--ease-out`. Skip particles if a tap came <60 ms ago (merge window). |
| Pop | tap pop per number-pop-spec (+k), shared timing §0. |
| Sound | `egg.tap`, 60 ms cooldown. |
| Total | squash 200 ms, particles 260 ms, pop 800 ms. |
| Reduced motion | no squash/particles; target opacity 1 → 0.75 → 1 over 120 ms; pop fade-only. |

## 2. Collect (eggs coop → basket)
| Part | Spec |
|---|---|
| Source | coop: `scale(1.05)` 0–80 ms `--ease-out` → 1.0 by 240 ms `--ease-pop`. |
| Flight | min(N, 5) egg icons (`icon-egg.svg` 20px) fly coop → basket pill, stagger 30 ms, each 280 ms, `--ease-in` on translate with arc: y offset −40px at midpoint (two keyframes). Last egg lands ≤ 400 ms (30×4 + 280). |
| Land | basket pill `.pulse` 1 → 1.12 → 1 over 240 ms (`--ease-pop`, existing layout-spec §3.2) on first egg's landing (t ≈280 ms); counter value updates on that frame. |
| Sparkle | 4 dots 4px `--c-gold`, at basket, radial 360°, 14px, lifetime 200 ms. |
| Pop | collect pop above coop per number-pop-spec, starts t=0. |
| Sound | `egg.collect` at t=0 (second note at 80 ms ≈ midway flight). |
| Reduced motion | no flight/scale/sparkle; basket counter value cross-fades (opacity 0.4→1, 150 ms); pop fade-only. |

## 3. Sell (eggs → coins)
| Part | Spec |
|---|---|
| Button | Sell button `:active` per layout-spec §5 (`translateY(2px) scale(.97)`), release 1.0 over 120 ms `--ease-pop`. |
| Coins | min(ceil(value/price_unit), 6) `icon-coin.svg` 20px fly customer/button → coins pill, stagger 25 ms, 300 ms each, `--ease-in` arc −32px; done ≤ 425 → cap stagger so last lands ≤ 400 ms (6 coins: 20 ms stagger). |
| Land | coins pill `.pulse` 240 ms on first coin; counter ticks to new value over 300 ms (text only, `font-variant-numeric: tabular-nums`, no width change: min-width per §3.2). |
| Big sale (>10× median, number-pop-spec) | +4 sparkle dots 5px `--c-yolk-dark` at coins pill, radial, 20px, 300 ms; sound +2 dB (+ optional sparkle layer ≤600 ms, audio-hooks). Pop 1.25× + glow per number-pop-spec. |
| Sell all | one burst (max 6 coins), one sound, one pop with summed value. |
| Reduced motion | no flight/sparkle; coins counter cross-fade 150 ms + value tick; pop fade-only. |

## 4. Mute toggle
Settings label **"Sound"** (never "SFX") with a speaker icon that changes on/off (waves / slash) plus visible text "On"/"Off"; 44×44 min hit; state never colour-only. Persisted. Muting stops new sounds instantly; no effect on visuals.

## 5. QA checks
1. DevTools Performance, 360×640, 4× CPU throttle: 20 taps/s for 5 s + collect + sell-all → no frame >16.7 ms in FX code, ≤30 live fx nodes.
2. Layout Shift (CLS) = 0 during all effects.
3. Frame-step: first visual change in the same frame as input event.
4. All effects end by 400 ms; pops by 800 ms (650 ms reduced).
5. Reduced motion on: no transforms in `#fx-layer`; HUD values still update.
6. Sound off: every event still has a visible change.

---
# v1.1 additions (2026-10-16), signed off by Head of Art & UX 2026-10-16
**Exception to §0 (signed off):** the 400 ms limit covers feedback for taps and actions. The welcome-back count-up (§9) is a skippable information display and may run up to 1200 ms.
Global rules §0 apply (1-frame start, transform/opacity only, `#fx-layer`, 30-element budget, docked ≥960 same px). Copy/toast visuals: `m4-tracks-copy.md` v1.1 (strings, toast style "Coop upgraded!" ≤2.5 s), `m4-tracks-explainer.md`, `m2-workers-layout.md` §4, `layout-spec.md` §4.7/§5. Sounds and priority/ducking: `audio-hooks.md` v1.3. Mute: every item works fully silent; reduced motion never removes the text/value change.

## 6. Stacking with upgrade / milestone (visual side)
- One purchase that fires several rewards (level-up + milestone + Balanced step) plays **one** row bump (§7.1) immediately; toasts queue (UI rule, one at a time ≤2.5 s); sparkle bursts from the same tick merge into one burst of ≤10 dots. Only the highest reward sound plays (audio-hooks reward bus).
- FX budget priority when full: toasts > number pops > strip/row bumps > particles (drop particles first).

## 7. M4-A tracks
### 7.1 Track level-up (Hens / Egg value / Farm Buy)
| Part | Spec |
|---|---|
| Level badge | `scale` 1 → 1.3 → 1.0 over 0–240 ms (`--ease-pop`), as layout-spec §4.5 level badge. |
| Effect line | `{Stat} {cur} → {next}` text swaps on frame 1; new value `opacity` 0.4 → 1 over 160 ms. |
| Sparkle | 5 dots 4px `--c-gold`/`--c-yolk`, from Buy button, 90° upward cone, 16–24px, 260 ms. |
| Cap lift (Farm buy unlocks a capped row, M4A-3) | that row's lock glyph `opacity` 1 → 0 + `scale` 1 → 0.6 over 160 ms; Buy fades in 160 ms. No toast (copy rule). |
| Sound | `track.levelup` (replaces upgrade.buy). Ends ≤ 400 ms. |
| Reduced motion | no scale/sparkle; badge + effect line cross-fade 150 ms. |
### 7.2 Balanced farm step k/5 (k = 1..4)
| Part | Spec |
|---|---|
| Strip segment k | fill `transform: scaleX(0 → 1)` from left over 0–200 ms (`--ease-out`), then segment `scale` 1 → 1.15 → 1 over 200–400 ms (`--ease-pop`); ends at 400 ms. Label text updates on frame 1 (`Balanced farm {k}/5 · next …`). |
| Weakest outline | 2px `--c-yolk-dark` moves to new weakest track on frame 1 (no animation). |
| Toast | `Balanced farm {k}/5: +{x}% income` (copy v1.1, once per save). |
| Sound | `sfx-balanced-step-0k` (pitch climbs with k so progress is audible, but the text says it). |
| Reduced motion | segment appears filled with 150 ms fade; toast fade-only. |
### 7.3 Balanced farm 5/5 (+30%)
| Part | Spec |
|---|---|
| Strip | segment 5 fills as §7.2, then all 5 segments pulse `scale` 1 → 1.12 → 1 staggered 40 ms (ends ≤ 400 ms). Strip text becomes `Balanced farm 5/5 · +30%`. |
| Burst | 10 sparkle dots (5px `--c-gold`, `--c-yolk`, `--c-meadow`) radial from strip centre, 24–40px, 360 ms (`--ease-out`), opacity out last 120 ms. Counts in budget. |
| Pop | `+30%` number pop **reuses the big-sale number-pop styling from number-pop-spec v1.0** (no new style); shared pop timing (≤800 ms). |
| Toast | `Balanced farm 5/5: +30% income` (copy v1.1), above sheets, ≤2.5 s, non-blocking. |
| Sound | `balanced.complete` 760 ms (celebration exception), top priority; ducks core loop −6 dB. |
| Reduced motion | no pulse/burst/scale; strip text + toast fade 150 ms in / 200 ms out; `+30%` pop fade-only. |
| Migration (TR-MIG-MS) | tiers already reached at migration: no toast, no sound, no burst. |

## 8. Workers
### 8.1 Hire
| Part | Spec |
|---|---|
| Card | flip to Hired per m2-workers-layout §4.3: Buy area `opacity` 1 → 0 over 120 ms, energy bar + Manage `opacity` 0 → 1 + `translateY(6px → 0)` 120–280 ms. |
| Avatar | pop-in `scale` 0.6 → 1.1 → 1.0 over 0–240 ms (`--ease-pop`) + 6 sparkle dots (16–28px, 300 ms). |
| Coins | coins pill decrements on frame 1; existing `--c-barn-ui` tint 240 ms (layout-spec §3.2). |
| Farm View walk-in | per m2-workers-layout §6 (owned there); not part of the 400 ms budget. |
| Sound | `worker.hire`. |
| Reduced motion | no scale/translate/sparkle; cross-fade 150 ms; worker appears in Farm View in place. |
### 8.2 Coop Hand refill (Manage) and Refill tired (N)
| Part | Spec |
|---|---|
| Energy bar | fill to 100% over 300 ms ease-out (m2-workers-layout §4.2) — implement as `transform: scaleX()` on the fill, not width, to avoid layout work. Label % ticks to 100 on frame 1. |
| Sparkle | 6 dots on the card (Refill tired (N): one burst of ≤8 on the button, cards staggered 60 ms, per §4.4). 260 ms. |
| Bounce | avatar `scale` 1 → 1.08 → 1 over 240 ms (`--ease-pop`). |
| Coop Hand link (B-1) | if the coop showed the "⚠ Full!" badge/chip (B-1), it clears when collecting resumes; badge `opacity` 1 → 0 over 160 ms. B-1 hints 'hire or refill Coop Hand': following it plays the normal hire/refill sound; **no extra sound** for the badge. B-1 is a coop-badge copy/size fix in QA (qa/m3-recheck/rc1-qa-bugs-v4-7d52952): text "⚠ Full!", aria "Coop full". |
| Cooldown | button disabled with countdown + ring (§4.2, owned by UI); tapping during cooldown → shake + soft cant-afford sound (400 ms per button), shake always shows. |
| Sound | `worker.refill`, one per action. |
| Reduced motion | bar jumps to 100% with 150 ms fade of the label; no sparkle/bounce; ring steps once per second (as §4.2). |

## 9. Offline earnings "Welcome back" collect
| Part | Spec |
|---|---|
| Count-up | modal "+N eggs" (layout-spec §4 modal) counts 0 → N on open. Duration = `clamp(400, 400 + 200·log10(N), 1200)` ms (N=10 → 600, N=1,000 → 1000, ≥10,000 → 1200). Easing `--ease-out` (`cubic-bezier(.22,1,.36,1)`). Number format per number-pop-spec / 1.2K rules; `tabular-nums`, fixed `min-width` = width of final value, so no layout shift. |
| Ticks | `offline.countup.tick` at most every 90 ms, max 12, pitch rising; **ticks are optional sugar**: off when muted. |
| Skip | any tap on the card/number (not the buttons) during count-up jumps to N instantly; ticks stop; no sound for skip. |
| Collect | tap "Collect" (or close/scrim, which also grants, layout-spec): `sfx-welcome-collect-01`; egg flyers per §2 Collect (min(N,5) eggs → basket, ≤400 ms) then basket `.pulse`. Close/scrim = same sound, no flyers (per layout-spec). |
| a11y | dialog text has the final N for screen readers immediately (`aria-label` / visually hidden text with final value); counting digits `aria-hidden`. |
| Reduced motion | no count-up: final value shown instantly, number `opacity` 0 → 1 over 150 ms; no flyers; basket counter cross-fade 150 ms. No ticks. Collect sound still plays (unless muted). |

## MK-63 / MK-62 coin-pill spend pops (2026-10-19)
No sound. Purchases keep their existing purchase sound; the wage floater is silent. Pop timing: see decisions.md 2026-10-19 10:35.
MK-63 final (2026-10-19): drift 12 px, no overshoot, one pop per purchase with a new pop replacing any still showing, no sound, static fade for reduced motion. Source of truth: art-ux/copy/m41-mk60-mk63-wage-spend.md v1.1. Target M4.2.
