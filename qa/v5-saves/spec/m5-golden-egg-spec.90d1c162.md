# M5.0 Golden Egg (timed collectible + Frenzy): build spec · v1.3.2 · 2026-10-24 · PM, Collection
**Status:** **Approved (conditional), D-HOP-08 · BUILDABLE (HoE §12)** (`engineering/m5.0-sizing.md` §12, 2026-10-24 ~16:45) (D-HOP-2026-10-24-08, 16:22 CEST): approved as a spec, conditional on Economy G3/G1, Art assets and #69. **v1.3.2 (17:43)**: wording errata only (HoQA v0.7 wording; HoP errata ruling D-HOP-2026-10-24-26 #7). **v1.3 (17:22)**: GE-16/GE-17 measured (Art rects 5d9efa6 (`art-ux/m5-layout-rects-960.md` v1.0); UI/Visual GE16/17 review (art-ux/reviews/ge16-ge17-5d9efa6.md) (`art-ux/reviews/ge16-ge17-5d9efa6.md`)); final draft CSV sha. **v1.2 (17:19)** consolidates every edit made since v1.1 (see the v1.2 changelog entry). v1.1 applies the D-HOP-08 rulings (cited inline as *D-HOP-08 #n*). It supersedes `m4-timed-collectible-spec.md` v0.5 (DRAFT, never built). The v0.5 file stays as history; where the two disagree, this file wins.
**Scope ruling:** D-CEO-20261024-06 (M5.0 active layer first). HoP 2026-10-24 (a): the golden egg and streak were never built (`product/research/m4-shipped-audit.md`), so this is **greenfield on RC1 `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463`**.
**HoP rulings applied:** **D-HOP-2026-10-24-04** (cited inline as *D-HOP-04 #n*):
- #4 menus freeze the golden-egg timer;
- #5 "attended" (not used by the egg; see R5);
- #6 Art v1.0 spawn spots/mocks are final, the asset is `golden-egg.svg`, and M4-AC24 is restated against G1;
- #10 new CSV columns are drafted for Economy G3 and applied only after HoP approval.

Engineering sizing: `engineering/m5.0-sizing.md` (HoE v1.0), whose §8 gaps are closed in §12 below.
**No code, no PRs, no CSV edits.** This is a spec for the M5.0 build.

**Glossary**
- **Focus clock** (`focusClock` in code; HoE `engineering/m5.0-sizing.md` F1(b) and §9.1; renamed from HoE's earlier term by **D-HOP-2026-10-24-09 #1**): a clock **separate from the sim clock**. It advances only while the tab is visible, no D-HOP-04 #4 menu is open, and the tab is live (R5).
  - It does **not** advance during the rc1 hidden < 60 s online sim, a hidden-tab or frame gap ≥ 60 s, a menu, or a guarded tab.
  - The golden egg timers (first spawn, gap, lifetime, states), the **Frenzy** and the **streak hold and decay** run on it. So does the Broody Hen accrual.
  - **"Attended"** now has only its D-HOP-04 #5 meaning: tab visible plus player input within the last 30 s of sim time. Only abilities use it; nothing in this spec does (D-HOP-09 #1).
- **Sim clock**: the fixed-step 10 Hz `step()` time. It runs whenever rc1 runs the sim, including the hidden < 60 s online sim. The **credited-tap 1.0 s window** and the **reference-income 60 s window** run on it (D-HOP-04 #1/#2).

**Tags**
- **[HoP]**: set by Head of Product.
- **[CSV]**: an existing constant column in `product/economy.csv`, synced to `balance.json` `m4.tc.*` by `scripts/sync-economy.ts:161`.
- **[NEW-ROW · for Economy G3]**: a proposed new constant `tc_*` column (auto-synced by `sync-economy.ts:161`). Economy drafts it with G3; it's added to economy.csv and `product/economy/csv-column-allowlist.md` only after HoP approval (D-HOP-04 #10). **This spec makes no CSV edits.**
- **[UI]**: an Art & UX layout constant (`art-ux/m4-timed-collectible.md`), not CSV.
- **[G3-scratch: pending measure:l30plus re-measure]**: a value from Economy's scratch G3 draft (D-HOP-2026-10-24-16). It clears on the `measure:l30plus` re-measure (it was P1-pending up to v1.1).

**Gate G1 (HoP ruling (c) 2026-10-24; D-HOP-04 #6; wording confirmed by D-HOP-08 #4), standing until the CEO rules:** in the canonical sim with the full M5.0 active stack (golden egg at 100% catch, streak at its cap, tap coins, Broody Hen, worker abilities per `workers/m5-worker-abilities-spec.md`), optimal **active/idle ≤ 2.0 at P95, with the worst seed ≤ 2.25**, over every 10-minute window, seeds 0–99, at F10/F18/F24 (Economy's Python gate, mirrored by HoE's F5 TS harness). Nothing here ships until it passes. See GE-AC29.
**G3 status (D-HOP-2026-10-24-16):** Economy's scratch G3 is in (`product/research/v2-slices/economy.md` §13; draft `scratch/v2-econ/economy.m50-draft.csv`, **sha256 8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b** (152 columns, 29 added, `guard_*` dropped; **D-HOP-2026-10-24-24**, verified on disk 17:22). This supersedes 45095351 (D-HOP-22) and edfd8902 (D-HOP-16's 21-column draft). No Collection rule uses a `guard_*` column.
- The full M5.0 stack (golden egg at 120–300 s, streak cap 0.28, Broody Hen on) passes the window gate at **P95 1.77, worst seed 1.84**.
- Every formerly P1-pending value now carries the draft value, tagged **[G3-scratch: pending measure:l30plus re-measure]**. All of them equal what this spec proposed.
- **G3 clears only when the re-measure on the harness of record (`measure:l30plus`) is in.** HoP then signs off, and the draft is applied to `product/economy.csv` (D-HOP-16 #5). Until then this spec makes no CSV edits.

**Out of scope (M5.1):** Hot Hands (a faster spawn timer during a streak), the Golden Hen outcome, and Lab/frequency upgrades. Also out: the market-rush variant (M4.x backlog) and the M4-B rewarded boost (parked, D-HOP-2026-10-17-01). Every v0.5 boost rule (re-roll, `Frenzy active` caption) is **dropped**.

---

## 1. Overview
A golden egg appears at one of 8 fixed spots on the farm every 2–5 minutes of active play from Farm L8. It stays 30 s, and tapping it gives one of three rewards: coins, a 30 s ×2 price **Frenzy**, or free eggs (paid as coins from L20). Workers never tap it. It pays nothing to an idle player.

## 2. Player fantasy
"Something shiny just landed. Grab it!" A short, optional, lucky moment that a present player always notices and an absent player never misses or regrets. Frenzy turns the next 30 s into "sell everything now", so Sell and Collect matter again even after workers automate the farm.

## 3. Detailed rules
### 3.1 Unlock and spawn timing
- **R1** Spawning is enabled when Farm level F ≥ `tc_egg_unlock_farm` (8). It never re-locks.
- **R2** The first spawn comes `tc_first_spawn_s` (45) of **focus-clock time** after the unlock. The same applies on a save that already has F ≥ 8 when it first loads in M5.0.
- **R3** After a golden egg *resolves* (tapped or expired), the next gap is drawn uniformly from [`tc_egg_gap_min_s`, `tc_egg_gap_max_s`] = [120, 300] s of focus-clock time [HoP: base cadence kept per v0.5]. The gap is drawn from the **event RNG stream `evRng`** (HoE F1a, seeded from `mixSeed(seed ^ K)`), never from `state.rng` (which would shift customer sequences and pacing seeds) and never from `Math.random`.
- **R4** Only one golden egg exists at a time.

### 3.2 Focus clock and pause (new in v1.0)
- **R5 Focus clock (`focusClock`)** (HoE `engineering/m5.0-sizing.md` F1(b), §9.1; see Glossary) advances only when **all** of these hold:
  - (a) the tab is visible (`document.visibilityState === 'visible'`);
  - (b) no **menu** is open (R6);
  - (c) the game is live: not tab-guard-inactive, not read-only, not held by the newer-save guard (the same conditions as `game.ts:145` `canSave` minus the hidden check);
  - (d) the clock delta is ≥ 0.
- **R5e Focus-dt clamp (QA GE-5; accepted by HoP under D-HOP-09 #4; **confirmed by HoE**):** per frame, focus-clock time advances by min(frame dt, **1.0 s**) (`focus_dt_max_s` is a code constant, not CSV). A visible forward jump ≤ 60 s therefore advances golden timers, Frenzy, streak hold/decay and Broody accrual by at most 1.0 s, so an egg can't expire in one jump. The excess is discarded, not replayed. Jumps ≥ 60 s take R8. The rc1 sim itself (production, customers, sales and I_ref) is unchanged and processes the jump as it does today.
- **R5f Long frames can't buy extra uplift (HoE §12 D-C3).** In a frame shorter than 60 s, `advance()` still runs every sim tick of the frame, while focusClock credits at most 1.0 s (R5e).
  - So Game spreads the frame's focus dt over its ticks. The **first ⌈focusDt / 0.1⌉ ticks carry focus**: effects are live and timers count down.
  - The **remaining ticks run with M5 timed effects suspended**, the same as the hidden < 60 s sim: no Frenzy ×2, no streak (1 + s), no ability uplift; sales credit at base × Grader.
  - The two rules together: **R5e caps how far the timers move (≤ 1.0 s per frame), and R5f makes the uplifts apply only to the ticks covered by that 1.0 s.** In a long frame, effects are suspended after the first 1.0 s of its ticks.
  - Production, customers, sales and I_ref still process every tick.
- The spawn countdown, the first-spawn countdown and the on-screen lifetime use focus-clock time only. This is HoE's F1(b) clock input to `step()`, named `focusClock` (D-HOP-09 #1).
- The golden egg does **not** also require D-HOP-04 #5's "player input within the last 30 s": a visible, menu-free farm keeps spawning. An egg nobody taps just expires (GE-AC5), which costs nothing and pays nothing.
- **R6 Menus freeze (D-HOP-04 #4).**
  - These count:
    - every **modal** (Settings, welcome-back/offline, confirm, recovery, newer-save);
    - every **sheet** (Market/Upgrades/Workers at mobile layout);
    - the **tracks explainer**;
    - **onboarding** steps;
    - **coach** marks/nudges that show a scrim or callout.
  - In code terms: any element with the scrim, `aria-modal="true"`, or the explainer/onboarding/coach root visible (HoE F6 `dialogOpen()` extended to these).
  - These don't count: toasts, and the docked column at docked layout (it's part of the page, not a sheet).
  - While a menu is open, an on-screen egg stays **visible, frozen and untappable** (`animation-play-state:paused`, `pointer-events:none`, `inert`). It resumes at the same age when the menu closes (Art & UX §6).
  - The streak's hold and decay freeze at the same moment (m5-streak-tap-coins-spec R12), so nothing decays while a menu is open.
- **R7 Hidden < 60 s** (rc1 `save/hidden-time.ts` short-gap path): the timers are paused. On return the egg is still there at the same age.
- **R8 Hidden-tab or frame gap ≥ 60 s, or a reload** (HoE §9.1 and §9.1a wording; exactly 60.0 s counts as offline, since RC1 tests `gap < 60000`): this is the offline path. The focus clock does not advance for the gap.
  - Any on-screen egg is removed silently: `collectible_expired{reason:"offline"|"reload"}`, no reward. Its removal counts as a resolution, so the next gap is a fresh R3 draw, counting from when the welcome-back modal closes.
  - With **no** egg on screen, the saved spawn countdown **resumes where it stopped**, from when the welcome-back modal closes. It is neither reset nor re-drawn, so reloading can't shorten the wait (review fix B1).
  - rc1's hidden-time settlement, which simulates the first 60 s online, **never advances golden-egg timers**.
- **R9 Negative clock delta:** treated as 0 elapsed. Nothing spawns, expires or extends.
- **R10 Single-tab guard:** a guarded or frozen tab spawns nothing (R5c).
- **R10b Single-tab takeover (QA GE-7):** when another tab takes over, the old tab becomes guarded (R5c). Before freezing, it removes any on-screen egg with `collectible_expired{reason:"takeover"}`, no reward. Its Frenzy remaining time is in the last save and resumes in the new tab (R10a). The new tab loads the save, which never holds an egg (R10a), so it shows none and resumes `nextSpawnRemainingS`.
- **R10c Unload (QA GE-3):** on `pagehide` (the same flush as `session_end`, `game.ts:80`), an on-screen egg emits `collectible_expired{reason:"reload"}` as part of that flush. If the flush doesn't land, no event is emitted on the next load (the egg isn't saved). That loss is accepted and counted under T-AC flush loss.
- **R10d Flag (QA GE-6; HoE §12 D-C1):** `balance.m4.flags.golden`, default **0**. It lives in `m4.flags`, which `fitM4()` keeps whole on sync. A `m4.tc.*` key would be wiped, because `tc` is rebuilt from the `tc_*` columns. It's active only when `balance.m4.enabled` is also true. With the flag off: no spawns, no Frenzy, the fields below untouched, and the sim trace byte-identical to RC1 (flag-off golden `f90d1678`).
- **R10a Save (HoE F2; optional fields, no SAVE_VERSION bump):**
  - `nextSpawnRemainingS`: focus seconds left on the current countdown (first-spawn or gap). Absent on a save with F ≥ 8 means a first M5.0 load, so R2's 45 s applies.
  - `frenzyRemainingS` (endorsed, D-HOP-09 #5): focus seconds left on a running Frenzy, absent when none is running. On load, the Frenzy resumes with that remaining time once the welcome-back modal closes (R23, D-HOP-08 #3). It replaces v1.0's wall-clock `frenzyEndAt`, so HoE F2 should rename the field.
  - `evRngState` (uint32, QA GE-1): the event RNG's position, so the spawn/slot/reward sequence continues after a reload.
    - **Seeding (HoE §12 D-C2):** `GameState` has no `seed` field, so if `evRngState` is absent or invalid (not a non-zero uint32), take `evRngState = mixSeed(state.rng ^ 0x6576526E)` (salt = ASCII "evRn") **once**, on the first tick that `m4.flags.golden` **or** `m4.flags.broody` is on (**HoE Q4 ruling**), then save it.
      - After that, `evRng` never reads `state.rng` again, so the customer sequence is untouched (GE-AC3).
    - **HoE Q4 rule 1:** only golden draws (gap, slot, reward) advance `evRngState`. The Broody Hen never advances it.
    - **HoE Q4 rule 2:** `brRng` is derived from `evRngState` on load or when the Broody Hen is enabled. It is not saved, and only Broody draws from it (HoE §12 D-C4, m5-broody-hen-spec R4). So Broody re-picks never shift the golden sequence (GE-AC36).
    - **Out of scope (HoE Q4 follow-up ruling):** Broody enabled first and golden enabled at a later tick. `evRngState` is then seeded at the Broody tick, so the golden sequence won't match a golden-only run enabled later. The requirement is determinism per save, not identical sequences across arbitrary enable times. No fixed initial seed is added, because that would be a new save field with no player benefit.
    - Draw order per spawn is fixed: gap at resolve, then slot at spawn time, then reward at tap. QA can predict the sequence from a seed.
  - An on-screen egg is never saved.
  - Sanitising (HoE §12 D-C5): non-finite or negative values → absent; `nextSpawnRemainingS` is clamped to [0, `tc_egg_gap_max_s`]; `frenzyRemainingS` is clamped to [0, `tc_frenzy_s`]; `evRngState` must be a non-zero uint32, or it's re-derived per D-C2. An M4.1 build ignores all of these.

### 3.3 Spawn spots (new in v1.0)
- **R11 Spawn spots are Art & UX v1.1** (`art-ux/m4-timed-collectible.md` v1.1 §2, measured on live RC `5d9efa6` rects in Chromium 156; data `scratch/m5-layout-recheck-5d9efa6/`). They supersede v1.0's derived tables, and §2.4 holds the v1.0 → v1.1 delta. **This spec restates the rules and does not copy the tables:** Art's §2.2 reference tables and §2.3 QA-matrix expected centres are the oracle for GE-AC15.
- **R12 Layout keys** (Art v1.1 §2.1). The docked breakpoint is **960 px**, owned by Art (D-HOP-08 #5). 1024×474 is only a test viewport; no AC uses 1024 as a breakpoint.
  - **Orientation rule (QA GE-16; confirmed by Art):** the app docks **only** when `(min-width: 960px) and (orientation: landscape)`.
    - Everything else, **including portrait at vw ≥ 960**, uses the phone key with scene-anchored spots.
    - A docked layout with vh < 700, or without a full-width farm column (FW < 880), uses docked-compact.
  - **phone = NOT (width ≥ 960 AND landscape)**, i.e. not `(min-width:960px) and (orientation:landscape)`. This mirrors Art's §2.1 definition (Art rects 5d9efa6 §F m1).
    - It is the exact complement of the docking rule above (De Morgan: vw < 960 **or** not landscape; a square viewport counts as portrait in CSS).
    - Engineering derives the key at runtime from that same `matchMedia` query, never from vw alone.
    - (telemetry `layout` = `phone-360` for vw < 368, `phone-375` otherwise). Spots are **anchored to the live `#scene` rect** `s`:
    - x = `s.left + 42` for S1–S4 and `s.right − 42` for S5–S8;
    - y = `s.top + round(f × s.height)`, with f = **0.32 / 0.50 / 0.68 / 0.86** for S1/S5, S2/S6, S3/S7, S4/S8.
  - **docked** (landscape, vw ≥ 960, farm column FW = vw − 400 ≥ 880, **and** vh ≥ 700): Art's 1280×800 table, with
    - `x′ = x + (FW − 880)/2` (it follows the centred scene);
    - **`y′ = 56 + (y − 56) × (vh − 56)/744`** (confirmed by Art v1.1; the HUD band stays fixed). This applies **only** at vh ≥ 700 with a full-width farm column.
  - **docked-compact** (new key; landscape, vw ≥ 960, with FW < 880 **or** vh < 700, e.g. 1024×474 and 960×600). Spots are anchored to live rects:
    - L = `s.left + 58`, R = `s.right − 44`;
    - yt = `queue.bottom + 48`, yb = `meter.top − 48`, ym = `round((yt + yb)/2)`;
    - spots S1 (L,yt), S2 (L,ym), S3 (L,yb), S5 (R,yt), S6 (R,ym), S7 (R,yb). **S4 and S8 aren't used.**
  - All values are rounded to whole px, then `env(safe-area-inset-left/top)` is added (Art runtime rule 1).
- **Streak meter layout (`art-ux/m5-combo-tiers.md` v0.2):** Collect shrinks from 64 to 48 px, and the streak meter moves into the freed 24 px row under it. The scene is unchanged, so the R12/R13 spot rules and Art v1.1's tables and counts stand. The streak meter box stays a no-spawn zone (R14) at its new row.
- **R13 Expected valid-spot counts** (Art v1.1 §2.2–§2.3, Chromium-measured; sheets closed). They are given as pill hidden / `×N hens` pill shown / worst case with the Broody Hen placed:

| Viewport | Key | Spots | Valid (pill hidden / pill shown / worst with Broody) |
|---|---|---|---|
| 360×844, 375×844, 390×844, 430×844 | phone | 8 | 8 / 7 / 4 |
| 1024×474 | docked-compact | 6 | **6 / 5 / 3** |
| 1280×720, 1280×800, 1366×768 | docked | 8 | 8 / 8 / 7 |
| 959×600 | phone (`phone-375`) | 8 | **6 / 6 / ≥ 4** (S4, S8 drop: meter 15 px; S4 also the pill) |
| 960×600 | docked-compact | 6 | **5 / 4 / ≥ 2** (S3 drops with the pill; S5 drops with `Full!` 14 px; Broody at Y5) |
| 960×1280 portrait | phone (`phone-375`; portrait never docks) | 8 | **8 / 8 / ≥ 6** |
| 1024×1366 portrait | phone (`phone-375`) | 8 | **8 / 8 / ≥ 6** |

  The 959/960/portrait rows are measured on RC 5d9efa6 in Chromium 155: Art rects 5d9efa6 (`art-ux/m5-layout-rects-960.md` v1.0) §A–§B; UI/Visual GE16/17 review (art-ux/reviews/ge16-ge17-5d9efa6.md) (`art-ux/reviews/ge16-ge17-5d9efa6.md`). **The ≥ 2 floor is met at every size.** Hens aren't a no-spawn zone, so the stricter "off the yard" reading (2/3/4/4) doesn't apply.

  At phone sizes the pill drops S4. Art's reference sizes 360×640 and 375×667 measure 8 / 7 / 4 too. Firefox and Safari/WebKit aren't measured yet; the scene geometry is pure CSS, so Art expects ±1 px, and GE-AC15 re-measures live in all three engines.
- **R14 Safe zones (binding at runtime).** Before each spawn, test every spot against the **live** `getBoundingClientRect()` of each zone below. A spot is valid only if its 56×56 hit box plus `tc_margin_px` (16) [UI] overlaps none of them.

| Zone | Why |
|---|---|
| HUD (coins, basket, next-goal strip, frenzy pill, boost chip) | readability |
| Toast strip **as measured** (Art v1.1: at phone layouts it sits below the queue, e.g. 360×640 `47,147–313,179`; docked HUD+8) | toasts never cover a target (**new in v1.1 zone list**) |
| Customer queue / Market cards / **every Sell and Sell-all button** | anti-misclick (Sell) |
| Coop `<img>` box (clipped to `.farm`) + `.nest` + **Collect button** + `#goal` | anti-misclick (Collect). **The Sales Stopped chip** (`product/market/sales-stopped-spec.md` §4.7) shows in this slot. It sits **inside** the `#goal` rect (SS v1.3.9 SS-16: `max-width: 560px`, centred in `#goal`; its button/hit area fills `#goal`'s 44 px height). It never grows the slot. So it is narrower than `#goal` at 959×600 and 1024×1366, and equal to it at the other measured sizes. A label that doesn't fit uses the short form from `rc2-workers-copy` §6 instead of wrapping. So this zone covers the chip, and no egg can sit under a newly shown chip (QA GE-17; Art ruling).
  - **Measured (SS v1.3.9 SS-16; Art rects 5d9efa6):** the chip rect lies **inside** `#goal` at every size. It equals `#goal` at 360×640 (x 8–328), 960×600 (24–536) and 1280×800 (160–720). It is narrower at 959×600 (pill x 188–748 inside `#goal` 12–923) and 1024×1366 (232–792 inside 12–1012). The `#goal` zone therefore covers the chip, so R14 here and Broody R4 hold. `#goal` examples: 959×600 12,412 · 911×44; 960×600 24,472 · 512×44; 1280×800 160,672 · 560×44; 360×640 8,456 · 320×44 (Art rects 5d9efa6 (`art-ux/m5-layout-rects-960.md` v1.0) §D–§E; UI/Visual GE16/17 review (`art-ux/reviews/ge16-ge17-5d9efa6.md`)).
  - All 9 labels fit on one line (worst 242 px vs the narrowest 320 px slot), so the short-form fallback is never reached at ≥ 360 |
| The coop's **`Full!` badge** | readability (**new**, Art v1.1) |
| The **`×N hens` pill** while it's visible (hens > 12): **0 px** overlap allowed, not 16 | readability (**new**, Art v1.1) |
| Coop fill meter and the **streak meter box** (m5-streak-tap-coins-spec §4), even while the streak meter is hidden | spots stay stable |
| The **Broody Hen's 56×56 tap box** (m5-broody-hen-spec R4) whenever a hen is marked, glowing or not | two targets never overlap (**new**) |
| Worker cards / Manage-all | M2 |
| Docked column (880–1280 at 1280 wide; generally x ≥ FW) | never spawn on panels |
| Open sheet/modal/scrim | covered |
| Bottom nav, viewport edges, OS safe areas | reach |

  Pick uniformly at random (from `evRng`) among the valid spots.
- **R15 No valid spot:** defer the spawn. The lifetime doesn't start, and the deferral is recorded in `deferred_ms`. Re-check every 500 ms of focus-clock time and on every layout change. At 360/375 an open sheet blocks all 8 spots, so spawns are always deferred then.
- **R16 Resize/rotate with an egg on screen:** if its spot becomes invalid, move it to a valid spot in the new layout's spot set (R12), keeping its age. If none is valid, freeze it as in R6 until one is.

### 3.4 Target, lifetime and states
- **R17** Asset **`art-ux/assets/golden-egg.svg`** (D-HOP-04 #6; renamed from `fx-golden-egg.svg`, which is retired everywhere). The game copies it to `public/assets/golden-egg.svg`. 40 px visual in a 56×56 CSS px hit area [UI]. Stationary, with a gentle bob inside the hit area only. Art's file header says the SVG is "not drawn yet", so Art must deliver it before the UI PR (§7).
- **R18** States by focus age: Idle 0 s, Warning `tc_warn_at_s` (20), Urgent `tc_urgent_at_s` (27), Fade at `tc_egg_despawn_s` (30), lasting 300 ms. It isn't tappable during the fade. Visuals per Art & UX §3; reduced motion per §4.
- **R19 Fresh-spawn grace:** ignore any pointer-down within `tc_spawn_grace_ms` (250) of the spawn becoming visible, or that started before it appeared. Pointer-down and pointer-up must both be inside the hit box.
- **R20** One grant per egg. Double taps, multi-touch, or mouse plus touch give exactly one reward. Keyboard: the egg is focusable and Enter/Space collects it (Art & UX §4).
- **R21 Sound** (on by default, respects mute): spawn chime, a warning chime at 27 s, and pop + coin on collect. Expiry is silent.

### 3.5 Rewards (rolled at tap time from `evRng`)
| reward_type | Weight | Grant |
|---|---|---|
| `cash` | `tc_egg_w_cash` 0.45 [G3-scratch: pending measure:l30plus re-measure] | coins = `floor((baseScaled × cashBp + 500000) / 1000000)` (§4 #2) |
| `frenzy` | `tc_egg_w_frenzy` 0.35 [G3-scratch: pending measure:l30plus re-measure] | every sale × `tc_frenzy_price_mult` (2) for `tc_frenzy_s` (30) s of **focus-clock time** (R23) |
| `eggs` (F < `tc_egg_eggs_as_cash_from_farm`) | `tc_egg_w_eggs` 0.20 [G3-scratch: pending measure:l30plus re-measure] | Basket += floor(`tc_egg_eggs_s` × E), bypassing the coop cap |
| `eggs_cash` (F ≥ 20) | same weight | coins = `floor((baseScaled × eggsBp + 500000) / 1000000)` (§4 #3) |

- **R22 Frenzy scope** [HoP 13:10, `tc_frenzy_all_sales` = 1]: player, Market Hand/Hawker and Basket-stock sales. It enters as one entry in `saleMultipliers()` (`src/sim/payout.ts:8`), so every sale path and preview uses it. It multiplies the price (with the Grader and streak); it doesn't add.
- **R23 Frenzy timing (D-HOP-08 #3; replaces v1.0's wall-clock rule; the no-uplift-while-frozen consequence and `frenzyRemainingS` are **endorsed under D-HOP-09 #5**):** the Frenzy runs on the **focus clock** (R5), counting down `frenzyRemainingS`. Under any D-HOP-04 #4 menu and while the tab is hidden (any length, including the ≥ 60 s offline path and reloads), it is **frozen**:
  - the countdown stops;
  - the ×2 does **not** apply to any sale made while frozen, including worker sales under a menu. Otherwise a menu left open would park a permanent ×2;
  - the HUD pill shows the frozen remaining time with a paused style.
  
  It resumes with the same remaining time when the player can act again: the menu closes, or the tab is visible and the welcome-back modal is closed. "No timed active effect runs while the player can't act." Under defaults a second Frenzy can't overlap (30 s < 120 s). If it ever does, the remaining time is reset to 30 s, never stacked.
- **R24 Offline/hidden:** offline eggs and sales during hidden-time settlement are **never** at Frenzy price. A Frenzy can't end while hidden, because it is frozen (R23).

### 3.6 Feedback and copy
- **R25 Popups** at the egg position (Art & UX v1.1 §5) use **short money, `fmtMoneyShort`**, for every amount. This supersedes v1.0's popMoney full-digit rule.
  - Cash and eggs_cash show `+$812.40!`, `+$1.2K!`, `+$27.9K!` or `+$3.4M!`. A $999,999.99 amount shows `+$1M!`. Never `+$X coins`.
  - Eggs show `+25 free eggs!` / `+1 free egg!`, with the count in `fmtCount`. Frenzy shows `Frenzy! 2× price`.
  - The aria-label keeps the exact amount (`fmtMoneyAria`).
  - Style: Fredoka 24/700 `--c-text` on a `--c-yolk` pill; it rises 32 px and fades over 1.2 s.
- **R25a Popup clamp (required, Art v1.1 §5):** popup left = `clamp(x − w/2, 8, vw − 8 − w)`, and the popup never rises above HUD bottom + 8. That keeps it **8 px inside the screen**. Without the clamp, a centred 126–206 px popup at the x = 50 spots clips by 13–53 px.
  - The longest string, `+1,860 free eggs!`, measures 206 px; it fits the 344 px usable at 360 on one line at 24 px.
- **R25b Tap isolation (engineering):** the golden egg's tap handler calls **`stopPropagation()`**. RC1's whole `#scene` counts clicks as Collect taps (`app.ts:210`), so without it one egg tap would also Collect. A golden-egg tap is **not** a credited tap (m5-streak-tap-coins-spec R3): it doesn't build the streak or pay tap coins.
- **R26 Frenzy pill** `2× 0:30` (m:ss, tabular numerals) in the HUD where the boost timer would sit (the boost is parked). Every visible egg price (customer card, Sell, Sell all) shows the doubled value with a gold `2×` chip. With the streak, the chip order follows m5-streak-tap-coins-spec §4.4. Everything reverts within 1 tick of the Frenzy ending.

### 3.7 Shared test rules for the M5.0 Collection specs (QA cross-cutting X1–X7; binding for m5-streak-tap-coins-spec and m5-broody-hen-spec too)
- **X1 Per-feature economy tolerance:** QA checks each feature's income uplift at **±20 % relative** of Economy's G3 prediction (the AC7 convention). Example: golden +20 % at 100 % catch passes at 16–24 %. If Economy publishes per-feature bands with G3, those replace ±20 % for that feature. G1 remains the hard gate.
- **X2 Hidden semantics (D-HOP-04 #2 as clarified by D-HOP-08 #2/#3):** "sim paused" means **M5 timers, decay, effects and accrual freeze while hidden** (golden countdown and lifetime, Frenzy, streak value and hold, Broody accrual). **The rc1 < 60 s online sim is unchanged** (`save/hidden-time.ts`): production, customers and sales still run. Those sales get **no** M5 uplift (no streak, no Frenzy), because the focus clock and the effects are frozen. They **do** enter I_ref at base price, since the I_ref window is on the sim clock with "no special case" (D-HOP-04 #2; HoE §9.1). **Confirmed by D-HOP-09 #2**; this reverses v1.1's exclusion. After a load or an offline return, I_ref is the steady-state rate until 60 s of sim time accrue (D-HOP-07 X2, D-HOP-2026-10-24-10 #1; m5-streak-tap-coins-spec §4.1a). **The golden egg's rewards don't use I_ref** (they use the live E × P), so the golden egg is unaffected.
- **X3 Seeds and tolerances:** approved as QA proposed:
  - sim seeds 0–99;
  - timers ±1 tick (100 ms);
  - money ±1 ¢, except where an AC says "exactly";
  - statistical bands ≥ 3σ: gap mean 210 ± 15 s over 200 draws (GE-AC3), reward shares ± 1.5 pp over 10⁴ rolls (GE-AC7), spawn rate 17.1 ± 0.3/h instant catch and 15.0 ± 0.3/h zero catch over 100 focus hours (GE-AC30). "~17/h" applies only to instant catch.
- **X4 Telemetry v0.6.2 not built:** HoE §10.1 puts an **M5.0 subset** in scope: envelope `sid` + `fgMs` on every event (including `session_end`); `session_end` payload: credited taps, **`taps_total`, `taps_moved_eggs`, `empty_credited`, `coop_hand`, `farm_level` (M5.0, D-HOP-10 #4, HoE TEL-13; QA ST-12)**, `tap_bonus_cents`, `golden_cents`, `frenzy_extra_cents`, `streak_extra_cents`, `broody_cents`/`_collects`; a minimal `schema.ts`. The full migration (session split, `session_summary`, the 150 KB valve, `tap.empty`) is M5.0.1 (a CEO call). Assertions are tagged:
  - **[T-sub]**: in the M5.0 subset, so mandatory;
  - **[T-full]**: needs the full migration, so asserted only when it lands;
  - **[T-sub, pending HoE sizing]**: a field PM needs added to the M5.0 subset (D-HOP-09 #6: M5.0 keeps the subset only, but the fields ST-AC20 needs must be in it). The exact list is in m5-streak-tap-coins-spec §8.1. **D-HOP-2026-10-24-10 #4 (TEL-4) puts the whole `session_end` payload, including these fields, in the M5.0 subset**, so items formerly tagged this way are now [T-sub]; HoE confirms cost.
  
  Tags are used in GE-AC27, ST-AC19, ST-AC20 and BH-AC19. Untagged event names and fields are mandatory.
- **X5 Debug hooks Product needs** (HoE implements under `?debug=1`; never in production builds):
  - injected `now`;
  - injected visibility/menu schedule;
  - `evRng` seed;
  - force spawn at S1–S8;
  - force reward type;
  - set egg age;
  - set s and the hold remaining;
  - set I_ref (fixture override of the ring);
  - set nest cents;
  - force broody ready;
  - force broody slot.
  
  Abilities setters are PM Workers'.
- **X6 "Never stack":** refers **only** to the parked M4-B boost. Frenzy × streak multiply. Whether ability uplifts (Rush/Shout/Inspect) multiply with them is defined in `workers/m5-worker-abilities-spec.md` (PM Workers). This spec requires only that they enter `saleMultipliers()` as factors.
- **X7 Order and rounding:** one sale credits `round(k × base_cents × Π saleMultipliers)`, **rounded once** (`saleValueCents`, `payout.ts:12-15`), where `Π = grader × (1 + s) × frenzy(2|1) × [ability factors per the abilities spec]`. Multiplication is commutative, so the order of the factors doesn't change the result. During a menu or hide, (1 + s) and frenzy count as 1 (D-HOP-08 #3). Collection's example: Market Hand sale, k = 10, base 150¢, Grader 1.25, s = 0.28, Frenzy → round(10 × 150 × 1.25 × 1.28 × 2) = 4,800¢.

## 4. Formulas
Symbols: F = Farm level; E = `prodEggsPerSec(s,b)` (`src/sim/tracks.ts`, eggs/s from Hens); P = `priceDollars(s,b)` (`src/econ/income.ts`: sale price × Grader mult, **live** moods). P excludes the streak and the Frenzy.

1. `gap_s = tc_egg_gap_min_s + u × (tc_egg_gap_max_s − tc_egg_gap_min_s)`, with u ~ U[0,1) from `evRng`. Mean 210 s. Range [120, 300).
2. **Integer money with sub-cent precision (HoE money-math ruling 2, superseding ruling 1's `baseCents`; the same bp form as streak §4.1b):**
   - **`baseScaled`** = `Math.round(E × P_cents × 100)`, taken once at tap time, where `P_cents = P × 100`. It is the live production value per second in **hundredths of a cent** (10⁻⁴ $): E eggs/s × P (base sale price × Grader, live moods). There's no streak and no Frenzy, as before (GE-AC8).
     - This only converts the float to a 1/100 ¢ grid. Rounding to whole cents is rejected; **the one cent rounding is at payout**.
   - **bp** = seconds of production × 10,000, set at balance load:
     - `cashBp = Math.round(tc_egg_cash_s × 10000)` (45 → **450,000**);
     - `eggsBp = Math.round(tc_egg_eggs_s × 10000)` (60 → **600,000**).
   - `cash_cents = floor((baseScaled × cashBp + 500000) / 1000000)`, i.e. half up to the cent.
     - **Note:** HoE wrote `baseScaled × seconds × bp`. bp already contains the seconds (× 10,000), so the formula uses bp once. It is equivalent to HoE's intent: `baseScaled × seconds ÷ 100` gives cents, and `bp ÷ 1,000,000` = `seconds ÷ 100`. **HoE signed off this seconds-counted-once correction (17:18).** Check: E = 9.5, P = $1.35 → `baseScaled` 128,250 → (128,250 × 450,000 + 500,000) / 10⁶ = 57,713,000,000 / 10⁶ = **57,713¢**, the same as the exact 45 × 9.5 × 135 = 57,712.5 → 57,713.
   - **BigInt guard** (streak §4.1b) on the full product `baseScaled × bp + 500000`. It switches to BigInt when the product exceeds `Number.MAX_SAFE_INTEGER`, i.e. `baseScaled` > **20,015,998,342** for cash (≈ $2.0e6/s of production) and > **15,011,998,757** for eggs_cash (≈ $1.5e6/s). That is 100× lower than ruling 1's `baseCents` switch. The result converts back to `coinsCents: number`.
3. `eggs = floor(tc_egg_eggs_s × E)` (F < 20; eggs, not money). `eggs_cash_cents = floor((baseScaled × eggsBp + 500000) / 1000000)` (F ≥ 20), with the same `baseScaled` and guard.
4. `sale_cents = round(k × base_price × Π saleMultipliers)`, where `saleMultipliers = [graderMult, (1 + s_streak), frenzy ? tc_frenzy_price_mult : 1]` (the existing `saleValueCents` rule).
5. Expected value per spawn, in seconds of production value (PM arithmetic, Economy to re-confirm in P1) [G3-scratch: pending measure:l30plus re-measure]: 0.45 × 45 + 0.35 × ≈30 + 0.20 × 60 ≈ 43 s. At one spawn per ≈215 s that is ≈ +20% at 100% catch.
- **Boundary plug-ins:**
  - F8 row: E = 9.0, P ≈ $1.40 × Grader 1 → baseScaled 126,000 → cash (126,000 × 450,000 + 500,000) / 10⁶ → **56,700¢ = $567.00** (unchanged).
  - F30 row (CSV `eggs_per_sec` 31, `egg_price` 2.5, Grader ×1): baseScaled 775,000 → cash **348,750¢ = $3,487.50**, eggs_cash **465,000¢ = $4,650.00** (unchanged, exact). Tracks and the Grader scale P linearly, so an ×8 price stack gives about $27.9K. In short money (R25): $567.00 → `+$567.00!`, $3,487.50 → `+$3.5K!`, $27.9K → `+$27.9K!`.
  - At ≥ $1M the popup reads `+$X.XM!` (R25). There's no cap (E7).
  - E = 0 or P = 0 (impossible from F8 under the CSV, but guard it): cash = $0.00. The popup is suppressed (no `+$0.00!`), `reward_value` = 0 is still logged, and the egg still counts as collected.

## 5. Tunables
| Name | Value | Source | Tag |
|---|---|---|---|
| `tc_egg_unlock_farm` | 8 | CSV col `tc_egg_unlock_farm` → `m4.tc.egg_unlock_farm` | [HoP] |
| `tc_first_spawn_s` | 45 | **G3 draft column** (D-HOP-16 #5) | [P], draft 45 ✓ |
| `tc_egg_gap_min_s` / `tc_egg_gap_max_s` | 120 / 300 | CSV | [HoP] cadence kept |
| `tc_egg_despawn_s` (lifetime) | 30 | CSV | [HoP] |
| `tc_warn_at_s` / `tc_urgent_at_s` | 20 / 27 | **G3 draft columns** (D-HOP-16 #5) | [P] (Art & UX states), draft 20 / 27 ✓ |
| `tc_spawn_grace_ms` | 250 | **NEW-ROW, not in the G3 draft**: Economy adds it in the single M5 CSV PR (HoE ruling: no magic numbers; all tc_* go through the sync). Engineering builds against the default; validation catches a missing column | [P] |
| `tc_egg_w_cash` / `_w_frenzy` / `_w_eggs` | 0.45 / 0.35 / 0.20 | CSV | [G3-scratch: pending measure:l30plus re-measure] |
| `tc_egg_cash_s` | 45 | CSV | [G3-scratch: pending measure:l30plus re-measure] |
| `tc_egg_eggs_s` | 60 | CSV | [G3-scratch: pending measure:l30plus re-measure] |
| `tc_egg_eggs_as_cash_from_farm` | 20 | CSV | [HoP] |
| `tc_frenzy_price_mult` | 2 | CSV | [HoP] |
| `tc_frenzy_s` | 30 | CSV | [HoP] |
| `tc_frenzy_all_sales` | 1 | CSV | [HoP] |
| hit / visual / margin px | 56 / 40 / 16 | `art-ux/m4-timed-collectible.md` | [UI] |
| Spot rules | §3.3 | Art & UX v1.1 §2 (live-measured; supersedes v1.0) | [UI] |

**Draft economy.csv columns** (as in Economy's G3 draft `scratch/v2-econ/economy.m50-draft.csv`, approved in principle by D-HOP-16 #5; constant on every row; no edit made):
```
tc_first_spawn_s,tc_warn_at_s,tc_urgent_at_s
45,20,27
```
Existing columns are unchanged in the draft: `tc_egg_w_cash/_w_frenzy/_w_eggs` 0.45/0.35/0.20, `tc_egg_cash_s` 45, `tc_egg_eggs_s` 60.
- `tc_spawn_grace_ms` (250) is **not in the draft**. Per HoE's ruling, Economy adds it in the single M5 CSV PR. It's requested from Economy.
`validateBalance` (HoE F3) adds: tc_warn_at_s < tc_urgent_at_s < tc_egg_despawn_s; tc_egg_gap_min_s ≤ tc_egg_gap_max_s; the three weights sum to 1.

v0.5 names `tc_unlock_farm`, `tc_lifetime_s`, `tc_p_cash`, `tc_cash_prod_s`, `tc_eggs_prod_s`, `tc_frenzy_mult` and `tc_eggs_cash_from_farm` are **retired**. The CSV names above are canonical.

## 6. Edge cases
| # | Case | Expected |
|---|---|---|
| E1 | Hidden 40 s with the egg at age 25 s | Returns at 25 s, same state; expires after 5 more focus seconds |
| E2 | Hidden ≥ 60 s / reload / frame gap ≥ 60 s | R8: an on-screen egg is removed (`expired{offline|reload}`, no reward, fresh gap); with no egg, the countdown resumes from its saved value after the welcome-back modal closes |
| E3 | Settings opened 60 s with the egg at 12 s | Frozen, untappable, still at 12 s after closing; spawn timer unchanged |
| E3b | Menu or hide during a Frenzy | Frenzy frozen, no ×2 on sales while frozen, resumes with the same remaining time (R23, D-HOP-08 #3) |
| E4 | Welcome-back modal, tracks explainer, onboarding or coach open | No spawn, no timer progress (R6, D-HOP-04 #4); the streak is frozen too |
| E5 | Docked, no sheets | The focus clock runs while panels are used; spots never inside the docked column |
| E6 | All 8 spots invalid | Deferred (R15), `deferred_ms` > 0 when it finally spawns |
| E7 | Frenzy, then Grader/Egg value upgrade | 2× applies to the new price from that tick; end time unchanged |
| E8 | Frenzy, basket empty, no customers | Ends with `extra_coins` = 0, no compensation |
| E9 | Frenzy while Coop Hand asleep/unpaid (rc1: an asleep Coop Hand collects 0; the 0.15 asleep share is **out of M5.0**, backlog item for PM Workers, D-HOP-08) | Frenzy applies to whatever sells; collection speed is irrelevant to the price multiplier |
| E10 | Coop empty | No effect on spawn or reward; `eggs` rewards bypass the coop |
| E11 | Collect at 10–20 taps/s, autoclicker | Grace (R19) blocks accidental grabs; one grant max; Collect taps are all still processed |
| E12 | Autoclicker aimed at a spot | It can collect at ≥ 250 ms after spawn. Accepted: the payout is identical to a human 100% catch, which the gate already models |
| E13 | Clock backward | R9 |
| E14 | Two tabs | Only the live tab spawns (R10) |
| E15 | Reduced motion / muted | Art & UX §4; no sounds when muted |
| E16 | Cash < $1,000 / $1,000–$999,999.99 / ≥ $1M | `+$812.40!` / `+$1.2K!` / `+$3.4M!` (all `fmtMoneyShort`, R25); the popup is clamped 8 px inside the screen (R25a); aria `fmtMoneyAria` (exact) |
| E17 | Eggs reward ≥ 1M eggs (not reachable on the CSV) | `+1.2M free eggs!` via fmtCount; Basket exact |
| E18 | F drops below 8 (prestige/reset, future) | R1: never re-locks after unlock; a fresh save starts locked |
| E19 | Rotate/resize with the egg visible | R16 |

## 7. Dependencies
**Upstream (needed by this spec):**
- RC1 `5d9efa61…`: the visibility hook (`main.ts:142`, `save/hidden-time.ts`), the canSave live-state checks (`game.ts:145`), the `saleMultipliers()` hook (`payout.ts:8`), the sim RNG plumbing (`state.rng` at `sim/state.ts:48`, which this feature must **not** draw from), `fmtMoneyShort`/`fmtCount`/`fmtMoneyExact` (`ui/format.ts`) and the single-tab guard.
- `M4Params` (`config/formulas.ts:29-41`) must gain a `tc` field. The audit shows `m4.tc` ships with no reader.
- Art & UX: `art-ux/m4-timed-collectible.md` **v1.1** (states, popups with short money and the clamp, sounds, spawn spots re-measured on RC `5d9efa6`). **Deliverable before the UI PR:** draw `golden-egg.svg` (the file is marked "not drawn yet") and the 3 SFX. On the live build, verify GE-AC15's ≥ 2 valid spots at 1024×474.
- Economy: G3 (P1 model, T3 re-sim of the rewards) and the 4 draft columns (§5) for HoP approval. G1 is the gate.
- HoE foundations F1 (`evRng` second RNG stream, so spawns and rolls never draw from `state.rng`; focus clock; timed-effects registry), F2 (save fields with no SAVE_VERSION bump), F3 (validation), F6 (`ui/overlay.ts`, `dialogOpen()` covering D-HOP-04 #4 menus).
- Telemetry v0.6.2: schema allowlist §3.1 (the M4 entries already exist).

**Downstream (depends on this spec):**
- `m5-streak-tap-coins-spec.md` (frenzy × streak price stacking, chip order, streak meter exclusion zone).
- `m5-broody-hen-spec.md` (shares the collectible framework: spot validity, scrim freeze, popups, telemetry; the mutual exclusion zone).
- M5.1 Hot Hands / Golden Hen / upgrades.
- Economy dashboards (`collectible_*`).

## 8. Telemetry (telemetry-spec v0.6.2)
The envelope on every event is `type, ts, sid, fgMs`. All events are **ring-trimmed** (not pinned) and are already on the §3.1 allowlist. Field changes vs v0.5: `boost_active` and `rerolled_from` are **removed** (the boost is parked); `layout` is **added**. The age at tap is `reaction_ms` only; there is no `active_age_ms` field (QA GE-12).

| Event | Fields |
|---|---|
| `collectible_spawned` | `collectible_id` (per-session counter), `skin:"golden_egg"`, `farm_level`, `collection_level`, `slot_id` (S1–S8), `layout` (phone-360/phone-375/docked/**docked-compact**, Art v1.1 §2.1; a new enum value, not a new field), `interval_s` (integer: the **drawn** gap, or 45 for a first spawn, in focus seconds; it **excludes** deferral, QA GE-10), `deferred_ms` (focus ms between the countdown reaching 0 and the egg appearing) |
| `collectible_collected` | `collectible_id`, `skin`, `reaction_ms` (focus age at tap), `in_warning` (bool), `reward_type` (cash/frenzy/eggs/eggs_cash), `reward_value` (cents, eggs, or 2), `reward_duration_s` (30 or 0), `farm_level` |
| `collectible_expired` | `collectible_id`, `skin`, `reason` (timeout/offline/reload/takeover/reset), `farm_level` |
| `frenzy_started` | `collectible_id`, `mult`, `duration_s`, `farm_level`, `grader_tier` |
| `frenzy_ended` | `collectible_id`, `extra_coins` (cents above the non-frenzy price), `eggs_sold`, `sold_by_player`, `sold_by_workers`, `reason` (timeout/reset); `hidden_end` and `offline` are removed because a Frenzy can't end while frozen (QA GE-11, D-HOP-08 #3) |
| `session_end` (extend) | `golden_spawned`, `golden_collected`, `golden_cents` (cash + eggs_cash), `frenzy_extra_cents` |

KPIs: catch rate (collected/spawned) ≥ 60% in sessions with fg ≥ 5 min at F ≥ 8; median reaction < 10 s; `golden_cents`/total coins compared against Economy's P1 curve (±3 pp, telemetry §6).

## 9. Acceptance criteria
QA reads all values from config. Timings are **focus-clock time** unless stated, at ±1 tick (100 ms at `tickHz` 10).
- **GE-AC1** Given F < `tc_egg_unlock_farm`, when 30 min of focus-clock time pass, then no golden egg appears and no `collectible_spawned{skin:"golden_egg"}` fires.
- **GE-AC2** Given F reaches 8 at focus-clock time t, then the first spawn appears at t + 45 s, provided a valid spot exists.
- **GE-AC3** Given 200 seeded resolutions, then every gap is in [120, 300) s, the mean is 210 ± 15 s, the same seed reproduces the same gaps, and the customer arrival/demand sequence for that seed is byte-identical with the golden egg enabled vs disabled (`evRng` isolation).
- **GE-AC4** Given a golden egg is on screen, then no second one appears.
- **GE-AC5** *(carries M4-AC5, **updated**: "focus age" replaces "time", and Art & UX's state hook is added)* Given an untouched golden egg, then `data-tc-state` is `idle` from 0 s, `warning` at 20.0 s, `urgent` at 27.0 s and `fade` at 30.0 s. The element is removed by 30.3 s, `collectible_expired{reason:"timeout"}` fires once, and coins, coop and Basket are unchanged.
- **GE-AC6** Given a visible egg, when it is tapped once at focus age ∈ [0.25, 30.0) s, then exactly one reward is granted on that input frame, and `collectible_collected` fires with `reward_type`/`reward_value` equal to the state change.
- **GE-AC7** Given 10,000 seeded rolls, then the cash/frenzy/eggs shares are 45/35/20 ± 1.5 pp, and changing the three weights in config changes the shares accordingly.
- **GE-AC8** Given E and P (Grader included, streak and Frenzy excluded), when `cash` is granted, then coins increase by exactly `floor((Math.round(E × P_cents × 100) × 450000 + 500000) / 1000000)` cents (§4 #2). For example, E = 9.5 and P = $1.35 give exactly 57,713¢.
- **GE-AC9** Given F = 19, when `eggs` is granted, then the Basket increases by floor(60 × E), the coop is unchanged, and the cap is ignored. Given F = 20, the same roll gives `eggs_cash` = `floor((Math.round(E × P_cents × 100) × 600000 + 500000) / 1000000)` cents (§4 #3) with the Basket unchanged.
- **GE-AC9b (.5 edges at payout and BigInt guard; HoE money-math ruling 2)** Unit tests on the pure `rewardCents(baseScaled, bp) = floor((baseScaled × bp + 500000) / 1000000)`:
  - **cash, .5 edge (CSV 45 s, bp 450,000):**
    - given E = 9.5 and P = $1.35 (`baseScaled` 128,250; exact 57,712.5¢), then cash = **57,713¢**;
    - given `baseScaled` 128,249 (57,712.05¢), then cash = **57,712¢**;
    - given `baseScaled` 10 (4.5¢), then cash = **5¢**.
  - **eggs_cash, .5 edge:** at the CSV 60 s (bp 600,000), `baseScaled × 600,000 mod 10⁶` is always 0, 200,000, 400,000, 600,000 or 800,000, so an exact .5 can't occur. The edge is tested with the fixture `tc_egg_eggs_s` = 59.5 (eggsBp 595,000): `baseScaled` 100 (59.5¢) gives **60¢**, and 99 (58.905¢) gives **59¢**. At the CSV value, `baseScaled` 128,250 gives exactly **76,950¢**.
  - **guard, cash (switch at `baseScaled` > 20,015,998,342):**
    - given 20,015,998,342 (last safe, `number` path), then cash = **9,007,199,254¢**;
    - given 20,015,998,343 / 20,015,998,344 (BigInt path), then cash = **9,007,199,254 / 9,007,199,255¢**.
  - **guard, eggs_cash (switch at `baseScaled` > 15,011,998,757):**
    - given 15,011,998,757 (last safe), then eggs_cash = **9,007,199,254¢**;
    - given 15,011,998,758 (BigInt path), then eggs_cash = **9,007,199,255¢**.
  - **paths disagree (cash):** given `baseScaled` = 3,313,552,582,910, then cash = **1,491,098,662,310¢**, the BigInt reference (checked in Node with BigInt; the `Number` value is also from Node). The `Number` path gives …309. For eggs_cash a random search found no disagreeing value near the boundary, so the spy covers that path;
  - **large value:** given `baseScaled` = 1,000,000,000,000 (1e12), then cash = **450,000,000,000¢** and eggs_cash = **600,000,000,000¢**.
  - Every value equals the BigInt reference `(BigInt(b) × BigInt(bp) + 500000n) / 1000000n`, and a spy shows the BigInt path is taken exactly above the switch.
- **GE-AC10** Given a Frenzy granted at focus-clock time t with no menu or hide, then every sale in [t, t+30 s), by player, worker or Basket stock, credits exactly round(k × base × grader × (1+s) × 2). Laying, coop and cap are unchanged. Prices revert at t + 30 s ± 1 tick.
- **GE-AC10b (D-HOP-08 #3)** Given a Frenzy with 20 s left, when Settings (and separately: a sheet, the explainer, an onboarding step, a coach mark, a 40 s hide, a 10 min hide) holds for that period, then the remaining time is still 20 s afterwards. Worker sales made during it credit at 1× (no Frenzy, no streak uplift, per streak spec R12). The pill shows the paused style. After the player can act again, 2× applies for exactly 20.0 ± 0.1 s of focus-clock time.
- **GE-AC11** Given a Frenzy, then every visible price (customer card, Sell, Sell all) shows the doubled value with the gold `2×` chip, and the pill shows `2× m:ss` counting down. Within 1 tick of the end, all chips and the pill are gone.
- **GE-AC12** Given a Frenzy ends, then `frenzy_ended.extra_coins` = Σ(frenzy price − non-frenzy price) over its sales, and `eggs_sold` = `sold_by_player` + `sold_by_workers`.
- **GE-AC13** Given an egg at focus age 25 s and the tab hidden for 40 s, then on return it is at 25 s and expires after 5.0 more focus seconds. Given no egg on screen and the tab hidden for 40 s, then the spawn countdown is unchanged.
- **GE-AC14** Given the tab hidden ≥ 60 s, a reload, or a hidden-tab or frame gap ≥ 60 s with an egg on screen, then `collectible_expired{reason:"offline"|"reload"}` fires once, there is no reward, and the next spawn comes ≥ 120 s of focus-clock time after the welcome-back modal closes. Offline eggs and settlement sales use no Frenzy price.
- **GE-AC14b** Given no egg on screen and `nextSpawnRemainingS` = 87 s, when the page reloads (or the tab is hidden ≥ 60 s), then the next spawn comes 87 ± 0.1 s of focus-clock time after the welcome-back modal closes. Given a save with F ≥ 8 and the field absent, it comes 45 s after. Given `frenzyRemainingS` = 12 at reload, prices are at 1× while the welcome-back modal is open, then 2× for 12.0 ± 0.1 s of focus-clock time after it closes, then revert. Given `nextSpawnRemainingS` = −1 / NaN / 1e9, it is sanitised per R10a.
- **GE-AC15** *(carries M4-AC15, **updated v1.1+Art v1.1**: the 8-viewport matrix replaces 360/375/desktop; the zones add Sell buttons, the `Full!` badge, the `×N hens` pill, the Broody tap box and the toast; the binding check is live-rect; run in **Chromium, Firefox and Safari/WebKit**)* Given each viewport in {360×844, 375×844, 390×844, 430×844, 1024×474, 1280×720, 1280×800, 1366×768, **959×600, 960×600, 960×1280 portrait, 1024×1366 portrait**} (the last four per QA GE-16, measured in Art rects 5d9efa6), with sheets closed and 500 seeded spawns, then:
  - every spawn's `data-tc-spot` ∈ S1–S8 (S1–S3, S5–S7 at docked-compact) and its centre equals Art v1.1 §2.3's expected centre for that viewport ± 1 px (after safe-area offset);
  - the hit box `getBoundingClientRect` is 56×56 and the visual is 40 px wide;
  - the hit box is ≥ 16 px from every R14 zone rect (0 px for the `×N hens` pill), including the streak meter box while the meter is hidden and the Broody Hen tap box while it is not glowing;
  - the valid-spot count equals the R13 expected value for the case (pill hidden / pill shown / worst with Broody): phone 8/7/4; 1024×474 6/5/3; docked 8/8/7. 959×600 6/6/≥4; 960×600 5/4/≥2; 960×1280 and 1024×1366 8/8/≥6 (Art rects 5d9efa6 §B), with the R12 key phone / docked-compact / phone / phone and centres per rects §B ± 1 px;
  - the **floor**: at least **2** spots are valid at every matrix viewport and case with sheets closed. Below the floor it's an Art & UX layout defect, fixed in Art's rules, not at runtime;
  - in Firefox and Safari, any count or centre that differs from Chromium is logged for Art; the ≥ 2 floor is still binding.
- **GE-AC16** Given no valid spot (e.g. 375×844 with the Market sheet open), then no egg appears, the lifetime doesn't run, and on the next spawn `deferred_ms` ≥ the time the sheet was open (± 500 ms).
- **GE-AC17** Given Collect tapping at 10 taps/s, when an egg appears under the pointer path, then no pointer-down within 250 ms of it appearing (or started before it) collects it, and every Collect tap is still processed.
- **GE-AC18** Given a double tap, a two-finger tap, or mouse + touch on one egg, then there is exactly one reward and exactly one `collectible_collected`.
- **GE-AC19** Given an egg at focus age 12 s, when any D-HOP-04 #4 menu (Settings, welcome-back modal, a sheet at < docked, the tracks explainer, an onboarding step, a coach mark) is open for 60 s and then closes, tested once per menu type, then for the whole time the egg was visible and frozen (`getAnimations()` all paused) and taps on it did nothing. After closing, its age is 12.0 s and the spawn countdown did not move.
- **GE-AC20** Given the docked layout with the Market panel in use and no modal, then the focus clock advances (a 60 s session with the panel scrolled moves the countdown by 60 ± 0.1 s).
- **GE-AC21** Given a negative clock delta, then nothing spawns, expires or extends.
- **GE-AC22** *(carries M4-AC22 **verbatim**, plus Art & UX's QA hook)* Given reduced motion is on, then the Art & UX reduced-motion states show (no blinking), and the collectible is still keyboard-activatable with an aria-label. Measured: `getAnimations()` on `.tc` is empty except the 300 ms fade; the ring is solid → dashed → thin at 0/20/27 s; Enter collects.
- **GE-AC23** Given a guarded or frozen tab, then it spawns nothing for 10 min.
- **GE-AC24** Given default sound, then the spawn/warning/collect sounds fire once each at the matching moments. Given mute, none fire.
- **GE-AC25** *(v1.1+Art v1.1: short money)* Given cash amounts of 81,240 / 123,456 / 1,234,567 / 99,999,999 / 340,000,000 cents, then the popup text equals `+$812.40!` / `+$1.2K!` / `+$12.3K!` / `+$1M!` / `+$3.4M!`, and the aria-label contains the exact amount. Given a popup at an x = 50 spot at 360×844, its rect left is ≥ 8 and right ≤ vw − 8 (R25a); `+1,860 free eggs!` renders on one line at 24 px within 344 px. Given an eggs reward of 1 / 25, it shows `+1 free egg!` / `+25 free eggs!`. A computed $0.00 cash shows no popup.
- **GE-AC26** Given every `tc_egg_*`/`tc_frenzy_*` value changed in economy.csv and re-synced, then behaviour follows with no code change.
- **GE-AC27** Given any spawn, collect, expiry, Frenzy start or Frenzy end, then the event appears in the export with every §8 field non-null, plus `sid` and `fgMs` **[T-sub]**. `session_end` carries `golden_cents` and `frenzy_extra_cents` **[T-sub]**, plus `golden_spawned` and `golden_collected` **[T-sub]** (session_end payload, D-HOP-10 #4). Given 10 min at 20 taps/s plus 3 spawns, then telemetry stays ≤ 150 KB **[T-full]** (the valve isn't in the subset).
- **GE-AC28** Given a viewport resize from 1280×800 to 1024×474 with an egg at S6, then the layout switches to docked-compact (R12), so the egg moves to a valid docked-compact spot (S1–S3, S5–S7), with its age unchanged. If none is valid, it stays frozen (R16) until one is.
- **GE-AC29 (carries M4-AC24, restated against G1 per D-HOP-04 #6; focus and M4-B references removed)** Given the canonical sim with the full M5.0 active stack (golden egg at 100% catch with Frenzy, streak at its cap of 0.28 [G3-scratch: pending measure:l30plus re-measure], tap coins, Broody Hen collected at the cap, worker abilities), then optimal active income ≤ 2.0× idle income at P95 over every 10-minute window, and ≤ 2.25× on the worst seed, seeds 0–99, at F10/F18/F24 (G1). **Collectible income is included.** With zero collectibles caught, AC7 pacing is unchanged. **Scratch G3 (D-HOP-16):** P95 1.77, worst seed 1.84, which passes. This AC closes only on the `measure:l30plus` re-measure.
- **GE-AC29b (carries M4-AC24b, unchanged)** Given the managed/unmanaged worker ratio gate, then it is computed with collectible income excluded from both arms [HoP 13:10]. The sim reports both the excluded value (the gate) and the included value (info only).

- **GE-AC30 (spawn rate; X3)** Given 100 focus hours at F ≥ 8 with sheets closed, then spawns/h = 17.1 ± 0.3 with instant catch (mean cycle 210 s) and 15.0 ± 0.3 with zero catch (210 + 30 s).
- **GE-AC31 (jump clamp; R5e)** Given an egg at focus age 10 s, when a visible forward clock jump of +59 s happens in one frame, then its age is ≤ 11.0 s after that frame, and it is still present.
- **GE-AC31b (long frame; R5f; HoE §12 D-C3)** Given a Frenzy running and one injected 59 s visible frame, then that frame pays at most 1.0 s worth of `frenzy_extra_cents` (only the first 10 ticks carry ×2), and `frenzyRemainingS` drops by ≤ 1.0 s. The same holds for the streak uplift at s > 0: only the first 10 ticks credit (1 + s).
- **GE-AC32 (takeover; R10b)** Given an egg on screen in tab A, when tab B takes over, then A emits `collectible_expired{reason:"takeover"}` once with no reward, B shows no egg, and B's next spawn comes after A's saved `nextSpawnRemainingS` of focus-clock time (± 0.1 s).
- **GE-AC33 (evRng; R10a; HoE §12 D-C2)** Given `initialState(b, 7)` with `m4.flags.golden` on from tick 0, then `evRngState` = `mixSeed(mixSeed(7) ^ 0x6576526E)`, and the gap/slot/reward sequence equals the reference sequence from `xorshift32(mixSeed(mixSeed(7) ^ 0x6576526E))` in the fixed draw order. It is unchanged with the Broody Hen on (`brRng`, D-C4). After a reload mid-sequence, it continues from `evRngState` with no repeat or skip.
- **GE-AC34 (flag; R10d; HoE §12 D-C1)** Given `m4.flags.golden` = 0 or `m4.enabled` = false, then no egg spawns in 30 min, and the flag-off sim trace hash equals `f90d1678…`.
- **GE-AC35 (tap isolation; R25b)** Given F ≥ 8 with the streak unlocked, s = 0.10 and 12 eggs in the coop, when the player taps a visible golden egg once, then:
  - the egg is collected exactly once;
  - the coop still holds 12 eggs (no Collect fired);
  - s is still 0.10 with no tap coins paid;
  - the session's `credited_taps` and `taps_total` are unchanged;
  - the tap event had `stopPropagation()` called (a unit test on the handler).
- **GE-AC36 (golden independent of the Broody Hen; HoE Q4 ruling; R10a)** For the same seed, the golden egg's spawn times, slots and rewards are **identical with the Broody Hen on and off**. This holds in these cases (scope accepted by HoE; the Broody-then-golden-later case is out of scope per R10a):
  - golden and broody both from tick 0, set in either order;
  - golden from tick 0, with broody enabled, disabled or re-enabled at any later tick, including around Broody payouts, re-picks and reloads.
  
  `evRngState` after N golden draws is the same in every case, because Broody draws only from `brRng`. GE-AC33's reference (`xorshift32(mixSeed(mixSeed(7) ^ 0x6576526E))`) is unchanged.

## 10. Build size
**M.** Collectible framework (focus clock, spot picker with live-rect validation, scrim freeze, resize), reward roll, Frenzy multiplier in `saleMultipliers`, HUD pill and price chips, popups, sounds, save field (`nextSpawnRemainingS`, `frenzyRemainingS`), telemetry and ACs. Roughly 3–4 engineer-days plus 1 QA day (PM estimate; HoE to size). It is shared by the Broody Hen, so build it first.

## 11. Open questions
None open for HoP. D-HOP-08 closed the v1.0 questions: reference income (#1), Frenzy freeze (#3), G1 wording (#4), docked breakpoint 960 (#5).
- **Art & UX pre-UI-PR checks** (owner Art, not open questions):
  - Firefox and Safari spot measurements (GE-AC15). The docked y rule, the 1024×474 count and the popup fit were closed by Art v1.1 §2/§5;
  - draw `golden-egg.svg` and the SFX.
- ~~HoE (D-C2 × D-C4): `evRngState` with `broody` on and `golden` off~~ **Closed by HoE Q4 ruling:** it's created on the first tick either flag is on (R10a).
- Economy (D-HOP-16, HoE ruling): add `tc_spawn_grace_ms` = 250 to the single M5 CSV PR. Requested; non-blocking.
- Economy G3 reconfirms the 45/35/20 weights and the 45 s / 60 s sizes.

## 12. HoE §8 gap closure (`engineering/m5.0-sizing.md` §8)
| HoE gap | Status in this spec | Where |
|---|---|---|
| 1 Economy G3/G4/G5 not run | **Scratch G3 in (D-HOP-16):** P95 1.77, worst 1.84; every model-dependent number is tagged [G3-scratch: pending measure:l30plus re-measure]. G1 is stated as the ship gate | Header, §5, GE-AC29 |
| 2 CSV columns missing | **Closed (draft).** `tc_first_spawn_s` 45, `tc_warn_at_s` 20, `tc_urgent_at_s` 27, `tc_spawn_grace_ms` 250 drafted *for Economy G3*; no CSV edit (D-HOP-04 #10) | §5 |
| 3 Golden egg v0.5 DRAFT / M4-AC24 / spots / asset | **Closed.** v1.0 supersedes v0.5. M4-AC24 → GE-AC29 restated against G1, focus and M4-B removed. Art v1.0 spots final and restated. Asset `golden-egg.svg` (D-HOP-04 #6) | R11–R13, R17, GE-AC29 |
| 4 Two "credited tap" definitions | N/A here (golden egg taps aren't Collect taps). Closed in m5-streak-tap-coins-spec R2 | — |
| 5 Reference income undefined | N/A: golden rewards use the live E × P (production-seconds), not reference income, so the D-HOP-10 #1 steady-state warm-up doesn't apply here. Golden cash and Frenzy are **excluded** from the reference income (m5-streak-tap-coins-spec §4) | §4 |
| 6 No Broody Hen spec | Closed in `m5-broody-hen-spec.md`. The broody hit box is a golden-egg exclusion zone here | R14 |
| 7 Abilities | Out of this spec (PM Workers, D-HOP-04 #8). Abilities are in the G1 stack | GE-AC29 |
| 8 Pause | Out of this spec (D-HOP-04 #9) | — |
| 9 Which UI states pause | **Closed.** Modals, sheets, explainer, onboarding and coach freeze the egg timer and the streak decay together (D-HOP-04 #4). The docked column and toasts don't | R6, GE-AC19 |
| 10 QA test plans | **Partly closed.** Every AC is numbered and measurable, with the M4-AC5/15/22/24 carry-over stated (GE-AC5/15/22/29). HoQA writes the test plan from them | §9 |
| 11 Telemetry names / skin / pinned | **Closed for PM; HoQA to OK.** Names reused verbatim from the §3.1 allowlist; `skin:"golden_egg"`; all events ring-trimmed, none pinned, so the pinned list is unchanged | §8 |

## 13. QA testability gaps → resolution (`qa/m5/testability-gaps.md` v0.1)
| Gap | Resolution | Holds it |
|---|---|---|
| GE-16 / GE-16b Orientation rule; counts at 959×600, 960×600, portrait ≥ 960 | **Closed:** the R12 rule mirrors Art §2.1 (phone = NOT (width ≥ 960 AND landscape)). Measured counts 6/8, 4/6, 8/8, 8/8, and ≥ 4/2/6/6 with Broody; the floor is met (Art rects 5d9efa6 (`art-ux/m5-layout-rects-960.md` v1.0) §A–§B; UI/Visual GE16/17 review (art-ux/reviews/ge16-ge17-5d9efa6.md) (`art-ux/reviews/ge16-ge17-5d9efa6.md`)) | R12, R13, GE-AC15 |
| GE-17 Sales Stopped chip vs the zones | **Closed:** the chip rect lies inside `#goal` at every measured size (equal at 360/960×600/1280; narrower at 959×600 and 1024×1366, SS v1.3.9 560 px max, centred), so R14/R4 hold (rects §D–§E; v1.3.2 wording) | R14 |
| GE-1 RNG stream; seeding; saved position | Separate `evRng`, seeded once as `mixSeed(state.rng ^ 0x6576526E)` (D-C2), never read from `state.rng` again; Broody uses `brRng` (D-C4); position saved as `evRngState`; fixed draw order | R3, R10a, GE-AC3, GE-AC33 |
| GE-2 Freeze list | Final: modals, sheets, tracks explainer, onboarding, coach (incl. the abilities coach card) all freeze (D-HOP-04 #4) | R6, GE-AC19 |
| GE-3 `expired{reload}` | Emitted on `pagehide` in the `session_end` flush; lost if the flush fails (accepted) | R10c |
| GE-4 Countdown after reload | **Restored** (100 s left → 100 s after welcome-back closes); an egg on screen → fresh gap | R8, R10a, GE-AC14b |
| GE-5 Visible jump < 60 s | Focus-clock dt clamped to 1.0 s per frame; excess discarded | R5e, GE-AC31 |
| GE-6 Flag | `m4.flags.golden` (D-C1), default 0, requires `m4.enabled` | R10d, GE-AC34 |
| GE-7 Single-tab takeover | Old tab removes the egg with `reason:"takeover"`; new tab resumes the countdown | R10b, GE-AC32 |
| GE-8 CSV columns | Names are `tc_first_spawn_s`/`tc_warn_at_s`/`tc_urgent_at_s`/`tc_spawn_grace_ms` (HoE §8 names; QA's `tc_egg_*` names are outdated). Drafted for G3; they land in Economy's single M5 CSV PR after HoP approval (D-HOP-04 #10). **Landing date: Economy, not answerable here** | §5 |
| GE-9 Active vs attended | Confirmed: visible + no menu + live, no input requirement; an AFK visible tab spawns and expires eggs | R5 |
| GE-10 `interval_s` vs `deferred_ms` | `interval_s` = drawn gap only; `deferred_ms` separate | §8 |
| GE-11 `hidden_end` | Removed; `frenzy_ended.reason` ∈ {timeout, reset} because a Frenzy freezes while hidden | R23, §8 |
| GE-12 Age field | `reaction_ms` only | §8 |
| X1–X7 | Answered in §3.7 (X4 scope and X5 implementation belong to HoP/HoE; the ability-factor parts of X6/X7 belong to PM Workers) | §3.7 |
| AB-1…AB-8, P-1…P-9 | **Not Collection's:** PM Workers owns Abilities and Pause/Resume | — |

## 14. HoE §9–§10 alignment (`engineering/m5.0-sizing.md` v1.1)
| # | HoE point | Applied | Conflict / flag |
|---|---|---|---|
| A1 | Golden timer, Frenzy and streak decay run on the **focus clock** (F1b), not sim `dt` (§9.1) | Glossary, R5, R18, R23, GE-AC5/10/10b/13/19 | none |
| A2 | Hidden-tab **or frame gap ≥ 60 s** is offline for M5 timed systems; the focus clock doesn't advance (§9.1, §9.1a) | R8, E2, GE-AC14 | **Confirmed by HoE** (v1.1 said "> 60 s"; now ≥ 60 s) |
| A3 | R5e per-frame focus-dt clamp (1.0 s) for visible gaps < 60 s | R5e | **Confirmed.** Accepted by HoP (D-HOP-09 #4) and confirmed by HoE |
| C1 | Term clash between HoE's F1(b) clock and D-HOP-04 #5 "attended" | Glossary, all timer rules and ACs | **Resolved by D-HOP-09 #1:** the clock is the focus clock (`focusClock`); "attended" keeps only the #5 meaning (abilities) |
| C2 | Reference income vs the hidden < 60 s sim | X2, streak spec §4.1, Broody R7 | **Confirmed by D-HOP-09 #2:** hidden-sim sales count, at base price |
| C3 | §10.1 `session_end` credited-tap field name | streak spec §8 | **Resolved by D-HOP-09 #3:** `credited_taps` everywhere |
| A4 | §10.1 telemetry subset in M5.0; full migration M5.0.1 | X4, GE-AC27 | D-HOP-09 #6: subset only. `golden_spawned`/`golden_collected` are [T-sub] (session_end payload in the subset, D-HOP-10 #4) |

## Change log
- **v1.3.2** (2026-10-24 17:43; HoQA v0.7 wording; HoP errata ruling D-HOP-2026-10-24-26 #7). Wording only; no rule, AC logic or number changes:
  - **GE-17 / R14:** the Sales Stopped chip sits **inside** the `#goal` rect, not equal to it (R14 table row, Measured note, §13 GE-17 row, v1.3 changelog line) (SS v1.3.9 SS-16: 560 px max, centred; narrower at 959×600 and 1024×1366). The `#goal` zone still covers it, so R14 and Broody R4 hold (R14 table, §13).
- **v1.3** (2026-10-24 17:22; **Art rects 5d9efa6**; **UI/Visual GE16/17 review (art-ux/reviews/ge16-ge17-5d9efa6.md)**; D-HOP-2026-10-24-24):
  - **GE-16:** R12 phone is now Art §2.1 word for word, checked as the exact complement of the dock rule. R13 and GE-AC15 carry the measured counts (959×600 6/8; 960×600 4/6; 960×1280 and 1024×1366 8/8; ≥ 4/2/6/6 with Broody). 1024×1366 is added. GE-16b is closed (§13).
  - **GE-17:** the chip rect lies inside `#goal` at every size, so R14/R4 hold (§13; wording corrected in v1.3.2).
  - **Draft CSV of record:** sha256 **8dc90e2b…996b** (152 cols, 29 added, `guard_*` dropped; D-HOP-2026-10-24-24; `sha256sum` on disk matches). It replaces 45095351, and the "may change" note is removed. No spec rule uses a `guard_*` column. `tc_stall_tap_guard_ms` is a sales-stopped column and isn't used here.
- **v1.2** (2026-10-24 17:19; **HoE money-math ruling 2**; HoP cross-check v0.2; HoQA v0.6):
  - **Version:** this consolidates the unversioned edits made at 16:59, 17:08, 17:11 and 17:13, plus the HoP cross-check v0.2 and HoQA v0.6 notes. HoP cross-check v0.2 asked for the bump.
  - **Draft CSV citation:** edfd8902 → **sha256 45095351…81b8** (154 cols, 31 added). Economy confirmed it via HoP at 17:18. edfd8902 was the earlier 21-column draft, not a typo. (Superseded in v1.3 by 8dc90e2b, D-HOP-24.)
  - **Since v1.1:**
    - The combo-tiers layout note (the spot tables stand).
    - HoQA v0.5: the GE-16 orientation rule and 3 "Art measuring" viewports, the GE-17 chip bounded by `#goal`, ST-12 X4 text, `fgMs`.
    - HoE money-math rulings 1–2: `baseScaled` (1/100 ¢) and `floor((baseScaled × bp + 500000) / 10⁶)` with the BigInt guard (§3.5, §4 #2–#3, GE-AC8/9, new GE-AC9b). **HoE signed off the seconds-counted-once correction at 17:18.**
  - **HoQA v0.6:** GE-AC9b gains a cash value where the paths disagree (3,313,552,582,910 → 1,491,098,662,310¢). Eggs_cash is covered by the spy.
- v1.1 + **HoE money-math ruling 2** (2026-10-24):
  - Rewards keep sub-cent precision. `baseScaled = Math.round(E × P_cents × 100)` (1/100 ¢); reward = `floor((baseScaled × bp + 500000) / 1000000)`, with bp = seconds × 10,000 used once (equivalent to HoE's `× seconds`, ÷100 to cents). One cent rounding at payout, with the BigInt guard on the full product (§3.5, §4 #2–#3, GE-AC8/9).
  - GE-AC9b is redone: .5 edges at payout, and guard switches at `baseScaled` 20,015,998,342 (cash) / 15,011,998,757 (eggs_cash).
  - The 22.5¢/30¢ drift flag is removed. E = 9.5, P = $1.35 gives 57,713¢. $567.00, $3,487.50 and $4,650.00 are unchanged.
- v1.1 + **HoE money-math ruling** (2026-10-24): cash and eggs_cash use `floor((baseCents × bp + 5000)/10000)` with the BigInt guard (§3.5, §4 #2–#3, GE-AC8/9, new GE-AC9b). `baseCents = Math.round(E × P × 100)`; bp = seconds × 10,000. Plug-in values are unchanged ($567.00, $3,487.50, $4,650.00) and the EV ≈ 43 s is unchanged. Non-whole E × P × 100 can differ from the old rule by ≤ 22.5¢ / 30¢ (flagged).
- v1.1 + **HoQA re-review v0.5 closures** (2026-10-24):
  - **GE-16 (Art confirmed):** R12 orientation rule: dock only at `(min-width: 960px) and (orientation: landscape)`; portrait ≥ 960 is phone. 959×600, 960×600 and 960×1280 portrait added to R13 and GE-AC15 as "Art measuring", with the ≥ 2 floor binding.
  - **GE-17 (Art ruling):** the Sales Stopped chip is bounded by `#goal`, so the R14 `#goal` zone covers it.
  - **ST-12:** X4 lists the `taps_*` fields as M5.0 on `session_end` (D-HOP-10 #4, HoE TEL-13); `fg_ms` → `fgMs`.
- v1.1 + `art-ux/m5-combo-tiers.md` v0.2 (2026-10-24): the streak meter moves to a new 24 px row under a 48 px Collect; the scene is unchanged, so the spawn tables stand.
- **2026-10-24 16:58 (HoE rulings):** GE-AC36's scope is accepted as written. The Broody-then-golden-later case is noted as out of scope in R10a. `tc_spawn_grace_ms` stays a CSV column that Economy adds in the M5 CSV PR.
- v1.1 + **HoE Q4 ruling** (2026-10-24): `evRngState` is created on the first tick golden **or** broody is on. Rule 1: only golden draws advance it. Rule 2: `brRng` is derived on load or when Broody is enabled, not saved, and Broody-only (R10a). New GE-AC36. §11 Q closed. GE-AC33 is unchanged.
- v1.1 + **D-HOP-2026-10-24-16** (2026-10-24):
  - Scratch G3 is in. [P1-PENDING] values are retagged [G3-scratch: pending measure:l30plus re-measure], with the draft values unchanged (weights 0.45/0.35/0.20, cash 45 s, eggs 60 s).
  - G3 status paragraph; GE-AC29 carries the scratch result.
  - The draft-CSV block matches the draft; `tc_spawn_grace_ms` is flagged as missing from it.
- v1.1 · **BUILDABLE (HoE §12)** (2026-10-24): folded in HoE `engineering/m5.0-sizing.md` §12 decisions.
  - **D-C1:** the flag is `m4.flags.golden` (R10d, GE-AC34, §13).
  - **D-C2:** `evRngState = mixSeed(state.rng ^ 0x6576526E)`, taken once (R10a, GE-AC33's new reference, §13).
  - **D-C3:** new R5f; effects are suspended after a frame's first 1.0 s of ticks; new GE-AC31b.
  - **D-C4:** `evRng` is golden-only; Broody uses `brRng`.
  - **D-C5:** sanitisers (R10a).
  - D-C6 is the streak/Broody I_ss (no golden change).
- v1.1 + Art v1.1 + **D-HOP-2026-10-24-10** + HoE (2026-10-24):
  - Spawn spots restated from Art v1.1 §2 (live-measured): scene-anchored phone spots, docked y′ only at vh ≥ 700 with FW ≥ 880, the new `docked-compact` key (R11–R13). The old tables were removed in favour of references.
  - Measured valid-spot counts added as expected values: phone 8/7/4, 1024×474 6/5/3, docked 8/8/7. The ≥ 2 floor is kept (GE-AC15, now in 3 engines).
  - New no-spawn zones: the `Full!` badge, the `×N hens` pill (0 px), the Broody tap box and the toast as measured (R14).
  - Popups switch to short money (`fmtMoneyShort`) with a required 8 px viewport clamp (R25, R25a, E16, GE-AC25).
  - `stopPropagation()` on egg taps (R25b, new GE-AC35); `layout` gains `docked-compact`.
  - HoE confirmed the 1.0 s focusClock cap and that ≥ 60 s gaps don't advance focusClock (A2/A3 confirmed).
  - X2 notes the I_ref steady-state warm-up; golden rewards don't use I_ref.
- v1.1 + **D-HOP-2026-10-24-09** (2026-10-24):
  - #1 the clock is renamed the focus clock (`focusClock`) everywhere, and "attended" is reserved for D-HOP-04 #5;
  - #2 I_ref counting hidden-sim sales is confirmed;
  - #3 `credited_taps`;
  - #4 the R5e clamp is accepted, HoE to confirm;
  - #5 the no-uplift-while-frozen rule and `frenzyRemainingS` are endorsed;
  - #6 [T-req] becomes [T-sub, pending HoE sizing].
- v1.1 + HoE §9–§10 (2026-10-24): timers restated on HoE's **focus clock** (Glossary, R5, all timer ACs); offline = hidden-tab or frame gap ≥ 60 s; X2 now counts hidden-sim sales in I_ref (flag C2); X4 uses the §10.1 subset tags; §14 alignment table.
- v1.1 + QA gaps (2026-10-24): answered `qa/m5/testability-gaps.md`. Added §3.7 shared test rules (X1–X7), R5e jump clamp, R10b takeover, R10c unload, R10d flag, `evRngState`, §8 field fixes, GE-AC30–34 and §13. GE-AC27 now tags its v0.6.2 assertions. Version stays v1.1.
- v1.1 (2026-10-24): status **Approved (conditional), D-HOP-08**.
  - Frenzy now freezes on the focus clock under menus and while hidden, and pays no ×2 while frozen (R23/R24, R10a `frenzyRemainingS`, GE-AC10b, GE-AC14b; D-HOP-08 #3).
  - Docked breakpoint 960 restated (#5).
  - 0.15 asleep share removed as a dependency; it's now a backlog item (E9).
  - Open questions closed.
- v1.0 (2026-10-24): from v0.5:
  - focus-clock time with pause on hidden and menus (R5–R10);
  - Art v1.0 spawn spots restated as final, plus the 8-viewport expected-centre table and live-rect safe zones (R11–R16, D-HOP-04 #6);
  - menus freeze the timer (R6, D-HOP-04 #4);
  - `golden-egg.svg`;
  - `evRng`;
  - M4-AC24 → GE-AC29 restated against G1;
  - draft G3 columns;
  - §12 gap closure.
  - CSV names made canonical;
  - boost rules removed (M4-B parked);
  - popups use popMoney (full digits under $1M, short from $1M);
  - ACs renumbered GE-AC1–29 (M4-AC5 → GE-AC5 updated, M4-AC15 → GE-AC15 updated, M4-AC22 → GE-AC22 verbatim + hook);
  - P1 gate.
