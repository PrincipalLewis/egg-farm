# M2 Workers — Layout & UX Spec · v1.3 (rc1) · 2026-10-16 · Art & UX
Source: product/workers/m2-proposal.md **v1.0 approved** (values below are taken from it; all numbers come from config/economy.csv, never hard-coded). Builds on layout-spec.md (M1) tokens and components. Mock: mockbuild/m2-workers.png (360×640).
> **Errata 2026-10-30 12:30 CET (HoAUX):** every 0.4 / 40% threshold in this doc (line numbers as before this note: L11, L36, L47, L57–59, L66, L68, L73, L125, L140–141, L146) is stale. The live values are economy.csv `yawn_at_pct` 50 and `manage_prompt_threshold` 0.5; with rc2 on, `refill_threshold_pct` 50. Read them as **50%**. With `m4.flags.rc2Refill` = 1, the Workers-tab Refill tired (N) bar and the per-card Refill are replaced by the Shift sheet (`art-ux/m5-refill-flows.md` v1.0). No other change.

## 1. Scope from spec
| ID | Worker | Unlock | Hire | Wage | Working (≥30%) | Tired (1–29%) | Asleep (0%) |
|---|---|---|---|---|---|---|---|
| W1 | Market Hand | Farm L3 | $40 | $0.25 × FarmL /min | serves queue every 1 s | every 3 s | stops, no wage |
| W2 | Coop Hand | Farm L7 | $150 | $0.5 × FarmL /min | collects eggs_per_tap every 2 s | every 4 s | stops, no wage |
| W3 | Hawker | Farm L8 | $800 | — | demand ×1.25 | ×1.10 | ×1.0 |
| W4 | Egg Grader (5 tiers) | Farm L18/19/21/22/24 | 0.5 × Farm cost at tier level | — | price ×1.5/2.0/2.5/3.0/4.0 | half the bonus | keeps 15% (v1.1) |
Energy (v1.1): 100% → 0% at −1% per 9 s while working (15 min); Tired below 30%; yawn cue at ≤40%. Manage = refill to 100%, 30 s cooldown. Offline: no work, drain or wage. PM rulings 2026-10-15: 40% yawn cue + Refill tired (N) (was Manage all) added (§4.1, §4.4); **one worker per type**; workers **can't be fired, paused or refunded** in M2 (no such UI anywhere). No Hawker queue slot / "sold out" (removed in v1.0).

## 2. Tokens (add to :root)
```css
--c-energy-ok: var(--c-meadow);      /* Working ≥30% (v1.1); bar has a % text label, so fill contrast is supplementary */
--c-energy-tired: var(--c-yolk-dark);/* Tired 1–29% (amber, not red) */
--c-energy-asleep: var(--c-disabled);/* Asleep 0% */
--energy-h: 14px; --worker-card-h: 76px; --worker-av: 56px; --manage-w: 84px;
--cooldown-ring: 3px;
/* thresholds: mirror config, pending Economy re-sim; UI reads config, these are display defaults */
--energy-yawn-at: 40;      /* % : yawn cue at ≤ this (config yawn_threshold) */
--energy-tired-below: 30;  /* % : Tired below this (v1.1, config tired_threshold) */
--energy-drain-min: 15;    /* full→empty minutes (v1.1: −1% per 9 s) */
--c-yawn-ring: var(--c-yolk-dark);
```
Engineering derives state from config values (`yawn_threshold`, `tired_threshold`, `energy_drain_s_per_pct`); never hard-code 40/50/10. If tired moves to <30, yawn (40) then fires while still Working — that's intended as an early warning.

## 3. Where it lives
- **Upgrades panel gets a 3rd tab: Collection | Farm | Workers** (`icon-hire.svg` tab icon). Each tab is ~107px on 360 (44px tall, 13px label); fits ✔. The tab appears once Farm ≥ L3 (first unlock); before that, 2 tabs as M1.
- Badge dot on the Upgrades nav button when: a worker is newly hireable and affordable, **or** any hired worker is Tired/Asleep and Manage is ready.
- Desktop docked column: Workers is a 3rd tab in the docked Upgrades area.

## 4. Worker card (one per type; W4 is one card that tiers up)
Grid `grid-template-columns:var(--worker-av) 1fr var(--manage-w); gap:var(--s-2); padding:var(--s-2); min-height:var(--worker-card-h)`; white, `--r-md`, 2px outline.
**360px fit:** 360 − 24 (panel pad) − 4 (border) − 16 (pad) − 56 − 84 − 16 (gaps) = **160px middle column** ✔ (name 15px + state pill fits; sub-line 12px wraps to max 2 lines).
- **Avatar** 56px: base `char-<type>.svg` + state overlay stacked in the same 64×64 viewBox: Yawning (≤40%) → `overlay-yawn.svg` (pulsed) + amber ring; Tired → `overlay-tired.svg` (half-lidded eyes + sweat drop) between yawns; Asleep → `overlay-asleep.svg` (closed eyes + "Zzz"). Working = no overlay, idle bob 2 s.
- **Name + state pill** (11px, `--r-pill`): "Working" meadow / "Tired" amber / "Asleep" grey.
- **Sub-line** 12px muted, live effect for the current state, e.g. "Sells every 1 s · $1.75/min", "Collects every 4 s · $3.50/min", "Demand ×1.10", "Price ×2.0 (Tier 2)", Asleep "… · no wage".
- **Energy bar** 100% × `--energy-h`, `--r-pill`, 2px outline, track `--c-cream`, fill colour by state; label `icon-energy.svg` 12px + "82%" (10px bold). Fill animates width linearly (full drain over 15 min, ≈1%/9 s, no jumps).
- **Manage button** (`--manage-w` × 44, pill): `icon-manage.svg` 20px + "Manage".

### 4.1 Energy states
| State | Range (from tokens) | Bar | Avatar | Button |
|---|---|---|---|---|
| Full | 100% | meadow, short shine sweep once after Manage | bob | **disabled** "Full" (no point refilling) |
| Working | tired-below–99% | meadow | bob | Manage (secondary style: white bg, meadow text) |
| Yawning | ≤ yawn-at (40%), any state above 0 | (as state) | **amber energy ring** (3px `--c-yawn-ring` circle around avatar) + `overlay-yawn.svg` yawn every 6 s (overlay shown 1.2 s: scaleY 1→1.08 mouth, head tilt 4°); scene worker yawns too | Manage gets glow |
| Tired | 1–(tired-below − 1)% | amber; bar pulses opacity 1→.7 every 2 s | overlay-tired, slower bob | Manage (primary meadow, glow) |
| Asleep | 0% | grey, empty | `overlay-asleep.svg` (closed eyes + **"Zzz"**), Zzz float loop; amber ring stays | Manage (primary meadow, glow) + card border amber |
| Unpaid (v1.1 §8.2) | any | bar frozen, grey stripes | `overlay-asleep.svg` + small coin badge with "Unpaid" pill (`--c-text` on `--c-yolk`), sub-line "Waiting for coins" | Manage still refills energy (stays Unpaid until it resumes) |
Asleep/Tired/Unpaid never use red or error styling (spec goal: "felt but not punishing").

### 4.2 Manage cooldown (30 s)
Cooldown is shared by all Manage buttons and Refill tired (N) (§4.4). After a tap: energy fills to 100% (300 ms ease-out) + 6 sparkle dots (from the M1 FX budget of 30) + a happy bounce. The button becomes disabled with a countdown "0:29 … 0:01" (tabular, 13px) and a `--cooldown-ring` conic progress border in `--c-meadow`. At 0 it returns to the state's normal button. Tapping during cooldown → shake (M1 disabled rule), no state change.

### 4.4 Refill tired (N) (was "Manage all")
- Unlocks once **≥ 3 workers are hired**; after that shown whenever N ≥ 1 (workers at ≤ 0.4 energy), hidden when N = 0 except during the shared cooldown (visible, greyed). Hidden with < 3 hired (no placeholder).
- Placement: full-width pill at the top of the Workers tab, directly under the tabs (sticky while scrolling the tab), height 44px, 336px wide at 360 (12px side margins) ✔. Label "Refill tired (N)" + `icon-manage.svg` 22px, N = hired workers at ≤ 0.4 energy (P4).
- **One shared cooldown** (manage_cooldown_s = 30 s): tapping Refill tired (N) refills only the workers at ≤ 0.4 energy to 100% and starts the same 30 s cooldown on Refill tired (N) **and** every individual Manage button. Tapping any individual Manage also starts the shared cooldown (one timer, all buttons).
- States: Ready (meadow, glow if any worker ≤ yawn-at) · ("All rested" removed in rc1: hidden when N = 0) · Cooldown (disabled, countdown "0:29" with conic ring, same as §4.2) · Hidden (<3 workers).
- Feedback: all cards refill together (staggered 60 ms), one sparkle burst on the button (≤8 FX elements total, not per worker).
- Farm View: a small 44px Refill-tired icon button appears next to the Upgrades nav badge when ≥3 workers and any ≤ yawn-at (same action/cooldown).

#### rc1 changelog — v1.1 · 2026-10-16 · S2-2a/b (agreed with PM Workers)
Supersedes the label, count and "Nothing to do" state above where they conflict.
- **v1.2 cleanup (checked vs product/workers/m2-proposal.md §8 #19–20, §3 P4):** all remaining "Manage all" renamed "Refill tired (N)" (asset file `icon-manage-all.svg` keeps its name); count = workers at ≤ 0.4 energy, not < 100%; refill applies only to those; energy bar drain corrected to full drain over 15 min (≈1%/9 s), was 1%/6 s; QA note 12 updated.
- **v1.3 (PM Workers clarification):** reverts the v1.2 "≥ 3 tired workers" rule. Unlocks at ≥ 3 hired; then shown when N ≥ 1, hidden at N = 0 except during cooldown (visible, greyed). QA note 12 updated.
- **Label:** "Refill tired (N)" + `icon-manage.svg` 22px, where N = hired workers at ≤ 0.4 energy (manage_prompt_threshold). Replaces "Manage all" / "(2 need it)".
- **aria-label:** "Refill N tired workers" (N updated with the label).
- **Hidden** when N = 0 and the shared cooldown is not running (replaces the "All rested" disabled state). Unlocks at ≥ 3 hired; then shown whenever N ≥ 1 (v1.3).
- **Cooldown (30 s):** stays visible and greyed (`aria-disabled="true"`) with the cooldown ring (§4.2, §4.6), even if N = 0, as ruled in PT1-10.
- **Caption:** one line directly below the button: "Ready in Ns" during cooldown. 12px Nunito, #5A4C42. Text updates at most once per second; an `aria-live="polite"` region announces no more often than every 5 s.
- **Per-worker Manage button (§4, §4.1):** stays visible and greyed above 0.4 energy, with the same caption style: "Not tired yet" when energy > 0.4, "Ready in Ns" during its cooldown (same 1 s text / 5 s aria-live limits).
- **Tap target** stays ≥ 44px for both buttons; the caption sits outside the tap area and must not shrink it.

### 4.5 One per type, permanent
Each card hires once; after hire, the Buy button is replaced by the energy bar + Manage. No fire, pause, sell-back or refund controls, menus, or long-press actions exist in M2.

### 4.6 Delivered for Engineering placeholders (m2-workers @ aa885bf)
**Cooldown ring**: `assets/ring-cooldown.svg` (48×48; grey track + `.ring-progress` circle, `pathLength="100"`, starts at 12 o'clock). Inline it (so CSS can reach the circle), absolutely positioned over the Manage / Refill tired (N) button, `inset:-4px`, `pointer-events:none`, scaled to the button (`preserveAspectRatio="none"` is not used; for pill buttons wrap the 44px icon area, or use the CSS conic fallback from §4.2).
```css
.manage .ring-cooldown{position:absolute;inset:-4px;pointer-events:none;display:none}
.manage.is-cooldown .ring-cooldown{display:block}
.ring-progress{stroke-dashoffset:var(--ring-offset,0);transition:stroke-dashoffset 1s linear}
```
Driven by the **shared** cooldown (one timer for all Manage buttons + Refill tired (N)): each second the UI sets `--ring-offset = 100 × (1 − remaining / manage_cooldown_s)` on every visible ring (100 = fully emptied, 0 = full). Or start with `animation: ring-drain calc(var(--cd-remaining) * 1s) linear forwards` from `@keyframes ring-drain{to{stroke-dashoffset:100}}` (reset on start). Reduced motion: step once per second, no transition.
**Farm View Refill-tired icon**: `assets/icon-manage-all.svg` (48×48, three stacked manage discs) for the 44px button in §4.4.
**Yawn sfx**: `assets/audio/sfx-worker-yawn.mp3` (0.9 s, 11.6 KB). Play rule: at most once per yawn cycle (6 s), and only for the **first** worker (card order) that's currently yawning; a global 6 s throttle across all workers, so N yawning workers = 1 sound per 6 s. Muted by the SFX toggle; never on Asleep (Zzz is silent).

### 4.3 Locked / hireable / hired
| State | Card | Button |
|---|---|---|
| Locked (Farm < unlock) | 55% opacity, avatar silhouette-tinted | grey "🔒 L7" (lock glyph is CSS, not emoji, in the build) ; sub "Unlocks at Farm L7" |
| Hireable, can't afford | full opacity, no energy bar | Buy style disabled: coin + "$150" + M1 time-to-afford hint line (§4.6b format) |
| Hireable, affordable | glow | Buy (meadow): `icon-hire.svg` + "$150" |
| Hired | energy bar + Manage | — |
| Egg Grader next tier | hired card + extra row "Tier 3 → ×2.5 · $27,288" Buy button under the bar (locked until its Farm level) | |
Hire flow: tap Buy → confirm-free (instant, like M1 upgrades) → coins deduct → card flips to Hired with 100% energy, avatar pops in with sparkle, and the worker walks into the Farm View (§6). The first hire of any worker shows a one-time coach bubble on the Manage button: "Workers get tired. Tap Manage to perk them up!"

## 5. "Hire a Coop Hand" tip (spec §2b)
- Trigger: coop in Full! for ≥ `coop_full_tip_s` (10 s, confirmed), Farm ≥ L7, no Coop Hand hired. Once per session; never after hiring.
- Look: toast card pinned under the HUD on the Farm View (not inside the panel), `--c-yolk` bg, 2px outline, `--r-md`, `char-coop-hand.svg` 32px. Copy: **"Coop's full! Hire a Coop Hand to collect for you."** with a chevron. Max width 336px (fits 360). Tap → opens Upgrades → Workers tab and scrolls to the Coop Hand card, which pulses twice. Swipe/✕ dismisses (counts as shown). Auto-hides after 8 s. Non-blocking.

## 6. Workers in the Farm View
- Market Hand: stands beside the customer queue strip (left end), 40px; on each auto-sale it does a tiny hop and the M1 coin flyer plays (respect the FX budget: auto-sales use 1 coin flyer max).
- Coop Hand: next to the nest, 40px; every collect it bends (scaleY .9, 150 ms) and the M1 egg flyers play at `min(k,2)` eggs.
- Hawker: at the stall/right of the queue with a megaphone; Working = small "♪" note every 3 s.
- Egg Grader: by the Basket area / bottom-right of the scene; small gold tier star ×tier.
- State overlays mirror the card (tired/asleep overlays at 40px). Tapping a worker in the scene = Manage if ready (the same action and cooldown), else opens the card.
- Placement at 360: absolute positions in the coop scene's free corners; never cover the nest, Full! badge or Collect button (min 8px clearance). Hidden until hired.

## 7. Assets
| File | Use |
|---|---|
| assets/char-market-hand.svg | W1 card + scene |
| assets/char-coop-hand.svg | W2 card + scene + tip |
| assets/char-hawker.svg | W3 |
| assets/char-egg-grader.svg | W4 |
| assets/overlay-tired.svg | Tired overlay, stack on any char-* (same 64×64 viewBox) |
| assets/overlay-asleep.svg | Asleep overlay, same stacking |
| assets/icon-energy.svg | energy bar label, nav badge |
| assets/icon-manage.svg | Manage button |
| assets/icon-hire.svg | Workers tab, Hire button |
SFX: reuse `sfx-upgrade.mp3` for hire, Manage and Refill tired (N) (PM-approved); `sfx-worker-yawn.mp3` for the yawn cue (§4.6).
| assets/overlay-yawn.svg | Yawn overlay (≤40%), same stacking; eyes closed (v2) |
| assets/ring-cooldown.svg | Manage cooldown ring (§4.6) |
| assets/icon-manage-all.svg | Farm View Refill tired (N) button |
| assets/audio/sfx-worker-yawn.mp3 | Yawn cue, throttled (§4.6) |

## 8. QA test notes
1. Energy colour/pill at 100, 40 (yawn), 30, 29, 1, 0% boundaries (Working ≥30, Tired 1–29, Asleep 0; v1.1).
2. Manage: refills to 100%, button shows a 30 s countdown, taps during cooldown do nothing; returns to its state button at 0; Full = disabled.
3. Asleep: wage label shows "no wage"; the card has no red/error styling.
4. Locked cards show the unlock level from config (L3/L7/L8/L18…); hire disabled until affordable; time-to-afford hint uses the M1 format.
5. Grader tiers: only one card; the next-tier row locks/unlocks at F18/19/21/22/24; MAX after tier 5.
6. Coop Hand tip: appears only when Full ≥10 s, Farm ≥L7, no Coop Hand; once per session; tap routes to the Workers tab + Coop Hand; never after hire.
7. 360×640: tabs, cards and tip don't overflow or truncate names; tap targets ≥44px.
8. Offline return: energy unchanged from the last save; no drain shown.
9. FX: worker auto-actions never push live effect elements over 30.
11. Yawn cue at ≤ config yawn_threshold (40%): amber ring + yawn; Zzz at 0%; change the config thresholds (e.g. tired 30, drain 15 min) and check the UI follows without a rebuild.
12. Refill tired (N): hidden with <3 hired; with ≥3 hired, shown when N ≥ 1, hidden at N = 0 unless cooling down; refills only those; one shared 30 s cooldown greys all Manage buttons with "Ready in Ns"; per-worker Manage greyed with "Not tired yet" above 0.4.
13. One per type: a hired card can't be hired again; no fire/pause/refund UI anywhere.
10. Reduced motion: no bobs/Zz floats; state readable by pill text + overlay (AC-W5 "readable at a glance").

## 9. Spec gaps — RESOLVED (Workers PM, 2026-10-15)
- 40% yawn cue: added (§4.1, overlay-yawn.svg, amber ring; Zzz at 0%).
- Refill tired (N) (was Manage all): added (§4.4), ≥3 workers, one shared cooldown.
- One worker per type (§4.5).
- No fire / pause / refund in M2 (§4.5).
- W2 wage $0.5 × Farm L/min and coop_full_tip_s = 10 s confirmed; tip copy and rules adopted.
- SFX: reuse sfx-upgrade.mp3.
- **Pending Economy re-sim:** Tired threshold may move from <50% to <30%, and full drain from 10 to 15 min. Both are tokens/config (§2); UI needs no redesign.
