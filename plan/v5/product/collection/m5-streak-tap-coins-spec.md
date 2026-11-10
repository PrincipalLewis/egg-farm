# M5.0 Collect Streak + Tap Coins: build spec · v1.3.3 · 2026-11-05 · PM, Collection
**Status:** **Approved (conditional), D-HOP-08 · BUILDABLE (HoE §12)** **v1.3.3 (2026-11-05 ~20:30 CET, D-HOP-2026-10-30-27 / D-HOP-2026-10-30-31, TASK PMC/v5-cap027-errata)**: tuning only. v5 default `tc_streak_cap` 0.28 → **0.27** with breeds=1 (0.28 with breeds off). Tiers 0.07/0.14/0.20/0.27; fill at s=0.187 → 69.26%; cap label MAX +27%; decay-to-zero 12.0 s; peak sale 2.54×. Model numbers from HoP's task (Economy-verified at cap 0.27). Historical G3 scratch (cap 0.28, P95 1.77) retained as history, not re-claimed at 0.27. ST-AC11 0.40 config test kept. Frozen predecessor v1.3.2: `product/collection/m5-streak-tap-coins-spec.acb4cdbb.md` (sha1 `acb4cdbba293db639a409d1c197589b97b1a5c4e`). Prior frozen v1.3.1: `product/collection/m5-streak-tap-coins-spec.895ca903.md` (sha1 `895ca903700fe63280e659fdc625bbd2416118ab`). **v1.3.2 (2026-10-29 22:55 CET, D-HOP-2026-10-29-08 (5))**: QA oracle only. Adds the complete ST-AC26b layout table (§9.1, canonical CSV). No rule, threshold or AC logic changes. (`engineering/m5.0-sizing.md` §12, 2026-10-24 ~16:45) (D-HOP-2026-10-24-08, 16:22 CEST): approved as a spec, conditional on Economy G3/G1, Art assets and #69. **v1.3.1 (17:25)**: errata only, adding ST-AC26b, a mirror of CT-AC17 (HoP ruling 17:24). **v1.3 (17:22)**: the draft CSV citation is updated to the D-HOP-24 final sha. **v1.2 (17:19)** consolidates every edit made since v1.1 (see the v1.2 changelog entry). v1.1 applies the D-HOP-08 rulings (cited inline as *D-HOP-08 #n*). It supersedes `m4-collect-streak-spec.md` v0.3 (approved, never built: `product/research/m4-shipped-audit.md`). It adds the tap coin bonus from the v2 Collection slice (`product/research/v2-slices/collection.md`, idea A1, package P1).
**Scope:** D-CEO-20261024-06; HoP ruling (a) 2026-10-24. **Greenfield on RC1 `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463`.** No code, no PRs, no CSV edits.
**HoP rulings applied:** **D-HOP-2026-10-24-04** (*D-HOP-04 #n*):
- #1 one credited-tap definition (sim time, eggs or not), used by the streak, A1 tap coins and telemetry;
- #2 reference income = trailing 60 s of sim-time passive income only;
- #3 streak cap 0.28, provisional until Economy G3 (**superseded for v5 by D-HOP-2026-10-30-27 / D-HOP-2026-10-30-31**: cap **0.27** with breeds=1; 0.28 with breeds off);
- #4 menus freeze the streak decay together with the golden-egg timer;
- #10 CSV columns are drafted for G3 and applied after HoP approval.

HoE's `engineering/m5.0-sizing.md` §8 gaps are closed in §12.
**Glossary**
- **Focus clock** (`focusClock` in code; HoE F1(b) and §9.1; named by **D-HOP-2026-10-24-09 #1**): a clock separate from the sim clock. It advances only while the tab is visible, no D-HOP-04 #4 menu is open, and the tab is live (m5-golden-egg-spec R5, with its 1.0 s per-frame clamp R5e).
  - It doesn't advance during the rc1 hidden < 60 s online sim, a hidden-tab or frame gap ≥ 60 s, or a menu.
  - **The streak hold and decay run on it**, as do the golden egg timers and the Frenzy.
  - "Attended" keeps only its D-HOP-04 #5 meaning (player input within the last 30 s; abilities only). This spec doesn't use it (D-HOP-09 #1).
- **Sim clock**: the fixed-step 10 Hz `step()` time, which also runs during the rc1 hidden < 60 s sim. **The credited-tap 1.0 s window and the I_ref 60 s window run on it** (D-HOP-04 #1/#2; HoE §9–§10 doesn't say otherwise).
- **Credited tap**: R2. One term in code, events and dashboards (QA ST-9); "counted" is retired.

**Tags:** [HoP] / [CSV] (constant `tc_*` column, synced to `m4.tc.*`) / [NEW-ROW] (proposed `tc_*` column plus allowlist entry) / [UI] (Art & UX) / **[G3-scratch: pending measure:l30plus re-measure]** (Economy's scratch G3 draft value, D-HOP-16; it was [P1-PENDING] up to v1.1) / **for Economy G3** (draft CSV column, no edit made).
**Gate G1 (HoP ruling (c); D-HOP-04 #6; wording confirmed by D-HOP-08 #4), standing until the CEO rules:** in the canonical sim with the full M5.0 active stack (golden egg, streak at cap, tap coins, Broody Hen, worker abilities), optimal **active/idle ≤ 2.0 at P95, with the worst seed ≤ 2.25**, over every 10-minute window, seeds 0–99, F10/F18/F24. If it fails, Economy's fallback order applies: lower `tc_streak_cap` first, then `tc_tap_income_share`.
**G3 status (D-HOP-2026-10-24-16):** Economy's scratch G3 is in (`product/research/v2-slices/economy.md` §13; draft `scratch/v2-econ/economy.m50-draft.csv`, **sha256 8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b** (152 columns, 29 added, `guard_*` dropped; **D-HOP-2026-10-24-24**, verified on disk 17:22). This supersedes 45095351 (D-HOP-22) and edfd8902 (D-HOP-16's 21-column draft). No Collection rule uses a `guard_*` column.
- The full M5.0 stack (golden egg at 120–300 s, **historical scratch streak cap 0.28**, Broody Hen on) passes the window gate at **P95 1.77, worst seed 1.84** (scratch G3 at 0.28; not re-claimed as evidence at the v5 0.27 cap). **v5 current rule:** `tc_streak_cap` = **0.27** with breeds=1 (D-HOP-2026-10-30-27).
- Every formerly P1-pending value now carries the draft value, tagged **[G3-scratch: pending measure:l30plus re-measure]**. All of them equal what this spec proposed.
- **G3 clears only when the re-measure on the harness of record (`measure:l30plus`) is in.** HoP then signs off, and the draft is applied to `product/economy.csv` (D-HOP-16 #5). Until then this spec makes no CSV edits.

**Out of scope (M5.1):** Hot Hands, Golden Hen, Lab/frequency upgrades. Also the M4-B boost interaction (parked).

---

## 1. Overview
From Farm L8, tapping Collect does two things beyond moving eggs:
1. **Streak.** Each *credited tap* (at most 1 per second) raises a streak that multiplies **every egg sale price** by (1 + s), up to **+27%** (v5 breeds=1; D-HOP-2026-10-30-27; G3 scratch was +28%). It holds 3 s after the last credited tap and then drains. Four **tiers** (+7 / +14 / +20 / MAX +27%) give a pop-up and a sound as the player climbs.
2. **Tap coins (A1).** Each credited tap also pays a small coin bonus worth **3% of one second of reference income** [G3-scratch: pending measure:l30plus re-measure], **whether or not the coop has eggs**. Taps keep meaning something after a Coop Hand empties the coop.

## 2. Player fantasy
"I'm on a roll." Steady tapping visibly heats up the farm: the meter fills, tier pop-ups cheer, prices climb, and small coins tinkle out of every tap. Stopping doesn't hurt (idle income is unchanged); it just cools down. Tapping faster than once a second adds nothing, so there's no reason to grind or use an autoclicker.

## 3. Detailed rules
### 3.1 Credited taps (shared by streak and coins)
- **R1 Unlock:** F ≥ `tc_streak_unlock_farm` (8) [HoP, v0.3 S-Q3]. Below it, s = 0, no meter, no coins, and Collect behaves exactly as in rc1.
- **R2 Credited tap (D-HOP-04 #1, the single definition):** a **player tap on the coop** at sim time t is credited when `t − last_credited_t ≥ tc_tap_credit_min_s` (1.0 s of sim time; G3 draft column, = 1 / `tc_streak_max_taps_per_s`), **whether or not eggs move**.
  - "Tap on the coop" means pointer-up on the Collect button or the coop/nest tap area, or Enter/Space on the focused Collect button, ignoring `event.repeat`.
  - Sim time is the fixed-step sim clock (10 Hz `step()`, so ≥ 10 ticks), not `Date.now()` or `performance.now()`. A tap's time t is the sim time at which its `collect` action is applied (the current tick). Wall-clock jitter and frame drops can't create extra credits. Sim time from the rc1 hidden < 60 s online sim **does** count toward the 1.0 s window (QA ST-1). That's harmless: no taps can land while hidden, so the only effect is that the first tap after a short hide is always credited.
  - The streak (§3.2), the A1 tap coins (§3.4) and telemetry (§8) all use **this** flag. There's no second "moved ≥ 1 egg" definition.
  - **Change from v0.3 §2.3–2.4:** empty taps there only held the streak. Taps inside the 1 s window still collect eggs per rc1 and are credited for nothing else.
- **R3 Never credited:**
  - Coop Hand / any worker collection;
  - the welcome-back modal's Collect;
  - taps while a menu (R12) is open (they can't reach Collect anyway);
  - taps on a guarded/frozen tab (single-tab guard);
  - taps while the tab is hidden;
  - synthetic events (`isTrusted === false`);
  - **a golden egg tap or a ready/full Broody Hen tap**: both handlers call `stopPropagation()` (m5-golden-egg-spec R25b, m5-broody-hen-spec R12), because RC1's `#scene` counts any click as Collect (`app.ts:210`). A tap on a **brooding** hen hits no button (`pointer-events:none`), falls through to the scene and is an ordinary Collect tap;
  - **any B2 coop-roof flutter tap** (cosmetic, out of M5.0 ACs). Neither pays a tap coin (QA ST-7). "Tap on the coop" means exactly the Collect button and the coop/nest element that dispatches `collect` in rc1.
- **R4 Multi-touch:** two fingers, or mouse plus touch, inside 1 s give one credited tap at most (R2).

### 3.2 Streak
- **R5 Build:** each credited tap sets s = min(`tc_streak_cap`, s + `tc_streak_per_tap`) [**0.27** (v5 with breeds=1 per D-HOP-2026-10-30-27 / D-HOP-2026-10-30-31; breeds off **0.28**; G3 scratch draft was 0.28 [G3-scratch: pending measure:l30plus re-measure]; CSV today 0.40 and the CEO first-pass 0.30 are superseded) / 0.01]. **27** credited taps (≥ 27 s) to reach the cap.
- **R6 Hold:** for `tc_streak_hold_s` (3) s **of focus-clock time** after the last credited tap, s doesn't change.
- **R7 Decay:** after the hold, s −= `tc_streak_decay_per_s` (0.03) × dt_focus until 0. dt_focus is the focus-clock delta, which is 0 while hidden or in a menu. From the cap (0.27): 3 s hold + 9.0 s decay = **12.0 s** (was ≈12.3 s at scratch 0.28). A credited tap during decay stops the decay, adds a step, and restarts the hold.
- **R8 Effect:** every egg sale, whether by player, worker or Basket stock, during s > 0 earns base × Grader × (1 + s) × (Frenzy 2 if active), as **one entry in `saleMultipliers()`** (`src/sim/payout.ts:8`, rounding per `saleValueCents`). s is read at the moment of each sale. Price only: laying, eggs per tap, coop cap and offline are unaffected.
- **R9 Not affected by s:** golden egg cash/eggs_cash, tap coins (R14), Broody Hen nest, offline earnings and the hidden-time settlement.
- **R10 Hidden < 60 s freezes the streak (D-HOP-08 #2, HoE §9.1; the v0.3 drain is superseded):** the focus clock doesn't advance while hidden, so s and the hold remaining are **exactly** unchanged on return. 5 s hidden at 0.27 → **0.27**, not 0.21; the v0.3 example "0.40 → 0.34" is void. No streak price applies to sales simulated by the rc1 hidden-time settlement.
- **R11 Hidden-tab or frame gap ≥ 60 s, or reload** (HoE §9.1/§9.1a; exactly 60.0 s is offline): s = 0, and `streak_peak{reason:"offline"}` fires on return if s was > 0. For a reload, `streak_peak{reason:"reload"}` is emitted on `pagehide` in the `session_end` flush (QA ST-8), because s isn't saved and can't be reported on the next load. If that flush fails, the event is lost (accepted).
- **R12 Menus freeze the streak (D-HOP-04 #4; replaces v0.3 K11).** While any modal, sheet, the tracks explainer, an onboarding step or a coach mark is open:
  - the hold timer and the decay are **frozen** (the focus clock is stopped), so s and the hold remaining are exactly as they were when it opened;
  - the meter shows its frozen state (no drain animation);
  - this is the same `dialogOpen()` signal that freezes the golden egg (m5-golden-egg-spec R6), so the two always freeze and resume together.

  **While frozen (menu or hidden), the streak uplift does not apply** (endorsed under **D-HOP-09 #5**): sales made then (workers keep selling) credit at (1 + 0) and resume at (1 + s) when the player can act again (D-HOP-08 #3, "no timed active effect runs while the player can't act"). Otherwise a menu left open at the cap would park a permanent +27% on worker sales. The docked column and toasts are not menus.
  - **Long frames (HoE §12 D-C3, m5-golden-egg-spec R5f):** in a visible frame shorter than 60 s, only the first ⌈focusDt / 0.1⌉ ticks (≤ 10, i.e. 1.0 s) apply (1 + s). The rest of that frame's ticks credit at (1 + 0), and hold/decay move by ≤ 1.0 s (R5e).
- **R13 Clock backward:** 0 elapsed.
- **R13a Flags (QA GE-6 pattern; HoE §12 D-C1):** `balance.m4.flags.streak` (streak and tiers) and `balance.m4.flags.tapCoins` (A1), both default **0**, each requiring `balance.m4.enabled`. They live in `m4.flags`, which `fitM4()` keeps on sync; `m4.tc.*` would be wiped. Either can be cut alone. Credited-tap detection runs when either is on.

### 3.3 Tiers (new)
- `tc_streak_tier_count` = 4 tiers at equal shares of the cap. Tier k threshold `T_k = round_to_step(cap × k/4)`: at cap **0.27** that's **0.07 / 0.14 / 0.20 / 0.27** (HoP task / Economy-verified; G3 scratch at 0.28 was 0.07/0.14/0.21/0.28), i.e. 7/14/20/27 credited taps.
- **Upward crossing** of T_k (s goes from < T_k to ≥ T_k):
  - a **tier pop-up** pill (style, pips and copy per `art-ux/m5-combo-tiers.md` v0.2 §2), never merged with another floater:
    - **position:** centred on Collect's x, with its bottom edge **8 px above the top of the coop fill meter** (`#meter.top − 8`), clamped 8 px inside the screen (`clamp(x − w/2, 8, vw − 8 − w)`). It never covers Collect, the goal strip, Buy or the coop fill meter. This supersedes Art's 16:41 "12 px above Collect" anchor, which landed inside the goal strip;
    - **motion ≤ 400 ms** (scale 0.6 → 1.1 → 1.0 over 0–120 ms plus an 8 px settle by 200 ms), then a **still hold**, then an opacity fade-out **finished by 900 ms**. Reduced motion: opacity only;
    - at most one pill is live; a new one replaces it;
  - a pitch step-up sound (it replaces v0.3's "every 10%" step), and the cap chime at tier 4 (v0.3 4.6);
  - the meter flashes the tier tick.
- **Hysteresis:** tier k can pop again only after s has fallen below T_(k−1) (T_0 = 0). This stops hold/decay jitter from spamming pop-ups.
- Tiers are feedback only. They pay **no** extra coins and don't change price beyond (1 + s).

| Tier | Threshold (cap 0.27) | Pop-up copy | Meter |
|---|---|---|---|
| 1 | +7% | `Warm streak! +7% price` | tick 1 lit |
| 2 | +14% | `Hot streak! +14% price` | tick 2 lit |
| 3 | +20% | `On fire! +20% price` | tick 3 lit |
| 4 (cap) | +27% | `MAX +27%!` | **gold fill + a one-time sparkle; no pulse** (no looping pulses; `art-ux/m5-combo-tiers.md` v0.2 §1/§10 C4; replaces v0.3 4.3's 1 Hz pulse) |

The % in the copy is floor(T_k × 100), so it follows the cap with no code change. Art approved the copy as final (`art-ux/m5-combo-tiers.md` v0.2 §1).
- **Sound mapping is unchanged:** 1:1 onto the 4 tiers (`sfx-streak-tier-01/-02/-03`, `sfx-streak-max-01`), with the same trigger as the pill (`art-ux/m5-combo-tiers.md` v0.2 §11).

### 3.4 Tap coins (new)
- **R14 Pay:** each credited tap pays `bonus_cents = floor((refCents × tapBp + 5000) / 10000)`. This is integer arithmetic (§4.1b, **HoE ST-11 ruling**), with `tapBp = Math.round(tc_tap_income_share × 10000)` and `tc_tap_income_share` = **0.03 [G3-scratch: pending measure:l30plus re-measure]** and I_ref = the reference income (§4.1, D-HOP-04 #2).
  - Paid immediately to coins, not to the Basket and not via a sale.
  - **Not** multiplied by streak or Frenzy, and tap coins never feed back into I_ref (§4.1).
- **R15** If bonus_cents < 1 (I_ref < $0.17/s, since round half-up pays 1¢ from 0.5¢), pay 0 and show no pop. The tap is still credited for the streak.
- **R16 Feedback: the tap-coin pop** (D-HOP-2026-10-24-13 #2; **confirmed by Art** against `art-ux/number-pop-spec.md` v1.0). Each paying credited tap shows one coin pop, with no separate coin-tick sound: the audible cue is the tier-pitched `egg.collect` on credited taps (`playbackRate = 2^(tier/12)`, at most +4 st, base pitch on uncounted taps; respects mute), per HoP ruling 7 and `art-ux/m5-sound-spec.md` v0.3.
  - **Format:** `fmtMoneyShort` for every amount (`+$812.40`, `+$1.2K`, `+$3.4M`). There's **no "!"** on per-tap pops. It's the same formatter as the golden egg and Broody Hen popups (m5-golden-egg-spec R25, m5-broody-hen-spec R14). The aria text stays the exact `fmtMoneyAria`, in the live region at most once per second.
  - **Type:** the pop font (Fredoka 700, tabular numerals) at **18 px**, never below 16 px; a 2 px `#3E2C23` stroke; Coin Gold `#E8B020` fill; a 16 px `icon-coin` on the left.
  - **Position:**
    - it spawns **8 px above the top of the coop fill meter** (bottom edge at `#meter.top − 8`), centred on Collect's x with a random x drift of ±8 px (cosmetic, not from `evRng`/`state.rng`), and rises 32 px. On a tier-up tap it sits 8 px above the tier pill (`art-ux/m5-combo-tiers.md` v0.2).
      - This **supersedes Art's 16:41 note** ("12 px above Collect"), which put the pop inside the goal strip;
    - it stays **8 px clear of the Buy buttons, the next-goal bar and the streak meter**;
    - it stays **8 px inside the screen**: left = `clamp(x − w/2, 8, vw − 8 − w)`, the same clamp as golden R25a.
  - **Motion:** the shared juice timing: scale 0.6 → 1.1 → 1.0 over 0–120 ms, hold to 500 ms, fade 500–800 ms. Reduced motion: opacity only (no scale, no rise, no drift).
  - **Stacking:** at most **1** live pop at 1 credited tap/s, and number-pop-spec's **4-per-source merge rule** applies.
    - It is a **separate source** from the egg-collect pop and **never merges** with it.
    - If both fire in the same frame, the coin pop is offset **20 px above** the egg pop. (This replaces v1.1's merge into the egg floater.)
  - **No per-tier glow or size bump:** the streak meter carries the tier. Combo emphasis is specified in `art-ux/m5-combo-tiers.md` v0.2 (the meter ladder and the tier pill only).
  - **Longest string:** `+$2.33` on the CSV range (F30), about `+$18.60` with an ×8 price stack. The format's maximum is 8 characters (`+$999.99` / `+$999.9K`).
  - **Zero payout (HoP X8 follow-up):** when a credited tap's `tapCoinsCents` is 0 (R15, a sales stall, or `refCents` < 17), there is **no money floater**: never `+$0.00`, and no aria announcement of $0.
    - Everything else still happens: the tap's collect feedback (egg pop if eggs moved, button press), the tier-pitched `egg.collect`, the streak increment, the meter fill/tick update and, on a crossing, the tier pill and sting.
- **R17 Coop Hand asleep/unpaid:** taps still pay. I_ref falls only as far as actual sales over the last 60 s fall. The bonus is never 0 just because a worker is asleep. The 0.15 asleep collect share is **out of M5.0**; it's a backlog item for PM Workers (D-HOP-08), and rc1's asleep = 0 collection is the M5.0 behaviour.

### 3.5 UI (Art & UX `art-ux/m4-collect-streak.md`, deltas only)
- **Layout (`art-ux/m5-combo-tiers.md` v0.2):** Collect goes from **64 px to 48 px tall** (still ≥ 44 px) and stays full width. The freed **24 px row directly under it** holds the streak meter: 360 → y 552–576; 1280 → y 772–796.
  - The scene is unchanged, so the golden egg spot rules and counts and the Broody Hen slot table stand.
  - The row is always reserved (hidden at s = 0), so there's no layout shift.
- Meter: the `art-ux/m5-combo-tiers.md` v0.2 §0 anatomy (12 px bar with an 8 px track; label inline to the right in an 80 px column), with 0–cap mapped to the bar and **4 tier ticks** at 25/50/75/100%. Cap label `MAX +27%`. No looping animation in any state.
- Price chips: v0.3 4.5 unchanged (`2×` gold first, then meadow `+N%`, collapsing to `2×+` at 360 on overflow).
- Meter box + 16 px stays a golden-egg exclusion zone even while hidden (m5-golden-egg-spec R14).
- Docked: the meter row sits under the scene's Collect button. Pop-ups anchor above the coop fill meter. Neither is ever in the docked column.

## 4. Formulas
### 4.1 Reference income I_ref (D-HOP-04 #2, confirmed by D-HOP-08 #1; shared with m5-broody-hen-spec)
- **Definition:** the trailing `tc_tap_bonus_income_window_s` (60) s of **sim time** of sale income (worker and player sales alike):
  `I_ref ($/s) = Σ base_cents(sale) over the window / 60 / 100` (payouts use its integer form `refCents`, §4.1b; gross, **not** net of wages)
  - **base_cents(sale)** is the sale credit at the **base price chain** (D-HOP-08 #1: worker and player sales alike, excluding every active uplift): base egg price including Egg-value grades, track and milestone factors (`salePriceCents`), × the Grader multiplier. It covers every egg sale in the window (Market Hand/Hawker, Basket stock and player Sell).
  - **Excluded** (so there's no self-feeding loop): the streak (1 + s), the Frenzy ×2, ability multipliers (Rush/Shout/Inspect), golden egg cash/eggs_cash, Broody Hen payouts, tap coins, and offline grants.
- **Storage:** a 60-bucket ring of 1 s sim-time buckets in sim state (HoE `sim/income-ref.ts`), plus a warm-up counter `refWarmS` (sim seconds accrued since the last warm-up start). Neither is saved. After a load, I_ref is the steady-state rate (§4.1a), not an empty ring, so a reload can't zero or inflate it.
- **Hidden tab (revised; QA ST-2, X2):** the window is on the **sim clock** with "no special case" (D-HOP-04 #2).
  - The rc1 hidden < 60 s online sim keeps running, so its base-price sales **enter** the ring and advance it (HoE §9.1 recommendation). They carry no M5 uplift, because the streak and Frenzy are frozen.
  - A hidden-tab or frame gap ≥ 60 s is paid by `grantOffline`, which is not a sale, so it doesn't enter the ring. It is an **offline return**: the ring is cleared and a warm-up starts (§4.1a, D-HOP-07 X2).
  - Under menus the sim keeps ticking, so the ring keeps advancing with worker sales.
  - **Hidden-tab sales count. This is closed:** D-HOP-07 X2, D-HOP-09 #2(c) and D-HOP-2026-10-24-10 #1. No open question remains (v1.1 had excluded them).
- **Live mood:** the Coop Hand's mood affects the trailing window only through the sales that actually happen. It affects I_ss (§4.1a) through RC1's mood-aware collect, demand and Grader terms. No other mood factor is applied.

### 4.1a Steady-state fallback and handover (D-HOP-07 X2; D-HOP-2026-10-24-10 #1; QA ST-2b / BH-j)
- **Ruling.** "After an offline return, and until 60 s of sim time accrue, reference income = steady-state passive rate" (D-HOP-07 X2, verbatim).
  - HoQA asked HoP to confirm it over v1.1's empty-ring ramp, and **D-HOP-2026-10-24-10 #1 confirmed X2**: "no empty ramp". X2 is the current ruling. v1.1's "starts empty and ramps" is withdrawn everywhere.
- **Steady-state value I_ss ($/s)** is RC1's own steady-state income model, taken **gross of wages**:
  `I_ss = max(0, incomePerSec(state, balance) + wagesPerSec(state, balance))` (both from `src/econ/income.ts`, default options, so `assumeWorking` = false). This uses existing code, with no new `passiveIncomePerSec` (**HoE §12 D-C6**, D-HOP-13 #1).
  - **Sales stall (D-C6):** HoE's live-income fix (`m5.0-sizing.md` §14/§4.2) makes I_ss = **0 while a hired Market Hand is Asleep or Unpaid**, because eggs aren't selling. This is **intended: HoP confirmed X8** (HoP 16:46; QA X8). The zeroing comes from `product/market/sales-stopped-spec.md` §4.2: per SS-15, live `incomePerSec` = −wages, so I_ss = 0. So tap coins pay 0 in a warm-up during that stall.
  - This is accepted and consistent with the ring: after warm-up, the trailing window falls the same way as sales stop.
  - That is `min(prodEggsPerSec, demandPerSec, collectPerSec) × priceDollars`. In plain terms, it is computed from:
    - the current hens and production (Hens track, `prodEggsPerSec`);
    - the current customer rate and demand, including the Hawker's demand multiplier (`demandPerSec`);
    - the current collection rate: RC1's model of 1 tap/s plus the Coop Hand by live mood (`collectPerSec`). **The 1 tap/s term is kept (D-HOP-2026-10-24-13 #1):** the 60 s ring counts sales of eggs the player collected (D-HOP-08 #1), so the proxy must include them too, or I_ref would step at 60 s;
    - the **base price chain**: `salePriceCents` (Egg-value grades, track and milestone factors) × the Grader multiplier at live mood.
  - Live worker moods are used. Wages are **not** subtracted.
  - **No uplift is ever in I_ss:** no streak (1 + s), no Frenzy ×2, no ability multiplier, no golden, Broody or tap-coin income, no offline grant. RC1's `incomePerSec` has none of these, and the M5 timed effects must not be added to it.
  - It is re-evaluated **every sim tick** from live state. So a hire, upgrade or mood change during warm-up moves I_ss at once.
- **When I_ss is used** (a warm-up). A warm-up starts with `refWarmS` = 0 and the ring cleared on:
  1. a fresh start (new save) and a CSR save reset;
  2. every page load, including reloads, a new tab and a single-tab takeover (the ring isn't saved);
  3. every **offline return**: a hidden-tab or frame gap ≥ 60 s (HoE §9.1a, exactly 60.0 counts).
  
  A warm-up does **not** start on a hidden tab < 60 s or under a menu. The sim keeps ticking there, so `refWarmS` and the ring keep advancing (hidden-sim sales count).
- **Handover (a hard switch, as X2 says).** Each sim tick:
  - `I_ref = I_ss` while `refWarmS < 60`;
  - `I_ref = Σ base_cents(ring) / 60 / 100` (§4.1) once `refWarmS ≥ 60`.
  - In both cases, payouts use the integer `refCents` (§4.1b).
  
  The ring fills with real sales during the warm-up, so at the switch it holds a full 60 s window. There is no blend: the value can step once at the switch, by |trailing − I_ss|.
  - This is HoP's literal rule, and it's simple to test.
  - If playtests show a visible jump in the tap-coin pop or the nest fill, the fallback option for HoP is a fill-in blend: `I_ref = (Σ accrued buckets / 100 + (60 − refWarmS) × I_ss) / 60`. It is not adopted.
### 4.1b Rounding: exact integer arithmetic (**HoE ST-11 ruling**, confirmed as written; **HoE money-math ruling**; QA ST-11)
The old float form (0.03 × I_ref × 100 in IEEE doubles, then rounded half up) gives **232¢** at F30 (0.03 × 7750 = 232.4999…). All tap-coin money is therefore integer:
- **Rate → basis points, once at balance load/sync:** `tapBp = Math.round(tc_tap_income_share × 10000)`, so 0.03 → **300**. The Broody Hen uses the same form (m5-broody-hen-spec R7).
  - `validateBalance` proposal: `|rate × 10000 − bp| < 1e-6`, so a CSV rate has ≤ 4 decimals.
- **`refCents`** (integer ¢/s, the per-second reference income in cents) is computed **once per sim tick**, rounded half up exactly once:
  - **warm-up** (`refWarmS < 60`): `refCents = Math.round(I_ss × 100)`. I_ss is RC1's float $/s (§4.1a), and this is its only rounding (half up; I_ss ≥ 0).
    - **Float edge (HoQA v0.6; HoE confirmed 17:18):** `refCents` is `Math.round(I_ss × 100)` on the game's float I_ss, exactly as the code computes it. For example, I_ss = 1.005 gives 1.005 × 100 = 100.49999999999999, so `refCents` = **100**, and that is the expected value. I_ss is itself a float sum of rates, so there is no exact decimal to compare against. **Tests build their reference from the same float expression** (ST-AC2b), never from a decimal literal;
  - **trailing window** (`refWarmS ≥ 60`): `refCents = floor((Σbase_cents_ring + 30) / 60)`. That is the integer ring sum (sales credit whole cents) over the 60 s window, rounded half up in integer arithmetic. The `+30` is half the 60 s divisor.
  - I_ref in $/s is `refCents / 100`, for display and telemetry only.
- **Tap coins:** `tapCoinsCents = floor((refCents × tapBp + 5000) / 10000)`, which is half up. Every operand is an integer < 2^53 for any reachable `refCents`.
- **Rechecked examples (unchanged):**

| Case | refCents | Old float result | Exact result |
|---|---|---|---|
| F8 (and the F8 reload) | 1260 | 38¢ | **38¢** (378,000 + 5,000 → 38) |
| F10 reload | 1650 | 50¢ | **50¢** (495,000 + 5,000 = 500,000 → 50) |
| F30 | 7750 (Σ = 465,000) | **232¢** | **233¢ = $2.33** (2,325,000 + 5,000 → 233); the spec's $2.33 stands |

  - R15's threshold is unchanged: the first paying `refCents` is 17 (17 × 300 + 5,000 = 10,100).
- **BigInt guard (HoE money-math ruling).** `refCents × bp` must stay exact.
  - While `refCents × bp + 5000 ≤ Number.MAX_SAFE_INTEGER` (2^53 − 1), the multiply-and-floor runs in `number`.
  - Above that, it runs in **BigInt**: `Number((BigInt(refCents) × BigInt(bp) + 5000n) / 10000n)`. The result converts back to the game's money type.
  - **RC1 has no big-number type.** Coins are `coinsCents: number` (`game/src/sim/state.ts:7`), so "the game's big-number type" is a plain `number` holding integer cents. The result is exact up to 2^53 − 1 ¢, which is above the 1e15 ¢ save clamp.
  - The boundary is `refCents > floor((2^53 − 1 − 5000) / bp)`: **30,023,997,515,786** at 300 bp (≈ $3.0e11/s); 900,719,925,473 at 10,000 bp (≈ $9.0e9/s).
    - **HoE money-math ruling 2:** at 10,000 bp the BigInt switch is at **9.0e11 ¢/s ($9.0e9/s)**.
  - The same guard applies to the Broody Hen (R7) and the golden egg (§4) integer forms.


### 4.1c Other formulas
- **I_ref ≥ 0 always.** I_ss can be 0, e.g. when production or demand is 0; then I_ref = 0.
- **Wages** aren't subtracted (gross passive sales income). I_ref ≥ 0 always.
- **Other formulas:**
  1. `s(t+dt)` = `s` if dt ≤ hold remaining; else max(0, s − 0.03 × (dt − hold_remaining)), where **dt is focus-clock time** (0 while hidden or in a menu; ≤ 1.0 s per frame).
  2. Sale: `round(k × base_cents × grader × (1 + s) × frenzy)`.
  3. Tap coins per credited tap: `floor((refCents × 300 + 5000) / 10000)` cents (§4.1b). At 1 credited tap/s that's +3% of I_ref per second [G3-scratch: pending measure:l30plus re-measure].
  4. Peak sale multiplier: (1 + 0.27) × 2 = **2.54×** before the Grader (v0.3: 2.8×; G3 scratch at 0.28 was 2.56×).
5. **Boundary plug-ins** (CSV rows, Grader ×1, sales = min(E, demand) × P when fully automated):
   - F8: E = 9, P = $1.40 → I_ref ≤ $12.60/s → bonus ≤ 38¢ per tap.
   - F30: E = 31, P = $2.50 → I_ref ≤ $77.50/s → bonus ≤ $2.33 per tap.
   - First 10 s after a reload at F8, fully automated: I_ref = I_ss = $12.60/s (§4.1a) → refCents 1260 → 38¢ per tap. That's the same as steady play, with no ramp.
   - F10 reload, I_ss = $16.50/s: the first credited tap pays floor((1650 × 300 + 5000) / 10000) = 50¢.
   - After warm-up with no sales in the last 60 s, or I_ss = 0 during warm-up: I_ref = 0 → bonus 0, no pop (R15).
   - At I_ref ≈ $3.4M/s (far beyond the CSV) the bonus is about $102K, and the floater shows `+$102K` (short money, R16). At I_ref ≥ $33.4M/s the bonus is ≥ $1M, and it shows `+$1M`.

## 5. Tunables
| Name | Value | Source | Tag |
|---|---|---|---|
| `tc_streak_unlock_farm` | 8 | **G3 draft column** (v0.3 `streak_unlock_farm` was never added; `tc_egg_unlock_farm` must not be reused) | [HoP] |
| `tc_streak_per_tap` | 0.01 | CSV | [HoP v0.3] |
| `tc_streak_max_taps_per_s` | 1 | CSV | [HoP] |
| `tc_tap_credit_min_s` | 1.0 | **G3 draft column** (D-HOP-16 #5): the credited-tap window (R2). It wasn't in v1.1, which derived the window from `tc_streak_max_taps_per_s` | [HoP D-HOP-04 #1] |
| `tc_streak_hold_s` | 3 | CSV | [HoP v0.3] |
| `tc_streak_decay_per_s` | 0.03 | CSV | [HoP v0.3] |
| `tc_streak_cap` | **0.27** (v5 breeds=1; breeds off 0.28; CSV today 0.40) | D-HOP-2026-10-30-27 / D-HOP-2026-10-30-31 (G3 scratch draft was 0.40 → 0.28) | tuning (v1.3.3) |
| `tc_streak_tier_count` | 4 | **G3 draft column** (HoE "A2 tier step") (named to avoid the unrelated `combo_window_s`/`combo_boost_s` columns) | [P] |
| `tc_tap_income_share` | 0.03 | **G3 draft column** | **[G3-scratch: pending measure:l30plus re-measure]** |
| `tc_tap_bonus_income_window_s` | 60 | **G3 draft column** (D-HOP-16; HoE's name, replacing v1.1's proposed `tc_ref_income_window_s`; shared with the Broody Hen) | [HoP D-HOP-04 #2] |
| tier thresholds | 0.07/0.14/0.20/0.27 | derived (cap × k/4); HoP task / Economy-verified at 0.27 | tuning (v1.3.3) |
| meter/tick/chip px | Art & UX | `art-ux/m4-collect-streak.md` | [UI] |

**Draft economy.csv change** (as in Economy's G3 draft `scratch/v2-econ/economy.m50-draft.csv`, approved in principle by D-HOP-16 #5; constant on every row; no edit made):
```
tc_streak_unlock_farm,tc_streak_tier_count,tc_tap_income_share,tc_tap_credit_min_s,tc_tap_bonus_income_window_s   (new)
8,4,0.03,1.0,60
tc_streak_cap: 0.4 -> 0.27                                                                                       (value change; v5 breeds=1 per D-HOP-27; G3 scratch was 0.28)
```
`validateBalance`: 0 < tc_streak_cap ≤ 1; tc_streak_tier_count ≥ 1; tc_tap_bonus_income_window_s ≥ 1; tc_tap_credit_min_s > 0.

v0.3 names `streak_step`, `streak_credit_interval_s`, `streak_grace_s` are **retired**; the CSV `tc_streak_*` names are canonical. `tap_batch_ms` (telemetry) is unchanged.

## 6. Edge cases
| # | Case | Expected |
|---|---|---|
| K1 | 10–20 taps/s or autoclicker | Eggs per rc1 for every tap; ≤ 1 credited tap/s, so s +0.01/s max and coins ≤ 1 bonus/s. No extra reward for speed |
| K2 | Coop empty (Coop Hand emptied it) | Taps are still credited: s builds, coins pay (R2) |
| K3 | Coop full | Normal |
| K4 | At cap, still tapping | s = 0.27; coins keep paying; `time_at_cap_s` grows; no repeat tier-4 pop (hysteresis) |
| K5 | Stop at cap | Hold 3 s, 0 at **12.0 s**; `streak_peak{reason:"decay"}` |
| K6 | Frenzy at s = 0.14 | Sales × 2 × 1.14; tap coins unchanged |
| K7 | Worker sale with s > 0 | Gets (1 + s) |
| K8 | Hidden 5 s at 0.27 | Returns 0.27, hold unchanged (R10, D-HOP-08 #2); no coins accrue while hidden |
| K9 | Hidden ≥ 60 s / reload | s = 0, `streak_peak` offline/reload; nothing saved |
| K10 | Settings/sheet/explainer/onboarding/coach open 10 s at 0.27 | Frozen: s = 0.27 on close, hold remaining unchanged; worker sales during the menu at 1× streak (R12) |
| K11 | Welcome-back Collect | Not credited (R3) |
| K12 | Coop Hand asleep/unpaid (rc1 asleep collects 0; the 0.15 share is backlog, out of M5.0) | Taps are credited; I_ref reflects actual sales (lower if fewer sell) |
| K13 | I_ref = 0 (after warm-up with no sales in 60 s, or I_ss = 0 during warm-up) | Bonus 0, no pop; streak still builds. A plain reload does **not** give I_ref = 0 (§4.1a) |
| K13c | Market Hand hired and Asleep or Unpaid (sales stall; D-C6) | During a warm-up, I_ss = 0, so credited taps pay 0 with no money floater (R16); the streak, the collect sound and the meter still update. After warm-up, the ring falls with the stalled sales. **Intended: HoP confirmed X8** (HoP 16:46; QA X8). The zeroing comes from `product/market/sales-stopped-spec.md` §4.2: per SS-15, live `incomePerSec` = −wages, so I_ss = 0 |
| K13b | Reload / offline return at F10 fully automated | I_ref = I_ss = $16.50/s from the first tick; the switch to the trailing window happens at 60 s of sim time (§4.1a) |
| K14 | Bonus < $1,000 / ≥ $1,000 / ≥ $1M | `+$0.38` / `+$1.2K` / `+$1.2M` (`fmtMoneyShort`, R16, D-HOP-13 #2, Art-confirmed), clamped 8 px inside the screen; aria via `fmtMoneyAria` in the live region only once per second (no per-tap announcements) |
| K15 | Keyboard Enter held | `event.repeat` ignored; ≤ 1 credited/s anyway |
| K16 | Clock backward | 0 elapsed |
| K17 | Two tabs | Only the live tab counts (R3) |
| K19 | Frame drop / tab throttled (visible) | Credits use sim time (R2), so a 2 s frame stall followed by catch-up ticks credits at most what 1/s allows |
| K18 | Cap lowered by config below current s (live reload of balance) | s clamps to the new cap on the next tick; no tier pop on the clamp |

## 7. Dependencies
**Upstream:**
- RC1 `5d9efa61…`: Collect handler (`app.ts` collect → `g.dispatch`), `saleMultipliers()`, visibility hook / hidden-time settlement, single-tab guard, the floater merge (`app.ts:139-144`), `fmtMoneyExact`/`fmtMoneyShort`/`fmtMoneyAria`.
- `M4Params.tc` reader (shared with the golden egg).
- Economy: P1 / model gate at cap **0.27**, tap 0.03 (v5 breeds=1); the 2 NEW-ROW columns; CSV value change of `tc_streak_cap` 0.40 → 0.27 once applied (G3 scratch draft used 0.28).
- Art & UX: tier ticks, pop-up copy and style, tier-pitched collect sound (`art-ux/m5-sound-spec.md` v0.3, ruling 7; no coin-tick file).
- (Removed in v1.1: the 0.15 asleep share is not an M5.0 dependency; backlog, PM Workers, D-HOP-08.)
- HoE foundations: F1 (timed-effects registry feeding `saleMultipliers`, sim clock), F4 (`tap.credited`, `bonus_cents`, `session_end.credited_taps`, `tap_bonus_cents`), F6 (`dialogOpen()` covering the D-HOP-04 #4 menus), and the new `sim/income-ref.ts` (shared with the Broody Hen).

**Downstream:**
- m5-golden-egg-spec (Frenzy × streak chips, meter exclusion zone).
- m5-broody-hen-spec (shares I_ref §4.1/§4.1a and the short-money formatter with the 8 px clamp, D-HOP-13 #2).
- telemetry dashboards (§8, effective-tap swap).
- M5.1 Hot Hands (reads s; out of scope).

## 8. Telemetry (telemetry-spec v0.6.2)
Envelope `type, ts, sid, fgMs`. No new event names (T-AC12).

| Event | Change | Fields |
|---|---|---|
| `tap` (batched per `tap_batch_ms`) | extend | existing `count`, `eggs`; `empty`, `full_at_start` **[T-full]** (not in HoE's §10.1 subset); **new** `credited` (credited taps in the window), `empty_credited` (credited taps that moved 0 eggs **while a Coop Hand is hired**), `bonus_cents` (Σ tap coins in the window) |
| `streak_started` | keep (v0.3) | `farm_level`, `collection_level` |
| `streak_peak` | keep, plus 1 field | v0.3 fields (`value`, `duration_s`, `credited_taps`, `time_at_cap_s`, `extra_coins`, `frenzy_overlap_s`, `reason`) plus **`max_tier`** (0–4) |
| `session_end` | extend | `credited_taps` (the §10.1 field, renamed per **D-HOP-09 #3**), `tap_bonus_cents`, `streak_extra_cents` **[T-sub]**; plus the ST-AC20 fields in §8.1 **[T-sub]** (D-HOP-10 #4) |

**Accepted telemetry swap (HoP 2026-10-24):** `effective_tap_share` (telemetry §1 M1, §6, alert < 0.85) is redefined **per session**:
- If the session's `farm_level` < 8 **or** `coop_hand` = false: as v0.6.2, `taps_moved_eggs / taps_total`.
- If `session_end.farm_level` ≥ 8 **and** `session_end.coop_hand` = true: `taps_effective / taps_total`, where `taps_effective = taps_moved_eggs + empty_credited`. `taps_effective` is **computed on the dashboard, not emitted**. It's a different concept from `credited_taps`: taps that moved eggs **or** were credited. A tap is effective if it moved eggs **or** was a credited (coin-paying) tap, so a Coop Hand emptying the coop no longer looks like wasted taps. The alert threshold stays < 0.85. Segments (≥45 / 15–45 / <15 taps/active-min) are unchanged.
- The dashboard shows a `swap` flag per session so the two definitions are never averaged together.

### 8.1 Minimal telemetry for ST-AC20 (D-HOP-09 #6, for HoE sizing)
All fields are on **one existing subset event**: no new events and no `tap`-event changes. Counters are kept Game-side per page-load session, alongside the subset's `credited_taps` counter.

| Event | Field | Type | Units | Emitted when | In HoE §10.1 subset? |
|---|---|---|---|---|---|
| `session_end` | `sid` (envelope) | string, 6 chars | — | on every event; here at `session_end` | **Yes** |
| `session_end` | `fgMs` (envelope, as on every event) | integer | ms of foreground time | once per page-load session, on `pagehide`/final flush (`game.ts:297`) | **Yes** |
| `session_end` | `credited_taps` | integer | taps (credited per R2) | same | **Yes** (listed as `taps_counted`; renamed, D-HOP-09 #3) |
| `session_end` | `taps_total` | integer | taps (every player coop tap per R2, credited or not; excludes Broody/flutter/worker/welcome-back) | same | **No: new → added to the subset by D-HOP-10 #4** |
| `session_end` | `taps_moved_eggs` | integer | taps that moved ≥ 1 egg | same | **No: new → added to the subset by D-HOP-10 #4** |
| `session_end` | `empty_credited` | integer | credited taps that moved 0 eggs **while a Coop Hand is hired** (0 before the first hire); needs the `credited` flag on the `collect` SimEvent (HoE §12) | same | **No: new → added to the subset by D-HOP-10 #4** |
| `session_end` | `coop_hand` | boolean | — (true if `workers.coop_hand` existed at any tick of the session) | same | **No: new → added to the subset by D-HOP-10 #4** |
| `session_end` | `farm_level` | integer | Farm level at emit time | same | **No: new → added to the subset by D-HOP-10 #4** |

**`empty_credited` counts only while a Coop Hand is hired (fallback `taps_swap_eligible`)** (HoE TEL-13, QA ST-12). A session that spans the first hire counts only the taps after it (ST-AC20).

That's 5 new numeric/boolean fields on one event (≈ 60 B per session). **HoE §12 confirmed** that this fits the TEL-4 line already counted (+0 further dd). Derived on the dashboard, not emitted: `taps_effective` = `taps_moved_eggs` + `empty_credited`; taps per active minute = `taps_total` / (`fgMs` / 60000).

KPIs:
- streak ≥ T2 (0.14) reached in ≥ 30% of F8+ active sessions;
- tap-coin share of coins in Economy's P1 band ± 3 pp;
- p99 taps/active-min ≤ 600 (unchanged).

Budget: three numeric fields on `tap` add about 25 B per event (≤ 600 events per 10 min, about 15 KB), inside the T-AC ring budget.

## 9. Acceptance criteria
Values are read from config; ±1 tick (100 ms).
- **ST-AC1** Given F = 7, when Collect is tapped at any rate for 60 s, then s = 0, no meter shows, Collect taps add no coins (coins change only from sales and, if unlocked, Broody payouts), and `tap.credited` = 0.
- **ST-AC2** Given F ≥ 8, s = 0, when one Collect tap lands, then s = 0.01, `streak_started` fires, the meter shows `+1% price`, and coins increase by exactly `floor((refCents × 300 + 5000) / 10000)` cents (§4.1b).
- **ST-AC2b (exact arithmetic; HoE ST-11 ruling; QA ST-11)** Given `tapBp` = 300:
  - given `refCents` 1260 / 1650 / 7750, then a credited tap pays exactly **38 / 50 / 233**¢ (F30 = $2.33, not 232¢);
  - given a ring sum of 465,029¢ / 465,030¢, then `refCents` = 7750 / 7751;
  - given `refCents` 16 / 17, then the pay is 0¢ (no pop) / 1¢;
  - the unit test uses integer inputs only; no float product is ever rounded;
  - **warm-up float edge (§4.1b; HoE confirmed 17:18):** given I_ss = 1.005 (float), then `refCents` = `Math.round(1.005 * 100)` = **100**, and the reference is built from the same float expression.
- **ST-AC2c (BigInt guard; HoE money-math ruling)** Given `tapBp` = 300, a unit test on the pure `tapCoinsCents(refCents, bp)`:
  - given `refCents` = 1,000,000,000,000 (1e12) and 1,000,000,000,007, then the results equal the BigInt reference `(BigInt(refCents) × 300n + 5000n) / 10000n`: **30,000,000,000** and **30,000,000,000**¢;
  - given `refCents` = 30,023,997,515,786 (the last safe value) and 30,023,997,515,787 / 30,023,997,515,788 (just above it), then the results equal the BigInt reference, **900,719,925,474**¢ for the first above-boundary value;
  - **paths disagree (HoQA v0.6):** given `refCents` = 6,425,135,468,379,916, the result is **192,754,064,051,397¢**, the BigInt reference (checked in Node with BigInt; the `Number` value is also from Node). The `Number` path would give …398;
  - a spy shows the BigInt path is taken exactly when `refCents × bp + 5000 > Number.MAX_SAFE_INTEGER`;
  - the same holds at bp = 10,000 around `refCents` = 900,719,925,473 / 900,719,925,474.
- **ST-AC3** Given 10 taps/s for 10 s at F ≥ 8, then `credited` = 10 (±1), s = 0.10 (±0.01), tap coins = 10 (±1) × bonus, and every tap still moved eggs per rc1.
- **ST-AC4** Given an empty coop (Coop Hand working), when tapping at 1/s for **27** s, then s = **0.27** at the 27th credited tap, every credited tap paid the bonus, and `empty_credited` = 27.
- **ST-AC5** Given s = 0.27 and no taps, then s stays 0.27 for 3.0 s, then falls 0.03/s and reaches 0 at **12.0 s** (±0.1). `streak_peak{value:0.27, reason:"decay", max_tier:4}` fires once.
- **ST-AC6** Given s is decaying, when a credited tap lands, then decay stops and s rises by 0.01 on that tap.
- **ST-AC7** Given s = x and Grader g, when any egg is sold by player, worker or Basket stock, then it credits round(k × base × g × (1+x)), and with Frenzy round(k × base × g × (1+x) × 2) (at x = 0.27: **2.54** × g × base per egg).
- **ST-AC8** Given s > 0 or a Frenzy, then golden egg cash, tap coins and the Broody Hen nest are unchanged versus s = 0 and no Frenzy.
- **ST-AC9** Given s rising from 0 to 0.27, then exactly 4 tier pop-ups show, at s = 0.07, 0.14, **0.20**, 0.27, with the §3.3 copy, plus 4 pitch steps and one cap chime (muted: none).
- **ST-AC10** Given s oscillates between **0.19 and 0.20** (decay plus taps), then the tier-3 pop-up shows once. It shows again only after s < 0.14 and a re-cross of **0.20**.
- **ST-AC10b (tier pop-up; `art-ux/m5-combo-tiers.md` v0.2)** Given an eligible upward crossing of T_k, then:
  - the pill's bottom edge is 8 ± 1 px above the coop fill meter's top, ≥ 8 px inside both screen edges, and never intersects Collect, the goal strip, Buy or the coop fill meter;
  - all motion ends by 400 ms; the pill is still until the fade, which finishes at 900 ms (± 1 frame);
  - with reduced motion, only opacity animates;
  - the matching sting (1:1 tier mapping) plays on the same frame.
- **ST-AC11** Given `tc_streak_cap` = 0.40 in config, then thresholds are 0.10/0.20/0.30/0.40, the copy reads `+10%`…`MAX +40%`, and the meter maps 0–0.40, with no code change.
- **ST-AC12a (explicit, HoE §9.1 / D-HOP-08 #2)** Given s = 0.27 and the tab hidden for exactly 5 s, then on return s = **0.27** exactly (not 0.21).
- **ST-AC12** Given s = 0.27 with 2 s of hold left and the tab hidden 5 s, then on return s = 0.27, the hold left is 2 s (±1 tick), and no tap coins were paid (D-HOP-08 #2). Given a hidden-tab or frame gap ≥ 60 s, or a reload, then s = 0, `streak_peak` fires with reason offline (on return) or reload (on `pagehide`), and offline earnings equal rc1 exactly (no streak or tap coins).
- **ST-AC13** Given s = 0.27 with 1.5 s of hold left, when any D-HOP-04 #4 menu (modal, sheet, explainer, onboarding, coach; one run per type) is open for 10 s, then on close s = 0.27 and the hold left is 1.5 s (±1 tick). Decay starts 1.5 s after close. Every worker sale during the menu credited round(k × base × grader) with no (1 + s) (and no Frenzy, GE-AC10b). A golden egg on screen at the same time is frozen for the same interval (GE-AC19).
- **ST-AC14** Given a Coop Hand collection, the welcome-back Collect, a synthetic click, or a tap on a guarded tab, then no credited tap, no s change, and no coins. Given a tap on a visible golden egg or a ready Broody Hen, then it does not Collect, doesn't change s, pays no tap coins, and isn't counted in `credited_taps` or `taps_total` (GE-AC35, BH-AC27).
- **ST-AC15** Given the Coop Hand asleep or unpaid at F ≥ 8, when the player taps at 1/s, then each credited tap pays `floor((refCents × 300 + 5000) / 10000)` (§4.1b), and the bonus is > 0 whenever I_ref ≥ $0.17/s.
- **ST-AC16** Given I_ref = 0 (after warm-up with no sales in the last 60 s of sim time), then a credited tap pays 0, shows no coin pop, and still builds s.
- **ST-AC16b (I_ref composition)** Given a completed warm-up and a 60 s sim window with $600.00 of base-value sales, plus a Frenzy, s = 0.27, a $500 golden cash grant, a Broody payout, tap coins and an ability active, then I_ref = $10.00/s exactly. After the tab is hidden for 40 s (rc1 online sim), I_ref includes the base-price sales simulated during the hide, with no uplift, and no warm-up starts. *(v1.1's "after a reload I_ref = 0" and "after a ≥ 60 s gap I_ref equals its value at the hide" are withdrawn; see ST-AC16d.)*
- **ST-AC16d (steady-state warm-up; ST-2b; D-HOP-10 #1)** Given an F10 save with every worker working, where `incomePerSec + wagesPerSec` = $16.50/s:
  - **(a) Reload:** at sim t = 0.1 s, I_ref = $16.50/s (not 0), and a credited tap pays 50¢. For every tick with t < 60.0 s, `refCents` equals `Math.round(100 × max(0, incomePerSec + wagesPerSec))` exactly (§4.1b).
  - **(b) Live I_ss:** given the Coop Hand put to sleep at t = 20 s, then I_ref drops on that tick to the new I_ss.
  - **(c) Handover:** at t = 60.0 s (± 1 tick), `refCents = floor((Σ ring + 30) / 60)` exactly (§4.1b), and it never reads I_ss again until the next warm-up.
  - **(d) Uplifts:** given a Frenzy, s = 0.27 and an ability active during the warm-up, then I_ref is unchanged by them.
  - **(e) Offline return:** given the tab hidden for 60.0 s or 10 min, then on return I_ref = I_ss and a new 60 s warm-up runs.
  - **(f) Short hide:** given a hide of 40 s at t = 30 s of a warm-up, then on return `refWarmS` = 70 s (± 1 tick), so the trailing window is already in use.
  - **(g) Fresh start:** given a fresh start or a CSR reset, the same as (a) with that state's I_ss.
- **ST-AC16e (sales stall; D-C6)** Given a reload with a hired Market Hand Asleep (or Unpaid), then during the warm-up I_ref = I_ss = 0, and a credited tap pays 0 with no coin pop while s still builds. When the Market Hand works again, I_ss > 0 on that tick and taps pay `floor((Math.round(I_ss × 100) × 300 + 5000) / 10000)` (§4.1b). The stall is **intended: HoP confirmed X8** (HoP 16:46; QA X8). The zeroing comes from `product/market/sales-stopped-spec.md` §4.2: per SS-15, live `incomePerSec` = −wages, so I_ss = 0.
- **ST-AC16c (sim-time gate)** Given taps at wall intervals of 0.95 s while sim time advances 1.0 s per tap, then every tap is credited. Given a 3 s visible frame stall followed by catch-up ticks, then taps buffered in the stall are credited at most once per 1.0 s of sim time.
- **ST-AC17 (tap-coin pop; R16; D-HOP-13 #2; number-pop-spec v1.0)**
  - **Format:** given bonuses of 38 / 81,240 / 123,456 / 340,000,000 cents, the pop reads `+$0.38` / `+$812.40` / `+$1.2K` / `+$3.4M`, with no "!". The aria text is the exact `fmtMoneyAria`.
  - **Type:** the computed font size is 18 px (≥ 16 at every matrix viewport), with a 2 px `#3E2C23` stroke, `#E8B020` fill and a 16 px `icon-coin` on the left.
  - **Position:** the pop's bottom edge spawns 8 ± 1 px above the coop fill meter's top, with x within ±8 px of Collect's centre (before the clamp); it rises 32 px. On a tier-up tap it sits 8 px above the tier pill.
  - **Clearance:** at all 8 matrix viewports the pop rect never intersects Collect or the goal strip. It stays ≥ 8 px from the Buy buttons, the next-goal bar and the streak meter, and ≥ 8 px inside both screen edges. It never overlaps the tier pill.
  - **Motion:** scale 0.6 → 1.1 → 1.0 over 0–120 ms, hold to 500 ms, fade over 500–800 ms (± 1 frame). With reduced motion, only opacity animates.
  - **Stacking:** at 1 credited tap/s, there is ≤ 1 live coin pop. The 4-per-source merge rule applies.
  - **Separation:** a coin pop never merges with an egg-collect pop. When both fire in the same frame, the coin pop is 20 ± 1 px above the egg pop.
  - **Tiers:** the pop's size and glow are identical at s = 0.07 and s = 0.27.
- **ST-AC17b (zero payout; HoP X8 follow-up)** Given a hired Market Hand Asleep during a warm-up (`refCents` = 0), or `refCents` = 16, when the player makes 7 credited taps from s = 0:
  - there is no coin-pop node and no `+$0.00` in the DOM or the live region, and coins are unchanged;
  - each tap still plays the pitched collect, s rises by 0.01 per credited tap, and the meter updates;
  - the 7th tap shows the tier-1 pill and plays `sfx-streak-tier-01`;
  - `tap.bonus_cents` = 0 and `credited` counts every credited tap.
- **ST-AC18** Given any `tc_streak_*` / `tc_tap_income_share` change in the CSV plus sync, then behaviour follows with no code change.
- **ST-AC19** Given 50 taps in 1 s at F ≥ 8 with a Coop Hand and an empty coop, then exactly one `tap` event has `count` = 50, `credited` = 1, `empty_credited` = 1, `bonus_cents` = bonus, and `empty` = 50 **[T-full]**. `session_end.credited_taps`/`tap_bonus_cents` equal the Σ over `tap` events **[T-sub]**.
- **ST-AC20 (telemetry swap) [T-sub]** (D-HOP-09 #6; **in the M5.0 subset per D-HOP-2026-10-24-10 #4 (TEL-4)**; fields in §8.1; HoE §12 confirmed the cost)
  - **Session with a mid-session hire:** an F ≥ 8 session of 600 taps with the Coop Hand hired after the first 200.
    - Before the hire: 200 taps, 100 credited, 50 of them moved 0 eggs.
    - After the hire: 400 taps, 250 credited, 200 of them moved 0 eggs.
    - In all, 200 taps moved eggs.
  - Then `session_end` carries:
    - `taps_total` = 600 and `taps_moved_eggs` = 200;
    - `credited_taps` = 350;
    - **`empty_credited` = 200** (only taps while a Coop Hand is hired; the 50 before the hire don't count);
    - `coop_hand` = true and `farm_level` ≥ 8.
  - The dashboard `effective_tap_share` = (200 + 200) / 600 = 0.667, flagged `swap`, and it alerts (< 0.85).
  - **Without a Coop Hand all session** (or at F7) with the same taps: `empty_credited` = 0, `coop_hand` = false, and the share is 200 / 600 with no `swap` flag.
- **ST-AC21 (UI)** Given s = 0.187, then the fill is at **69.26%** width (0.187/0.27) with ticks at 25/50/75/100%, and the label reads `+18% price`. Given s = 0.27, then it's a gold fill, `MAX +27%`, and 4 lit ticks, with one sparkle on reaching the cap. **There is no pulse:** `getAnimations()` on the meter row is empty from 400 ms after the cap is reached, through 10 s at the cap. Reduced motion: no sparkle, instant 1% steps. The meter box + 16 px is never overlapped by a golden egg hit area (with GE-AC15).
- **ST-AC22 (chips)** v0.3 S-AC19/S-AC20 unchanged, with s ≤ 0.27.
- **ST-AC23 (G1; Economy)** Given the v5 values (cap **0.27**, tap 0.03) in the full M5.0 stack (golden egg, Broody Hen, abilities), then optimal active/idle ≤ 2.0 at P95 and ≤ 2.25 on the worst seed, over every 10-min window, seeds 0–99, F10/F18/F24. With no taps, AC7 pacing is unchanged. **Scratch G3 (D-HOP-16) was measured at cap 0.28:** P95 1.77, worst seed 1.84 — historical only, not claimed as a pass at 0.27. This AC closes only on a model-gate / `measure:l30plus` re-measure **at cap 0.27**.

- **ST-AC24 (carries v0.3 S-AC16; QA ST-6)** Given reduced motion, then there is no pulse or sparkle, the fill changes instantly in 1% steps, and cap and cooling show colour plus the `MAX` text or the diagonal stripes.
- **ST-AC25 (carries v0.3 S-AC17, cap-relative)** Given s = 0, then the meter is hidden. Given 3 focus seconds with no credited tap, then the fill is `--c-muted` with diagonal stripes and drains, the label shows the live floor(%), and the meter fades out at 0. While frozen (menu or hidden), the stripes and drain are paused.
- **ST-AC26 (carries v0.3 S-AC18, restated per `art-ux/m5-combo-tiers.md` v0.2)** Given viewports 360×844, 375×844, 1280×800 and 1024×474:
  - Collect is **48 px** tall and full width;
  - the meter row is the **24 px row directly under Collect**, spanning Collect's left and right edges (360×640: y 552–576; 1280×800: y 772–796);
  - the bar is 12 px outer (8 px track, 2 px outline), with the label inline on the right;
  - at docked layouts it sits under the scene's Collect button, never in the docked column;
  - the row's box is unchanged at s = 0 (hidden, reserved).
- **ST-AC26b (errata v1.3.1; mirrors `art-ux/m5-combo-tiers.md` v0.3 CT-AC17; `art-ux/layout-spec` v1.5 §3.3a)** Given each test viewport, then the bottom of the 24 px meter band is ≤ the nav top (phone) or ≤ the viewport bottom (docked), and the 12 px bar inside it keeps ≥ 4 px clear. At phones ≤ 390 px wide the band may meet the nav with a 0 px gap. Collect is 48 px tall in Fredoka 18/700 (the M5 build sets `.btn.xl` to 18 px, down from 22). If this AC and the layout spec ever conflict, **the layout spec wins** (HoP 17:24). **Expected values (v1.3.2, D-HOP-2026-10-29-08):** every viewport, state and rect this AC names is in the §9.1 table (canonical CSV there), ±1 px.
- **ST-AC27 (carries v0.3 S-AC21)** Given default settings, when s reaches the cap, then the cap chime plays exactly once; not again while capped, again after s drops below T3 and returns to the cap. Muted: never. No per-tap streak sound other than the 4 tier pitch steps (ST-AC9).
- **ST-AC28 (cap-relative oracles; QA ST-5)** All streak oracles read `tc_streak_cap` from config, and QA runs ST-AC3/5/9/11/21/25 at cap **0.27 and 0.40** (ST-AC11 keeps the 0.40 config test). Breeds-off 0.28 remains a valid alternate config.
- **ST-AC29 (flags; R13a; D-C1)** Given `m4.flags.streak` = 0 and `m4.flags.tapCoins` = 1, then taps pay coins and s stays 0 with no meter. Given the reverse, then s builds and no coins are paid. Given both 0 or `m4.enabled` = false, then Collect behaves exactly as in rc1, and the flag-off trace hash is `f90d1678…`.
- **ST-AC30 (Broody/flutter not credited; R3)** Given a Broody Hen collect or a coop-roof flutter tap, then `tap.credited` is unchanged, s is unchanged, and no tap coin is paid.


### 9.1 ST-AC26b layout table (v1.3.2; D-HOP-2026-10-29-08 (5); HoQA v5 UI QA gap 5)
**Sources (cited by section/selector, not line):**
- `art-ux/layout-spec.md` v1.5 §3.3a "Per-size table" (sha1 `5ffb58f3f96531e92551715dd40d39d7700931b4` on disk 2026-10-29): Collect x/y, streak row band, 20 px row, bottom (nav.top / viewport), clear below band. RC `5d9efa6` rects, Chromium, with the M5.0 48 px Collect applied (Collect.top unchanged).
- `art-ux/m5-combo-tiers.md` v0.3 §0 "Meter anatomy" (sha1 `ed4ded1d891b4dae81cd7a49417ba74c3d275d8a`): the bar is 12 px outer, vertically centred in the 20 px row, then an 8 px gap and an 80 px right-aligned label column, so bar x = Collect.left → Collect.right − 88 and label x = Collect.right − 80 → Collect.right. **Bar and label rects are derived from these rules, not measured.**
- `art-ux/m5-layout-rects-960.md` v1.0 §A (layout mode at 959/960/960×1280/1024×1366) and §D (960×600 `.collectbar` x 24–536).
- Shipped code, for what the M5 build changes (Latest p2 head `23d2b78`, `src/ui/styles.css`): `.btn.xl` is still `min-height:64px; font-size:22px`, and `.collectbar` still uses `gap:var(--s-2)`. The M5 build applies layout-spec §3.3a "How the 24px is found": `#collect` 48 px, `.btn.xl` 18 px, `#streak{height:20px;margin-top:-4px}`, `.farm` bottom padding 12→4 px (8→0 px at ≤ 390 px). The streak row is rendered by the M5 UI in `src/ui/app.ts` (`collectbar` markup); it isn't built yet, so nothing here is measured on a v5 build.

**States.** The rects are the same in every state, because the row is always reserved: (H) hidden, s = 0, `#streak` has `visibility:hidden` and keeps its box; (S) shown, 0 < s < cap; (M) at cap (MAX, gold); (C) cooling (stripes); (F) frozen under a menu. QA asserts the table in H and S at every matrix viewport; M/C/F reuse the same rects (ST-AC26 "the row's box is unchanged at s = 0").

**Modes.** phone = NOT `(min-width:960px) and (orientation:landscape)` (golden-egg R12; layout-rects §A); the bottom limit is `nav.actions` top. docked / docked-compact = landscape and ≥ 960 px; the limit is the viewport bottom, and there is no bottom nav.

**Checks per row (all ±1 px, Chromium, Firefox and WebKit; the Collect height is fixed at 48 px, so the 21 px vs 22 px line box doesn't move any rect):** band_y1 ≤ bottom_y; band_clear_px = bottom_y − band_y1 is 0 only at vw ≤ 390, else ≥ 4; bar_clear_px = bottom_y − bar_y1 ≥ 4 at every row; band x = Collect x; never inside the docked column.

**Matrix.** `matrix = yes` rows are the ST-AC26b test viewports (HoQA plan: 360×844, 375×844, 390×844, 959×600, 960×600, 1024×474, 1280×800, plus QA's extra 1024×1366). `ref` rows are layout-spec reference sizes; they are binding if QA runs them.

**375×844 is derived, not measured** (it isn't in layout-spec §3.3a): Collect is bottom-anchored to the nav (layout-spec §3.3a note on 430×932), so its y equals 360×844 and 390×844 (nav 780), and its x equals the measured 375×667 row (8–343). QA logs it for Art if a live rect differs by more than 1 px; the layout spec wins on conflict (HoP 17:24).

Human-readable table (y in CSS px from the viewport top; "bar" = the 12 px outer bar box):

| Viewport | Mode | ST-AC26b matrix | Collect x (w) | Collect y | Band (Collect.b → +24) | Row (20 px) | Bar x × y (12 px) | Label x (80 px) | Bottom | Clear below band | Bar clear | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 360×640 | phone | ref | 8–328 (320) | 504–552 | 552–576 | 556–576 | 8–240 × 560–572 | 248–328 | nav.top 576 | 0 | 4 | measured |
| 375×667 | phone | ref | 8–343 (335) | 531–579 | 579–603 | 583–603 | 8–255 × 587–599 | 263–343 | nav.top 603 | 0 | 4 | measured |
| 360×844 | phone | yes | 8–328 (320) | 708–756 | 756–780 | 760–780 | 8–240 × 764–776 | 248–328 | nav.top 780 | 0 | 4 | measured |
| 375×844 | phone | yes | 8–343 (335) | 708–756 | 756–780 | 760–780 | 8–255 × 764–776 | 263–343 | nav.top 780 | 0 | 4 | derived |
| 390×844 | phone | yes | 8–358 (350) | 708–756 | 756–780 | 760–780 | 8–270 × 764–776 | 278–358 | nav.top 780 | 0 | 4 | measured |
| 430×844 | phone | ref | 12–394 (382) | 704–752 | 752–776 | 756–776 | 12–306 × 760–772 | 314–394 | nav.top 780 | 4 | 8 | measured |
| 959×600 | phone | yes | 12–923 (911) | 460–508 | 508–532 | 512–532 | 12–835 × 516–528 | 843–923 | nav.top 536 | 4 | 8 | measured |
| 960×1280 | phone | ref | 12–948 (936) | 1140–1188 | 1188–1212 | 1192–1212 | 12–860 × 1196–1208 | 868–948 | nav.top 1216 | 4 | 8 | measured |
| 1024×1366 | phone | yes (QA extra) | 12–1012 (1000) | 1226–1274 | 1274–1298 | 1278–1298 | 12–924 × 1282–1294 | 932–1012 | nav.top 1302 | 4 | 8 | measured |
| 960×600 | docked-compact | yes | 24–536 (512) | 524–572 | 572–596 | 576–596 | 24–448 × 580–592 | 456–536 | viewport 600 | 4 | 8 | measured |
| 1024×474 | docked-compact | yes | 32–592 (560) | 398–446 | 446–470 | 450–470 | 32–504 × 454–466 | 512–592 | viewport 474 | 4 | 8 | measured |
| 1280×720 | docked | ref | 160–720 (560) | 644–692 | 692–716 | 696–716 | 160–632 × 700–712 | 640–720 | viewport 720 | 4 | 8 | measured |
| 1280×800 | docked | yes | 160–720 (560) | 724–772 | 772–796 | 776–796 | 160–632 × 780–792 | 640–720 | viewport 800 | 4 | 8 | measured |
| 1366×768 | docked | ref | 203–763 (560) | 692–740 | 740–764 | 744–764 | 203–675 × 748–760 | 683–763 | viewport 768 | 4 | 8 | measured |

**Canonical (machine-readable).** The CSV below is canonical for the ST-AC26b oracle; the human table above is generated from the same rows and matches it value for value. If either ever disagrees with `art-ux/layout-spec.md` §3.3a, the layout spec wins (HoP 17:24) and PM Collection re-pins this table.

```csv
viewport,mode,matrix,collect_x0,collect_x1,collect_y0,collect_y1,band_y0,band_y1,row_y0,row_y1,bar_x0,bar_x1,bar_y0,bar_y1,label_x0,label_x1,bottom_kind,bottom_y,band_clear_px,bar_clear_px,source
360x640,phone,ref,8,328,504,552,552,576,556,576,8,240,560,572,248,328,nav,576,0,4,measured
375x667,phone,ref,8,343,531,579,579,603,583,603,8,255,587,599,263,343,nav,603,0,4,measured
360x844,phone,yes,8,328,708,756,756,780,760,780,8,240,764,776,248,328,nav,780,0,4,measured
375x844,phone,yes,8,343,708,756,756,780,760,780,8,255,764,776,263,343,nav,780,0,4,derived
390x844,phone,yes,8,358,708,756,756,780,760,780,8,270,764,776,278,358,nav,780,0,4,measured
430x844,phone,ref,12,394,704,752,752,776,756,776,12,306,760,772,314,394,nav,780,4,8,measured
959x600,phone,yes,12,923,460,508,508,532,512,532,12,835,516,528,843,923,nav,536,4,8,measured
960x1280,phone,ref,12,948,1140,1188,1188,1212,1192,1212,12,860,1196,1208,868,948,nav,1216,4,8,measured
1024x1366,phone,yes,12,1012,1226,1274,1274,1298,1278,1298,12,924,1282,1294,932,1012,nav,1302,4,8,measured
960x600,docked-compact,yes,24,536,524,572,572,596,576,596,24,448,580,592,456,536,vp,600,4,8,measured
1024x474,docked-compact,yes,32,592,398,446,446,470,450,470,32,504,454,466,512,592,vp,474,4,8,measured
1280x720,docked,ref,160,720,644,692,692,716,696,716,160,632,700,712,640,720,vp,720,4,8,measured
1280x800,docked,yes,160,720,724,772,772,796,776,796,160,632,780,792,640,720,vp,800,4,8,measured
1366x768,docked,ref,203,763,692,740,740,764,744,764,203,675,748,760,683,763,vp,768,4,8,measured
```

## 10. Build size
**S–M**:
- credited-tap gate;
- streak state, hold and decay;
- `saleMultipliers` entry;
- tier hysteresis and pop-ups;
- tap-coin credit, floater merge and telemetry fields;
- meter UI.

About 2–3 engineer-days plus 1 QA day (PM estimate; HoE to size). It needs the `M4Params.tc` reader from the golden egg. If built alone, add 0.5 day.

## 11. Open questions
- Q2 (Art & UX): **closed** by `art-ux/m5-combo-tiers.md` v0.2 (tier copy and ticks final; sound mapping 1:1, per m5-sound-spec). Remaining: Art Q2 asks PM to confirm the inline label (done in ST-AC26).
- Q4 (Economy G3): model tap coins and the Broody Hen on the §4.1 trailing-60 s I_ref, using I_ss (gross `incomePerSec` + wages) for the first 60 s of sim time after each load or offline return (§4.1a).

## 12. HoE §8 gap closure (`engineering/m5.0-sizing.md` §8)
| HoE gap | Status in this spec | Where |
|---|---|---|
| 1 Economy G3–G5 not run | **Scratch G3 in (D-HOP-16): P95 1.77, worst 1.84 at historical cap 0.28.** v5 current cap **0.27**, tap 0.03, tiers 0.07/0.14/0.20/0.27 (D-HOP-27); G1 is the ship gate and needs a model-gate re-run at 0.27 | Header, §5, ST-AC23 |
| 2 CSV columns / streak_cap value | **Closed (draft + v1.3.3 tuning).** `tc_tap_income_share` 0.03, `tc_tap_bonus_income_window_s` 60, `tc_streak_tier_count` 4, `tc_streak_unlock_farm` 8; `tc_streak_cap` **0.40 → 0.27** for v5 breeds=1 (D-HOP-27; G3 scratch draft was 0.40 → 0.28). No CSV edit in this errata | §5, R5 |
| 3 Golden egg | N/A (m5-golden-egg-spec) | — |
| 4 Two "credited tap" definitions; sim vs wall | **Closed.** One definition: a coop tap ≥ 1.0 s of **sim time** after the last credited tap, eggs or not. Used by the streak, A1 and telemetry (D-HOP-04 #1) | R2, ST-AC4, ST-AC16c, §8 |
| 5 Reference income undefined | **Closed.** Trailing 60 s of sim-time passive income; inclusions and exclusions listed; sales from the rc1 hidden < 60 s sim count; I_ss for the first 60 s of sim time after a load or offline return (§4.1a, D-HOP-07 X2, D-HOP-10 #1); not saved | §4.1, §4.1a, ST-AC16b/16d |
| 6 Broody spec | N/A here (`m5-broody-hen-spec.md`); it shares §4.1 | — |
| 7 Abilities | Out of scope (PM Workers). Ability multipliers are excluded from I_ref; abilities are in the G1 stack | §4.1 |
| 8 Pause | Out of scope (D-HOP-04 #9) | — |
| 9 Menu states / K11 decay | **Closed.** Modals, sheets, explainer, onboarding and coach freeze the decay and hold, together with the golden egg (D-HOP-04 #4; v0.3 K11 replaced) | R12, K10, ST-AC13 |
| 10 QA test plans | **Partly closed.** ST-AC1–23 are numbered and measurable and replace S-AC1–24 (S-AC19/20 kept by reference in ST-AC22). HoQA writes the plan | §9 |
| 11 Telemetry names | **Closed for PM; HoQA to OK.** No new event names. `tap` gains `credited`/`empty_credited`/`bonus_cents` (HoE F4 names). `session_end` gains `credited_taps`/`tap_bonus_cents`/`streak_extra_cents` plus the §8.1 fields. **`taps_effective` is dashboard-only, not emitted** (§8, §8.1; QA ST-12). All ring-trimmed except `session_end`, which is already pinned, so the pinned list is unchanged | §8 |

## 13. QA testability gaps → resolution (`qa/m5/testability-gaps.md` v0.1)
| Gap | Resolution | Holds it |
|---|---|---|
| ST-1 Credited-tap clock | **Sim clock** (D-HOP-04 #1); the rc1 hidden < 60 s sim time counts toward the 1.0 s window | R2, ST-AC16c |
| ST-2 Reference income formula | Trailing 60 s **sim-clock** window of base-price-chain sales (D-HOP-08 #1), ÷60; gross, not net of wages; hidden < 60 s sim sales included (D-HOP-07 X2, D-HOP-09 #2). For the first 60 s of sim time after a load or offline return it is I_ss (§4.1a) | §4.1, §4.1a, ST-AC2/15/16/16b/16d |
| ST-2b (v0.2) Empty ramp vs X2 steady-state | **X2 wins (D-HOP-2026-10-24-10 #1)**: I_ss = gross `incomePerSec` + `wagesPerSec`, live state and moods, no uplifts; used during a warm-up (fresh start, load, offline return ≥ 60 s) until 60 s of sim time accrue; then a hard switch to the trailing window. The C2 hidden-sales question is closed: they count | §4.1a, K13/K13b, ST-AC16b/16d |
| ST-3 Menu decay | **Frozen** (focus clock stopped) → 0.27 | R12, K10, ST-AC13 |
| ST-4 Hidden 5 s at 0.27 | **0.27 exactly** (focus clock stopped; D-HOP-08 #2) | R10, ST-AC12a, ST-AC12 |
| ST-5 Cap-relative oracles; G3 date | Yes: run at **0.27 and 0.40** (ST-AC11 keeps 0.40). Model-gate re-run at 0.27 is Economy/HoQA | ST-AC11, ST-AC28 |
| ST-6 v0.3 S-AC16/17/18/21 | In force, restated cap-relative as ST-AC24–27 | §9 |
| ST-7 Broody / flutter taps | Neither credited nor paid | R3, ST-AC30 |
| ST-8 `streak_peak{reload}` | Emitted on `pagehide` in the `session_end` flush | R11 |
| ST-9 counted vs credited | **credited** everywhere (D-HOP-09 #3) | Glossary, §8, §8.1 |
| GE-6-style flags | `m4.flags.streak`, `m4.flags.tapCoins` (D-C1) | R13a, ST-AC29 |
| X1–X7 | Answered in m5-golden-egg-spec §3.7 and binding here. X4 tags in ST-AC19/20 | m5-golden-egg-spec §3.7 |
| AB-1…AB-8, P-1…P-9 | **Not Collection's:** PM Workers owns Abilities and Pause/Resume | — |

## 14. HoE §9–§10 alignment
| # | HoE point | Applied | Flag |
|---|---|---|---|
| A1 | Streak hold and decay run on the **focus clock** (F1b) | Glossary, R6, R7, R10, R12, §4 formula 1, ST-AC5/12/12a/13/25 | none |
| A2 | §9.1: streak spec "hidden 5 s at 0.40 → 0.34" must become no decay | R10 (0.27 → 0.27), ST-AC12a; review example fixed | none |
| A3 | Offline = hidden-tab or frame gap ≥ 60 s | R11, ST-AC12 | none. **HoE confirmed** that a ≥ 60 s gap doesn't advance focusClock; an offline return also starts an I_ref warm-up (§4.1a) |
| C2 | I_ref and the hidden-sim sales | §4.1 includes them | **Confirmed, D-HOP-09 #2** |
| C3 | credited-tap field name | §8, §8.1 | **Resolved, D-HOP-09 #3:** `credited_taps` |
| A4 | §10.1 subset vs full migration | §8 tags; ST-AC20 is [T-sub] (D-HOP-09 #6, D-HOP-10 #4) | **Resolved (QA ST-12):** the swap is computed from `session_end` alone (`taps_total`, `taps_moved_eggs`, `empty_credited`, `coop_hand`, `farm_level`; D-HOP-10 #4, HoE TEL-13). It is not tied to `tap.empty` |

## Change log
- **v1.3.3** (2026-11-05 ~20:30 CET; **D-HOP-2026-10-30-27 / D-HOP-2026-10-30-31**, TASK PMC/v5-cap027-errata): **tuning**. v5 default `tc_streak_cap` **0.28 → 0.27** with breeds=1 (0.28 with breeds off). Derived: 27 credited taps; hold+decay **12.0 s**; tiers **0.07/0.14/0.20/0.27**; peak sale **2.54×**; ST-AC21 fill at s=0.187 **69.26%**; cap label **MAX +27%**; ST-AC10 oscillates 0.19/0.20 with reset below 0.14. ST-AC11 0.40 config test retained. ST-AC23 requires the model gate at 0.27 and keeps scratch G3 (P95 1.77 at cap 0.28) as history only. ST-AC28 runs at 0.27 and 0.40. Tap share 0.03 and other non-cap tuning unchanged. Layout table §9.1 unchanged. Frozen predecessor v1.3.2: `m5-streak-tap-coins-spec.acb4cdbb.md` (sha1 `acb4cdbba293db639a409d1c197589b97b1a5c4e`).
- **v1.3.2** (2026-10-29 22:55 CET; **D-HOP-2026-10-29-08 (5)**, HoQA v5 UI QA gap 5): QA oracle only. New §9.1: the complete ST-AC26b layout table for all 14 layout-spec §3.3a sizes plus 375×844 (derived, marked), with Collect, band, row, bar and label rects, bottom limit and both clearances, in a human table and a canonical fenced `csv` block; ST-AC26b points to it. Sources cited by section and selector (layout-spec v1.5 §3.3a, combo-tiers v0.3 §0, layout-rects 960 §A/§D, `src/ui/styles.css` `.btn.xl` / `.collectbar` at `23d2b78`). No rule, threshold or AC logic changes. Frozen v1.3.1: `m5-streak-tap-coins-spec.895ca903.md`.
- **v1.3.1** (2026-10-24 17:25; HoP errata ruling 17:24): adds ST-AC26b, mirroring combo-tiers v0.3 CT-AC17 and layout-spec v1.5 §3.3a (band ≤ nav top or viewport bottom, 12 px bar ≥ 4 px clear, 0 px gap allowed at ≤ 390 px, Collect 48 px Fredoka 18/700, `.btn.xl` 18 px). The layout spec wins on conflict. No other changes.
- **v1.3** (2026-10-24 17:22; D-HOP-2026-10-24-24):
  - **Draft CSV of record:** sha256 **8dc90e2b…996b** (152 cols, 29 added, `guard_*` dropped; D-HOP-2026-10-24-24; `sha256sum` on disk matches). It replaces 45095351, and the "may change" note is removed. No spec rule uses a `guard_*` column. `tc_stall_tap_guard_ms` is a sales-stopped column and isn't used here.
  - No rule changes. The bump keeps the three specs aligned at v1.3.
- **v1.2** (2026-10-24 17:19; **HoE money-math ruling 2**; HoP cross-check v0.2; HoQA v0.6):
  - **Version:** this consolidates the unversioned edits made at 16:59, 17:08, 17:11 and 17:13, plus the HoP cross-check v0.2 and HoQA v0.6 notes. HoP cross-check v0.2 asked for the bump.
  - **Draft CSV citation:** edfd8902 → **sha256 45095351…81b8** (154 cols, 31 added). Economy confirmed it via HoP at 17:18. edfd8902 was the earlier 21-column draft, not a typo. (Superseded in v1.3 by 8dc90e2b, D-HOP-24.)
  - **Since v1.1:**
    - `art-ux/m5-combo-tiers.md` v0.2: Collect 48 px, the meter row, pop anchors 8 px above the coop meter, pill timing, no MAX pulse (R16, §3.3, §3.5, ST-AC17/21/26, new ST-AC10b).
    - HoQA v0.5 closures: ST-11 integer bp rule §4.1b (new ST-AC2b), ST-12 text, X8, the zero-payout rule (new ST-AC17b).
    - HoE money-math ruling: BigInt guard (new ST-AC2c). Ruling 2: the 9.0e11 ¢/s boundary.
  - **HoQA v0.6:**
    - ST-AC2c gains a value where the BigInt and `Number` paths disagree (192,754,064,051,397¢).
    - §4.1b states the warm-up float rule: `Math.round(I_ss × 100)` on the float I_ss, with the reference built from the same expression (ST-AC2b). **HoE confirmed it at 17:18.**
- v1.1 + **HoE money-math ruling 2** (2026-10-24): HoE adopted our boundary, so the switch at 10,000 bp is 9.0e11 ¢/s ($9.0e9/s) and the mismatch flag is removed (§4.1b).
- v1.1 + **HoE money-math ruling** (2026-10-24): §4.1b confirmed as written. Adds the BigInt guard (RC1 has no big-number type; coins are `coinsCents: number`) and the new ST-AC2c. The old float formula is now described in words, so no float half-up rounding of a ×100 product is left. Examples are unchanged.
- v1.1 + **HoQA re-review v0.5 (PASS with conditions) closures** (2026-10-24):
  - **ST-11:** new §4.1b, exact integer arithmetic per the **HoE ST-11 ruling**: `tapBp = Math.round(rate × 10000)`; `refCents` (Math.round(I_ss × 100) in warm-up, floor((Σ + 30)/60) after); `tapCoinsCents = floor((refCents × bp + 5000)/10000)`. Applied to R14, the §4.1c formulas, ST-AC2/15/16a/16c/16e and the new ST-AC2b. The F30 $2.33 stands (the float gave 232¢); 38¢ and 50¢ are unchanged.
  - **ST-12:** §14 A4 no longer tied to `tap.empty`; §12 row 11 has `taps_effective` as dashboard-only; §8.1 gains the `empty_credited` / `taps_swap_eligible` line; `fg_ms` → `fgMs`.
  - **X8 (HoP confirmed, 16:46):** the $0 tap coins during a sales stall are intended, citing Market §4.2 (§4.1a, K13c, ST-AC16e). New zero-payout rule: no `+$0.00` floater, all other feedback kept (R16, new ST-AC17b).
- v1.1 + **`art-ux/m5-combo-tiers.md` v0.2** (2026-10-24):
  - Collect goes 64 → 48 px; the meter sits in the freed 24 px row under it (§3.5, ST-AC26).
  - The tap-coin pop and the tier pill both anchor 8 px above the coop fill meter, superseding Art's 16:41 "12 px above Collect" (R16, §3.3, ST-AC17, new ST-AC10b).
  - Pill motion ≤ 400 ms, then a still hold, with the fade done by 900 ms.
  - No 1 Hz pulse at MAX: a gold fill plus a one-time sparkle (§3.3 table, ST-AC21).
  - Sound mapping unchanged (1:1).
- **2026-10-24 16:55 (Audio via HoP):** R16 and the Art & UX dependency line now name the tier-pitched `egg.collect` as the tap-coin cue (ruling 7, `art-ux/m5-sound-spec.md` v0.3); the "light coin tick sound" wording is removed.
- v1.1 + **D-HOP-2026-10-24-16** (2026-10-24):
  - Scratch G3 is in. P1-pending values are retagged [G3-scratch: pending measure:l30plus re-measure], with the draft values unchanged (cap 0.28, tap 0.03, tiers 0.07/0.14/0.21/0.28).
  - The window column is renamed `tc_ref_income_window_s` → `tc_tap_bonus_income_window_s` (draft name). The draft's `tc_tap_credit_min_s` 1.0 is now the R2 window.
  - G3 status paragraph; ST-AC23 carries the scratch result.
- v1.1 · **BUILDABLE (HoE §12)** (2026-10-24): folded in HoE §12 decisions.
  - **D-C1:** flags `m4.flags.streak` / `m4.flags.tapCoins` (R13a, ST-AC29, §13).
  - **D-C3:** long frames apply (1 + s) only on the first 1.0 s of ticks (R12).
  - **D-C6:** I_ss uses existing code; a sales stall gives I_ss = 0 (§4.1a, K13c, new ST-AC16e).
  - `empty_credited` counts only credited taps made while a Coop Hand is hired (`tap` row, §8.1). ST-AC20 has new numbers (empty_credited 200, share 0.667).
  - HoE confirmed the ST-AC20 cost.
- v1.1 + **D-HOP-2026-10-24-13** (2026-10-24):
  - #1: I_ss keeps RC1's 1 tap/s collection term, matching the ring (§4.1a). The open note is closed.
  - #2: the tap-coin floater uses short money (`fmtMoneyShort`) with the 8 px clamp (R16, plug-ins, K14, ST-AC17).
  - **Art confirmed it against `art-ux/number-pop-spec.md` v1.0**, so it is no longer pending. R16 now carries the type, position, motion and stacking rules: a separate source from the egg pop, offset 20 px above it in the same frame, with no tier emphasis. `art-ux/m5-combo-tiers.md` is pending.
- v1.1 + **D-HOP-2026-10-24-10** + HoQA v0.2 + HoE (2026-10-24):
  - #1 (ST-2b): new §4.1a. I_ref = steady-state I_ss (gross `incomePerSec` + wages) until 60 s of sim time accrue after a fresh start, load or offline return; then a hard switch to the trailing window. The empty ramp is removed (storage, hidden tab, plug-ins, K13/K13b, ST-AC16, ST-AC16b, new ST-AC16d, Q4, §13). The hidden-sales question is closed (they count).
  - R3 / ST-AC14: golden and Broody taps aren't credited and don't Collect (`stopPropagation`).
  - HoE confirmed the 1.0 s focusClock cap and that ≥ 60 s gaps don't advance focusClock (A3 confirmed).
  - #4 (TEL-4): the `session_end` payload, including the §8.1 ST-AC20 fields, is in the M5.0 subset, so ST-AC20 is now [T-sub].
- v1.1 + **D-HOP-2026-10-24-09** (2026-10-24):
  - focus clock (`focusClock`), with "attended" reserved for D-HOP-04 #5;
  - C2 confirmed;
  - `credited_taps`; `taps_effective` is dashboard-only;
  - the R5e clamp accepted (HoE to confirm);
  - the no-uplift-while-frozen rule endorsed;
  - §8.1 minimal ST-AC20 field list, with ST-AC20 retagged [T-sub, pending HoE sizing].
- v1.1 + QA gaps + HoE §9–§10 (2026-10-24):
  - focus clock in the Glossary, with hold/decay restated on it;
  - explicit ST-AC12a (hidden 5 s at 0.28 → 0.28);
  - offline = gap ≥ 60 s;
  - I_ref counts hidden-sim sales (flag C2);
  - credited-only naming; Broody/flutter not credited;
  - `streak_peak{reload}` on pagehide;
  - flags;
  - v0.3 S-AC16/17/18/21 restated as ST-AC24–27;
  - ST-AC28–30; §13; §14;
  - telemetry tags per HoE §10.1.
- v1.1 (2026-10-24): status **Approved (conditional), D-HOP-08**.
  - Hidden < 60 s freezes the streak (R10, K8, ST-AC12; #2).
  - The streak uplift is suspended while frozen under menus or hidden (R12, ST-AC13; #3).
  - I_ref confirmed (#1); G1 wording confirmed (#4).
  - 0.15 removed as a dependency; it's a backlog item.
  - Q3/Q5 closed.
- v1.0 (2026-10-24): from v0.3:
  - cap 0.40 → 0.28 [G3-scratch: pending measure:l30plus re-measure];
  - one credited-tap definition on sim time (D-HOP-04 #1), and A1 tap coins 0.03 [G3-scratch: pending measure:l30plus re-measure] on the trailing-60 s I_ref (D-HOP-04 #2);
  - menus freeze the decay (D-HOP-04 #4);
  - draft G3 columns;
  - §12 gap closure;
  - 4 tiers with hysteresis;
  - CSV names made canonical;
  - telemetry: `tap.credited/empty_credited/bonus_cents`, session totals, and the effective-tap swap;
  - ACs renumbered ST-AC1–23.
