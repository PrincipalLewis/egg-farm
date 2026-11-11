# M5.0 Broody Hen (B1): build spec · v1.3.2 · 2026-10-24 · PM, Collection
**Status:** **Approved (conditional), D-HOP-08 · BUILDABLE (HoE §12)** (`engineering/m5.0-sizing.md` §12, 2026-10-24 ~16:45) (D-HOP-2026-10-24-08, 16:22 CEST): approved as a spec, conditional on Economy G3/G1, Art assets and #69. **v1.3.2 (17:43)**: wording errata only (HoQA v0.7 wording; HoP errata ruling D-HOP-2026-10-24-26 #7). **v1.3 (17:22)**: BH-k measured (Art rects 5d9efa6 (`art-ux/m5-layout-rects-960.md` v1.0)), with the D-COL-2026-10-24-01 minimum-slot decision; final draft CSV sha. **v1.2 (17:19)** consolidates every edit made since v1.1 (see the v1.2 changelog entry). v1.1 applies the D-HOP-08 rulings (cited inline as *D-HOP-08 #n*). First full spec, from the v2 Collection slice §2.2 (`product/research/v2-slices/collection.md`, idea B1, package P1). **Greenfield on RC1 `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463`.** No code, no PRs, no CSV edits.

**HoP rulings applied:**
- **2026-10-24 (d):** the 2 save fields are OK; the nest persists across reload and fills only while the tab is open, so a reload gains nothing.
- **D-HOP-2026-10-24-04** (*D-HOP-04 #n*):
  - #2 reference income = trailing 60 s of sim-time passive income, excluding Broody payouts;
  - #4 menus freeze timers;
  - #7 unlocks at the first Coop Hand hire and depends on **#69**'s yard landing in main;
  - #10 CSV columns drafted for G3, applied after HoP approval.
- HoE `engineering/m5.0-sizing.md` §8 gaps closed in §12.

**#69** = PR #69 `fix/yard-hens-from-track` (M4.1-P1, https://github.com/PrincipalLewis/egg-farm/pull/69).
- **What it changes:** yard sprites become `min(hens[hensLevel], 12)` with M4 on, and `#henpill` shows only when hens > 12 (D-HOP-2026-10-24-01). The change is in `ui/app.ts` render `// hens` block :528–536.
- **Status:** Draft. CCR PASS @ c849ccf; boundary tests @ 2c9c0bb; Art & UX final PASS 16:05 CEST. It waits for a v2 rebase onto main after #67.

**Glossary**
- **Focus clock** (`focusClock` in code; HoE F1(b) and §9.1; named by **D-HOP-2026-10-24-09 #1**): a clock separate from the sim clock. It advances only while the tab is visible, no D-HOP-04 #4 menu is open, and the tab is live, with ≤ 1.0 s per frame (m5-golden-egg-spec R5/R5e).
  - It doesn't advance during the rc1 hidden < 60 s online sim, a hidden-tab or frame gap ≥ 60 s, or a menu.
  - The golden egg timers, the Frenzy and the streak decay run on it (HoE), and so does **nest accrual** (this spec, R7).
  - "Attended" keeps only its D-HOP-04 #5 meaning (player input within the last 30 s; abilities only). This spec doesn't use it.
- **Sim clock**: the 10 Hz `step()` time. The I_ref 60 s window runs on it (D-HOP-04 #2).

**Tags:** [HoP] / [CSV] / **[G3 draft column]** / [UI] / **[G3-scratch: pending measure:l30plus re-measure]** (Economy's scratch G3 draft value, D-HOP-16; it was P1-pending up to v1.1).

**Gate G1 (HoP ruling (c); D-HOP-04 #6; wording confirmed by D-HOP-08 #4), standing until the CEO rules:** in the canonical sim with the full M5.0 active stack (golden egg, streak, tap coins, Broody Hen collected at the cap, worker abilities), optimal **active/idle ≤ 2.0 at P95, with the worst seed ≤ 2.25**, over every 10-minute window, seeds 0–99, F10/F18/F24. Economy's fallback: lower `tc_broody_income_share` to 0.03 after the streak cap.
**G3 status (D-HOP-2026-10-24-16):** Economy's scratch G3 is in (`product/research/v2-slices/economy.md` §13; draft `scratch/v2-econ/economy.m50-draft.csv`, **sha256 8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b** (152 columns, 29 added, `guard_*` dropped; **D-HOP-2026-10-24-24**, verified on disk 17:22). This supersedes 45095351 (D-HOP-22) and edfd8902 (D-HOP-16's 21-column draft). No Collection rule uses a `guard_*` column.
- The full M5.0 stack (golden egg at 120–300 s, streak cap 0.28, Broody Hen on) passes the window gate at **P95 1.77, worst seed 1.84**.
- Every formerly P1-pending value now carries the draft value, tagged **[G3-scratch: pending measure:l30plus re-measure]**. All of them equal what this spec proposed.
- **G3 clears only when the re-measure on the harness of record (`measure:l30plus`) is in.** HoP then signs off, and the draft is applied to `product/economy.csv` (D-HOP-16 #5). Until then this spec makes no CSV edits.


**Out of scope (M5.1):** Hot Hands, Golden Hen (`golden_hen_drop`), Lab/frequency upgrades; B2 coop flutter (Art flavour, no economy; optional Art & UX add-on, not in these ACs).

---

## 1. Overview
Once the player hires their first Coop Hand, one hen in the yard becomes **broody**. A small nest under her quietly fills with coins while the tab is open, worth 5% of reference income [G3-scratch: pending measure:l30plus re-measure] and capped at 150 s of filling [G3-scratch: pending measure:l30plus re-measure]. When the nest is at least half full she glows and wobbles. One tap on her pays the nest as coins, and another hen becomes broody. **Only the player can collect her; workers never do.** Idle income is untouched: the nest is extra, not diverted from production.

## 2. Player fantasy
"My Coop Hand does the chores, but the broody hen is mine." Every time the player looks in (every 2–3 minutes), there's a warm little thing to collect that rewards visiting rather than grinding. Visiting about every 150 s collects everything. Tapping faster earns nothing more. It also gives the welcome-back moment a tap: the nest is still there after a reload.

## 3. Detailed rules
### 3.1 Unlock
- **R1** Unlocked once `state.workers.coop_hand` exists (the first Coop Hand hire, D-HOP-04 #7; CSV `w2_unlock_farm` = 7, so as early as F7).
  - rc1 has no fire action, so the unlock never reverts. A future Pause/Resume "paused" Coop Hand is still hired, so the hen stays unlocked.
  - A migrated or already-hired save is unlocked on first load in M5.0, with nest = 0.
- **R2 Ship order (the #69 gate):** the UI depends on #69's yard sprites in main **and on #69's Minor m1 follow-up** (§7). Without both, the broody hen must not ship. The legacy `S.hens(F)` sprite count is not supported.
  - m1: RC/#69 rebuild `yard.innerHTML` on every count change (`app.ts:546-548`), which would wipe her nest layers, glow and state classes.
  - m1 must build the 12 slots once and fill only new ones, or the Broody PR must re-apply `.is-broody`, the nest and the glow after every rebuild (Art `m5-broody-hen-art.md` §1). Either way, the overlay button is re-positioned after any yard change or resize.

### 3.2 The broody hen (selection, target, layout)
- **R3** Exactly **one** broody hen exists while unlocked and a slot is eligible (`tc_broody_max_on_screen` = 1, a G3 draft column that `validateBalance` pins to 1).
  - **She takes over one of the hens already drawn in the yard; she is not an extra hen** (Art `m5-broody-hen-art.md` v0.1 §1). The sprite count stays `min(hens[H], 12)`, so the hen count and the `×N hens` pill are unchanged, and she is included in the pill's count.
  - Her nest, glow and ring are layers inside her yard slot. The tap button lives in the golden egg's overlay layer, positioned from the live slot `<img>` rect.
  - `broodyHenIdx` ∈ 0–11 is a yard slot index (the 6×2 `.yard` grid, `styles.css:83-86`).
  - It must be a **drawn** slot: #69 draws slots in the order `[2,3,1,4,0,5,8,9,7,10,6,11]` up to min(hens[H], 12).
- **R4 Eligibility** (Art `m5-broody-hen-art.md` v0.1 §2; checked against live `getBoundingClientRect()` every 500 ms of focus-clock time and on any layout change). Her **56×56 CSS px tap box**, centred on the slot `<img>` centre at rest (ignoring the 2 px bob), must keep:
  1. **≥ 16 px from every tap target and the toast:** `#collect`, the coop `<img>` box (clipped to `.farm`), `.nest`, `#goal`, `#queue`/Market and every Sell button, the HUD, the bottom nav, the docked column, the toast strip, the hit box of a golden egg on screen, and any open sheet/modal/scrim (`tc_margin_px` [UI]);
  - **Sales Stopped chip (QA GE-17; Art ruling):** it shows in the goal-strip slot (`product/market/sales-stopped-spec.md` §4.7). It sits **inside** the `#goal` rect (SS v1.3.9 SS-16: `max-width: 560px`, centred in `#goal`; its button/hit area fills `#goal`'s 44 px height). It never grows the slot. So it is narrower than `#goal` at 959×600 and 1024×1366, and equal to it at the other measured sizes. A label that doesn't fit uses the short form from `rc2-workers-copy` §6 instead of wrapping. So the `#goal` clearance in rule 1 covers the chip, and no hen can sit under a newly shown chip.
  2. **≥ 8 px from non-interactive readouts:** the coop fill `#meter`, the streak meter box (reserved even while hidden), the `Full!` badge, and the `×N hens` pill while it's visible;
  3. **≥ 8 px inside the viewport** and the safe-area insets.
  - The measured eligible slots per viewport are in Art §2's table, e.g. phones Y0, Y5–Y11 (Y0, Y5, Y8–Y11 with the pill shown), and 1024×474 Y0, Y5 (Y5 with the pill shown).
  - Choose uniformly from eligible drawn slots using the Broody Hen's own stream, **`brRng = xorshift32(mixSeed(evRngState ^ 0x62724E67))`** (salt = ASCII "brNg"; **HoE §12 D-C4**). It is never `state.rng` and never `evRng`, so a re-pick doesn't shift the golden egg's gap/slot/reward sequence (GE-AC33).
    - **HoE Q4 ruling:**
      - `evRngState` is created on the first tick that `m4.flags.golden` **or** `m4.flags.broody` is on (m5-golden-egg-spec R10a).
      - (1) Only golden draws advance `evRngState`; the Broody Hen never advances it.
      - (2) `brRng` is derived from `evRngState` on load or when the Broody Hen is enabled. It is not saved, and only Broody draws from it.
    - `broodyHenIdx` is saved, so a reload doesn't re-pick.
    - The UI passes the list of eligible slot ids into the action, and the sim draws an index into it (HoE §12.2).
  - When re-picking after a payout, exclude the current slot if any other is eligible.
- **Streak meter layout (`art-ux/m5-combo-tiers.md` v0.2):** Collect shrinks from 64 to 48 px, and the streak meter moves into the freed 24 px row under it. The scene is unchanged, so Art's eligible-slot table (R4) stands. The streak meter box stays an 8 px readout zone at its new row.
- **R5 No eligible slot** (e.g. only slots behind the coop are drawn): **no hen is marked** and nothing is tappable. She is never placed outside the yard, on the coop, nest or Collect, or as an extra sprite.
  - **Minimum slot count (D-COL-2026-10-24-01, PM Collection; APPROVED by HoP 17:22):** the minimum acceptable eligible nest-slot count at any supported viewport is **1**. So 959×600's **2** slots (Y0, Y5) are acceptable.
    - M5.0 does **not** depend on the m4 hen-row overlap fix. The Broody Hen takes over one existing yard hen, so placement needs only one valid slot. m4 is a Minor polish item that Art tracks separately.
    - If 0 eligible slots ever occur, the hen stays hidden (not `ready`, nothing tappable), and the nest keeps accruing and is never lowered (below; BH-AC14).
  - **The nest keeps filling invisibly** under R7 (focus clock, up to the cap), and it is **never lowered** (R8). Nothing is lost, and nothing is paid.
  - The same applies if a marked hen becomes ineligible (a resize, the pill appearing, a golden egg landing): she is unmarked, the nest is kept and keeps filling.
  - On the first eligible check, a slot is marked with the nest's current value and the matching state (`brooding`, `ready` or `full`). If that is ready, the R11 announcement and the R14a toast rules apply then. `deferred_ms` records the unmarked time.
  - Art measured that with ≥ 5 hens drawn, Y0 is eligible at every matrix viewport, so this case is a guard.
- **R6 Saved index invalid on load** (not drawn, not eligible, out of range or non-finite): re-pick per R4 and keep the nest.

### 3.3 Nest accrual (on the focus clock)
- **R7** The nest accrues only on the **same focus clock as the golden egg** (m5-golden-egg-spec R5; HoE F1(b)), i.e. while all hold:
  - the tab is visible;
  - no D-HOP-04 #4 menu is open (modals, sheets, explainer, onboarding, coach);
  - the tab is live (not guarded, frozen or read-only);
  - dt ≥ 0.
  
  It accrues per **focus-clock** delta dt (not sim `dt`, so the rc1 hidden < 60 s sim never fills it):
  `nestScaled = min(nestScaled + Δ, max(nestScaled, capScaled))`, with `capScaled = refCents × broodyBp × tc_broody_cap_s`.
  - **Scaled units (HoE money-math ruling):** the nest accrues as an integer in **cents × bp**, i.e. ¢ × 10,000, consistent with the HoE ST-11 ruling (m5-streak-tap-coins-spec §4.1b).
    - `broodyBp = Math.round(tc_broody_income_share × 10000)` (0.05 → 500) and `readyBp = Math.round(tc_broody_ready_share × 10000)` (0.5 → 5000), set at balance load;
    - `refCents` is the shared integer ¢/s from streak §4.1b;
    - `dtMs` is the difference of the cumulative `floor(focusClock × 1000)`, so per-frame rounding never drifts.
  - **Per frame:** `num = refCents × broodyBp × dtMs + msRem`; `Δ = floor(num / 1000)`; `msRem = num mod 1000`. `msRem` ∈ [0, 1000) carries the sub-ms part, so accrual is exact. Neither `nestScaled`'s remainder nor `msRem` is saved.
  - `ready` ⇔ `nestScaled × 10000 ≥ readyBp × capScaled` and `nestScaled ≥ 10000` (≥ 1¢). `full` ⇔ `nestScaled ≥ capScaled`.
  - **The single rounding is the floor to the cent at payout** (R13, D-HOP-10 #3): `paid_cents = floor(nestScaled / 10000)`. The save stores that value as `broodyNestCents` (R20), and a load sets `nestScaled = broodyNestCents × 10000`.
  - **BigInt guard** (the same as streak §4.1b): every product, sum and comparison above runs in `number` while it is ≤ `Number.MAX_SAFE_INTEGER` and in BigInt above it. `paid_cents` converts back with `Number()`. RC1's money type is `coinsCents: number` and has no big-number type; it is exact to the 1e15 ¢ clamp. In scaled units, `nestScaled` passes 2^53 at ≈ $9.0e9 of nest. The per-frame intermediate `refCents × broodyBp × dtMs` overflows much earlier: at a 1,000 ms frame, above `refCents` 18,014,398,509 (≈ $1.8e8/s).
  - I_ref is the shared reference income (m5-streak-tap-coins-spec §4.1/§4.1a, D-HOP-04 #2, confirmed by D-HOP-08 #1): the trailing 60 s of sim-clock sales at the base price chain, including the rc1 hidden < 60 s sim's sales (no uplift; they count, D-HOP-09 #2).
  - **After a fresh start, a load or an offline return, I_ref is the steady-state I_ss** (gross `incomePerSec` + wages via existing code, HoE §12 D-C6; live state, no uplifts; 0 while a hired Market Hand is Asleep or Unpaid, **intended: HoP confirmed X8** (HoP 16:46; QA X8). The zeroing comes from `product/market/sales-stopped-spec.md` §4.2: per SS-15, live `incomePerSec` = −wages, so I_ss = 0) until 60 s of sim time accrue, then the trailing window (D-HOP-07 X2, **D-HOP-2026-10-24-10 #1**). It never starts at 0 after a reload.
  - It excludes golden cash, Frenzy, abilities, **Broody payouts** and tap coins.
- **R8 Never lower a stored nest** (re-checked against D-HOP-10 #1). Whenever I_ref falls, the cap shrinks; the nest keeps its value but doesn't grow past the larger of itself and the new cap. That can happen:
  - at the warm-up handover, if the trailing window < I_ss;
  - after a reload, if I_ss < the pre-reload I_ref (e.g. a worker asleep);
  - if I_ss = 0.
  
  A reload no longer zeroes the cap, because I_ss replaces the empty ring.
- **R8a Ready is sticky within a page session.** Once `ready` or `full`, the hen stays tappable until paid, even if I_ref later rises and the nest falls below `tc_broody_ready_share` × the new cap.
  - It isn't saved (HoP (d) approved exactly 2 fields). After a load, the state is recomputed from the saved nest against the I_ss-based cap.
  - So a saved nest just under the new ready threshold shows `brooding` for a few focus seconds and then becomes ready.
- **R9 Hidden (any length), offline, reload:** no accrual ("fills only while the tab is open", HoP (d)). The nest is **kept**. The rc1 hidden-time settlement and the offline grant never touch it.
- **R10 Workers never collect** (HoP (d), D-HOP-04 #7): no worker, ability or automation empties the nest. The Coop Hand animation may walk past her (Art flavour) without effect.

### 3.4 States and tap
- **R11 States** (`data-broody-state` hook):

| State | Condition | Visual (Art `m5-broody-hen-art.md` v0.1 §3) | Tappable |
|---|---|---|---|
| `brooding` | nest < ready threshold | small nest sprite under the hen, no glow | no (`pointer-events:none`) |
| `ready` | nest ≥ max(1¢, `tc_broody_ready_share` × cap_cents) | warm glow + gentle wobble | yes |
| `full` | nest ≥ cap_cents (and ready) | glow pulses slower ("settled") | yes |
| `frozen` | a menu is open | current state, animations paused, `inert` | no |

  - Glow, ring, wobble, coin and nest layers, timings and the reduced-motion forms are **as specified in Art `m5-broody-hen-art.md` v0.1 §3**. The nest asset is `overlay-broody-nest.svg` (§5), and the wireframes are `art-ux/wireframes/m5-broody-{360x640,1280x800}`. Reduced motion: no wobble or pulse; the ring is solid when ready and doubled when full.
  - Screen reader: when it becomes ready, announce once via the polite live region "Broody hen ready, $X" (`fmtMoneyAria`).
- **R12 Tap:** pointer-down and pointer-up inside the tap box while `ready`/`full`. Pointer-downs that started before the state became ready, or within `tc_spawn_grace_ms` (250) of it, are ignored. Keyboard: the hen is focusable only when ready, Enter/Space collects, and the aria-label is "Collect broody hen nest, $X".
  - **The ready/full handler calls `stopPropagation()`:** RC1's whole `#scene` counts clicks as Collect taps (`app.ts:210`). So a Broody tap pays once, never Collects, and is never a credited tap (m5-streak-tap-coins-spec R3).
  - A `brooding` hen's button is `pointer-events:none`, so a tap on her falls through to the scene as an ordinary Collect tap, credited per streak R2 (Art §2).
- **R13 Payout:**
  - `paid_cents = floor(nestScaled / 10000)` (R7) is credited to coins immediately. It is not a sale, so streak, Frenzy, Grader and abilities don't multiply it.
  - Then nest_cents = 0, a new hen is picked (R4), and accrual continues immediately.
  - One payout per tap: double taps, multi-touch or mouse + touch give exactly one.
  - It never counts as a credited Collect tap (it's not a coop tap).
- **R14 Feedback:**
  - A popup at the hen in **short money, `fmtMoneyShort`** (Art `m4-timed-collectible.md` v1.1 §5; `m5-broody-hen-art.md` §3): `+$61.87`, `+$1.2K`, `+$1.2M`. There's no "!", and the style is Fredoka 20/700 on a cream pill. The aria-label keeps the exact `fmtMoneyAria` amount.
  - **The popup is clamped 8 px inside the screen (required):** left = `clamp(x − w/2, 8, vw − 8 − w)`, and it never rises above HUD bottom + 8.
  - A soft cluck + coin sound (respects mute).
  - The `full`→collect transition gets a brief feather puff (Art).
  - **No popup when paid_cents = 0** (the same rule as the streak's zero payout, m5-streak-tap-coins-spec R16; HoP X8 follow-up).
    - A $0 nest is never `ready` (R8 requires ≥ 1¢), so the hen can't be tapped for a payout and the popup never shows. This holds during a sales stall too, when the nest doesn't fill (B6b).
    - The `paid_cents = 0` check is a guard only; it never renders `+$0.00`.

- **R14a Unlock cue (QA BH-g):**
  - **No coach card and no new event at hire time** (there's nothing to tap yet).
  - The cue is the first `ready` state: the glow, the polite live-region line (R11), and a one-line toast **`Your broody hen is ready! Tap her to collect.`** The toast shows once per session, on the first ready episode, only while that session has 0 broody collects.
  - No new save field (HoP (d) approved exactly 2).
  - Telemetry marks the unlock implicitly: the first `collectible_spawned{skin:"broody_hen"}` per save is identifiable by `collectible_id` order and `interval_s`. For a dedicated unlock metric, the dashboard uses `worker_hire{worker:"coop_hand"}` (already pinned).
- **R14b Flag (QA GE-6 pattern; HoE §12 D-C1):** `balance.m4.flags.broody`, default **0**. It lives in `m4.flags`, which `fitM4()` keeps whole on sync (a `m4.tc.*` key would be wiped), and takes effect only when `balance.m4.enabled` is true **and** #69 is in the build (BH-AC20). With the flag off: no hen, no accrual, fields untouched.
- **R14c B2 coop flutter (QA BH-f):** out of M5.0 ACs. If Art adds it, it is cosmetic only: no credited tap (m5-streak-tap-coins-spec R3), no coins, no telemetry, no save.

### 3.5 Interactions
- **R15 Golden egg:** both can be on screen. The broody hit box is a permanent golden-egg exclusion zone (m5-golden-egg-spec R14, GE-AC15), and R4 avoids an on-screen egg.
- **R16 Frenzy / streak / abilities:** no effect on accrual or payout, and they don't enter I_ref (D-HOP-04 #2).
- **R17 Coop Hand asleep/unpaid** (rc1: asleep collects 0. The 0.15 asleep share is **out of M5.0**; backlog item for PM Workers, D-HOP-08): the hen stays unlocked and tappable. The fill rate follows I_ref, which falls only if fewer eggs sell.
- **R18 Coop empty / full:** irrelevant, since the nest doesn't use eggs.
- **R19 Resize/rotate:** if the hen becomes ineligible, re-pick (R4) and keep the nest. No payout and no loss.

### 3.6 Save (HoP (d); HoE F2, no SAVE_VERSION bump)
- **R20** Two optional fields:
  - `broodyNestCents` (integer ≥ 0, saved as floor(nest_cents));
  - `broodyHenIdx` (integer 0–11).
- **Names are camelCase like every `GameState` field (HoE §12 D-C5)**, replacing v1.1's `broody_nest_cents`/`broody_hen_idx`.
- Sanitising (D-C5; like `NUM_FIELDS`, `save.ts:201`):
  - a non-finite or negative nest → absent (= 0);
  - a finite nest is clamped to [0, 1e15] cents (the `fmtMoneyExact` limit) and floored;
  - an index that is non-integer, outside 0–11, or not a drawn eligible slot → re-pick.
  - Absent = 0 / re-pick.
- An M4.1 build loading the save ignores both fields (HoE F2 downgrade check).
- **R20a Save edge cases (QA BH-i):**
  - **CSR fresh start / save reset:** the whole save is replaced, so the Coop Hand is absent → the hen is locked (R1). Both fields are dropped (absent = nest 0) and `collectible_expired{skin:"broody_hen", reason:"reset"}` fires once if the hen was unlocked.
  - **Coop Hand absent but fields present** (hand-edited or corrupted save; rc1 has no fire action): the hen is locked. The fields are kept untouched and ignored until a Coop Hand exists, then used per R6.
  - **Hens drawn drops below the saved index's draw position** (e.g. a future prestige): the index is not drawn → re-pick per R4 on the next 500 ms check. The nest is kept.
- **R21 Clock tamper:** accrual uses focus-clock dt only. A negative dt counts as 0. A visible forward jump ≤ 60 s advances accrual by at most 1.0 s per frame (the shared focus-dt clamp, m5-golden-egg-spec R5e; **confirmed by HoE**). A hidden-tab or frame gap ≥ 60 s (HoE §9.1a) is the offline path (R9: no accrual).

## 4. Formulas
- Fill rate: `0.05 × I_ref` $/s [G3-scratch: pending measure:l30plus re-measure].
- Cap: `0.05 × I_ref × 150` = **7.5 s of I_ref** [G3-scratch: pending measure:l30plus re-measure].
- Ready at 50% = 3.75 s of I_ref, reached after 75 s of focus-clock time.
- Long-run value at ≤ 150 s visits: +5% of I_ref for any player who checks in at least every 150 s [G3-scratch: pending measure:l30plus re-measure]. Optimal and casual gain the same (it's not tap-rate driven).
- **Boundary plug-ins** (CSV rows, Grader ×1, sales = min(E, demand) × P):
  - F7 (first possible unlock): E = 8 , P = $1.35 → I_ref ≤ $10.80/s → cap = $81.00, ready at $40.50 (exact).
  - F10: E = 11, P = $1.50 → I_ref ≤ $16.50/s → capScaled = 1650 × 500 × 150 = 123,750,000 → cap **12,375¢ ($123.75)**, ready at exactly **6,187.5¢** (a tap at that instant pays the floored **$61.87**).
  - F30: E = 31, P = $2.50 → I_ref ≤ $77.50/s → cap = **$581.25** (exact).
  - Just reloaded at F10, fully automated: I_ref = I_ss = $16.50/s (D-HOP-10 #1), so the fill is $0.825/s and the cap is $123.75 from the first tick (no ramp). A stored $70.00 nest is `ready`. A stored $60.00 nest is `brooding` for 2.273 s (2,273 focus ms), then ready at $61.87.
  - I_ss = 0 (production or demand 0): no growth. A stored $60.00 nest stays $60.00 and is `ready` (≥ 1¢ and ≥ 0.5 × 0).
  - Very large I_ref (≥ $133,334/s, beyond the CSV): cap ≥ $1M, and the popup shows `+$1M`-style short form.

## 5. Tunables
| Name | Value | Source | Tag |
|---|---|---|---|
| `tc_broody_income_share` | 0.05 | **G3 draft column** (renamed from `broody_*`, D-HOP-16 #5) | **[G3-scratch: pending measure:l30plus re-measure]** |
| `tc_broody_cap_s` | 150 | **G3 draft column** (D-HOP-16 #5) | **[G3-scratch: pending measure:l30plus re-measure]** |
| `tc_broody_ready_share` | 0.5 | **G3 draft column** (D-HOP-16 #5) | [P] ([G3-scratch: pending measure:l30plus re-measure]) |
| `tc_broody_unlock_worker` | 2 (W2 = Coop Hand) | **G3 draft column** (D-HOP-16 #5). v1.1 had no column. The rule stays event-based (D-HOP-04 #7): unlock at the first hire of worker index `tc_broody_unlock_worker`. `validateBalance` requires 2 in M5.0 | [HoP] |
| `tc_broody_max_on_screen` | 1 | **G3 draft column** (D-HOP-16 #5). v1.1 and HoE §12.2 treated it as fixed by design. The game reads it, but `validateBalance` requires exactly 1 | [HoP] |
| `tc_tap_bonus_income_window_s` | 60 | shared G3 draft column (m5-streak-tap-coins-spec §5; replaces `tc_ref_income_window_s`) | [HoP D-HOP-04 #2] |
| `tc_spawn_grace_ms` | 250 | shared NEW-ROW, **not in the G3 draft** (m5-golden-egg-spec §5) | [P] |
| hit box / margin / sprite | 56 / 16 / 48 px | Art & UX | [UI] |

**Draft economy.csv columns** (as in Economy's G3 draft `scratch/v2-econ/economy.m50-draft.csv`, approved in principle by D-HOP-16 #5; renamed `broody_*` → `tc_broody_*` so `sync-economy.ts` auto-maps them; constant on every row; no edit made):
```
tc_broody_income_share,tc_broody_cap_s,tc_broody_ready_share,tc_broody_unlock_worker,tc_broody_max_on_screen
0.05,150,0.5,2,1
```
`validateBalance`: 0 ≤ share ≤ 0.2; cap_s ≥ 1; 0 < ready_share ≤ 1; unlock_worker = 2; max_on_screen = 1.

## 6. Edge cases
| # | Case | Expected |
|---|---|---|
| B1 | Hidden 40 s / hidden 10 min / offline 2 h | No accrual; nest kept; state as before hiding |
| B2 | Reload with a $70 nest at F10 (I_ss = $16.50/s → cap $123.75, ready at 6,187.5¢) | Nest $70, a hen re-marked (saved index if valid), `ready`, tap pays $70. No accrual while closed |
| B2b | Reload with a $60 nest, same I_ss | Nest $60 (never lowered), `brooding` (6,000 < 6,187.5¢). It fills at $0.825/s and is ready after 2.3 focus seconds (R8a) |
| B2c | Reload when I_ss = 0 | Cap 0; the nest is kept, doesn't grow, and is `ready` (≥ 1¢ and ≥ 0.5 × 0) |
| B3 | Reload-spam to farm the nest | Nothing to gain: the nest grows only while the tab is open, at the same steady-state rate a normal session gets (I_ss, §4.1a), and a reload costs focus time |
| B4 | Settings/sheet/explainer/onboarding/coach open 60 s | Accrual frozen, hen `frozen` and untappable; resumes on close |
| B5 | Frenzy active | No effect on accrual or payout |
| B6b | Market Hand hired and Asleep or Unpaid (sales stall; HoE §12 D-C6) | During a warm-up, I_ss = 0, so the nest doesn't fill. This is **intended: HoP confirmed X8** (HoP 16:46; QA X8). The zeroing comes from `product/market/sales-stopped-spec.md` §4.2: per SS-15, live `incomePerSec` = −wages, so I_ss = 0. The stored nest is kept and is `ready` if ≥ 1¢ (R8). After warm-up, the ring falls with the stalled sales. Accepted |
| B6 | Coop Hand asleep/unpaid | Still unlocked and tappable; fill follows I_ref |
| B7 | Coop empty / full | No effect |
| B8 | Rapid taps / autoclicker on the hen | One payout per ready episode; the next ready comes ≥ 75 s of focus-clock time later. An autoclicker gains ≤ 5% of I_ref, the same as a human visiting every 75–150 s |
| B9 | No eligible drawn slot | No hen marked; the nest fills invisibly and is never lowered; marked in its current state when a slot qualifies (R5) |
| B10 | Hens track bought (more sprites drawn) | Current hen kept if still drawn and eligible |
| B11 | Golden egg lands near the hen | Can't: the golden egg excludes the broody box (GE-AC15) |
| B12 | Payout < $1,000 / ≥ $1,000 / ≥ $1M | `+$61.87` / `+$1.2K` / `+$1.2M` (short money, R14), clamped 8 px inside the screen; aria `fmtMoneyAria` (exact) |
| B13 | Two tabs | Only the live tab accrues (R7) and shows a tappable hen |
| B14 | Clock backward | 0 elapsed |
| B15 | Coop Hand hired mid-session | Unlock on the next tick: hen picked, nest 0 |
| B16 | Save from an M5 build opened in M4.1 | Fields ignored; no crash |
| B17 | Reduced motion | No wobble/pulse; solid/double ring; keyboard and aria work |

## 7. Dependencies
**Upstream:**
- **#69** merged to main (yard sprites from hens[H], `ui/app.ts:528-536`; D-HOP-04 #7), **plus #69's Minor m1 follow-up**: build the 12 yard slots once and fill only new ones, or re-apply the Broody layers after every rebuild (R2). HoE rebases #69 v2 after #67, before F6.
- The golden-egg framework (m5-golden-egg-spec: focus clock, overlay layer, live-rect eligibility, freeze, short-money popups with the 8 px clamp, and `evRngState`, from which Broody's own `brRng` is derived per D-C4).
- I_ref (`sim/income-ref.ts`, m5-streak-tap-coins-spec §4.1).
- HoE F1 (sim clock, `brRng` per §12 D-C4), F2 (2 save fields, sanitising), F3 (validation), F4 (`session_end.broody_cents`), F6 (`ui/overlay.ts`).
- **Art & UX:** broody glow/wobble/full and frozen states, the nest sprite, the cluck SFX, and the reduced-motion ring. These are **not delivered** (HoE §8.6) and block the UI PR. Art & UX also verifies on the live build that ≥ 1 yard slot is eligible at each matrix viewport with ≥ 6 hens drawn.
- Economy G3: the 3 draft columns; G1.

**Downstream:**
- m5-golden-egg-spec (the exclusion zone).
- Telemetry dashboards.
- M5.1 Golden Hen (would reuse the yard-target code; out of scope).

## 8. Telemetry (telemetry-spec v0.6.2; reuse, no new event names)
| Event | Use | Fields |
|---|---|---|
| `collectible_spawned` | when the hen becomes `ready` (once per ready episode; `restored:true` if ready at load) | `collectible_id` (shared per-session counter with the golden egg), `skin:"broody_hen"`, `farm_level`, `collection_level`, `slot_id` (`Y0`–`Y11`, the yard slot of the marked hen at the moment of ready; never null), `layout` (`phone-360`/`phone-375`/`docked`/**`docked-compact`**, the same enum and keys as golden R12: 1024×474 and 960×600 are `docked-compact`, and portrait ≥ 960 is `phone-375`; QA BH-o), `interval_s` (integer focus seconds from the last payout or unlock to ready; on `restored:true` it is 0), `deferred_ms` (focus ms in this episode with no eligible slot; 0 if none), `restored` (bool) |
| `collectible_collected` | on payout | `collectible_id`, `skin:"broody_hen"`, `reaction_ms` (focus-clock time from ready to tap), `in_warning:false`, `reward_type:"broody_cash"`, `reward_value` (cents), `reward_duration_s:0`, `nest_fill_share` (paid / cap at tap, may be > 1 after a cap drop), `farm_level` |
| `collectible_expired` | **never** on normal play (the hen doesn't expire); only `reason:"reset"` on a save reset or CSR fresh start (R20a) | `collectible_id`, `skin`, `reason:"reset"`, `farm_level` |
| `session_end` (extend) | totals | `broody_cents`, `broody_collects` (HoE F4 names) |

**No field is null for `skin:"broody_hen"`** (QA BH-e): every golden field has a defined broody value above. The broody-only fields are `restored` and `nest_fill_share`. Own event names were rejected (T-AC12: reuse names). All are ring-trimmed. `session_end` is already pinned, so the pinned list is unchanged. KPIs:
- median `nest_fill_share` at collect is between 0.6 and 1.0 (≈ 1.0 means the cap is too short; < 0.6 means anxious tapping);
- `broody_cents` / coins in the P1 band ± 3 pp.

## 9. Acceptance criteria
- **BH-AC1** Given no Coop Hand hired (any F), then no hen has `data-broody-state`, the nest stays 0 for 30 min, and no `skin:"broody_hen"` events fire.
- **BH-AC2** Given the first Coop Hand hire, then within 1 tick exactly one drawn, eligible yard slot carries `data-broody-state="brooding"` and nest = 0. Given an already-hired save loaded for the first time, the same holds.
- **BH-AC3** Given I_ref = $16.50/s held constant and 150 s of focus-clock time, then nest = **12,375¢ exactly** (integer accrual, R7). It shows `ready` from 75.000 s (±1 tick), when the nest is 6,187.5¢ and a tap pays **$61.87**, and `full` at 150 s, and it doesn't grow after that.
- **BH-AC3b (scaled accrual and BigInt guard; HoE money-math ruling)** A unit test on the pure accrual step:
  - given `refCents` = 1650, broodyBp 500, and 2,273 frames of 1 ms from `nestScaled` = 60,000,000, then `nestScaled` = 61,875,225 and `msRem` = 0. It is ready (61,875,225 × 10000 ≥ 5000 × 123,750,000), and it pays **6,187¢**;
  - given `refCents` = 1,000,000,000,000 (1e12) and 150 focus s, then `capScaled` = 75,000,000,000,000,000 (> 2^53, the BigInt path), the nest is full, and it pays **7,500,000,000,000¢**, equal to the BigInt reference;
  - given `refCents` = 18,014,398,509,472 and one 1,000 ms frame, then `nestScaled` = 9,007,199,254,736,000 and the pay is **900,719,925,473¢**, equal to the BigInt reference.
    - The guard here is on the **intermediate product** `refCents × broodyBp × dtMs` (9.0e18), not on the nest: the nest is 4,991 below `Number.MAX_SAFE_INTEGER`.
    - For a 1,000 ms frame the intermediate boundary is `refCents` > **18,014,398,509** (HoQA v0.6);
  - **paths disagree:** given `refCents` = 7,474,818,205,800 and one 1,000 ms frame from 0, then the pay is **373,740,910,290¢**, the BigInt reference (checked in Node with BigInt; the `Number` value is also from Node). The `Number` path gives …289, because the intermediate 3.7e18 loses precision;
  - a spy shows the BigInt path is taken exactly when an operand or product exceeds `Number.MAX_SAFE_INTEGER`.
- **BH-AC4** Given a `ready` hen, when tapped once, then coins increase by exactly floor(nest_cents), the nest is 0, a different eligible slot becomes broody (if one exists), and `collectible_collected{reward_type:"broody_cash"}` fires once.
- **BH-AC5** Given a `brooding` hen (below ready), when her slot is tapped, then nothing is paid from the nest and no Broody event fires. The tap falls through to the scene as an ordinary Collect tap (credited per streak R2).
- **BH-AC6** Given a double tap, multi-touch or mouse + touch on a ready hen, then exactly one payout.
- **BH-AC7** *(restated for D-HOP-10 #1)* Given F10 with every worker working (I_ss = I_ref = $16.50/s) and a ready nest of $70.00:
  - when the tab is hidden for 40 s, hidden for 10 min, or the page is reloaded, then on return the nest is $70.00 exactly (no accrual while hidden or closed), a hen is marked `ready`, and a tap pays $70.00;
  - given a saved $60.00 nest instead, then after the reload it is `brooding` and turns `ready` after 2.3 ± 0.1 focus seconds (2,273 ms exact), and a tap then pays **$61.87** (the floor of the 6,187.5¢ threshold; QA BH-p).
- **BH-AC8** Given save fields `broodyNestCents` = −5 / NaN / 1e20 / absent, and `broodyHenIdx` = 99 / an undrawn slot, then on load the nest is 0 / 0 / 1e15 / 0 respectively (R20), the index is re-picked, and nothing crashes. An M4.1 build loading the save ignores both fields.
- **BH-AC9** Given any D-HOP-04 #4 menu open for 60 s (one run per menu type), then nest growth over that interval is 0, the hen is `frozen` (animations paused, `inert`), and taps do nothing.
- **BH-AC10** Given a Coop Hand working, tired, asleep or unpaid for 10 min with no player tap on the hen, then the nest is never emptied by any worker, and BH-AC3's arithmetic holds against the measured I_ref.
- **BH-AC11** Given a Frenzy, s = 0.28 and an active ability, then payout = floor(nest_cents) unchanged, and I_ref excludes Broody payouts (a $100 payout doesn't change I_ref).
- **BH-AC12** Given I_ref drops from $16.50 to $5.00/s with the nest at $100, then the nest stays $100 (cap now $37.50), doesn't grow, and stays `full`.
- **BH-AC13** *(restated per Art `m5-broody-hen-art.md` v0.1 §2)* Given each matrix viewport {360×844, 375×844, 390×844, 430×844, 1024×474, 1280×720, 1280×800, 1366×768, **959×600, 960×600, 960×1280 portrait, 1024×1366 portrait**} (the last four per golden R12/R13; measured in Art rects 5d9efa6; QA BH-o/GE-16/BH-k) with sheets closed, then:
  - the tap box is 56×56; it is ≥ 16 px from every R4 tap target and the toast, ≥ 8 px from the meter, the streak box, `Full!` and the visible pill, and ≥ 8 px inside the viewport;
  - the eligible slot set equals Art §2's table for that viewport and pill state;
  - with ≥ 5 hens drawn, at least one slot (Y0) is eligible.
  - A golden egg never spawns within 16 px of the tap box (GE-AC15).
  - Firefox and Safari are re-measured live; differences are logged for Art.
- **BH-AC13b (BH-k; Art rects 5d9efa6 (`art-ux/m5-layout-rects-960.md` v1.0) §C; D-COL-2026-10-24-01)** With 12 hens drawn and `Full!` forced visible, the eligible slot set is:

| Viewport | Pill hidden | Pill shown |
|---|---|---|
| 959×600 phone | exactly **{Y0, Y5}** (2) | exactly **{Y0, Y5}** (2) |
| 960×600 docked-compact | {Y0, Y5, Y6–Y11} (8) | {Y0, Y5, Y7–Y11} (7) |
| 960×1280 portrait (phone) | {Y0, Y5, Y6–Y11} (8) | {Y0, Y5, Y7–Y11} (7) |
| 1024×1366 portrait (phone) | {Y0, Y5, Y6–Y11} (8) | {Y0, Y5, Y7–Y11} (7) |

  - Why 959×600 drops the others: Y6–Y11 overlap the coop `#meter` (−5 px), and Y1–Y4 overlap the coop or nest.
  - At H0 (5 hens drawn, Y0–Y4), Y0 is eligible at all four sizes.
  - Every count is ≥ 1, the D-COL-2026-10-24-01 minimum.
  - A fixture with 0 eligible slots behaves as BH-AC14: hidden, never `ready` or tappable, no `collectible_spawned`, and the nest accrues and is never lowered.
- **BH-AC14** Given no eligible drawn slot (fixture), then no hen is marked, the nest keeps filling and is never lowered, and no payout happens. When a slot becomes eligible (e.g. a Hens buy), it is marked within 500 ms in the state its nest warrants (ready if nest ≥ the threshold), and `deferred_ms` > 0 on its next `collectible_spawned`.
- **BH-AC15** Given 200 payouts on a fixed seed, then the slot sequence is reproducible, never repeats the previous slot when ≥ 2 are eligible, and the customer sequence is byte-identical to a run with the hen disabled. **The golden egg's gap/slot/reward sequence is also byte-identical with the hen on and off** (`brRng` isolation, HoE §12 D-C4; for every flag-enable order, see m5-golden-egg-spec GE-AC36, HoE Q4 ruling). Reproducibility is per page session from a fixed seed; after a reload, `brRng` is re-derived from `evRngState`.
- **BH-AC16** *(restated, short money)* Given payouts of 6,187 / 123,456 / 120,000,000 cents, then the popup reads `+$61.87` / `+$1.2K` / `+$1.2M`, and the aria text uses the exact `fmtMoneyAria`. Given a hen at the leftmost eligible slot at 360×844, the popup rect is ≥ 8 px inside both screen edges.
- **BH-AC17** Given reduced motion, then no wobble or pulse; the ready ring is solid and the full ring doubled; Enter on the focused ready hen collects; the live region announces "Broody hen ready, $X" once per ready episode.
- **BH-AC18** Given any `tc_broody_*` change in the CSV plus sync, then behaviour follows with no code change.
- **BH-AC19** Given a ready episode and a payout, then `collectible_spawned{skin:"broody_hen"}` and `collectible_collected` appear with every §8 field non-null, plus `sid`/`fgMs` **[T-sub]**. **`layout`** (QA BH-o) is `docked-compact` at 1024×474 and 960×600, `phone-375` at 959×600 and 960×1280 portrait, `docked` at 1280×800, and the same key as golden `collectible_spawned` in the same session. And **[T-sub]** `session_end.broody_cents` = Σ `reward_value`, `broody_collects` = count.
- **BH-AC20 (#69 gate)** Given a build without #69 **and its m1 follow-up** merged, then the broody hen flag can't be enabled (the release check fails); ship order per D-HOP-04 #7.
  - Given a `ready` hen with a $70 nest, when a Hens level is bought (yard count change), then within 1 frame her nest layer, glow, ring, `data-broody-state` and the nest value are unchanged.
  - The yard isn't rebuilt under her: either the slots are built once, or the layers are re-applied.
- **BH-AC21 (G1; Economy)** Given G3's values (0.05 / 150 / 0.5) in the full M5.0 stack, then optimal active/idle ≤ 2.0 at P95 and ≤ 2.25 on the worst seed over every 10-min window, seeds 0–99, F10/F18/F24. With the hen never tapped, AC7 pacing is unchanged. **Scratch G3 (D-HOP-16):** P95 1.77, worst seed 1.84, which passes. This AC closes only on the `measure:l30plus` re-measure.

- **BH-AC22 (managed/unmanaged ratio; QA BH-h)** Given the managed/unmanaged worker ratio gate, then it is computed with Broody income **excluded from both arms**, like golden-egg income (GE-AC29b). The sim reports both the excluded value (the gate) and the included value (info only).
- **BH-AC23 (save edge cases; R20a)** Given a ready hen with a $60 nest, when the save is reset (CSR fresh start), then the hen is locked, the nest is absent/0, and `collectible_expired{reason:"reset"}` fires once. Given a save with both fields but no Coop Hand, then no hen shows and the fields are unchanged on the next save. Given the saved slot is no longer drawn, then within 500 ms a drawn eligible slot is marked and the nest is unchanged.
- **BH-AC24 (unlock cue; R14a)** Given the first ready episode of a session with 0 broody collects, then the toast `Your broody hen is ready! Tap her to collect.` shows exactly once. Given a second ready episode in the same session, or a session where a collect already happened, then no toast. No event fires at hire time apart from the existing `worker_hire`.
- **BH-AC25 (flag; R14b; D-C1)** Given `m4.flags.broody` = 0 (default) or `m4.enabled` = false, then no hen, no accrual, the save fields are byte-unchanged, and no `skin:"broody_hen"` events fire.
- **BH-AC26 (jump clamp)** Given a visible forward clock jump of +59 s in one frame with I_ref = $16.50/s, then the nest grows by at most 0.05 × 16.50 × 1.0 = $0.83 for that frame.
- **BH-AC27 (tap isolation; R12)** Given F ≥ 8 with the streak unlocked, s = 0.10, 12 eggs in the coop and a `ready` hen, when she is tapped once, then:
  - exactly one payout;
  - the coop still holds 12 eggs (no Collect);
  - s = 0.10 with no tap coins;
  - `credited_taps` and `taps_total` are unchanged;
  - `stopPropagation()` was called (a unit test on the handler).
- **BH-AC28 (steady-state warm-up; BH-j; D-HOP-10 #1)** Given a reload at F10 with I_ss = $16.50/s and nest $0, **with the welcome-back modal dismissed at load** (sim time runs under the modal, but focus time doesn't; QA BH-p), then after 10 focus seconds the nest = **825¢ exactly** ($8.25), not $0. At 60 s of sim time, I_ref switches to the trailing window (m5-streak-tap-coins-spec ST-AC16d).
  - Given the trailing window is then $10.00/s with the nest at $100, the nest stays $100 (cap $75.00) and doesn't grow (R8).
- **BH-AC29 (sales stall; D-C6)** Given a reload with a hired Market Hand Asleep (or Unpaid) and a stored $40 nest, then during the warm-up I_ss = 0, so the nest stays $40.00 after 30 focus seconds, is `ready`, and a tap pays $40.00. When the Market Hand works again, the fill resumes at 0.05 × I_ss on that tick. The $0 fill is **intended: HoP confirmed X8** (HoP 16:46; QA X8). The zeroing comes from `product/market/sales-stopped-spec.md` §4.2: per SS-15, live `incomePerSec` = −wages, so I_ss = 0.
  - Given a stall from a fresh unlock (nest 0), then the hen stays `brooding`, is never tappable for a payout, and no popup or `+$0.00` ever renders (R14).

## 10. Build size
**S–M on the golden-egg framework** (HoE: sim 0.75 + UI 1.25–1.5 + tel 0.25 = 2.25–2.5 dd), plus Art 0.5–1 day for the undelivered states and 1 QA day. **M** standalone. It's on the critical path after the golden-egg UI, and blocked by #69 and the Art assets.

## 11. Open questions
- Q1 (Art & UX, blocking the UI PR, not the spec): states, placement, popup and wireframes are delivered in `m5-broody-hen-art.md` v0.1. Still to draw: `overlay-broody-nest.svg` (≈ 0.25 d), plus the SFX per the sound spec.
- Q2 **closed (D-HOP-2026-10-24-10 #3, QA BH-l):** the payout floors to whole cents (≤ 1¢ lost per payout). This is the Broody Hen's **single rounding** under X7, so it doesn't conflict with "rounded once". It keeps the 2 approved integer save fields.
- Q4 **closed (HoE Q4 ruling):** `evRngState` is created on the first tick golden **or** broody is on; HoE's two rules are in R4 and golden R10a.
- Q3 (Economy G3): fold the Broody Hen into P1 at 100% collection-at-cap for optimal and casual.

## 12. HoE §8 gap closure (`engineering/m5.0-sizing.md` §8)
| HoE gap | Status in this spec | Where |
|---|---|---|
| 1 Economy G3 not run | **Scratch G3 in (D-HOP-16): P95 1.77, worst 1.84.** Share 0.05 and cap 150 s are [G3-scratch: pending measure:l30plus re-measure] (= G3); G1 is the gate | Header, §5, BH-AC21 |
| 2 CSV columns (`broody_income_share`/`_cap_s`/`_ready_share`/`_unlock`) | **Closed (draft).** `tc_broody_income_share` 0.05, `tc_broody_cap_s` 150, `tc_broody_ready_share` 0.5, *for Economy G3*. No `_unlock` column: the unlock is the first-hire event (D-HOP-04 #7). No CSV edit | §5 |
| 3 Golden egg | N/A; the shared framework and the mutual exclusion are referenced | R15 |
| 4 Credited tap | N/A: a hen tap is not a coop tap and is never credited | R13 |
| 5 Reference income | **Closed.** Uses the shared I_ref: trailing 60 s of sim-time sale income, hidden < 60 s sales included; steady-state I_ss for the first 60 s after a load or offline return (D-HOP-10 #1); Broody payouts excluded | R7, R8, BH-AC11, BH-AC28 |
| 6 No Broody spec; unlock; #69; glow assets | **Closed (spec), with the asset routed.** This spec; unlock at the first Coop Hand hire; depends on #69 in main (BH-AC20); assets listed as a UI-PR blocker for Art & UX | §3.1, §7, Q1 |
| 7 Abilities | Out of scope; abilities don't affect the nest and are excluded from I_ref | R16 |
| 8 Pause | Out of scope. A paused Coop Hand keeps the hen unlocked | R1 |
| 9 Menu states | **Closed.** D-HOP-04 #4 menus freeze accrual and tapping | R7, BH-AC9 |
| 10 QA test plans | **Partly closed.** BH-AC1–21 are measurable; HoQA writes the plan | §9 |
| 11 Telemetry names / skin / pinned | **Closed for PM; HoQA to OK.** `collectible_*` reused with `skin:"broody_hen"`; `session_end.broody_cents`/`broody_collects` (HoE F4 names); pinned list unchanged | §8 |

## 13. QA testability gaps → resolution (`qa/m5/testability-gaps.md` v0.1–v0.5.7)
| Gap | Resolution | Holds it |
|---|---|---|
| BH-a No spec | This spec, with numbered ACs BH-AC1–26 | §9 |
| BH-b Numbers not in CSV | 0.05 / 150 / 0.5 are the P1 values ([G3-scratch: pending measure:l30plus re-measure] = G3). Drafted as `tc_broody_income_share`/`tc_broody_cap_s`/`tc_broody_ready_share`; they land in Economy's single M5 CSV PR with G3, after HoP approval (D-HOP-04 #10). Date: Economy | §5 |
| BH-c Hit box; hens drawn < 2 / hen not drawn | 56×56 CSS px (≥ 44) centred on the slot `<img>`; 16 px from tap targets and the toast, 8 px from readouts, 8 px inside the screen (Art v0.1 §2). < 2 drawn or none eligible → no hen marked, the nest keeps filling (R5). A saved hen not drawn → re-pick (R6). Golden needs **≥ 2** valid spots (GE-AC15, v1.1), not 4 | R4–R6, BH-AC13/14 |
| BH-d Accrual under menus | **No.** Frozen under every D-HOP-04 #4 menu and while hidden | R7, BH-AC9 |
| BH-e Telemetry | `collectible_*` reused; every field has a documented broody value, none null; `expired` only `reset` | §8 |
| BH-f B2 flutter | Cosmetic only: no credited tap, no coins, no telemetry, no save; out of M5.0 ACs | R14c |
| BH-g Unlock cue | No event or coach at hire; a once-per-session toast on the first ready episode; no new save field | R14a, BH-AC24 |
| BH-h Ratio gate | Broody income excluded from both arms | BH-AC22 |
| BH-i Save edge cases | Reset → locked, fields dropped, `expired{reset}`; no Coop Hand → ignored; index not drawn → re-pick | R20a, BH-AC23 |
| BH-j (v0.2) I_ref after reload/offline | **X2 wins (D-HOP-2026-10-24-10 #1):** steady-state I_ss until 60 s of sim time accrue, then the trailing window. R8 re-checked (never lower; a reload no longer zeroes the cap); R8a sticky ready; B2/B2b/B2c; plug-ins restated | R7, R8, R8a, BH-AC7, BH-AC28 |
| BH-l (v0.2) Floor vs X7 "rounded once" | **Not a conflict (D-HOP-10 #3):** floor-to-cent **is** the Broody Hen's single rounding under X7 | R13, Q2 |
| BH-o (v0.5) `layout` enum lacks `docked-compact` | **Closed:** the §8 `layout` enum is phone-360/phone-375/docked/**docked-compact**, with the same keys as golden R12 (incl. the orientation rule). Schema acceptance is HoE's (TEL-16) | §8, BH-AC13, BH-AC19 |
| BH-p (v0.5) $61.88 vs the 6,187.5¢ threshold; BH-AC28 precondition | **Closed:** the floored payout at the threshold is **$61.87** (§4, B2/B2b/B12, R14, BH-AC3/7/16). BH-AC28 requires the welcome-back modal dismissed at load. Arithmetic and test precondition, not a design change | BH-AC3/3b/7/16/28 |
| BH-k Eligible slots at 959×600 / 960×600 / portrait ≥ 960 | **Closed:** measured in Art rects 5d9efa6 (`art-ux/m5-layout-rects-960.md` v1.0) §C (2 / 8·7 / 8·7 / 8·7). The minimum of 1 slot per viewport is D-COL-2026-10-24-01 (APPROVED by HoP 17:22), and M5.0 doesn't depend on the m4 hen-row fix | R5, BH-AC13, BH-AC13b, BH-AC14 |
| BH-n Hen states/assets | **Closed 17:24 (no rev):** §3 states are CSS-only (`data-broody-state`); nest `art-ux/assets/overlay-broody-nest.svg` + `@2x.png`, mock `mocks/m5-broody-nest-360.png`, Broody SFX in `art-ux/assets/sfx/`; FINAL, CC0, files verified on disk | Art `m5-broody-hen-art.md` §3/§5 |
| GE-6-style flag | `m4.flags.broody` (D-C1; default 0) + `m4.enabled` + #69 | R14b, BH-AC25 |
| ST-7 Broody tap credited? | No: not a coop tap, no tap coin | R13, R14c |
| X1–X7 cross-cutting | Answered once in m5-golden-egg-spec §3.7 and binding here: tolerances, seeds, hidden semantics, telemetry v0.6.2 split, debug hooks, stacking, rounding. Broody debug hooks needed: set nest, set I_ref, force ready, force slot | m5-golden-egg-spec §3.7 |
| AB-1…AB-8, P-1…P-9 | **Not Collection's:** PM Workers owns Abilities and Pause/Resume (`workers/m5-worker-abilities-spec.md`, `m5-worker-pause-spec.md`) | — |

## 14. HoE §9–§10 alignment
| # | HoE point | Applied | Flag |
|---|---|---|---|
| A1 | Focus clock (F1b), separate from sim | Glossary; R7 accrual on focus-clock dt; R21 | none. HoE §2 item 5 already had "nest accrual on the focus clock" |
| A2 | Offline = hidden-tab or frame gap ≥ 60 s | R9, R21 | none |
| C2 | I_ref includes hidden-sim sales | R7 note | **Confirmed, D-HOP-09 #2** |
| A4 | §10.1 subset includes `broody_cents`/`_collects` | BH-AC19 [T-sub] | none |

## Change log
- **v1.3.2** (2026-10-24 17:43; HoQA v0.7 wording; HoP errata ruling D-HOP-2026-10-24-26 #7). Wording only; no rule, AC logic or number changes:
  - **R4:** the Sales Stopped chip sits **inside** the `#goal` rect (SS v1.3.9: 560 px max, centred; narrower at 959×600 and 1024×1366). The `#goal` clearance still covers it.
  - **BH-AC13:** the viewport list adds 1024×1366 portrait (already measured in Art rects §C and BH-AC13b).
  - The v1.3 changelog line "BH-n stays open" is corrected to "BH-n closed 17:24".
  - D-COL-2026-10-24-01 is marked APPROVED by HoP 17:22 (logged `decisions.md` 17:23) at R5, §13 BH-k and the v1.3 changelog.
- **v1.3** (2026-10-24 17:22; **Art rects 5d9efa6**; **UI/Visual GE16/17 review (art-ux/reviews/ge16-ge17-5d9efa6.md)**; D-HOP-2026-10-24-24):
  - **D-COL-2026-10-24-01 (PM Collection design decision; APPROVED by HoP 17:22, logged `decisions.md` 17:23):** min 1 eligible slot per viewport; 959×600's {Y0, Y5} is acceptable; no dependency on the m4 hen-row overlap fix; 0 slots → hidden, nest accrues, never lowered (R5; already in R5/BH-AC14).
  - New **BH-AC13b** (BH-k measured counts); BH-AC13 cites the rects. BH-k is closed. BH-n closed 17:24 (Art assets verified on disk, §13).
  - The GE-17 chip measured inside `#goal` (R4 holds; golden R14; wording corrected in v1.3.2).
  - **Draft CSV of record:** sha256 **8dc90e2b…996b** (152 cols, 29 added, `guard_*` dropped; D-HOP-2026-10-24-24; `sha256sum` on disk matches). It replaces 45095351, and the "may change" note is removed. No spec rule uses a `guard_*` column. `tc_stall_tap_guard_ms` is a sales-stopped column and isn't used here.
- **v1.2** (2026-10-24 17:19; **HoE money-math ruling 2**; HoP cross-check v0.2; HoQA v0.6):
  - **Version:** this consolidates the unversioned edits made at 16:59, 17:08, 17:11 and 17:13, plus the HoP cross-check v0.2 and HoQA v0.6 notes. HoP cross-check v0.2 asked for the bump.
  - **Draft CSV citation:** edfd8902 → **sha256 45095351…81b8** (154 cols, 31 added). Economy confirmed it via HoP at 17:18. edfd8902 was the earlier 21-column draft, not a typo. (Superseded in v1.3 by 8dc90e2b, D-HOP-24.)
  - **Since v1.1:**
    - The combo-tiers layout note (the slot table stands).
    - HoQA v0.5: BH-o, BH-p, X8, GE-17 chip, and integer accrual.
    - HoE money-math ruling: scaled ¢ × bp accrual with a ms remainder, the floor at payout, the BigInt guard (new BH-AC3b).
  - **HoQA v0.6:**
    - BH-AC3b(c) wording: the guard is on the intermediate product (boundary `refCents` 18,014,398,509 at 1,000 ms); the pay value is kept.
    - Added a value where the paths disagree (7,474,818,205,800 → 373,740,910,290¢).
  - **§13** gains BH-o and BH-p rows. BH-AC13 gains the 959×600 / 960×600 / 960×1280 viewports, and BH-AC19 the `layout` assertion.
- v1.1 + **HoE money-math ruling** (2026-10-24): R7 now accrues in scaled units (¢ × bp, with a ms remainder) and floors to the cent only at payout, with the BigInt guard. New BH-AC3b. Examples unchanged ($123.75, ready at 6,187.5¢ / pays $61.87, $8.25, $81.00, $581.25).
- v1.1 + **HoQA re-review v0.5 closures** (2026-10-24):
  - **Integer accrual** consistent with the **HoE ST-11 ruling** (R7; bp rates, `refCents`, ms, 10⁻⁷ ¢ units). The floor-to-cent payout stays the single rounding.
  - **BH-p:** at the 6,187.5¢ threshold the payout is $61.87, not $61.88 (§4, B2/B2b/B12, R14, BH-AC3/7/16). BH-AC28 gains "welcome-back dismissed at load"; its $8.25 is now exact.
  - **BH-o:** `docked-compact` added to the §8 `layout` enum.
  - **X8 (HoP confirmed, 16:46):** a $0 fill during a sales stall is intended, citing Market §4.2. No popup at $0, because a $0 nest is never ready (R14).
  - **GE-17:** the Sales Stopped chip is bounded by `#goal` (R4; Art ruling).
- v1.1 + `art-ux/m5-combo-tiers.md` v0.2 (2026-10-24): the streak meter moves to a new 24 px row under a 48 px Collect; the scene is unchanged, so the slot table stands.
- v1.1 + **D-HOP-2026-10-24-16** + **HoE Q4 ruling** (2026-10-24):
  - Scratch G3 is in. P1-pending values are retagged [G3-scratch: pending measure:l30plus re-measure], with the draft values unchanged (0.05 / 150 / 0.5).
  - Columns follow the draft: `tc_broody_*`, plus `tc_broody_unlock_worker` 2 and `tc_broody_max_on_screen` 1 (new to this spec, both pinned by validation); `tc_tap_bonus_income_window_s` replaces `tc_ref_income_window_s`.
  - G3 status paragraph; BH-AC21 carries the scratch result.
  - Q4 closed (R4 rules 1 and 2); BH-AC15 references GE-AC36.
- v1.1 · **BUILDABLE (HoE §12)** (2026-10-24): folded in HoE §12 decisions.
  - **D-C1:** flag `m4.flags.broody` (R14b, BH-AC25, §13).
  - **D-C4:** own `brRng = xorshift32(mixSeed(evRngState ^ 0x62724E67))`, not saved (R4, BH-AC15).
  - **D-C5:** save fields `broodyNestCents` / `broodyHenIdx` everywhere, with sanitisers (R20, BH-AC8 keys).
  - **D-C6:** I_ss = 0 in a sales stall (R7, B6b, new BH-AC29).
  - D-C3 needs no change here, because accrual already uses focus dt ≤ 1.0 s per frame.
- v1.1 + **D-HOP-2026-10-24-10** + Art + HoE (2026-10-24):
  - #1 (BH-j): I_ref uses steady-state I_ss after a load or offline return (R7). R8 re-checked; new R8a (sticky ready); B2/B2b/B2c/B3; plug-ins; BH-AC7; new BH-AC28.
  - #3 (BH-l): the floor is the single rounding (Q2 closed).
  - From Art `m5-broody-hen-art.md` v0.1:
    - she takes over a drawn hen, with no extra sprite and an unchanged pill (R3);
    - the tap box is 16/8/8 px (R4), and no eligible slot means no hen marked with the nest filling invisibly and never lowered (R5);
    - the states reference Art §3;
    - popups use short money with the 8 px clamp (R14, B12, BH-AC16).
  - `stopPropagation()` (R12, BH-AC5, new BH-AC27).
  - The #69 gate includes Minor m1 (R2, §7, BH-AC20).
  - HoE confirmed the 1.0 s focusClock cap (A3).
- v1.1 + **D-HOP-2026-10-24-09** (2026-10-24): focus clock (`focusClock`) in the Glossary, R7 and R21 (#1); I_ref hidden-sim sales confirmed (#2); the shared R5e clamp accepted, HoE to confirm (#4).
- v1.1 + HoE §9–§10 (2026-10-24): Glossary with the focus clock; accrual stated on focus-clock dt; offline = gap ≥ 60 s; I_ref hidden-sim note (C2); BH-AC19 telemetry tags; §14.
- v1.1 + QA gaps (2026-10-24): answered `qa/m5/testability-gaps.md`. Added R14a unlock cue, R14b flag, R14c B2, R20a save edge cases, the jump clamp, documented broody telemetry values, BH-AC22–26 and §13. Version stays v1.1.
- v1.1 (2026-10-24): status **Approved (conditional), D-HOP-08**. I_ref confirmed (#1); G1 wording confirmed (#4); 0.15 asleep share removed as a dependency (backlog). The accrual freeze under menus/hidden already matched #3.
- v1.0 (2026-10-24): first spec, from slice §2.2, with HoP (d) and D-HOP-04 #2/#4/#7/#10 applied.
