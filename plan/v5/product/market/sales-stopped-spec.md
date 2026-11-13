# M5.0: "Sales stopped" chip + fatigue-visibility Rules 2–4 (PM, Market/Customers)
**v1.3.27 · 2026-10-30 13:46 CET · FROZEN for QA (QA-D-1030-PINFREEZE; HoQA verified v1.3.26 `1e0aa3a4`); further changes only via a dated errata note, no AC changes without HoQA** · Telemetry: telemetry-spec `d170eb09` + PMC errata v5 (rev 6 `83424120` at time of writing; sha of record at gate = the one pinned in `engineering/v5-rc-manifest.md`) (SS-43–46 Saves CONFIRMED vs rc/v5 e77fc5c; v1.3.24 `b95d5cf8`: G37 ruled, incl. the closing tap; G-13 field types proposed; sub-line name = visible text at each width, Art-confirmed `b23ae9e7`; episode end per Rule 2 hysteresis; v1.3.23 `15b36fe7`: HoQA SS-G30–G38 closed, F-4c, v5 save shapes per D-HOP-2026-10-30-38; v1.3.22 `8244e066`) · Status: ACCEPTED into M5.0 (D-HOP-2026-10-24-13); **HoE BUILDABLE (final)**; **PM Workers CONFIRMED** (v1.3.4); **Art CONFIRMED, rects signed** (`art-ux/m5-layout-rects-960.md`); **HoQA test plan v0.13** (`qa/m5/test-plan-sales-stopped.md`, sha256 `7e581eba`, 108 cases) covers SS-1…SS-49 · **Size 2.05–2.2 dev-days** (HoE final; cap 2.2, D-HOP-20) · Scope rulings **D-HOP-2026-10-24-11 (b)**, **-13**, **-14**, **-15**, **-17**, HoP ruling 16:50, **-19**, **-20**, **-23** · Release flag **`m4.flags.salesStopped`** · Changelog §14, sign-offs §12.1 · build hold stands (code only on Vadim's go) · Research/PM only, no code or PRs.
**Data source of truth:** `product/economy.csv` sha256 `c7bb783f…8b44` (**CSV c7bb783f**). Columns are cited by name. The new columns in §6 are UI-only and have no economy effect.
**Sources:**
- Diagnosis: `product/research/v2-slices/market.md` §7 and `product/market/bug-l10-sales-stall-5d9efa6.md`.
- Pulled-in rules (moved source, PM Workers item 9): `product/workers/m4.2-fatigue-visibility-spec.md` **v0.2.2** Rules 2–4 (RV-3, D-HOP-37). Refill taps use today's `manage` action (M5.1 Refill later). Nothing reuses the c231c02 Refill bar (not on main). Their placement and strings come from `art-ux/m4.2-fatigue-visibility-ux.md`.
- Pause: `product/workers/m5-worker-pause-spec.md` v1.2.
- Rush Hour (M5.2): `v2-slices/market.md` §4.
- Copy conventions: `art-ux/copy/*`.
- Code baseline: RC1 `5d9efa6` plus **post-M4.1 patch (a), branch `fix/m41-patch1`** (a targeted rc1 port of AC-R1–R9 from 8a49d35, plus §4.2 and the D-HOP-14 banner), which is a **prerequisite** (§10).

## 1. Overview
When eggs pile up but nothing sells, the farm screen shows one tappable chip in the goal-strip slot, just above Collect (§4.7). It names the cause (for example, Market Hand asleep) and fixes it in one tap (Refill, Sell all or Collect).
Alongside it, three already-approved fatigue cues move from parked M4.2 into M5.0:
- **Rule 2:** the HUD fatigue cost chip.
- **Rule 3:** the Asleep banner on the farm screen.
- **Rule 4:** the "Refill workers" goal bubble.
The chip is triggered by the **symptom** (no sales). The fatigue cues are triggered by the **cause** (energy). §5 makes sure one problem never shows two alerts.

## 2. Goals and non-goals
**Goals**
- G1. Within ≤ 9 s of selling stopping on the farm screen, a player can see that it stopped, why, and the one tap that fixes it. Playtest 2026-10-24 had 2 stalls of over 2 minutes with no cue.
- G2. Every cue is true. It never claims a stop that isn't happening, and never shows a positive income while nothing sells (fixes the Market Hand gap in `incomePerSec`, §4.2).
- G3. One alert per problem: the chip, banner and HUD chip don't duplicate each other (§5).
- G4. Absence is never punished. The cues are information only.
**Non-goals**
- No energy, wage, drain, sleep or price change (P41-6 guardrail; L0–11 byte-identical). No auto-wake.
- No change to `bestBuy`, AC7 or the sim bots.
- No new sounds.
- Fatigue Rules 1, 5, 6, 7 and 8 stay with PM Workers (not pulled).
- No Rush Hour build (M5.2). §7.3 only sets forward-compatible rules.

## 3. Player fantasy
"The farm tells me when something's wrong, and I fix it with one tap." Failure is **telegraphed and recoverable** (M4.2 goal), not "the game got slow".

## 4. Detailed rules
### 4.1 Definitions (all pure selectors over `GameState`, evaluated every render frame)
- **Queue `Q`** = `s.customers`, the normal queue only. It never includes Rush Hour buyers, the bulk buyer, or contracts (§7.3).
- **Sellable eggs `E`** = `floor(s.basket) − reserved`. In M5.0, `reserved` = 0. From M5.1, it includes the CT-AC-1 bulk hold-back and contract Hold.
- **Focus clock:** advances only while the tab is visible and no sheet, menu or modal is open (D-HOP-2026-10-24-09 (b), `focusClock`). Every stall timer below runs on it, so a hidden tab, open menu or offline gap never counts.
- **`noSaleS`:** focus-clock seconds for which T-SELL's **state** conditions (`|Q| ≥ 1` ∧ `E ≥ 1` ∧ gates) have held **continuously** with no `sell` event (any `by`). It resets to 0 when any of them breaks or on any `sell`.
- **`noCollectS`:** the same, for T-COLLECT's state conditions and `collect` / `worker_collect` events.
- Timers have sim-tick resolution (`tickHz` 10, so 0.1 s).
- **MH / CH states:** `mood()` from `sim/workers.ts` plus the Pause flag (`paused: true`, m5-worker-pause-spec). Precedence: **Paused > Unpaid > Asleep > Tired > Working**, for **all 4 roles** (MH, CH, Hawker, Grader) and in every rule here (chip, Rules 2–4, banner). A Paused worker at any energy is never shown as Asleep or Tired and gets no yawn cue or effect string (Pause spec no-yawn; PM Workers item 1).
- **Pause gate (HoE f):** until `m4.flags.pause` exists in the build, `paused` reads false everywhere, and all Pause rules (§7.1, `mh_paused`) are inert. Pause ACs run on a sim fixture with `paused: true`.

### 4.2 Income selector fix (needed for G2 and Rule 2)
- **Today:** `incomePerSec` (`econ/income.ts`, also in 8a49d35) ignores Market Hand, so it shows positive income while an asleep Market Hand sells nothing (bug report).
- **Fix:** live mode only (not `assumeWorking`). If Market Hand is **hired** and **Asleep or Unpaid**, the eggs-sold term is **0**.
- Unchanged: Market Hand not hired (F0–2), Working, Tired, or **Paused**. A paused Market Hand means the player chose to sell by hand, so the old "player sells" model stays true.
- **Live path only; the planner is never affected** (PM Farm Upgrades condition 1, Economy note 3). `best-buy.ts` calls `incomePerSec(s, b, working)` at lines 73, 82, 100 and 116–122 (pr58 66680eb). That `working` steady-model path is untouched. The zeroing lives only in the live branch. The live value never feeds `bestBuy`, the goal-label %, the ★ pick or the bot; they all keep `assumeWorking: true` (SS-21, SS-27, both hard merge gates).
- **Which ETA changes** (condition 2): only `secondsToAffordSteady` (`income.ts:95`) reads "—" (it returns null at income ≤ 0). The next-goal bubble and card countdown ETAs divide by the **60 s gross sales window** (`format.ts:40-48`, KI-RV5) until RV-5b. So during Asleep or Unpaid they keep counting down for up to 60 s while the HUD rate is red. The spec does **not** claim that the next-goal ETA reads "—". Handling: §4.9.
- **ASSIGNED TO PATCH (a)** (`fix/m41-patch1`, not built yet). HoE confirmed ≤ 0.25 dd and live-income figure only (D-HOP-2026-10-24-13 condition met; D-HOP-14). **SS-15, SS-27 and SS-28 are specified for the patch; to be verified by QA on patch1.** M5.0 runs them as regression only. SS-29 is verified in M5.0, because it needs the chip and Rule 3.
- Sign-off: PM Farm Upgrades (owner of the income selector, rc1-upgrade-clarity UC18), conditional, conditions met in v1.2 (§12.1).
- **Consequence for the hotfix banner (8a49d35, `workers-ui.ts:74-75`):** with this fix, `salesStopped()` becomes true for an asleep Market Hand. Per **D-HOP-2026-10-24-14** as amended by **-17**, the banner (patch and M5.0) reads **`Market Hand asleep: sales stopped`** or **`Market Hand unpaid: sales stopped`** (`art-ux/rc2-workers-copy.md` §6, amended 16:52). The banner aria is "Market Hand is asleep. Auto-sales have stopped." / "Market Hand is unpaid. Auto-sales have stopped." M5.0 uses "sales stopped" as the Market Hand effect on every surface it owns (§4.4, Rule 3, SS-20). The older v0.2.2 effect wording is used only in the toast and welcome-back line, which aren't in M5.0 (D-HOP-17).

### 4.3 "Sales stopped" chip: trigger (show)
The chip shows when **every** condition of **one** of these rows holds:
| id | Condition | Hold |
|---|---|---|
| **T-SELL** | `|Q| ≥ 1` ∧ `E ≥ 1` ∧ `noSaleS ≥ hold` ∧ MH not Holding (M5.1) | `tc_stall_hold_s` 8 s; **`tc_stall_hold_nomh_s` 20 s** if MH isn't hired; **`tc_stall_hold_paused_s` 20 s** if MH is Paused (`mh_paused`) |
| **T-COLLECT** | `|Q| ≥ 1` ∧ `E < 1` ∧ `floor(s.coop) ≥ 1` ∧ CH hired ∧ CH Asleep or Unpaid (not Paused) ∧ `noCollectS ≥ tc_stall_hold_s` | 8 s |
Extra gates:
- the farm screen is the active view;
- the onboarding flow has finished (`onboarding.ts` `finished = true`, the same state that ends coach steps);
- `s.farmLevel ≥ w1_unlock_farm` (3) for the no-MH cause, so first-minutes players selling by hand are never nagged.
A Tired MH serves every `tired_every_s` 3 s (< 8 s), so a Tired MH can never trigger T-SELL.
**`mh_paused`** (PM Workers item 2): with MH Paused, the chip shows only after `tc_stall_hold_paused_s` 20 s of **truly zero sales** (no `sell` of any `by`). Any sale resets the hold. It never auto-resumes the worker. A deliberate pause while the player keeps selling never shows a chip. A Paused CH never triggers T-COLLECT (`ch_paused` is deferred; PM Workers marked it optional, and it needs Art copy).

### 4.4 Cause resolution and copy
The cause is evaluated when the chip shows and re-evaluated every frame. If it changes, the chip text swaps without re-animating, and one `sales_stall` resolved/shown pair is logged (§8).
| cause | When | Visible (Fredoka 700 14 px, icon 16 px + 6 px gap, 12 px side padding) | Chars | Tap action |
|---|---|---|---|---|
| `mh_asleep` | T-SELL, MH Asleep | [zzz] `Market Hand asleep · Refill` | 27 | `manage` (Refill) on `market_hand`. While `manageCdS > 0` the label reads `Market Hand asleep · Sell all` and the tap runs Sell all (§4.6). **With `rc2Refill` = 1:** `Market Hand asleep · Manage`, and a tap opens the Shift sheet focused on `market_hand` (SS-36, D-HOP-2026-10-30-20) |
| `mh_paused` | T-SELL, MH Paused (hold 20 s) | [icon-pause] `Market Hand on break · Sell all` | 31 | `sellAll` only. Never resumes MH |
| `mh_unpaid` | T-SELL, MH Unpaid | [icon-warning] `Market Hand unpaid · Sell all` | 29 | `sellAll` (coins come in, and Unpaid auto-resumes once coins ≥ reserved + need, `tick.ts:61-69`) |
| `no_mh` | T-SELL, MH not hired, F ≥ 3 | [icon-nest] `Eggs waiting · Sell all` | 23 | `sellAll` |
| `ch_asleep` | T-COLLECT, CH Asleep | [zzz] `Coop Hand asleep · Refill` | 25 | `manage` on `coop_hand`. While `manageCdS > 0` the label reads `Coop Hand asleep · Collect` and the tap runs `collect` once. **With `rc2Refill` = 1:** `Coop Hand asleep · Manage`, and a tap opens the Shift sheet focused on `coop_hand` (SS-36) |
| `ch_unpaid` | T-COLLECT, CH Unpaid | [icon-warning] `Coop Hand unpaid · Collect` | 26 | `collect` once |
| `other` | T-SELL with MH Working or Tired (shouldn't happen; this is a bug detector) | [icon-warning] `Sales stopped · Sell all` | 24 | `sellAll` |
Conventions follow `art-ux/copy/`:
- NBSP on both sides of `·`.
- Icon plus text, never colour alone. **No emoji anywhere** (Art change 4). Icons are SVG at 16 px and `aria-hidden="true"`: `ico_fatigue_zzz` (fatigue-ux §6) for the asleep causes, `assets/icon-warning.svg` for the unpaid causes and `other`, `icon-pause.svg` (Pause spec asset) for `mh_paused`, and `icon-nest.svg` for `no_mh`. No ⚠ character anywhere (PM Workers item 3, confirmed).
- The words are "Refill" (never "Manage", AC-R6, except asleep causes with `rc2Refill` = 1, which read "Manage" (SS-36)) and "Sell all" (same as the Market sheet button).
- Worst case is `Market Hand on break · Sell all` (31 chars). **Art measured it at 242 px**, including icon, gap, padding and border, which leaves 78 px spare in the narrowest 320 px slot at 360 (`art-ux/m5-layout-rects-960.md` §E, copy-fit table; the earlier ≈295 px estimate was high, §E note) (SS-17).
- **With `rc2Refill` = 1 (SS-36):** the worst case is `Market Hand asleep · Manage` (33 chars, about 256 px by Art's estimate; inside the 320 px slot at 360). It's measured in the build in SS-17's 3-engine shots. The 242 px worst case stands for `rc2Refill` = 0.
- **Wording rule (D-HOP-14/-17, single source `art-ux/rc2-workers-copy.md` §6):**
  - Chip visible text: `{Role} {state} · {verb}` (Art's approved `·` pattern).
  - Banner visible text: `{Role} {state}: {effect}` (rc2 §6 copy).
  - **Chip describedby = the rc2 §6 aria sentence for the same role and state + " Tap to {verb}."** The §6 aria rule is written for banners ("aria always uses the full string with the role name"). The chip reuses it so that a screen reader hears the same words from both surfaces. The chip and the banners therefore never disagree on state or effect.
- **Copy approved by Head of Art & UX as drafted** (6 strings, NBSP around `·`, bubble `Refill workers · +$X/s`) on v1.2. The 2 cooldown labels reuse approved words only. **v1.3.2 re-signed by Art (16:55):** the describedby sentences and `Market Hand on break · Sell all` with `icon-pause.svg` (16 px, `aria-hidden`) are approved. It's the widest string and is included in the SS-17 3-engine shots.
**Accessibility** (Art change 3):
- The button has **no `aria-label`**. Its accessible name is the visible text (WCAG 2.5.3, label in name).
- The longer sentence below is linked with `aria-describedby`.
- A separate visually hidden `role=status` region (polite, throttled ≥ 1000 ms as MK-40) announces that sentence **once per show**.
**Describedby sentences:**
- `mh_asleep`: "Market Hand is asleep. Auto-sales have stopped. Tap to refill." (on cooldown: "… Tap to sell all."; with `rc2Refill` = 1: "… Tap to manage.", Art to sign)
- `mh_paused`: "Market Hand is on break. Auto-sales have stopped. Tap to sell all." (new; same pattern, needs Art sign-off)
- `mh_unpaid`: "Market Hand is unpaid. Auto-sales have stopped. Needs {Y} dollars. Tap to sell all." ({Y} = max(0, reserved + `resumeNeedCents(market_hand)` − coins), the same sum as `tick.ts:61-67`, money formatter)
- `no_mh`: "Customers are waiting and eggs are ready. Tap to sell all."
- `ch_asleep`: "Coop Hand is asleep. Auto-collecting has stopped. Tap to refill." (on cooldown: "… Tap to collect."; with `rc2Refill` = 1: "… Tap to manage.", Art to sign)
- `ch_unpaid`: "Coop Hand is unpaid. Auto-collecting has stopped. Tap to collect." (same wording as asleep while the synced CH share is 0; rc2 §6 amended 16:57)
- `other`: "Sales have stopped. Tap to sell all."

### 4.5 Clear (hide)
The chip hides **on the next tick (≤ 100 ms)** when any of these happen (D-HOP-19/-20: there's no minimum on-screen time; a chip that says "sales stopped" after a sale would be untrue, G2):
- C1: a `sell` (T-SELL) or `collect`/`worker_collect` (T-COLLECT) event;
- C2: `|Q| = 0`;
- C3: `E < 1` (T-SELL) or `floor(coop) < 1` (T-COLLECT);
- C4: the cause worker leaves Asleep or Unpaid (Refill or auto-resume), immediately, without waiting for the next sale;
- C5: **the cause worker becomes Paused → re-evaluate, don't hide** (PM Workers item 2). For an MH cause, the cause becomes `mh_paused`. The chip stays only if `noSaleS ≥ tc_stall_hold_paused_s`; otherwise it hides (resolved `paused`) and reshows at 20 s of zero sales. For a CH cause, it hides (resolved `paused`);
- C6: the focus clock stops (sheet or menu opens, tab hidden). **Leaving the farm screen for another screen** (HoE d) only hides the chip: timers keep running, and the chip reshows on return if its conditions still hold (same `prev_stall_id` rule);
- C7: the cause is `no_mh` and MH is hired.
**Swap-back (D-HOP-15 as amended by -19/-20, SS-34):** on any C1–C5 or C7 hide, the chip and the goal bubble **crossfade over 150 ms in the same slot**. The bubble starts fading in on the same tick the chip starts fading out, so there's never an empty frame. Reduced motion: an instant swap.
**Anti-flicker:** comes from the re-arm rule below (5 s since hide **and** a full 8 s hold of the trigger). A worker that wakes and falls asleep again can't bring the chip back before both are met, so the bubble stays steady in between. There's no min-show state machine and no `tc_stall_min_show_s` column (dropped by D-HOP-20).

**Re-arm:**
- After a C1–C5 or C7 hide, the chip can show again only once its trigger holds again for the full hold, **and** at least `tc_stall_rearm_s` 5 s have passed since it hid. The no-sale timers also reset to 0 on C4 and on Resume (§7.1).
- **After a C6 hide** (focus lost), the timers are frozen, not reset (except for the ≥ 60 s gap in §7.2). The chip reshows as soon as focus returns if the frozen timer is still ≥ the hold and its conditions still hold, with no re-arm wait. **Welcome-back and a ≥ 60 s gap share one reset path** (`resetStallTimers()`, HoE d; §7.2). This counts as a new show for telemetry (§8 `prev_stall_id`).

### 4.6 Tap behaviour
- One tap = one action, as in the §4.4 table. Repeat taps are ignored for `tc_stall_tap_guard_ms` 500 ms (the existing `tap-guard.ts` pattern).
- **Propagation (HoQA SS-G4):** the chip's pointer and click handlers call `stopPropagation()`. A chip tap never reaches `#scene` and never counts as a Collect: no coop change, no credited tap, no streak step, no tap coins (SS-35).
- **Second tap during the hide crossfade:** the chip gets `pointer-events: none` on the tick it starts hiding. Until the 500 ms tap guard from the chip tap ends, the slot swallows taps: they don't hit the incoming goal bubble or `#scene`. After that the bubble is interactive. A second tap on a still-visible chip inside 500 ms is ignored by the guard (SS-35).
- **Refill on cooldown** (`manageCdS > 0`, shared 30 s, Art change 2): the label reads `Market Hand asleep · Sell all` (or `Coop Hand asleep · Collect`), and the tap runs that action. There's **no `0:ss` badge** and never a disabled chip. When the cooldown ends, the label swaps back to `… · Refill` in place, without re-animating and without a new announcement or telemetry pair (same cause).
- **`m4.flags.rc2Refill` = 1 (D-HOP-2026-10-30-20 (1); matches the Asleep banner, fatigue-ux v1.2 §2 errata; D-HOP-2026-10-30-13):** the asleep label reads `<Role> asleep · Manage`, and a tap opens the Shift sheet with that worker's row heading scrolled into view and focused (SS-36). It spends no refill. Because Manage spends nothing, the cooldown swap to `· Sell all` / `· Collect` above doesn't apply (**CONFIRMED by HoP, D-HOP-2026-10-30-20 follow-up, and by Art**). With `rc2Refill` = 0, everything is as in v1.3.13 (SS-36). Unpaid, paused and `no_mh` labels are unchanged.
  - **Telemetry and clearing:** opening the sheet is a C6 hide (focus clock stops). It is **not** a clear: timers freeze, there's no C4 and no re-arm reset. The open pair closes with `resolved_by: chip_manage`, `chip_tapped: true` (instead of `focus_lost`) when the sheet opens (**Option A, ruled by HoP in D-HOP-2026-10-30-20 addendum 2**). Conversion to a Refill is measured by the §8 `sheet_id` join (`shift_sheet_opened{entry: stall_chip, stall_id}` → `refill_used{by: manual}`). A Refill later made in that sheet is a real C4, logged as `refill_elsewhere` wherever a pair is open. If the sheet closes with the stall's conditions still holding, the chip reshows per the §4.5 C6 rule as a new `stall_id` with `prev_stall_id`.
- Refill uses the existing per-worker `manage` action, with its ≤ 50% gate (Asleep = 0, so the gate always passes) and the shared cooldown. From M5.1, the tap calls the M5.1 Refill action (charges) instead. Same rule, new action.
- After a successful tap, the chip clears through C1 or C4 within ≤ 100 ms (§4.5 swap-back). If the action changed nothing (for example Sell all with E < 1, which can't happen while the chip shows), log `resolved_by: none`.

### 4.7 Placement
- **Goal-strip slot, just above Collect** (Art change 1). Rects: **360: 8,456–328,500** (320 × 44 px); **1280: 160,672–720,716** (560 × 44 px). **0 px layout shift** (SS-16).
- Why not under the customer strip: there it would cover the coop tap area, the Full! badge and the toast strip, and at 1280 the gap is only 39 px (under 44).
- **While the chip shows, it replaces the goal bubble** at all widths. The bubble returns when the chip clears (C1–C7).
- **Slot priority (merged with PM Workers item 7): stall chip > coop-full > nudge > UC25 > fatigue bubble (Rule 4) > buy goals > M4 hints.** Nudge and UC25 apply when built.
- This resolves review D2 (two Refill CTAs at once) and E11 (no overlap with spawn spots).
- **All widths approved: D-HOP-2026-10-24-15** (16:46). The chip replaces the goal bubble at every width while sales are stopped, and the bubble returns the moment sales resume (swap-back AC: SS-16).
- z-order: same layer as the goal strip; below sheets, toasts, the explainer and dialogs. It never covers Collect or the tab bar.
- **1280 docked:** in the farm column's goal-strip slot. The docked Market panel doesn't count as a "sheet open" for C6, and its Sell all is the same action.
- Style: the existing danger style for the warning causes and the amber "tired" pill style for the zzz causes (fatigue-ux §1). AA ≥ 4.5:1.
- **Motion:** 150 ms fade plus a 1.05 scale pop on show, no loop. Hide = a 150 ms crossfade with the goal bubble in the same slot, never an empty frame (§4.5). **Reduced motion:** fade only.

### 4.8 Fatigue Rules 2–4 (pulled from M4.2 v0.2.2 as written, with M5.0 deltas)
- **Rule 2, HUD fatigue chip:**
  - Unchanged: show at `fatigueLoss / (incomePerSec + fatigueLoss) ≥ tc_fatigue_cue_min_share` 0.15 held `tc_fatigue_cue_hold_s` 5 s; clear below `tc_fatigue_cue_clear_share` 0.12 held `tc_fatigue_cue_clear_hold_s` 2 s.
  - **Clock** (item 5): every Rule 2 and Rule 4 hold and every stall hold runs on `focusClock` (visible, no menu, dt capped at 1.0 s, 0 offline).
  - **Base rates only** (item 6): the share uses base rates. Ability calls (Rush, Shout), Frenzy and streak multipliers are excluded, so starting or ending one never flips the chip (SS-32).
  - Strings and placement per fatigue-ux §1, with no emoji (Art change 4): [icon-warning] + `Tired −$X/s` below 400 px, [icon-warning] + `Tired workers −$X/s` at 400 px and up (icon `aria-hidden`), in a slot under the HUD rate restored by the hotfix (AC-R2). The slot exists **only when `m4.flags.fatigueCue` = 1** (which requires `salesStopped` = 1), and then it's reserved at all times. With `fatigueCue` = 0 there's no slot (SS-23f; Art ruling 12:39). The flags are build-time values from balance.json, so this never shifts mid-session. Tap opens Workers with the costliest worker first.
  - **Short-viewport variant (Art ruling 12:58; D-HOP-2026-10-30-24; spec of record Art fatigue-ux **v1.3.1** `art-ux/m4.2-fatigue-visibility-ux.md` sha1 `b23ae9e7b9bdbd97ee5d42fb3dd3c302596c771a` (**re-signed 13:40**, `art-ux/decisions.md` L541: FC-SV14 clarification only, which supersedes `b23ae9e7` for that row; first signed 13:36, L535; FC-SV11–16 at L53–95 cover HoQA G30–G38; measurement evidence `cb5ca050` / SUMS `ffa115bb`), on top of v1.3 `115891d4` (SIGNED 13:06, L514, file `95f31259`) §1 errata v1.3, L12–50; evidence `art-ux/reviews/fc-ac9-golden-spots-360.md` sha1 `34e86e2288add698b656dbb5b1623a134c919272` (`art-ux/reviews/fc-ac9/SHA256SUMS` sha1 `051eca86…`; rc/v5 e77fc5c, Chromium/Firefox/WebKit)):**
    - **Breakpoint (CONFIRMED):** CSS media query `(max-height: 739px)` on the viewport height in CSS px (= `innerHeight`). **≤ 739 → icon chip, no sub-line slot. ≥ 740 → signed sub-line.** It re-evaluates natively; there's no JS debounce.
      - **Height-only (SS-G32 CLOSED; Art fatigue-ux v1.3.1 `b23ae9e7` FC-SV13, L67–78; Art ruling 13:35):** there's no width condition. Any viewport under 740 px high gets the icon chip at every width, including 960×600, 959×600, 1024×474 and **1280×720 docked**. This is accepted: one rule, no width branch.
        - Measured in 3 engines: the chip is at 216.4,5–260.4,49 and the popover at 26.1,62–260.4,114 at all three measured sizes. Settings is at 904 / 903 / 968,5. Flag-on spot counts equal flag-off (960×600 5/4/2 of 6; 959×600 6/6/4 of 8; 1024×474 6/5/3 of 6).
        - The 960×600 / 959×600 golden losses are pre-existing flag-off and are recorded by PMC as accepted, with no gate. Any future failure goes to Art + HoP as a fix, never as a width condition.
      - The measured floor is 672 px at widths 360–430. 740 is kept as margin, because widths 431–959 weren't swept (v1.3 L13; decisions L514).
      - **Single definition:** the 740 value is defined **once**, as a shared constant (e.g. `FATIGUE_SUBLINE_MIN_H = 740`). Both the CSS media query (`(max-height: 739px)`, emitted from the constant at build time) and the telemetry bucketing (§8 `viewport_h`) reference it.
    - **Icon chip (v1.3 L15–18):** a `<button>` in `.hud` after the basket, before the spacer/settings. **44×44 hit box**, 26 px cream pill, icon 20 px centred: `ico_fatigue_sweat` for Tired, `ico_fatigue_zzz` for Asleep.
      - At 360×640 the chip is **216.4,5–260.4,49** and settings **304,5–348,49**, both 44×44, with no overlap.
      - Coins (12,7–130.2,47) and basket (138.2,7–208.4,47) are **display pills, not tap targets**, at the signed 40 px height. They are **non-focusable and non-interactive**: no `tabindex`, no button role and no handlers (SS-G38; Art fatigue-ux v1.3.1 `b23ae9e7` FC-SV16, L93–95). All four of coins, `#rate`, basket and settings equal flag-off: 0 px shift when the chip shows or hides.
      - **Space is not reserved:** the chip occupies spacer room, and the other rects are identical with the chip shown or hidden (v1.3 L18).
    - **Accessibility (SS-G33/G34; Art fatigue-ux v1.3.1 `b23ae9e7` FC-SV14/15, L79–92; Art ruling 13:35, WCAG 2.5.3; Asleep copy APPROVED):** no `aria-label` on either variant.
      - **≤ 739 icon chip (icon-only, so 2.5.3 doesn't apply):** the name is a visually hidden `.sr` sentence ending `Show details.`: Tired `Tired workers are costing $X per second. Show details.`; Asleep (any worker Asleep) `Asleep and tired workers are costing $X per second. Show details.`. `aria-describedby` = the FC-AC2 copy `Tired −$X/s` in both states (state is told by icon shape and colour). The chip has `aria-expanded` and `aria-controls` (→ the popover id).
      - **≥ 740 sub-line pill:** the name is **exactly its visible text at each width** (WCAG 2.5.3; from content, no `.sr` suffix, no `aria-label`; exact-string per QA-D-1030-NAME-FINAL): `Tired −$X/s` below 400 px wide, and `Tired workers −$X/s` at 400 px and up (the §4.8 Rule 2 strings). The same visible-text rule applies in the Asleep state. The decorative ⚠ / warning icon is never in the name. **CONFIRMED by Art** (FC-SV14, `b23ae9e7`; `art-ux/decisions.md` L541, 13:40). The sentence moves to `aria-describedby`: Tired `Tired workers are costing $X per second. Open workers.`; Asleep `Asleep and tired workers are costing $X per second. Open workers.`.
      - X uses the HUD aria formatter (`spellShort`).
      - **Popover:** `role="group"` (**not** `dialog`; focus stays on the chip when it opens), `aria-labelledby` = its cue-text line. The Manage button comes **directly after the chip in DOM and tab order**.
    - **Tap (v1.3 L20–25; D-HOP-2026-10-30-28 (2): different destinations kept in M5):**
      - At ≥ 740, a tap on the sub-line opens Workers sorted by costliest.
      - At ≤ 739, a tap on the chip opens a **non-modal popover**, `position: fixed`, at **26.1,62–260.4,114 (234×52)**. It holds one line, `⚠ Tired −$X/s` (**the popover is where sighted players see X**), and a **Manage** button (172.4,66–254.4,110, 82×44) that opens the Shift sheet at the worker (SS-36 handler) and spends nothing.
      - The popover covers **0 golden spots** (none of the S1–S8 hit boxes, which start at y 211/223), and not the toast, Collect, the tab bar or the chip. Layout shift is 0 px.
    - **Dismissal (v1.3 L26–31; Art 13:01):** an outside tap closes the popover **and passes through to its target, for every target with no swallow exceptions** (golden collect, buys and Sell all included). Esc closes it and refocuses the chip. A second chip tap closes it, and so does the cue resolving. There's no timeout (WCAG 2.2.1).
      - Crossing 739/740 while it's open closes it, and the cue state carries over (no event; the episode continues).
      - **Focus (SS-G30; Art fatigue-ux v1.3.1 `b23ae9e7` FC-SV11, L54–58):** focus moves to the equivalent control (the sub-line at ≥ 740, the chip at < 740) **only if** focus was on the chip or inside the popover. Otherwise focus is unchanged. It never goes to `body`.
      - **Telemetry (SS-G40 (1), = SS-48):** every chip tap logs one `fatigue_cue_tapped`, including the tap that closes the popover. Esc, an outside tap, a resize and the cue clearing close it and log nothing. Opening or closing it is never a resolution.
      - **Stall-chip suppression (SS-G35, SS-47):** if the stall chip appears while the popover is open (§5 hides the HUD chip's display), the popover closes and focus moves to the stall chip. Nothing is logged, and the fatigue episode continues.
      - **Manage target (SS-G36, SS-48):** Manage opens the Shift sheet with the **costliest at-risk worker** (max `workerAtRisk`, ties in code id order `market_hand`, `coop_hand`, `hawker`, `grader`) row heading focused, and logs `shift_sheet_opened{entry: fatigue_chip}`.
    - **`#rate` shows net income, not X (v1.3 L32 correction):** `#rate` = `incomePerSec` = gross sales − wages (`src/econ/income.ts` L72–76). It never shows the fatigue loss X (= Σ `workerAtRisk`). On short viewports the popover carries X.
    - **At ≥ 740:** the signed sub-line is unchanged (390×844 rect 8,66,374,28).
  - **Delta: `workerAtRisk(w)`** = `incomePerSec(s with w Working at 100%) − incomePerSec(s)` using the §4.2 selector, summed over Tired and Asleep workers as `fatigueLoss`. Paused workers (all 4 roles, item 1) and Unpaid workers are excluded (Pause spec; Unpaid is shown by the patch).
  - **Coop Hand asleep share pinned at 0 for M5.0** (item 4): the game CSV and sim (`isOff`) give 0, so the effect is "collecting stopped" and T-COLLECT can fire. The product CSV value was corrected from 0.20 to **0.15** by D-HOP-2026-10-24-16 (6), "unread in M5.0, effective 0". The rule: string and trigger key off the **synced** value. At > 0 (e.g. if the 0.15 fallback ever ships), `ch_asleep` can't fire, and the asleep **and** unpaid CH strings revert to rc2 §6 "collecting slowed" (SS-33). The sim's `isOff` gives 0 collection at any share, so a non-zero share changes only the UI string and trigger path until the sim reads it.
  - **Share guard:** share = `fatigueLoss / (incomePerSec + fatigueLoss)`. If the denominator is ≤ 0 (wages ≥ gross at a low level), share = 1 when `fatigueLoss > 0`, else 0. Never divide by zero or a negative.
- **Rule 3, Asleep banner on the farm screen:** reuses the hotfix banner component in the band under the top bar (fatigue-ux §2). One banner names the costliest Asleep role plus `+N more`. Visible string and aria come **verbatim from `art-ux/rc2-workers-copy.md` §6** (single source, same as the patch banner; D-HOP-19 approved the CH and Hawker strings):
  | Role / state | Banner (full string) | If the full string doesn't fit (role dropped) | Aria |
  |---|---|---|---|
  | MH asleep | `Market Hand asleep: sales stopped` | `Asleep: sales stopped` | Market Hand is asleep. Auto-sales have stopped. |
  | MH unpaid | `Market Hand unpaid: sales stopped` | `Unpaid: sales stopped` | Market Hand is unpaid. Auto-sales have stopped. |
  | Hawker asleep | `Hawker asleep: sales slowed` | `Asleep: sales slowed` | Hawker is asleep. Sales are slowed. |
  | Hawker unpaid | `Hawker unpaid: sales slowed` | `Unpaid: sales slowed` | Hawker is unpaid. Sales are slowed. |
  | CH asleep (share 0) | `Coop Hand asleep: collecting stopped` | `Asleep: collecting stopped` | Coop Hand is asleep. Auto-collecting has stopped. |
  | CH unpaid (share 0) | `Coop Hand unpaid: collecting stopped` | `Unpaid: collecting stopped` | Coop Hand is unpaid. Auto-collecting has stopped. |
  | Grader asleep / unpaid | `Grader asleep: bonus down to N%` / `Grader unpaid: …` | `Asleep: bonus down to N%` | Grader is asleep. Bonus down to N percent. |
  - Never `{Role}: {effect}` without the state word. `production stopped` is reserved for a true whole-farm zero and is never used by these rules. The Rule 3 banner shows Asleep roles; the Unpaid rows are listed so the chip and the patch banner can be checked against the same table.
  - **Fit rule (HoQA SS-G22; = rc1-asleep-state v1.0.5/1.0.6 `bannerFit`, Art 16:53):** the role is dropped **only when the full string doesn't fit** the banner at the current width, never by breakpoint. E.g. `Hawker asleep: sales slowed` may fit at 360 and then keeps the role. Aria always uses the full string with the role name.
  Paused workers are never named. **Delta:** the dedupe in §5.
- **Rule 4, goal bubble:** at the same show and clear thresholds as Rule 2, the bubble reads `Refill workers · +$X/s` ahead of buy goals. Slot priority is **stall chip > coop-full > nudge > UC25 > fatigue > buy goals > M4 hints** (§4.7; nudge and UC25 when built; RV-2b `·` style, copy approved by Art). The abilities [bolt] nav badge is a separate surface, never hidden. It's display-only: `bestBuy` is unchanged (AC-F12 → SS-21).

### 4.9 ETA truth and always a next action (PM Farm Upgrades conditions 2 and 3)
- **Choice: the §5 alert owns the moment** (not "known inconsistency").
  - Once the stall chip shows, it takes the goal-strip slot, so the bubble and its 60 s-window countdown aren't rendered (§4.7).
  - In the same farm view, a Market Hand that is Asleep and not covered by the chip is named by the Rule 3 banner with Refill (§5).
- **Bounded residual** (logged as **KI-SS1**, a child of KI-RV5; it closes with RV-5b and isn't a defect of this spec):
  - (i) the ≤ `tc_stall_hold_s` (8 s) before the chip shows;
  - (ii) MH Asleep or Unpaid with `|Q| = 0` or `E < 1` (no sale is possible, so the chip is correctly absent);
  - (iii) inside sheets (C6), where card countdowns use the window.
  - In these windows the bubble or card countdown can drift for up to 60 s while the HUD rate is red.
- **Always a next action** (condition 3): in the farm view, whenever `secondsToAffordSteady` returns null because of §4.2 (MH Asleep or Unpaid), at least one actionable control is visible in the same view:
  - the stall chip (Refill / Sell all / Collect); or
  - for MH Asleep, the Rule 3 banner with Refill; or
  - the sell-by-hand affordance: the Market tab with its red dot (`app.ts:563`, customers + basket ≥ 1), or at 1280 the docked panel's Sell all; plus Collect, which is always shown.
  - The goal-strip slot is never blank. If the bubble's ETA would read "—", the bubble keeps its goal label and omits the ETA text (SS-29).

## 5. One alert per problem (interplay with the M4.1 hotfix asleep signal)
| Surface (owner) | Shows for Market Hand / Coop Hand Asleep | While the chip shows for that role |
|---|---|---|
| Worker card banner + Upgrades and Workers badges (hotfix, AC-R1/R5) | yes | **unchanged.** They live in other views, so there's no duplication |
| HUD rate red, with the warning icon, at ≤ 0 (hotfix AC-R2, with the §4.2 fix) | yes when ≤ 0 | **unchanged.** It's a number, not an alert |
| Farm-screen Asleep banner (Rule 3) | yes | **excludes that role.** It names the next costliest Asleep role not covered by the chip, or hides. `+N more` counts only uncovered roles |
| HUD fatigue chip (Rule 2; sub-line ≥ 740 or icon chip < 740, same rules) | if share ≥ 0.15 | **display hidden** while the stall chip is visible. Its show/clear state machine keeps running underneath, and its slot stays reserved (0 px shift; the slot exists only when `fatigueCue` = 1, SS-23f). When the stall chip clears, the HUD chip reappears ≤ 1 s later if its **state** is still "shown" (state-based, the same as Rule 2's hysteresis; HoQA SS-G3). **Exception** (`rc2Refill` = 0 only; with `rc2Refill` = 1 the chip never refills, so it's N/A there, SS-12 (d)): if the stall chip cleared through C4 because of a Refill (chip, card, Manage all), a share < 0.12 at that moment force-clears the HUD chip state, so it doesn't flash for the 2 s clear hold after a deliberate fix. **Confirmed by PM Workers (17:07)** |
| Goal bubble (Rule 4 and buy goals) | if share ≥ 0.15 | **replaced** by the chip in the shared slot (§4.7); it returns when the chip clears. Both Refill entry points stay (D-HOP-2026-10-24-13); they're never on screen together |
| Fatigue explainer and first-Asleep toast (Rule 5, not pulled) | n/a in M5.0 | n/a |
- The chip and the Rule 3 banner never name the same role at the same time (SS-12).
- If the hotfix ships without the farm-screen banner (Rule 3 is M5.0), the chip still works alone.

## 6. Tunables (new CSV columns, UI-only; Economy adds them with no re-run, as for M4.2)
| key | value | range | note |
|---|---|---|---|
| `tc_stall_hold_s` | 8 | 6–15 (0 = off) | Must be > max(`w1_tired_every_s`, `w2_tired_every_s`) + 1, computed from the **loaded** config, never hard-coded (today 3 and 4, so the floor is 5 and 8 is valid; SS-22) |
| `tc_stall_hold_nomh_s` | 20 | 10–60 | no-MH cause only |
| `tc_stall_hold_paused_s` | 20 | 10–60 | **New in v1.3 (9th column):** the minimum zero-sales time before the `mh_paused` chip shows (SS-30) |
| `tc_stall_rearm_s` | 5 | 2–15 | |
| `tc_stall_tap_guard_ms` | 500 | 250–1000 | |
| `tc_fatigue_cue_min_share` | 0.15 | 0.10–0.30 | from M4.2, unchanged |
| `tc_fatigue_cue_hold_s` | 5 | 3–10 | from M4.2 |
| `tc_fatigue_cue_clear_share` | 0.12 | 0.08–0.14 | must be < min_share (load fails otherwise) |
| `tc_fatigue_cue_clear_hold_s` | 2 | 1–5 | from M4.2 |
**Column names (final, v1.3.3):** **9 `tc_*` columns**: the 5 `tc_stall_*` above (`tc_stall_hold_s`, `_hold_nomh_s`, `_hold_paused_s`, `_rearm_s`, `_tap_guard_ms`; there's no `_min_show_s`, per D-HOP-20) plus the 4 **`tc_fatigue_cue_*`** (0.15 / 5 / 0.12 / 2). The `tc_` prefix is required, or the sync script drops them; Economy renames them in the M5 CSV PR. The 2 `fatigue_explainer_*` columns don't land with M5.0. Economy adds the 9 columns as a UI-only balance entry, with no re-run, when Engineering's wiring PR is ready.
**Release flags.** (1) **`m4.flags.salesStopped`** (HoE ruling 17:03) gates the chip AND Rules 2–4; Rule 2 additionally needs `m4.flags.fatigueCue` (2). (2) **`m4.flags.fatigueCue`** (D-HOP-2026-10-29-05/-06, D-HOP-2026-10-30-16) is the release flag for Rule 2, the HUD fatigue chip. It ships only paired with `salesStopped`: on the same manifest row, or with `salesStopped` = 1 on an earlier row. With `salesStopped` = 1 and `fatigueCue` = 0, there's no Rule 2 HUD chip and no `fatigue_cue_shown{surface:hud_chip}`, while the stall chip and Rules 3–4 are unchanged. With `salesStopped` = 0, `fatigueCue` has no effect. **About (1):** Flag off is exactly the `fix/m41-patch1` baseline: no chip, no Rule 2 HUD chip, no Rule 3 farm banner, no Rule 4 bubble, no `sales_stall` or `fatigue_cue_*` events. The §4.2 income fix and the patch banners stay, because they belong to the patch. `tc_stall_hold_s = 0` is a secondary CSV switch for the chip only (SS-23).

## 7. Interactions
### 7.1 Pause/Resume (M5.0, `m4.flags.pause`)
- **While MH is Paused, there's no chip as long as anything sells.** Only 20 s of truly zero sales shows `mh_paused` (Sell all, never Resume). A Paused CH never shows a chip. *(**ACCEPTED, HoP ruling 16:50**: supersedes D-HOP-11's "no chip while paused".)* **Why:** M5.0 has no auto-end for forgotten pauses, so a player who paused Market Hand and forgot about it would otherwise sit at zero sales with no cue. This chip is that reminder. It only offers Sell all and never resumes the worker, so a deliberate pause is respected.
- **On Resume, `noSaleS` / `noCollectS` reset to 0**, so a full hold must pass after Resume. A resumed Asleep worker (energy 0) can trigger the chip 8 s after Resume.
- If MH is Paused and CH is Asleep with E < 1, T-COLLECT can still fire (CH isn't paused).
- Until `m4.flags.pause` exists, these rules are inert, and the Pause ACs run on a fixture (HoE f).
- `fatigueLoss` excludes Paused workers (Pause spec).
### 7.2 Offline return and hidden tab
- Timers run on the focus clock, so a hidden tab (any length) and offline time add nothing. The welcome-back sheet stops the focus clock (C6).
- **Gap ≥ 60 s** (exactly 60.0 counts: the offline settle path, `settleHiddenPeriod`, Pause spec E1) **or a welcome-back sheet: all stall timers reset to 0 through the single `resetStallTimers()` path and start after welcome-back closes.** A gap under 60 s keeps the frozen values (E15). At the earliest, the chip appears `tc_stall_hold_s` later, even if a worker fell asleep offline. The welcome-back line about the sleeping worker (Rule 8) isn't in M5.0. The chip is the M5.0 cue.
- Reload restores no stall state (nothing is saved). Timers start at 0. See §7.5 (v5 save shapes).
### 7.3 Rush Hour (M5.2, forward rules, so M5.0 code must be built this way)
- Rush Hour buyers live in a separate lane, **not in `Q`**. Unserved tap-only Rush buyers never trigger T-SELL, and their sales don't reset `noSaleS` (they aren't queue sales).
- If MH is Asleep during a Rush, the queue still stalls, and the chip shows `mh_asleep · Refill` as usual (`· Manage` with `rc2Refill` = 1, SS-36). The Rush lane UI is unaffected.
- **Naming:** MH's ability call is also called "Rush" (m5-abilities). This spec says **"Rush Hour"** for the event only. A running MH Rush *call* has no effect on the chip, because MH is Working.
### 7.5 v5 save shapes (D-HOP-2026-10-30-38; ACs SS-43–SS-46; **Saves CONFIRMED vs rc/v5 e77fc5c** (Saves 13:37; HoE D-HOE-20261030-22, `engineering/decisions.md` L428))
*Saves 13:37 on rc/v5 e77fc5c: `salesStopped` is a pure function at `src/econ/income.ts:83`; `fatigueCue` is flag-only (`src/config/flags.ts:9`, `src/config/balance.json:172`); nothing is persisted, so `SAVE_VERSION` stays 6 (D-HOE-20261030-22). `stall_id` as a per-session monotonic counter is fine: it lives in `src/telemetry/schema.ts`, which isn't on rc/v5 yet. The snapshot line numbers below drift by about 1 at e77fc5c (income.ts L82 → :83, app.ts L41–52 → :43; `qa/v5-saves/m5-save-cases-DRAFT.md` L200).*
*Derived from the code snapshot at `/tmp/rcv5/src` (files dated 2026-10-30 10:14 CET, not a git checkout; re-check on the final RC): `src/save/save.ts` (`SAVE_KEY` `eggfarm.save`, `SAVE_VERSION` = 6, L6–7; `BAK_KEY` `eggfarm.save.bak`, L133; `RESET_KEYS`, L116), `src/sim/m5-state.ts` (`M5_SAVED_FIELDS` / `M5_SESSION_FIELDS`, L65–67), `src/ui/app.ts` (`UI_KEY` `eggfarm.ui` and `UiFlags`, L41–52), `src/econ/income.ts` L82 (`salesStopped()` selector), `src/config/flags.ts` L9. A grep at 13:28 found no fatigue-cue or stall field in any persisted shape; `src/telemetry/schema.ts` doesn't exist yet.*
- **(1) fatigueCue: no persisted field (as built, and none needed in v5).**
  - Rules 2–4 are derived every frame from `GameState` (the share, §4.8). The only "seen once per save" items in M4.2 are Rule 5's explainer and first-Asleep toast (M4.2 L26–29, AC-F6), which are **not pulled** into M5.0/v5 (§5 table).
  - So the save shape is: **field none, type n/a, default n/a.** Nothing is in `eggfarm.save`, `.bak`, the IndexedDB mirror or `eggfarm.ui`.
  - **Loading a v6 save with workers already Tired/Asleep:** the cue doesn't show on load. The Rule 2 hold starts at 0 on the focus clock, which is stopped while welcome-back is open (C6, §7.2). It shows after `tc_fatigue_cue_hold_s` 5 s of focus time at share ≥ 0.15.
    - That is a **new episode in the new session**: exactly one `fatigue_cue_shown` (§8). Nothing carries a "shown" state across a reload, so the episode before the reload doesn't count.
  - **.bak restore:** nothing to restore or reset. The cue is re-derived from the restored state, the same as a normal load.
  - *PROPOSED, Saves (3ba38cf3) to confirm; only if HoP ever pulls Rule 5, which is not in v5:* `fatigueExplainerSeen?: boolean` and `fatigueAsleepToastSeen?: boolean` as optional v6 `GameState` fields in `M5_SAVED_FIELDS` (absent = false; `SAVE_VERSION` stays 6). This is the `abilitiesCoachSeen` pattern (`m5-state.ts` L61). They would travel with `.bak`, so a restore restores that save's own values.
- **(2) salesStopped: none. Derived at runtime from stock and queue state, not persisted.**
  - `salesStopped()` (`income.ts` L82) and the §4.1 selectors are pure over `GameState`. `noSaleS`, `noCollectS`, the re-arm timer, `stall_id` and the open pair are **session-only**.
  - **On load** (also a `.bak` restore):
    - the chip is re-evaluated from the loaded state, and every stall timer starts at 0 (after welcome-back closes, SS-11);
    - a stall needs the full hold (8 s, or 20 s for `no_mh` / `mh_paused`) and is a **new episode**: a new `stall_id` and no `prev_stall_id` (no carry-over across sessions);
    - **no `sales_stall{resolved}` is ever sent for an episode shown before the save/reload.** That pair was closed in its own session by C6 `focus_lost` on hide. If the page was killed before that, the old `shown` stays unpaired in the old `sid`.

### 7.4 Other M5.0 features
- **Golden-egg Frenzy:** no interaction. A Frenzy with no sales is still a stall.
- **Shift calls (#4):** blocked calls don't affect the chip.
- **Coop-full hint (rc1-b1, not built):** if it ships, it keeps top priority in the goal bubble only. The chip is a different surface.

## 8. Telemetry (pinned, never dropped; in the M5.0 telemetry subset; telemetry-spec `d170eb09` + PMC errata v5 (rev 6 `83424120` at time of writing; sha of record at gate = the one pinned in `engineering/v5-rc-manifest.md`))
- **Citation rule (freeze):** errata line refs in this section are to rev 6 `83424120` (HoQA CONDITIONAL PASS-WITH-NOTES, QA-D-1030-TELERR3). A later errata rev (e.g. rev 7) changes the sha of record via the manifest and doesn't unfreeze this spec.
- **`sales_stall`** `{phase: "shown"|"resolved", stall_id, prev_stall_id?, cause: mh_asleep|mh_paused|mh_unpaid|no_mh|ch_asleep|ch_unpaid|other, farm_level, queue_len, sellable_eggs, coop_eggs, mh_state, ch_state (each working|tired|asleep|unpaid|**paused**|none), focus_s_since_last_sale, session_s}`
- **`sales_stall` resolved** adds `{resolved_by: chip_refill|chip_sell_all|chip_collect|chip_manage|refill_elsewhere|sell_elsewhere|collect_elsewhere|auto_resume|queue_empty|basket_empty|paused|focus_lost|cause_changed|none, time_to_resolve_s, chip_tapped: bool}`. It's emitted at the hide.
  - `time_to_resolve_s` is focus-clock seconds from shown to resolved, 1 dp.
  - **`session_s`** = focus-clock seconds since session start, the same clock as the stall timers and `time_to_resolve_s` (HoQA SS-G7 b). Foreground wall time stays in the envelope `fgMs`.
  - **Pinned-pair dedupe (HoE ruling 17:03):** pinned `sales_stall` pairs are deduped by (role, cause) within an episode, so C6 sheet toggling doesn't multiply pinned pairs. No numeric cap.
  - Exactly one resolved is sent per shown (`stall_id` pairs them). `focus_lost` closes the pair when the chip hides through C6, except that a chip tap opening the Shift sheet (`rc2Refill` = 1) closes it with `chip_manage` (§4.6; still a C6 hide, not a clear; a later sheet Refill is `refill_elsewhere`). A re-show after focus returns is a new `stall_id` and carries `prev_stall_id`, so analysis can join the episode. `time_to_resolve_s` KPIs are computed per joined episode.
- **Rules 2–4:** `fatigue_cue_shown {surface: hud_chip|banner|bubble, loss_per_s, loss_share, n_tired, n_asleep, n_paused, suppressed_by_stall: bool}` (**surface unchanged per D-HOP-2026-10-30-24:** the ≤ 739 icon chip logs `surface: hud_chip`, the same as the sub-line, with no new `fatigue_cue_*` field).
  - **Firing (F-4c ruling, v1.3.23/24; SS-47, SS-49):** `fatigue_cue_shown` fires **once per cue episode**, at the moment the cue becomes eligible. `suppressed_by_stall` = true if the stall chip is up at that moment (cue hidden; for the banner and bubble, §5 excludes and §4.7 replaces them), else false. `fatigue_cue_tapped` fires **once per chip tap, including a tap that closes the popover** (SS-G37 **RULED**, v1.3.24; no new field; SS-48). **Adopted in telemetry errata rev 6 `83424120`** V-2c L102 (D-COL-2026-10-30-15).
    - There is **no resolved event** and no shown/resolved pair for `fatigue_cue_*`.
    - The episode ends when the cue condition clears under the Rule 2 hysteresis: share < `tc_fatigue_cue_clear_share` 0.12 held `tc_fatigue_cue_clear_hold_s` 2 s.
    - **SS-G39 (`rc2Refill` = 0; kill-switch build only, logged, not graded):** the chip-Refill force-clear (SS-12 (d), C4 exception) clears the chip's display state but does **not** end the fatigue episode directly. **Only** the Rule 2 hysteresis (share < 0.12 held 2 s) ends it, which a refill typically triggers about 2 s later. There is no special path.
    - **Mid-episode stall (SS-G35, SS-47):** If the stall chip appears mid-episode, the popover (if open) closes, focus moves to the stall chip, nothing is logged, the episode continues, and `fatigue_cue_shown` is not re-fired when the stall clears and the cue reappears.
    - Popover open/close logs nothing. Manage logs only `shift_sheet_opened{entry: fatigue_chip}`.
  - **Field types (PM Market, v1.3.24; **adopted in errata rev 6 `83424120`** V-2 #1–3, L55–57, signed off per L51; D-COL-2026-10-30-15, unchanged through rev 6, D-COL-2026-10-30-20).** Derived from the code snapshot `/tmp/rcv5/src` (10:14): `incomePerSec` / `grossSalesPerSec` return **float dollars/s** (`src/econ/income.ts` L72–79), the existing "stopped" test rounds them to cents with `Math.round(x * 100)` (L82), `WorkerId` has 4 roles (`src/sim/workers.ts` L4), and `basket` / `coop` are fractional egg counts that the sim floors before use (`src/sim/payout.ts` L22, `actions.ts` L22).
    - **`fatigue_cue_shown` / `fatigue_cue_tapped`:**
      - `loss_per_s`: **int cents/s ≥ 0** = `Math.round(fatigueLoss * 100)`, where `fatigueLoss` = Σ `workerAtRisk` in dollars/s (§4.8). This is the same rounding as `salesStopped()` and matches the `*_cents` convention. The code computes dollars, so the emitter converts once; X on screen keeps its own display formatter.
      - `loss_share`: **float in [0, 1]**, rounded to **3 dp** (`Math.round(share * 1000) / 1000`), using the §4.8 share guard (denominator ≤ 0 → 1 if `fatigueLoss` > 0, else 0). 3 dp keeps the 0.15 / 0.12 thresholds distinguishable. The value is the share at the emit moment.
      - `n_tired`, `n_asleep`, `n_paused`: **int ≥ 0, each ≤ 4**, and `n_tired + n_asleep + n_paused` ≤ 4 (the 4 `WorkerId` roles; unhired roles count 0).
      - `surface`: enum `hud_chip|banner|bubble`. `suppressed_by_stall`: bool, on `fatigue_cue_shown` only.
    - **`sales_stall`:**
      - `phase`, `cause`, `mh_state`, `ch_state`, `resolved_by`: enums as listed above.
      - `stall_id`: **int ≥ 1, a per-session monotonic counter** (the `sheet_id` pattern, D-HOE-20261030-18). `prev_stall_id`: the same type, optional. Pairs are keyed by (`sid`, `stall_id`).
      - `farm_level`, `queue_len`: int ≥ 0. `sellable_eggs`, `coop_eggs`: int ≥ 0 = `Math.floor` of the sim's fractional `basket` / `coop`.
      - `focus_s_since_last_sale`, `session_s`, `time_to_resolve_s`: float seconds ≥ 0, 1 dp (focus clock). `chip_tapped`: bool.
      - No nulls. Optional fields are absent, not null.
- **`session_start.viewport_h` (telemetry v0.6.2; D-HOP-2026-10-30-28 (1); bucket edges approved by HoE 13:03):**
  - `viewport_h` = `window.innerHeight` in CSS px at `session_start`, sent **as a bucket only**: `'<740' | '740-899' | '>=900'`. It's not re-sent on resize, and there's no raw value (no-PII rule, telemetry-spec L139).
  - It lets the analysis split the icon (`'<740'`) and sub-line variants. The variant can still differ from the bucket if the player resizes mid-session; that's accepted.
  - **Boundary (HoE AC, = SS-38 (e)):** innerHeight **739** → `viewport_h = '<740'` and the icon chip; **740** → `'740-899'` and the sub-line. The 740 edge is the same single constant as §4.8's breakpoint.
  - **Owner of the change:** `product/collection/telemetry-spec.md` v0.6.2 (sha1 `d170eb09…`) is **PM Collection's** file, so it isn't edited here. The line to add, in the L27 `session_start` row after `viewport_w (…)`: `viewport_h` (CSS px `innerHeight` at session_start, bucketed `<740` / `740-899` / `>=900`; v5, D-HOP-2026-10-30-28 (1)). Also the L77 payload list and T-AC1 (L143). *(Now carried by telemetry-spec `d170eb09` + errata rev 6 `83424120` V-4.)*
- **Allowlist (item 8; change in another owner's file, not edited here):** `product/collection/telemetry-spec.md` §3.1 (PM Collection) and `src/telemetry/schema.ts` must add `sales_stall`, `fatigue_cue_shown` and `fatigue_cue_tapped` with the fields above, in the same change as the M5.0 wiring PR. T-AC9 fails otherwise.
- **Manage → Refill conversion (D-HOP-2026-10-30-20 addendum 2; deterministic join per PMW key D-PMW-2026-10-30-09; 60 s fallback RETIRED per HoP, v1.3.22).**
  - **Refill-side events (PM Workers' specs, read only, not edited here):**
    - `product/workers/rc2-refill-proposal.md` v1.3, sha1 `2fdd84a21a9a20ce095f540ce154293eab6ac1a4`, v1.3 Telemetry L203–208:
      - `shift_sheet_opened {entry: nav|card|stall_chip, sheet_id, stall_id?}` (L204). `sheet_id` is a per-open id; `stall_id` is present only when `entry` = `stall_chip`.
      - **v1.3.23:** rc2 v1.3.3 (`b1bc3339`, L214; PMW-confirmed 13:20) adds **`fatigue_chip`** to `shift_sheet_opened.entry`, `refill_used.entry_point` and `rest_toggled.entry_point`. It's used when the sheet opens from the fatigue cue, carries no `stall_id`, and uses `sheet_id` as usual.
        - **Allowlist APPROVED:** HoE D-HOE-20261030-18 13:21 addendum (`engineering/decisions.md` `ba52827b` L390).
        - `sheet_id` is a per-session monotonic int counter (L376). The full merged `rest_toggled` and RF5 fields are in rc2 v1.3.3 L208–211.
        - The telemetry-spec line is in errata rev 6 `83424120` V-2c (L103).
      - `refill_used {worker, energy_pct, charges_left, rank_by_risk, by: manual|auto, sheet_id, entry_point: nav|card|stall_chip|auto, stall_id?}` (L205) **+ `fatigue_chip`** (HoE D-HOE-20261030-18 13:21 addendum; errata rev 6; rc2 re-quote pending PMW). `sheet_id` is null for `by:auto` outside a sheet.
      - `rest_toggled {worker, on, energy_pct, sheet_id, entry_point, stall_id?}` (L206).
      - **No `manage_used` event and no alias:** the schema is closed, and wire and export use `refill_used` only (D-HOP-2026-10-30-41 (2), D-HOE-20261030-19 G-4; errata rev 6 L74). This supersedes rc2's one-release alias (L172/L208).
    - `product/workers/m5.1-lighter-refill-proposal.md` v0.8.10, sha1 `f71e45161c14382772e8f76f543452164c51b3b1`, L62/L107: the never-implemented `refill` event is **renamed** `refill_used` (`charges_after` → `charges_left`). This spec uses **`refill_used` only**.
    - Envelope on every event: `type`, `ts`, `sid`, `fgMs` (`product/collection/telemetry-spec.md` `d170eb09…` L20).
  - **Conversion (the only definition):** a `sales_stall{phase: resolved, resolved_by: chip_manage}` with `stall_id` = S counts as converted when:
    - there's a `shift_sheet_opened{entry: stall_chip, stall_id: S}` with `sheet_id` = K; and
    - there's ≥ 1 `refill_used{by: manual, sheet_id: K}`.
    - Conversion = converted chip_manage ÷ all chip_manage, per (role, cause).
    - Secondary cut: same-worker conversion, where also `refill_used.worker` = the cause's worker (`mh_*` → `market_hand`, `ch_*` → `coop_hand`).
  - **Invariants:** every chip_manage has exactly one `shift_sheet_opened{entry: stall_chip}` with the same `stall_id`, in the same `sid`, at `ts` ≥ the resolved `ts`. If one is missing, it counts as not converted and is reported as a data gap.
  - **Fatigue-cue conversion (v1.3.23):** `shift_sheet_opened{entry: fatigue_chip, sheet_id: K}` → ≥ 1 `refill_used{by: manual, sheet_id: K}` (no `stall_id`).
  - **HoE allowlist: APPROVED** (D-HOE-20261030-18 L376: `sheet_id`, `entry_point`, `stall_id`; the 13:21 addendum L390: `fatigue_chip`). `src/telemetry/schema.ts` is a row-11 deliverable (Saves). There's no fallback.
- **KPIs** (HoP review after M5.0 playtest):
  - median `time_to_resolve_s` ≤ 15 s;
  - % of stalls resolved by a chip tap ≥ 50%;
  - `cause: other` count = **0** (anything else is a bug);
  - stalls > 120 s per 30 min at F10+ ≤ 0.2 (baseline: 2 in 21 min, playtest 2026-10-24).

## 9. Edge cases
| # | Case | Rule |
|---|---|---|
| E1 | 0 eggs (E < 1) and coop empty | No chip: production-limited, not a stall (C3) |
| E2 | 0 customers | No chip (C2). An empty queue is never a stall |
| E3 | Sell all in progress (player taps the Market Sell all, or the served-dwell animation is running) | The `sell` event resets `noSaleS` in the same tick, so the chip can't show mid-dwell. If it's already showing, it clears through C1 |
| E4 | Worker refilled mid-chip (chip, card, Manage all or nav) | Clears immediately (C4) with `resolved_by` chip_refill or refill_elsewhere. Timers reset |
| E5 | Partial Sell all (E covers only part of the queue) | Any `sell` clears it (C1). A new stall needs a fresh hold |
| E6 | Cause changes while showing (e.g. MH Unpaid → Asleep) | Text swaps in place, and telemetry logs resolved(`cause_changed`) plus a new shown |
| E7 | MH and CH both off | T-SELL is checked first (eggs to sell). If E < 1, T-COLLECT. One chip at a time |
| E8 | Manage cooldown running (`rc2Refill` = 0 only; SS-36) | Label reads `… · Sell all` / `… · Collect` and the tap runs it (§4.6). It swaps back to `… · Refill` in place when the cooldown ends. The chip stays until C1 or C4 |
| E9 | Reduced motion | Fade only, no scale. Static otherwise |
| E10 | Screen reader | Accessible name = visible text (no `aria-label`); the sentence is in `aria-describedby`. A separate visually hidden polite `role=status` announces it once per show, never again while it stays. A cause swap announces once (≥ 1000 ms throttle); a cooldown label swap doesn't. Focus order: the goal-strip slot's position, before Collect |
| E11 | 360 px with the golden egg or Broody spawned under the strip | Resolved by §4.7: the chip lives in the goal-strip slot, not over the scene, so it can't cover spawn spots, the coop tap area, Full! or the toast strip |
| E12 | Coins at $0 and MH Unpaid with E ≥ 1 | `mh_unpaid · Sell all`, and the Sell all coins auto-resume MH |
| E13 | Tutorial and F0–2 | No chip at all (gates in §4.3) |
| E14 | `tc_stall_hold_s` = 0 | The chip and its telemetry are fully off. Rules 2–4 are unaffected (only the release flag turns those off) |
| E15 | Hidden < 60 s live sim | Worker sales continue in the sim, but the focus clock is frozen, so there's no show. On return, the timers continue from their frozen values (they don't reset). A sale during the hidden time resets them |

## 10. Dependencies (two-way)
| Depends on | Why | Status |
|---|---|---|
| **Patch (a) `fix/m41-patch1`**: targeted rc1 port of AC-R1–R9 (8a49d35) + §4.2 + the D-HOP-14 banner | §4.8 Rules 2–3 reuse the banner and HUD rate slot; §4.2 is delivered there | In progress (HoE). **If it slips, add +0.75–1 dd here**. **AC-R8 (PM Workers, rc1-asleep-state-spec v1.0.7, 8f2435d):** Refill gate T = `manage_prompt_threshold` × 100. That's 50% on origin/main (F1 bae4bdf), and the tests read T from balance. Local main and the old `fix/rc1-*` branches still have 0.4, so the patch must branch from origin/main |
| Economy: CH asleep share (`w2_asleep_collect_share` product 0.15 after D-HOP-16 (6), unread in M5.0) | M5.0 effective 0 (SS-33) | Ruled; no further Economy action for M5.0 |
| Telemetry allowlist (PM Collection, telemetry-spec §3.1) | §8 events | Change requested |
| `focusClock` (D-HOP-09 b) | Stall timers | M5.0 F1b, HoE |
| Pause (`m4.flags.pause`) | §7.1 | M5.0 last PR, may be cut. With no Pause, §7.1 is inert |
| Art & UX | Chip style, icons, final strings, 360/375/390/1280 fit | Signed off (5 changes applied) |
| Economy | Add the 9 UI columns (`tc_` prefix: 5 `tc_stall_*` + 4 `tc_fatigue_cue_*`), no re-run | **Approved, 9 columns** (`tc_stall_min_show_s` dropped by D-HOP-20); in the M5 CSV draft `scratch/v2-econ/economy.m50-draft.csv` for HoP sign-off |
| PM Farm Upgrades (income selector UC18) | §4.2 changes live `incomePerSec` | Signed off (conditions met, v1.2) |
| **Depended on by** M5.1 Refill and charges (§4.6 tap target), M5.1 bulk and contract `reserved` (§4.1), M5.2 Rush Hour (§7.3) | Those specs must cite §4.1 / §7.3 | PM Market owns |

## 11. Acceptance criteria
Sim-level ACs run on the pure selectors (`step()` fixture, like `scratch/l10-stall/repro.ts`). UI ACs use the QA hook **`eggfarmQa.worker.set`** (dev/QA builds only; renamed from `window.eggfarm`, which the release check blocks) to set energy, Unpaid or paused. Widths are 360, 375, 390 and 1280.
- **SS-1 (mh_asleep show):** F17 fixture, MH energy 0, CH Working, basket ≥ 100, queue full. The chip `Market Hand asleep · Refill` shows at 8.0 s ± 0.1 s of focus time with no sale, and not before 7.9 s.
- **SS-2 (Refill tap):** tapping the SS-1 chip with `manageCdS = 0` sets MH energy to 100. The chip hides ≤ 100 ms after the tap (C4) with the 150 ms crossfade to the goal bubble, and a `market_hand` `sell` occurs ≤ 1.1 s later. `sales_stall` resolved has `resolved_by: chip_refill`.
- **SS-3 (cooldown label):** same as SS-1 but `manageCdS = 20`. The chip reads `Market Hand asleep · Sell all` with no `0:ss` badge. The tap performs exactly one Sell all (coins rise by `sellAllPreview` cents), the chip clears through C1, and energy is unchanged. Without a tap, when `manageCdS` reaches 0, the label changes to `Market Hand asleep · Refill` within ≤ 100 ms, in place, with no scale or fade, no announcement and no new `stall_id`. The same holds for `Coop Hand asleep · Collect`.
- **SS-4 (mh_unpaid):** MH Unpaid, coins $0, E ≥ 1. The chip reads `Market Hand unpaid · Sell all`. The tap sells, and MH leaves Unpaid on the next qualifying worker tick (`tick.ts:61-69`).
- **SS-5 (no_mh):** F3, MH not hired, onboarding done, E ≥ 1, |Q| ≥ 1. The chip `Eggs waiting · Sell all` shows at 20 s ± 0.1 s, never at F0–2 and never before onboarding completes.
- **SS-6 (ch_asleep / ch_unpaid):** CH energy 0, basket 0, coop ≥ 1, |Q| ≥ 1. `Coop Hand asleep · Refill` shows at 8 s. With CH Unpaid, `Coop Hand unpaid · Collect` shows, and the tap moves `min(coop, eggs_per_tap)` eggs into the basket.
- **SS-7 (no false stall):** across a 600 s F10–F20 trace with all workers Working or Tired (energy ≥ 1), the chip shows 0 times. In particular, MH Tired (3 s cadence) never triggers.
- **SS-8 (clear conditions):** each of C1–C7 hides the chip within ≤ 100 ms, tested one at a time.
- **SS-9 (re-arm):** after a clear, the chip doesn't reshow before max(full hold, 5 s since hide).
- **SS-10 (Pause, fixture until the flag exists):** with MH Paused, stall conditions otherwise true and a player `sell` at least every 19 s for 60 s, the chip shows 0 times. A Paused CH never shows a chip. After Resume at energy 0, it shows at 8 s ± 0.1 s after Resume, not earlier.
- **SS-11 (offline / welcome-back):** load a save where MH fell asleep offline. While welcome-back is open, there's no chip. After it closes, the chip shows at 8 s ± 0.1 s, not immediately.
- **SS-12 (one alert per role):** MH and CH both Asleep, E ≥ 1. The chip names Market Hand, and the farm banner names **Coop Hand** (never Market Hand). With only MH Asleep, the farm banner is hidden while the chip shows. The HUD fatigue chip is hidden while the stall chip shows. After a C2, C3 or C6 clear, it returns ≤ 1 s later if its Rule 2 **state** is still "shown" (not a share test). After a C4 Refill with share < 0.12, it doesn't return, and its state is cleared at once (§5).
  - **(d) `rc2Refill` = 1:** the chip never refills (its tap opens the Shift sheet, SS-36). So the chip-Refill trigger of the C4 exception above (and in §5) is **inactive (N/A)**. A Refill done in the Shift sheet follows the normal rules: it's an ordinary C4 (resolved `refill_elsewhere` if a pair is open; timers reset), and the HUD fatigue chip uses the state-based return above. With `rc2Refill` = 0, nothing changes.
  - **SS-G39 (`rc2Refill` = 0; kill-switch build only, logged, not graded):** the chip-Refill force-clear (SS-12 (d), C4 exception) clears the chip's display state but does **not** end the fatigue episode directly. **Only** the Rule 2 hysteresis (share < 0.12 held 2 s) ends it, which a refill typically triggers about 2 s later. There is no special path.
- **SS-13 (hidden / sheet):** opening any sheet or hiding the tab for < 60 s hides the chip (C6) and freezes the timer. On return, it reshows immediately if the conditions still hold, with a new `stall_id` carrying `prev_stall_id`. A hidden gap ≥ 60 s resets the timers to 0, and the chip reshows only after a full 8 s hold.
- **SS-14 (Rush Hour forward rule, unit test on the selector):** with an injected non-queue lane holding unserved buyers and `|Q| = 0`, T-SELL is false. With `|Q| ≥ 1`, MH Asleep and the lane active, cause = `mh_asleep`.
- **SS-15 (income fix, live path only):** MH hired and Asleep or Unpaid: live `incomePerSec` equals −(live wages) exactly, so the eggs-sold term is 0, and the HUD rate shows red with the warning icon and is never positive. MH not hired, Working, Tired or Paused: the value equals the pre-change value for the same state. A denominator ≤ 0 in the Rule 2 share gives share 1 (fatigueLoss > 0) or 0, never NaN or Infinity.
- **SS-16 (layout and slot; rects signed by Art, `art-ux/m5-layout-rects-960.md` v1.0, RC 5d9efa6):** the chip lives inside `#goal`. Every `#goal` rect is 44 px tall (±1 px):
  | Size | Mode | `#goal` box x | `#goal` box y | Chip button = hit area x (max 560, centred; signed) | Hit area height | Visible pill y (height, inset) |
  |---|---|---|---|---|---|---|
  | 360×640 | phone | 8–328 | 456–500 | 8–328 (= `#goal`, ≤ 560) | 44 (fills `#goal`) | 458–498 (40, 2 px inset; from `.goal-pill`) |
  | 959×600 | phone | 12–923 | 412–456 | **188–748** (560, centred) | 44 | 414–454 (40, 2 px inset) |
  | 960×600 | docked-compact | 24–536 (`styles.css:300`) | 472–516 | 24–536 (= `#goal`, ≤ 560) | 44 | 472–516 (44, 0 inset, `--goal-h-lg`) |
  | 1024×1366 | phone (portrait) | 12–1012 | 1178–1222 | **232–792** (560, centred) | 44 | 1180–1220 (40, 2 px inset) |
  | 1280×800 | docked | 160–720 | 672–716 | 160–720 (= `#goal`, exactly 560) | 44 | 672–716 (44, 0 inset, `--goal-h-lg`) |
  - **Width:** the chip button (the hit area) is `max-width: 560px`, centred inside `#goal`. Where `#goal` is ≤ 560 px wide (360, 960 docked, 1280), it takes the full `#goal` width; where `#goal` is wider (959×600, 1024×1366), it's 560 px centred and never stretches to the full tablet width. **QA tests the 560 px button**, not the `#goal` box. The x values at 959×600 and 1024×1366 are signed by Art (2026-10-24 17:21).
  - **Hit area (Art, v1.3.9):** the chip's button element fills `#goal`'s full height (44 px), and that is the hit area. The visible pill is drawn inside it: 40 px with a 2 px inset at phone, and 44 px with 0 inset at docked (`--goal-h-lg`). The result is a ≥ 44 px target at every size, with no pseudo-element and no layout shift.
  - With the chip shown or hidden, the customer strip, coop, Collect button and tab bar move by 0 px. While the chip shows, the goal bubble isn't rendered, and it returns ≤ 100 ms after each of C1–C7. Slot priority per §4.7 (stall chip > coop-full > nudge > UC25 > fatigue > buy goals > M4 hints).
  - Clear space ≥ 2 px above (`#meter`) and below (`#collect`) at every size (Art: 8/4 px phone, 8/8 px docked).
- **SS-17 (copy fit):** all 7 strings (incl. `mh_paused`) plus the 2 cooldown labels, in Fredoka 700 14 px with 12 px side padding, all 9 labels fit on one line at weight 700 with no ellipsis within the pill (worst case `Market Hand on break · Sell all` **242 px measured by Art**, 78 px spare in the 320 px slot at 360 (with `rc2Refill` = 0). **With `rc2Refill` = 1, the worst case is `Market Hand asleep · Manage` (33 chars, about 256 px by Art's estimate; measured in the build in the same 3-engine shots, must fit the 320 px slot at 360 on one line)**; source `art-ux/m5-layout-rects-960.md` §E copy-fit table, Chromium 155 on RC 5d9efa6; it's in every 3-engine shot). The UI/Visual Designer takes screenshots in Chromium, Firefox and WebKit at 360/375/390/1280, and Art & UX signs them. No emoji in any chip, banner or HUD string; all icons are SVG and `aria-hidden`. **v1.3.19 (Rule 2 variants):** the 3-engine shots add **360×640 and 375×667 (icon chip, popover closed and open)** and **360×740 (sub-line, at the boundary)**.
- **SS-18 (a11y):** the button has no `aria-label`; its accessible name equals the visible text (WCAG 2.5.3). `aria-describedby` points at the §4.4 sentence for the cause. A separate visually hidden `role=status` (polite) announces that sentence once per show, with ≥ 1000 ms throttle, and none while it stays or on a cooldown label swap. Reduced motion has no scale. Contrast is ≥ 4.5:1.
- **SS-19 (telemetry):** every shown has exactly one resolved with the same `stall_id`, emitted at the hide. `time_to_resolve_s` equals the focus-clock duration within ±0.1 s. All §8 fields are present. `cause: other` fires only in an injected-fault test.
- **SS-20 (effect strings, D-HOP-14):** for MH Asleep, the patch banner, Rule 3 farm banner and chip describedby all contain exactly `Market Hand asleep: sales stopped`. The Unpaid case contains exactly `Market Hand unpaid: sales stopped`. No M5.0 surface shows any Market Hand effect other than "sales stopped" (never "sales slowed" or "production stopped"). The chip describedby begins with the rc2 §6 aria sentence for the same role and state. For CH at synced share 0: the banner reads exactly `Coop Hand asleep: collecting stopped` / `Coop Hand unpaid: collecting stopped`, and the chip describedby starts "Coop Hand is asleep. Auto-collecting has stopped." / "Coop Hand is unpaid. Auto-collecting has stopped." Hawker banners read `Hawker asleep: sales slowed` / `Hawker unpaid: sales slowed`, never `Hawker: sales slowed`. The role drops **only when the full string doesn't fit** the banner (`bannerFit`), never at a fixed width. QA tests 360 as an example width where e.g. `Asleep: sales slowed` may result, but the trigger is the fit, not the width. For every cause, the chip's `{Role} {state}` matches the banner's for the same worker at the same time (never asleep vs unpaid vs on break).
- **SS-21 (no economy effect; two HARD MERGE GATES, D-HOP-2026-10-24-23 = Option B):** seeds 0–99, AC7 harness.
  - **Gate 1, flag off ≡ patch1 golden:** with `m4.flags.salesStopped` off, the sim/economy traces (state, coins, purchases, `bestBuy` picks; AC7 and L10 bot traces), the farm-screen DOM snapshot (360 and 1280) and the telemetry stream are identical to the `fix/m41-patch1` golden, with 0 new events (`sales_stall`, `fatigue_cue_*`).
  - **Gate 2, flag on vs off in the same build:** sim/economy traces (state, coins, purchases, `bestBuy` picks) are byte-identical. With the flag on, telemetry and DOM differences (sales_stall / fatigue_cue_* events, chip rendering) are expected and outside gate 2.
  - **CSV:** this feature's 9 `tc_*` columns (5 `tc_stall_*` + 4 `tc_fatigue_cue_*`) are added, and every pre-existing column on rows L0–30 is unchanged versus CSV c7bb783f. Other M5 features' columns in the shared M5 CSV PR are out of scope here.
  - The flag gates the chip and Rules 2–4 (HoE 17:03). A PR that fails either gate can't merge, with no waiver.
- **SS-22 (config validation):** balance validation computes the floor as max(`w1_tired_every_s`, `w2_tired_every_s`) + 1 **from the loaded config**, with no hard-coded 5. It rejects (a) any non-zero `tc_stall_hold_s` ≤ that floor (today 3 and 4 give a floor of 5, so 1–5 fail and 8 passes; a test config with `w2_tired_every_s` 7 must reject 8), and (b) `tc_fatigue_cue_clear_share ≥ tc_fatigue_cue_min_share`. `tc_stall_hold_s = 0` loads and disables the chip.
- **SS-23 (kill switches; two release flags + CSV):** with `m4.flags.salesStopped` off (release) or `tc_stall_hold_s = 0` (CSV), the chip and `sales_stall` never appear. With **`salesStopped`** off, Rules 2–4 and `fatigue_cue_*` are also absent (= patch baseline), whatever `fatigueCue` is. With `salesStopped` on and **`m4.flags.fatigueCue`** off, there's no Rule 2 HUD chip and no `fatigue_cue_shown{surface:hud_chip}`; the chip and Rules 3–4 behave normally (= gate card FC-AC1). With **`tc_stall_hold_s = 0`** only, Rules 2–4 behave per SS-24 to SS-26.
- **SS-23f (AC amendment v1.3.13; Art ruling 12:39; amended v1.3.19/v1.3.21, Art 12:58 and v1.3 `115891d4`):** Given `fatigueCue` = 0 (any `salesStopped`), the `#rate` sub-line slot is absent and the `#rate`/HUD DOM and rects equal the patch1 golden for that row. Given `fatigueCue` = 1 (`salesStopped` = 1) **and `window.innerHeight` ≥ 740**, the slot is reserved at all times, empty when no chip shows, with 0 px layout shift when the chip shows or hides. Given `fatigueCue` = 1 and **innerHeight < 740**, there's **no slot**: the icon chip is used (SS-38), and the farm layout rects equal flag-off. On a resize or rotate across 739/740, the variant re-evaluates natively through the `(max-height: 739px)` media query, with no JS debounce and no event spam (SS-38; = Art FC-SV1/FC-SV7).
- **SS-24 (Rule 2 = AC-F2 revised; [icon-warning] + text, no emoji):** at share ≥ 0.15 the HUD chip shows within 6 s and doesn't show at 0.14. Once shown, it stays at 0.13 and clears within 3 s at 0.11. X matches Σ `workerAtRisk` within ±1%. The string depends on width ([icon-warning] `Tired −$X/s` below 400 px).
- **SS-25 (Rule 3 = AC-F4 + AC-F13):** with any worker Asleep and no stall chip for that role, the farm banner shows the §4.8 table string plus Refill (verbatim rc2 §6; the role drops only when the full string doesn't fit, `bannerFit`, never at a fixed width) for each of the 4 roles. With several Asleep, it shows the costliest plus `+N more`.
- **SS-26 (Rule 4 = AC-F5 revised):** the bubble reads `Refill workers · +$X/s` under the SS-24 thresholds. Over a 60 s trace oscillating 0.12–0.15 there are 0 extra transitions. With the coop full, the coop-full hint wins if built. With the stall chip showing, the chip wins and the bubble isn't rendered (SS-16).
- **SS-27 (planner unaffected; HARD MERGE GATE, PM Farm Upgrades condition 1):** AC7 bot trace hashes are byte-identical on seeds **1–200** before vs after the §4.2 change, so the ★ and best-buy picks are unchanged. A unit test asserts that `incomePerSec(s, b, working)` with `working` set (the `best-buy.ts` call sites 73, 82, 100, 116–122) returns the pre-change value for MH Asleep and Unpaid fixtures.
- **SS-28 (which ETA; §4.9):** MH Asleep, F10 fixture. `secondsToAffordSteady` returns null and every steady ETA reads "—" within ≤ 1 s. Once the chip shows (8 s ± 0.1 s), the bubble and its countdown aren't rendered. In residual windows (i)–(iii), the bubble or card countdown may keep counting down for ≤ 60 s; QA logs that under KI-SS1/KI-RV5, not as an SS fail. No spec text or UI string claims that the next-goal ETA reads "—".
- **SS-29 (always a next action):** across MH Asleep and MH Unpaid fixtures at 360/375/390/1280, in each of these states: before the hold, chip shown, |Q| = 0, E < 1, cooldown running, and `tc_stall_hold_s = 0`. On every frame where `secondsToAffordSteady` is null because of §4.2, the farm view shows at least one of: the stall chip, the Rule 3 Refill banner (MH Asleep), or the sell-by-hand affordance (Market tab with red dot or docked Sell all), and Collect. The goal-strip slot is never empty: if the bubble's ETA would read "—", it shows its goal label without ETA text.
- **SS-30 (`mh_paused`):** MH Paused, |Q| ≥ 1, E ≥ 1, no sale of any kind. `Market Hand on break · Sell all` shows at 20 s ± 0.1 s (`tc_stall_hold_paused_s`), not before 19.9 s. A player sale at 15 s resets the hold, so the next show is ≥ 20 s after that sale. The tap runs exactly one Sell all, and MH stays Paused (`paused: true`, no Resume, no wage). Pausing an Asleep MH while its chip shows swaps the cause to `mh_paused` and hides it unless `noSaleS ≥ 20`. Telemetry has `cause: mh_paused` and `mh_state: paused`.
- **SS-31 (Paused first, all 4 roles):** pause each of MH, CH, Hawker and Grader at energy 0 (fixture). Each time, that worker gets no Rule 3 banner, no Rule 4 bubble, no yawn cue and no effect string, isn't counted in the Rule 2 `fatigueLoss`, and `fatigue_cue_shown.n_paused` counts it.
- **SS-32 (base rates in share):** with share 0.14 and the HUD chip hidden, starting Rush, Shout, Frenzy or a streak leaves the chip state unchanged for the call's duration, and ending one doesn't toggle it either.
- **SS-33 (CH asleep share pin):** with synced `w2_asleep_collect_share` = 0 (M5.0), an asleep CH emits no `worker_collect`, `ch_asleep` fires per SS-6, and the asleep and unpaid strings read "collecting stopped" (banner and chip aria per §4.8). **The share > 0 case is out of M5.0 (HoQA SS-G23).** The share is pinned at 0, the sim's `isOff` gives 0 collection at any share (HoE), and rc2 §6 no longer has the "collecting slowed" fallback rows. "Collecting slowed" is dropped for M5.0, and rc2 §6 has no fallback rows (Art, 17:07). Any non-zero share must go back to Art for copy first, then this case returns.
- **SS-34 (bubble swap-back and anti-flicker, D-HOP-15 as amended by -19/-20):** F17 fixture at 360 and 1280, with the chip shown for `mh_asleep`.
  - (a) **Real sale or wake:** on the first `sell` (C1), or on Refill (C4), the chip hides ≤ 100 ms after the event. The chip and bubble crossfade over 150 ms ± 1 frame in the same slot. On no frame is the goal slot empty. No chip says "stopped" after a sale.
  - (b) **Wake then sleep again:** Refill elsewhere (chip hides, bubble shows), then set MH energy 0 within 5 s with no sale. The chip doesn't reappear before max(hide + 5 s, re-sleep + 8 s hold) ± 0.1 s. The bubble is rendered on every frame in between (0 chip frames, no flash), and one resolved + at most one new shown is emitted per real reappearance.
  - (c) **Reduced motion:** the swap is instant, with no empty frame.
  - (d) **No min-show:** the build has no `tc_stall_min_show_s` column and no held or grace state (D-HOP-20). The chip is either hidden or shown.
- **SS-35 (chip taps, HoQA QA-1/QA-2):** for every cause:
  - (a) A chip tap performs exactly its §4.4 action. The coop count, credited taps, streak step and tap coins are unchanged (`stopPropagation()`; no `#scene` Collect).
  - (b) A second tap within 500 ms, on the chip or on the slot during the 150 ms crossfade, performs nothing: no second action, no Collect, no goal-bubble activation.
  - (c) A tap on the slot after the guard ends activates the goal bubble normally.
  - (d) The chip's button element fills `#goal`'s full 44 px height at every viewport, and that is the hit area (≥ 44 px). The visible pill is 40 px with a 2 px inset at phone and 44 px with 0 inset at docked. There's no pseudo-element, and the `#goal` height and layout are unchanged (0 px shift).
- **SS-36 (rc2Refill asleep label; D-HOP-2026-10-30-20 (1); no-cooldown-swap CONFIRMED by HoP and Art; label Art to sign):** Given `rc2Refill` = 1 and the Market Hand (or Coop Hand) is Asleep, the chip label is `<Role> asleep · Manage` (also with `manageCdS` > 0: no cooldown swap), and a tap opens the Shift sheet focused on that worker with no refill spent. **Focus target:** the asleep worker's **row heading** in the Shift sheet. It's scrolled into view and receives keyboard/AT focus, the same as the card Manage path (CW B10; Art `art-ux/m5-refill-flows.md` v1.0 `6173f757` §5 L89: "focus on that worker's row heading, row in view").
  - Telemetry: `sales_stall` resolved has `resolved_by: chip_manage`, `chip_tapped: true`. The no-sale timers are frozen, not reset. A Refill made in that sheet is logged as `refill_elsewhere`, never `chip_refill` or `chip_manage`. On the refill side, it's `refill_used{by: manual, entry_point: stall_chip, stall_id, sheet_id}` (rc2 v1.3 L205), and conversion is the §8 `sheet_id` join. Closing the sheet with the conditions still holding reshows the chip as a new `stall_id` with `prev_stall_id`.
  - Given `rc2Refill` = 0, the label and action match v1.3.13.
- **SS-37 (golden-egg reach; = gate card #11 FC-AC9; D-HOP-2026-10-30-20 (2), -24; Art v1.3 `115891d4` L13–14, evidence `34e86e22`):** for each state (pill hidden / pill shown / Broody Y5), the valid golden-egg spot count with `fatigueCue` = 1 equals flag-off (**8/7/4**), and the Broody-eligible slots equal flag-off. No spot is lost or clipped.
  - **(i) ≤ 739 (icon chip built):** at 360×640, 375×667 and 360×739, with the popover **closed and open**.
  - **(ii) ≥ 740 (sub-line):** at 360×740, 360×780 and 390×844.
  - **Measured:** all six viewports give 8/7/4 in 3 engines on rc/v5 e77fc5c (Art 13:06, decisions L514).
  - **Why the variant exists:** the sub-line at 360×640 measured 5/5/3 (S4/S8 14 px from `#meter`, S5 15.5 px from Full!; evidence `34e86e22`). Fixes (a) and (c) weren't needed, and (b) was superseded by the icon chip. Card #11 gap 8 is closed: the 36 vs 17 px gap was 19 px of letterbox slack.
  - **Baseline sources:** `art-ux/m4-timed-collectible.md` v1.1 `28dcff19…` §2.2 L37–41, acknowledged in golden-egg spec R13 (`910098bd…` L133). Rules are R14 L134 and R17 L158. GE-AC15 tests 360×844 by design (PMC); SS-37 owns the short viewports.
  - **Depends on:** the GE-16 re-count with the chip built.
- **SS-38 (threshold; = Art FC-SV1, FC-SV7; CONFIRMED):**
  - (a) With `fatigueCue` = 1: at 360×640, 375×667 and 360×739, `.fslot` is absent and `.hud .fchip` is present. At 360×740, 360×780 and 390×844, `.fslot` is present (390: 8,66,374,28) and there's no `.hud .fchip`.
  - (b) Native media query `(max-height: 739px)` with no JS debounce. The 740 value is one shared constant, used by both the CSS and the §8 `viewport_h` bucket.
  - (c) A resize across 739/740 mid-cue keeps the cue state and the episode: no new `fatigue_cue_shown`, and Rule 2 timers are unaffected. An open popover closes. **Focus (SS-G30, FC-SV11):** if focus was on the chip or inside the popover, it moves to the equivalent control (the sub-line at ≥ 740, the chip at < 740). Otherwise focus is unchanged. Never `body`/null.
  - (f) **Height-only (SS-G32, FC-SV13):** at 960×600, 959×600, 1024×474 and 1280×720 the icon chip renders (`.hud .fchip` present, `.fslot` absent). At the three measured sizes, the chip, settings and popover rects equal FC-SV13, and flag-on spot counts equal flag-off. At 1280×720, QA records the rects and asserts flag-on = flag-off spots. A failure is a fix for Art + HoP, never a width condition.
  - (d) QA viewports: 360×640, 375×667, 360×739 (icon) and 360×740, 360×780, 390×844 (sub-line).
  - (e) **Telemetry boundary (HoE):** innerHeight 739 → `session_start.viewport_h = '<740'` + icon chip; 740 → `'740-899'` + sub-line.
- **SS-39 (icon-only state and spoken name; = Art FC-SV2, FC-SV4):**
  - At ≤ 739 with the cue shown, the chip shows only the icon (`ico_fatigue_sweat` Tired / `ico_fatigue_zzz` Asleep, 20 px in a 44×44 hit box). It has no visible text.
  - It has no `aria-label`. The computed name is exactly the `.sr` sentence (SS-G33, FC-SV14): `Tired workers are costing $X per second. Show details.`, or with any worker Asleep `Asleep and tired workers are costing $X per second. Show details.`. The description is `Tired −$X/s`, and the chip has `aria-expanded` and `aria-controls` (→ the popover).
  - **≥ 740 sub-line (FC-SV14, WCAG 2.5.3):** the computed name is **exactly the visible pill text at that width**, with no `aria-label` and no `.sr` suffix: `Tired −$X/s` below 400 px, and `Tired workers −$X/s` at ≥ 400 px, the same in the Asleep state, never including the decorative ⚠ (Art-confirmed, FC-SV14 `b23ae9e7`). The description is `Tired workers are costing $X per second. Open workers.` (Asleep: `Asleep and tired workers are costing $X per second. Open workers.`).
  - X is visible in the popover, not in `#rate` (which shows net income).
  - With no cue, the chip is absent and **no space is reserved**: top-bar rects equal flag-off (v1.3 L18).
  - Visible copy is icon-only on short viewports (PMW conditions folded into Art v1.3).
- **SS-40 (popover; = Art FC-SV5, FC-SV6, FC-SV8, FC-SV9; HoP condition D-HOP-2026-10-30-24):**
  - (a) A chip tap opens the non-modal popover at 26.1,62–260.4,114 (234×52) at 360×640, **360×739** (SS-G31, FC-SV12: equal to 360×640 in all 3 engines, ±0 px; chip 216.4,5–260.4,49, Manage 82×44, golden spots 8/7/4) and 375×667, with Manage 82×44. **Role (SS-G34, FC-SV15):** the popover is `role="group"` (not `dialog`), `aria-labelledby` = its cue text; the chip has `aria-expanded` + `aria-controls`; the popover is the chip's next DOM sibling, so Tab from the chip lands on Manage and Shift+Tab returns to the chip. It shows `⚠ Tired −$X/s`. Layout shift is 0 px, and focus stays on the chip.
  - (b) The open popover covers **0** golden spots: it intersects no S1–S8 hit box, the toast slot, `#collect`, `nav.actions`, the HUD or the chip.
  - (c) Dismissal by an outside tap **also activates that tap's target, for every target with no swallow exceptions** (golden collect, buys, Sell all), counted on that one tap. Esc closes it and focuses the chip. A second chip tap closes it, and so does cue resolution. It's still open after 10 s idle (no timeout). Crossing 739/740 closes it (SS-38 (c)).
  - (d) Manage opens the Shift sheet at the costliest at-risk worker (SS-48; SS-36 handler; FC-SV9) and spends nothing. Telemetry as SS-48 (SS-G40 (1)): each chip tap logs one `fatigue_cue_tapped`, including the closing tap. Esc, an outside tap, a resize and the cue clearing log nothing. It's never a resolution.
  - (e) Under reduced motion, there's no scale animation (FC-SV8).
- **SS-41 (top bar at 360 wide, ≤ 739 high; = Art FC-SV3; rects from v1.3 L18):**
  - The chip is 216.4,5–260.4,49 and settings 304,5–348,49, both 44×44 ±0.5, with no overlap.
  - Coins and basket are display pills (not tap targets) at the signed 40 px height. **They are non-focusable and non-interactive (SS-G38, FC-SV16):** no `tabindex`, no button role and no handlers, and a tap has no effect. No two of coins, basket, chip and settings overlap.
  - Coins, `#rate`, basket and settings rects equal flag-off (0 px shift when the chip shows or hides), `.hud` scrollWidth equals the viewport width, and this holds in 3 engines.
- **SS-42 (variant tap behaviour; D-HOP-2026-10-30-28 (2); = Art FC-SV10):**
  - At height ≥ 740, a tap on the sub-line pill opens **Workers sorted by costliest** ($/s at risk, descending).
  - At ≤ 739, a chip tap opens or toggles the popover only, and the popover's Manage opens the Shift sheet at the named worker, or with several, at the costliest by `workerAtRisk` loss (ties in code id order `market_hand`, `coop_hand`, `hawker`, `grader`; = SS-48, SS-G40 (2)).
  - Neither tap opens anything else.
  - After a resize across 739/740, the next tap follows the variant **currently shown**.

- **SS-43 (v5 save shapes: nothing persisted; D-HOP-2026-10-30-38; §7.5; **Saves CONFIRMED vs rc/v5 e77fc5c** (Saves 13:37; HoE D-HOE-20261030-22, `engineering/decisions.md` L428)):**
  - With `salesStopped` = 1 and `fatigueCue` = 1, write a save while the stall chip and the fatigue cue are both shown, and another while both are hidden.
  - Neither `eggfarm.save`, `eggfarm.save.bak`, the IndexedDB mirror nor `eggfarm.ui` contains any key for stall or fatigue-cue state.
  - `M5_SAVED_FIELDS` and the `UiFlags` keys are unchanged by these two features, and `SAVE_VERSION` stays 6.
- **SS-44 (load with Tired/Asleep workers; Saves CONFIRMED vs rc/v5 e77fc5c):**
  - Given a v6 save whose loaded state has share ≥ 0.15 (e.g. MH Asleep), when it loads (with and without welcome-back), then no cue renders before 5.0 s ± 0.1 s of focus time, counted after welcome-back closes.
  - Then it shows, and exactly **one** `fatigue_cue_shown` is emitted in the new `sid`.
  - None is re-sent until the cue clears and becomes eligible again.
- **SS-45 (load with a stall condition; Saves CONFIRMED vs rc/v5 e77fc5c):**
  - Given a v6 save with the queue ≥ 1 and MH Asleep, when it loads, then the chip shows at 8 s ± 0.1 s of focus time (20 s for `no_mh` / `mh_paused`; after welcome-back, SS-11).
  - It has a new `stall_id` and no `prev_stall_id`.
  - The new `sid` contains no `sales_stall{resolved}` whose `stall_id` wasn't shown in that `sid`.
- **SS-46 (.bak restore; Saves CONFIRMED vs rc/v5 e77fc5c):** given a recovery that restores from `.bak` (`restored_from_backup`), SS-43–SS-45 hold the same way: cue and chip are re-derived from the restored state, and no flag is restored or reset (none exists).
- **SS-47 (stall chip during an open popover; = HoQA SS-G35; F-4c):**
  - At ≤ 739, with the popover open, when the stall chip shows (§5 hides the HUD chip), then the popover closes and `document.activeElement` = the stall chip.
  - **No telemetry** is logged, and the episode continues. When the stall clears and the HUD chip reappears, `fatigue_cue_shown` is not re-fired. The same holds with the popover closed, and at ≥ 740 (no popover; focus moves to the stall chip only if it was on the sub-line). The episode ends only per Rule 2 hysteresis (share < 0.12 held 2 s; SS-49).
- **SS-48 (popover Manage target and entry; = HoQA SS-G36; with SS-G37):**
  - With ≥ 2 Tired/Asleep workers, Manage opens the Shift sheet with the **costliest at-risk worker** row heading (max `workerAtRisk`; ties in code id order `market_hand`, `coop_hand`, `hawker`, `grader`) scrolled into view and focused.
  - It emits exactly one `shift_sheet_opened{entry: "fatigue_chip", sheet_id}` with no `stall_id`, and no other event.
  - A following manual Refill logs `refill_used{entry_point: "fatigue_chip", sheet_id}` with the same `sheet_id`.
  - **`fatigue_cue_tapped` (SS-G37, RULED v1.3.24):** exactly one per chip tap: the icon-chip tap at ≤ 739, **including the second tap that closes the popover** (open + close = 2 events), and the sub-line tap at ≥ 740. No new field. Esc, an outside tap, a resize and cue resolution close the popover with no `fatigue_cue_tapped`. The popover open/close emits nothing more, and Manage emits no `fatigue_cue_tapped`. **Adopted in errata rev 6 `83424120`** V-2c L102.
- **SS-49 (fatigue_cue_shown once per episode; F-4c):**
  - An episode starts when the cue becomes eligible (Rule 2 show). The episode ends when the cue condition clears under the Rule 2 hysteresis: share < `tc_fatigue_cue_clear_share` 0.12 held `tc_fatigue_cue_clear_hold_s` 2 s. Exactly one `fatigue_cue_shown` per episode, at the moment of eligibility.
  - `suppressed_by_stall` = true iff the stall chip is up at that moment (cue hidden), else false.
  - No `fatigue_cue_*` resolved event exists. Resizes, Esc, outside taps and the cue clearing emit nothing; chip taps log `fatigue_cue_tapped` per SS-48 (SS-G40 (1)).
  - **Mid-episode stall:** If the stall chip appears mid-episode, the popover (if open) closes, focus moves to the stall chip, nothing is logged, the episode continues, and `fatigue_cue_shown` is not re-fired when the stall clears and the cue reappears. (Same rule as SS-47.)
  - **SS-G39 (`rc2Refill` = 0; kill-switch build only, logged, not graded):** the chip-Refill force-clear (SS-12 (d), C4 exception) clears the chip's display state but does **not** end the fatigue episode directly. **Only** the Rule 2 hysteresis (share < 0.12 held 2 s) ends it, which a refill typically triggers about 2 s later. There is no special path.

## 12. Size and open items
- **Size: FINAL 2.05–2.2 dd (HoE, 17:07)**, Features seat, off the critical path, within the **2.2 dd cap** (D-HOP-20). Rule 4 stays. History: v1.1 1.75–2.0 → HoE re-size 2.15–2.4 incl. about 0.25 for the SS-34 min-show state machine → dropped by D-HOP-20 → 1.95–2.2 → **+0.1 dd for the SS-14 seam, the SS-19 fault fixture and SS-35 → 2.05–2.2** (the `eggfarmQa` setters count under the shared X5 debug-hooks line, not this budget).
  - *Indicative PM split from v1.1 (the parts don't sum to the total; HoE's 2.05–2.2 dd is the only size figure and includes the v1.3 deltas and the +0.1 dd for the SS-14 seam, SS-19 fixture and SS-35):*
  - Stall selectors + focus-clock timers + telemetry: 0.5 dd.
  - Chip UI + copy + a11y + tap actions: 0.5 dd.
  - Rule 2 hysteresis: about 0.1 dd (the §4.2 income fix is assigned to patch (a)).
  - Rules 3 and 4 with dedupe: 0.25 dd.
  - Tests (sim fixtures + rc0 UI): 0.25–0.5 dd.
- **Over budget if:** `fix/m41-patch1` slips (+0.75–1 dd), or `focusClock` isn't in place before this PR.
- **Standing rule (HoP 16:50, cap raised to 2.2 by D-HOP-20):** if the size ever exceeds 2.2 dd, cut Rule 4 first, then Rule 2, without a new ruling.
- **v5 ship state (D-CEO-20261030-09/-10, `decisions.md` L103–117):** `salesStopped` and `fatigueCue` ship **ON** in the single v5 release, together with telemetry v0.6.2. There's **no 5.1 deferral and no cut**: a gate failure is fixed and re-gated, and the schedule moves. The D-HOP-2026-10-29-05 line below (fatigueCue default 0, #5b to 5.1) is history.
- **SUPERSEDED for v5 by D-HOP-2026-10-29-05 (HoP, 21:15; itself superseded by D-CEO-20261030-09/-10):** Rule 4 is not cuttable on its own and ships. The only piece that can be cut inside the feature is the Rule 2 HUD chip, via `m4.flags.fatigueCue` = 0 (default 0, gated with `salesStopped`). If #5b fails its gate twice, the whole of #5b moves to 5.1 under the v5 cut rule. The two lines below are history.
- **Cut order if it has to shrink (ruled, D-HOP-2026-10-24-13):** Rule 4 (bubble, about −0.15 dd) first, then Rule 2 (HUD chip, about −0.25 dd; HoE g). The chip and Rule 3 are the core. Rule 3 is also part of the SS-29 guarantee, so it can't be cut.
- **Open:**
  - **Art & UX:** SS-17 screenshots; re-sign v1.3.1 copy; the CH asleep wording (§13 v1.3.1).
  - **HoE:** quick re-confirm of the v1.3 deltas: SS-30 / `tc_stall_hold_paused_s`, `mh_paused`, Paused-first precedence (×4 roles), base-rate share, the off-farm timer rule (d) and `resetStallTimers()`.
  - **Economy:** add 9 `tc_*` columns (5 `tc_stall_*` incl. `tc_stall_hold_paused_s`; 4 `tc_fatigue_cue_*` renamed) in the M5 CSV PR. `tc_stall_min_show_s` was dropped (D-HOP-20).
  - **PM Collection:** telemetry allowlist (§8).
  - **HoQA:** test plan v0.3 covers SS-1 to SS-34; add SS-35 (taps) in v0.4, plus whether SS-21 and SS-27 reuse the AC7 harness.
  - **PM Workers:** agree to the Rule 2 `workerAtRisk` delta (§4.8) and the §5 dedupe, as owner of the source spec.
  - **PM Workers:** lighter-refill proposal for M5.1 (D-HOP-2026-10-24-13; answers review D1).

### 12.1 Sign-offs
| Who | Scope | Status |
|---|---|---|
| Head of Product | Spec v1.1 into M5.0, cut order, §4.2 placement, both Refill entry points | **Accepted**, D-HOP-2026-10-24-13 (16:41). Slot merge at all widths: **D-HOP-15** (16:46). Banner wording: **D-HOP-14/-17**. `mh_paused`: **ACCEPTED, HoP ruling 16:50** (supersedes D-HOP-11 "no chip while paused"), plus the standing over-2.0 cut rule. Min-show default 0 + CH/Hawker strings + anti-flicker via re-arm/hold: **D-HOP-19** (16:56). Min-show column and state machine dropped, Rule 4 kept, cap 2.2 dd: **D-HOP-20** (16:58). **X8 CLOSED (17:06):** confirmed that Collection I_ss = 0 while MH is Asleep or Unpaid is intended (D-C6). Follow-ups: PM Collection owns the '+$0.00' tap-coin popup check; Economy models the live-path zero in the measure:l30plus re-measure |
| PM Farm Upgrades | §4.2 income-selector change (UC18 owner) | **Signed off, conditional; conditions 1–3 met in v1.2** (§4.2, §4.9, SS-27/28/29) |
| Economy / Balance Designer | UI-only columns, no re-run | **Approved: 9 `tc_*` columns**, 5 `tc_stall_*` (`hold_s` 8, `hold_nomh_s` 20, `hold_paused_s` 20, `rearm_s` 5, `tap_guard_ms` 500; no `min_show`, D-HOP-20) + 4 `tc_fatigue_cue_*` (rename accepted). CH share settled by D-HOP-16 (6) |
| Head of Art & UX | Copy, icons, placement, a11y, type, rects | **CONFIRMED, rects signed** (`art-ux/m5-layout-rects-960.md` v1.0, RC 5d9efa6): all `#goal` rects are 44 px tall (959×600 12–923 / 412–456; 960×600 24–536 / 472–516; 1024×1366 12–1012 / 1178–1222; 1280×800 160–720 / 672–716); pill max-width 560, centred (959×600 188–748 and 1024×1366 232–792 signed 17:21); hit area = the chip button filling `#goal`'s 44 px, with the visible pill 40 px / 2 px inset at phone and 44 / 0 at docked (17:21); Fredoka 700. Earlier: v1.3.2 re-sign (16:55), fit rule and hit area (17:07), CH "collecting slowed" dropped |
| PM Workers | Rules 2–4 as moved from v0.2.2, items 1–9; SS-12 | **CONFIRMED v1.3.4 (17:07).** SS-12 state-based restore with the C4 Refill exception confirmed. AC-R8 amended in rc1-asleep v1.0.7 (8f2435d) |
| Head of Engineering | Buildable + size | **FINAL: BUILDABLE**, v1.1 → v1.3.4. **17:07:** all 4 asks are buildable as written (SS-14 seam, SS-19 fault fixture, `eggfarmQa` setters, tap requirement/SS-35); setters are under the shared X5 debug-hooks line. **Final size 2.05–2.2 dd** within the 2.2 cap, Rule 4 stays. Earlier rulings: SS-21 flag on/off, pinned dedupe by (role, cause) |
| Head of QA | Test plan | **v0.4 (17:07) covers SS-1…SS-35** against v1.3.4; all PM-owned v0.3 items resolved. SS-G24 (360 role-drop wording) fixed in v1.3.7. SS-21 ruled (D-HOP-23, Option B), applied in v1.3.8 |

## 13. Review log

### 2026-10-24 ~16:41 · design-doc-review (skill `/home/box/agent-data/workflows/design-doc-review`), run by PM Market on v1.0
I ran the four lenses (game design, systems, economy, QA) inline, because this executor can't spawn reviewers. Values were checked against build 5d9efa6 (`balance.json` `tickHz` 10, MH/CH `tired_every_s` 3/4, `onboarding.ts` `finished`) and the hotfix tip 8a49d35.

**Completeness:** 8/8. Overview §1, fantasy §3, rules §4, formulas §4.1/§4.8, edge cases §9, dependencies §10, tunables §6, ACs §11.

**Dependency check:** the hotfix (a), focusClock (D-HOP-…-09 b), Pause v1.2, the fatigue spec v0.2.2 and the art-ux copy files all exist. The bidirectional links (M5.1 Refill, M5.2 Rush Hour) are in §10.

**Value conflicts (all fixed in v1.1):**
- V1: the range for `tc_stall_hold_s` was 5–15, but the validation rule rejects ≤ 5. The range is now 6–15 (0 = off), and SS-22 has been rewritten.
- V2: SS-21 said "byte-identical apart from 8 new columns", which contradicts itself and covered only L0–11. It now says every pre-existing column on L0–30 is identical.

**Required before implementation (all fixed):**
- R1: the `noSaleS` definition ("or the last change that made Q non-empty…") was ambiguous. It's now a continuous-hold timer that resets when any state condition breaks or on any sale. `noCollectS` works the same way, at tick resolution.
- R2: the C6 re-arm rule ("full hold again") contradicted E15/SS-13 ("continue from frozen"). Added a C6 exception (reshow at once, new `stall_id` + `prev_stall_id`) and defined the ≥ 60 s / welcome-back reset. SS-13 has been rewritten to cover both.
- R3: §4.2 zeroed sales for a **Paused** MH. Pausing to sell by hand would then show a red ⚠ rate while the player is actually selling, which breaks G2. Paused now keeps the old model. Only Asleep and Unpaid are zeroed, and SS-15 has been tightened (exact −wages; no NaN).
- R4: the Rule 2 share divided by `incomePerSec + fatigueLoss`, which can be ≤ 0 at low levels, giving NaN or a negative share. Added a guard and an AC clause.
- R5: hand-waves were made concrete. The onboarding gate is now `onboarding.ts finished`, the warning icon is now the 14 px SVG from the hotfix Unpaid banner, the `mh_unpaid` aria {Y} now uses the `tick.ts` reserve sum, and the HUD-chip hide is now display-only with its state machine running underneath.

**Recommended (fixed or routed):**
- §4.2 changes a selector owned by PM Farm Upgrades (UC18), and steady ETAs read "—" while MH is Asleep or Unpaid. Their sign-off has been added to §10/§12.
- The KPI `time_to_resolve_s` is fragmented by focus loss. Episodes are now joined through `prev_stall_id`.

**Disagreements (kept, noted for HoP):**
- D1 (game design): the chip makes the 15-min Refill chore *visible*. It doesn't make it lighter. The real fix (sleep or auto-rest rules) belongs to PM Workers' M5.x scope and isn't pulled in here (non-goal). The chip is still right for M5.0, because a silent zero is worse than a visible chore.
- D2 (UX): when the stall chip and the Rule 4 bubble both say "Refill", there are two CTAs for one cause. I kept both. The bubble is display-only, ranks goals, and isn't an alert, so the §5 "one alert per problem" rule holds. Art & UX can merge them if 360 px testing shows clutter (golden egg + Broody + chip + bubble, E11).

**Nice-to-have:**
- `·` vs `:` in the Rule 4 bubble copy needs Art sign-off (RV-2b style chosen).
- Rename the MH "Rush" call before M5.2 Rush Hour ships (§7.3).

**Economy lens:** no tunable changes. `bestBuy` and the bot traces are unchanged (SS-21), and P95 bots already refill optimally, so the shared active-reward budget (≤ 2.0) isn't touched. Real players stall less, which only narrows the gap to the modelled curve.

**Scope signal (v1.1 review, historical):** M (at review time 1.75–2.0 dd; final size 2.05–2.2 dd, §12). Cut order: Rule 4, then Rule 2 (§12). There's +0.5–1 dd risk if hotfix (a) slips, because the asleep-state plumbing would land here.

**Verdict:** NEEDS REVISION on v1.0 → all Required items fixed in **v1.1 → APPROVED for HoE buildable check / HoQA test plan**. Open sign-offs (PM Workers, PM Farm Upgrades, Art, Economy columns) are tracked in §12 and don't block the buildable check.

**Out-of-scope risk for HoP (re: hotfix (a)):** at 8a49d35, live `incomePerSec` ignores Market Hand state. If (a) restores the rc1 banner unchanged, an asleep MH will read "sales slowed" while the HUD rate stays positive until M5.0 §4.2 lands. Options: accept until M5.0, or pull the 1-line §4.2 selector change into (a) (~0.25 dd, HoE to size).

### 2026-10-24 ~16:47 · v1.2 consistency check (not a full re-review; per HoP)
Scope: the new and changed ACs (SS-3, SS-16–18, SS-22, SS-24, SS-26, SS-27–29) checked against SS-15, SS-21 and §5.
- **SS-27 vs SS-15:** no conflict. SS-15 covers only the live path. SS-27 covers only the `working` path that `best-buy.ts` uses. Together they fully partition `incomePerSec` calls.
- **SS-27 vs SS-21:** no conflict, and the two are complementary. SS-21 compares the chip and Rules 2–4 on vs off (seeds 0–99). SS-27 compares before vs after §4.2 (seeds 1–200). Both are hard merge gates. If §4.2 moves to patch (a), SS-27 runs in that PR.
- **SS-28 vs SS-15:** consistent. The HUD rate is red at ≤ 0 (SS-15) while the bubble countdown may lag (KI-SS1). §4.9 states the choice (the alert owns the moment), and no AC claims that the next-goal ETA reads "—".
- **SS-29 vs §5:** consistent. When the chip shows for MH, §5 removes MH from the Rule 3 banner, and the chip is the action. When it doesn't show, the Rule 3 banner names MH. One of them is always present for MH Asleep, and Collect plus the Market tab are always present. So SS-29 holds even with the kill switch on, and Rule 3 is now marked as non-cuttable (§12).
- **SS-16 vs §5:** the goal-bubble row in §5 changed from "unchanged" to "replaced in the shared slot", matching §4.7. The HUD fatigue chip row is unchanged.
- **Found and fixed:** E11, the §5 bubble row, SS-24 strings and SS-26 priority still used pre-Art wording. All are updated. Review D2 is resolved by Art change 1.
- **Result:** no contradictions remain. The status stays APPROVED for the HoE buildable check and the HoQA test plan. One HoP decision is open (375+ merge).

## 14. Changelog
- **v1.0 (2026-10-24 ~16:40):** first draft per D-HOP-2026-10-24-11 (b).
- **v1.1 (~16:42):** design-doc-review fixes (R1–R5, V1–V2), see §13.
- **v1.2 (~16:47):** accepted into M5.0 (D-HOP-2026-10-24-13: cut order Rule 4 → Rule 2; §4.2 to patch (a) if ≤ 0.25 dd and live-only; PM Workers owns lighter refill for M5.1; both Refill entry points stay).
  - **PM Farm Upgrades** conditional sign-off, conditions met:
    - §4.2 is live path only;
    - which-ETA statement plus §4.9 "alert owns the moment" with residual KI-SS1;
    - always-a-next-action;
    - new **SS-27** (planner hashes, seeds 1–200, hard gate), **SS-28** (which ETA), **SS-29** (always a next action).
  - **Economy** approved:
    - the SS-22 floor comes from the loaded config (`w1/w2_tired_every_s`);
    - final 8 column names, with no `fatigue_explainer_*`;
    - SS-21 is a hard merge gate.
  - **Art & UX** signed off with 5 changes:
    - the chip moves into the goal-strip slot and replaces the bubble, with slot priority (HoP OK pending for 375+);
    - the cooldown label is `… · Sell all` / `… · Collect` with no badge;
    - accessible name = visible text, plus `aria-describedby` and a separate `role=status`;
    - no emoji, `icon-warning.svg` for unpaid and other causes, and the Rule 2 chip uses the icon;
    - Fredoka 700 14 px (corrected from 600 in v1.3.8; only 500/700 ship), and SS-17 screenshots in 3 engines at 4 widths.
  - Sign-off table §12.1 added.

### 2026-10-24 ~16:51 · v1.3 consistency check (deltas only)
- **SS-20 vs D-HOP-14:** the chip uses `{Role} {state} · {verb}` and the banners use `{Role} {state}: {effect}`, with the same words, so they can't contradict each other. **Conflict, flagged to HoP:** D-HOP-14 has the patch banner read "Market Hand **asleep**: sales stopped" for **Unpaid** too, while the chip says `Market Hand unpaid · Sell all`. Recommendation: the patch keys the state word off the real state (`Market Hand unpaid: sales stopped`). *Resolved in v1.3.1 by D-HOP-17 and rc2-workers-copy §6 row 87.*
- **§5 dedupe still holds:** the Rule 3 banner excludes the chip's role, and Paused workers are never in banners. `mh_paused` names the role only in the chip.
- **`mh_paused` vs §7.1 / HoP brief:** the original brief said "no chip while paused". v1.3 keeps no chip while anything sells and shows one only after 20 s of truly zero sales, never resuming. *Resolved in v1.3.1: ACCEPTED, HoP ruling 16:50.*
- **`tc_` prefix vs Economy note 2:** overridden by HoP via HoE (a). Flagged for Economy.
- **SS-23 vs §6:** the release switch is now the flag. The CSV `0` is secondary. They're consistent.
- **SS-10 vs SS-30:** SS-10 covers paused **with** sales (no chip). SS-30 covers paused with **no** sales (chip at 20 s). They're consistent.
- **SS-29 vs Paused:** for a Paused MH with income ≤ 0, SS-30 or the Market tab provides the action. It holds.

## 14a. Changelog (continued)
- **v1.3 (~16:51):**
  - **§4.2** is assigned to patch (a) `fix/m41-patch1` (HoE confirmed ≤ 0.25 dd, live-only). SS-15, SS-27 and SS-28 are specified for the patch; to be verified by QA on patch1. M5.0 runs them as regression only. Size note updated.
  - **D-HOP-14 wording:** the MH effect is "sales stopped" everywhere. The describedby sentences now use `{Role} {state}: {effect}. Tap to {verb}.`, Rule 3 uses `{Role} asleep: {effect}`, and SS-20 is rewritten.
  - **PM Workers items 1–9 applied:**
    - Paused-first precedence for all 4 roles;
    - `mh_paused` + SS-30 + `tc_stall_hold_paused_s`;
    - icon-warning confirmed;
    - CH share pinned at 0 + SS-33;
    - focusClock named;
    - base-rate share + SS-32;
    - merged slot order;
    - telemetry enums, `n_paused` and the allowlist note;
    - sources. Plus SS-31.
  - **HoE / HoP edits (a)–(h):**
    - `tc_fatigue_cue_*` rename;
    - `m4.flags.salesStopped` release kill switch;
    - QA hook `eggfarmQa.worker.set`;
    - off-farm timers keep running, plus one reset path;
    - patch dependency +0.75–1 dd;
    - Pause gated on its flag, with fixture tests;
    - cut-order savings;
    - HoE buildable recorded.
  - Sign-offs: PM Workers pending confirm of v1.3, Art re-sign needed, Economy asks open.

### 2026-10-24 ~16:53 · v1.3.1 consistency check (copy and rulings)
- **Old v0.2.2 Market Hand effect wording:** no longer appears anywhere in this spec. MH effect = "sales stopped" on every M5.0 surface (§4.2, §4.4, Rule 3, SS-20). Per D-HOP-17, the old wording survives only in the toast and welcome-back line, which aren't in M5.0.
- **Aria:** rc2 §6's "Auto-sales have stopped." is a **banner** aria rule. The chip isn't bound by it, but v1.3.1 adopts it: chip describedby = the §6 aria sentence + " Tap to {verb}.", so both surfaces read the same. This needs Art's re-sign along with the `mh_paused` sentence.
- **Unpaid conflict (v1.3 flag #2):** **resolved, no HoP ruling needed.** D-HOP-17 (16:52) and rc2-workers-copy §6 row 87 give `Market Hand unpaid: sales stopped` (aria "Market Hand is unpaid. Auto-sales have stopped."). This matches the chip's `Market Hand unpaid · Sell all`. Caveat: I couldn't inspect `fix/m41-patch1` itself (it's not in any local worktree). Verified against the copy file, D-HOP-17 and art-ux/decisions 16:48 only. HoQA verifies on the patch SHA (SS-20).
- **New conflict, CH asleep wording (Art + PM Workers, not HoP):** rc2 §6 row 85 has `Coop Hand asleep: collecting slowed`. But M5.0's effective share is 0 (sim `isOff`; D-HOP-16 (6) "unread in M5.0, effective 0"), so collecting has really stopped. That makes "slowed" untrue, and it would disagree with the chip's `Coop Hand asleep · Refill` describedby ("Collecting has stopped"). Proposal: amend row 85 to `Coop Hand asleep: collecting stopped` while the share is unread (rc2 row 91 "true zero" logic would say "production stopped" instead, so Art must pick one). Until then, SS-20/SS-33 for CH are blocked on Art.
- **Hawker effect:** Rule 3 now uses rc2 §6 "sales slowed" (was v0.2.2 "fewer customers") for single-source consistency. PM Workers to note this in their v1.3 confirm.
- **§5 dedupe:** unchanged and still holds. The banner excludes the chip's role, Paused workers are never named, and identical wording means no contradiction even across views.
- **375+ merge:** already ruled by D-HOP-15 (16:46). The §4.7 "pending" note has been removed.

## 14b. Changelog (continued)
- **v1.3.1 (~16:53):**
  - **Copy:** D-HOP-17 copy applied: the MH banner is "asleep / unpaid: sales stopped", and the old v0.2.2 Market Hand effect wording is removed everywhere.
  - **Chip aria:** the describedby sentences are realigned to the rc2 §6 aria ("… Auto-sales have stopped.") + "Tap to {verb}.". Rule 3 strings now come verbatim from rc2 §6.
  - **HoP rulings recorded:**
    - `mh_paused` ACCEPTED (HoP ruling 16:50), with the forgotten-pause rationale;
    - the standing cut rule (threshold later raised to 2.2 dd by D-HOP-20);
    - the 375+ merge marked as ruled by D-HOP-15;
    - SS-33 test value changed to 0.15 (D-HOP-16 (6)).
  - **Conflicts:** the Unpaid conflict is resolved, and the CH asleep wording conflict is flagged to Art and PM Workers.

### 2026-10-24 ~16:55 · v1.3.2 consistency check (min-show only)
- **SS-2 vs SS-34:** SS-2 used to hide the chip ≤ 100 ms after the Refill tap. It now hides at the first sale (≤ 1.1 s), which matches D-HOP-15 ("returns the moment sales resume").
- **SS-8/SS-9 vs §4.5:** both are rewritten for min-show and the grace window. C1 and C6 stay immediate.
- **SS-19 vs deferred resolved:** still exactly one resolved per shown; only its emit time moves.
- **§5:** while the chip is held, the Rule 3 banner still excludes its role, and the HUD fatigue chip stays hidden. Both return when the chip hides.
- **SS-29:** still holds, because a held chip is still a visible action (taps are ignored for at most 3 s, and Collect and the Market tab remain).
- **Validation:** min-show 3 < hold 8 and ≤ rearm 5, so the defaults are valid.

## 14c. Changelog (continued)
- **v1.3.2 (~16:55):**
  - Added `tc_stall_min_show_s` (3 s, range 1–10; **10th column**) and **SS-34** (D-HOP-15 swap-back: the bubble returns on the first tick after a real sale; no flicker on wake and sleep within min-show).
  - §4.5 gains the min-show, reuse-in-place and deferred-resolved rules, plus their interplay with C1–C7 and re-arm.
  - §6: tunable + validation (< hold, ≤ rearm). §8: `reuse_count` and deferred resolved.
  - SS-2, SS-8, SS-9, SS-19 and SS-22 are updated. Column count 9 → 10.

### 2026-10-24 ~16:58 · v1.3.3 consistency check
- `tc_stall_min_show_s` remains only in the history (§13/§14), and the column count is 9 everywhere (§6, SS-21, §12, §12.1).
- SS-2, SS-8, SS-9 and SS-19 are back to hiding on the next tick, matching §4.5 and D-HOP-19 (C1/C4 ≤ 100 ms, no untrue "stopped").
- SS-34 (b) relies only on re-arm + hold (SS-9), so it's consistent.
- SS-20/SS-25/SS-33 and §4.8 use the same rc2 §6 table, so the chip and banners can't contradict each other. §5 dedupe is unchanged.
- SS-29 still holds (the bubble or the chip is always present, and Collect too).

## 14d. Changelog (continued)
- **v1.3.3 (~16:58):**
  - **Art re-sign recorded:** describedby sentences and `mh_paused` / `icon-pause.svg` approved; widest string in SS-17.
  - **Banners:** verbatim from rc2 §6, now a table in §4.8 incl. the role-drop fallback (fit rule). The Hawker state word is always present. CH reads "collecting stopped" / "Auto-collecting has stopped" (asleep and unpaid), keyed to the synced share, reverting to "slowed" if > 0. This unblocks the CH parts of SS-20 and SS-33.
  - **D-HOP-19 / D-HOP-20:**
    - no min-show: C1–C7 hide ≤ 100 ms, with a 150 ms same-slot crossfade;
    - anti-flicker via re-arm + hold;
    - the `tc_stall_min_show_s` column, held/grace states and `reuse_count` removed;
    - SS-34 rewritten; SS-2/8/9/19/22 restored.
  - **HoE:** final BUILDABLE, size then 1.95–2.2 dd (now 2.05–2.2 dd, v1.3.6) within the 2.2 cap, Rule 4 kept; SS-33 sim note added.
  - **Economy row:** 9 `tc_*` columns.

### 2026-10-24 ~17:05 · v1.3.4 consistency check (HoQA v0.3 findings)
- SS-21, SS-23, §6 and E14 now agree: the flag gates the chip + Rules 2–4, and the CSV hold 0 gates the chip only.
- SS-12 and §5 now use one rule (state-based, plus the C4 Refill exception).
- SS-20/25 and §4.8 use the fit rule, matching the rc1-asleep `bannerFit`.
- SS-33 no longer references strings that don't exist.
- SS-35 doesn't change any §4.4 action.
- `session_s` is on the same clock as the timers.

## 14e. Changelog (continued)
- **v1.3.4 (~17:05), resolving HoQA test-plan v0.3:**
  - **SS-G1:** the flag gates the chip + Rules 2–4, off = patch1 baseline, and SS-21 compares on vs off (HoE ruling). The lost §6 flag text is restored.
  - **SS-G22:** the role drops only when the full string doesn't fit.
  - **SS-G3:** state-based return, plus a force-clear after a C4 Refill (PM Workers to confirm).
  - **SS-G4:** `stopPropagation()`, the crossfade tap rule and new **SS-35**.
  - **SS-G7:** `session_s` uses focusClock, and pinned pairs are deduped by (role, cause) (HoE).
  - **SS-G6:** non-360/1280 rects follow the `#goal` box via the `styles.css` rules; exact y and heights are for Art.
  - **SS-G23:** the 0.15 UI case is dropped from M5.0, with a note.
  - **X8 CLOSED (HoP, 17:06):** §4.2's zero live income gives Collection I_ss = 0 while MH is Asleep or Unpaid, as intended (D-C6; streak-tap-coins §4.1a, Broody R8a). Owners: PM Collection ('+$0.00' popup), Economy (measure:l30plus re-measure).
- **v1.3.5 (~17:07):**
  - PM Workers confirmed v1.3.4, including SS-12 state-based restore with the C4 exception.
  - AC-R8 (rc1-asleep v1.0.7, 8f2435d) now reads T = `manage_prompt_threshold` × 100, which is 50% on origin/main (bae4bdf); the tests read it from balance. Local main and the old `fix/rc1-*` branches still have 0.4. Noted in the §10 patch dependency.
  - X8 closure was already recorded in v1.3.4 (§12.1, §14e); no change.
- **v1.3.6 (~17:08):**
  - **HoE:** all 4 asks buildable (setters under X5). The seam, fault fixture and SS-35 add about +0.1 dd, so the final size is **2.05–2.2 dd**, within the 2.2 cap, and Rule 4 stays.
  - **Art:** fit rule confirmed. The hit-area rule of that time (an extended pseudo-element hit box, superseded in v1.3.9) was in SS-16 and SS-35(d). y/heights were TBD from Art at the time (signed in v1.3.8). CH "collecting slowed" is dropped for M5.0.

### 2026-10-24 ~17:18 · v1.3.7 consistency pass (HoP pre-build)
- **Size:** 2.05–2.2 dd everywhere. The v1.1 split is labelled indicative, and older figures are marked as historical.
- **Header:** now matches §12.1 (HoE final, PM Workers confirmed, Art confirmed with y and heights pending, HoQA v0.4).
- **Columns:** 9 everywhere (the §10 Economy row was stale at 10).
- **Patch wording:** every claim that patch ACs were already verified became "specified for the patch; to be verified by QA on patch1" (patch1 isn't built).
- **Times:** changelog and review-log times were corrected to real Europe/Budapest times, reconstructed from the scratch backup mtimes (v1.1 ≤ 16:43:55, v1.2 ≤ 16:48:16, v1.3 ≤ 16:51:55, v1.3.1 ≤ 16:53:59, v1.3.2 ≤ 16:57:27, v1.3.3 ≤ 17:05:24, v1.3.6 file mtime 17:08:03). The earlier entries had been stamped ahead of the clock.
- **SS-G24:** SS-20 and SS-25 now state the fit rule (bannerFit). 360 is an example width only.
- **SS-21 wording dispute (for HoP) — RULED: Option B, D-HOP-2026-10-24-23 (17:20); applied in v1.3.8:**
  - The text says bot traces are "byte-identical … flag on vs off". HoE's 17:03 ruling made flag off = the patch1 baseline. HoQA v0.4 then added "flag off vs patch SHA: traces + DOM snapshot + 0 events" inside the same gate. Sibling M5 plans (abilities, streak, Broody) split this into "flag off ≡ golden" plus "flag on: sim traces identical".
  - Unresolved: (i) whether "trace" covers only sim/economy state or also telemetry and DOM (flag on necessarily emits `sales_stall`/`fatigue_cue_*` and renders the chip); (ii) whether the baseline is the in-build flag off or the patch1 SHA.
  - Separately, the CSV clause ("exactly the 9 new columns") will fail in the shared M5 CSV PR, which also adds other features' columns (D-HOP-16 (5)). Any option should scope it to "this feature's 9 columns".
  - **Options (mutually exclusive):**
    - **A. Sim-only, same build:** the gate compares sim/economy traces (state, coins, purchases, bestBuy picks; no telemetry, no DOM) with flag on vs off in one build. Flag off ≡ patch1 becomes a non-gating golden check.
    - **B. Two gates, sibling-plan pattern:** (1) flag off ≡ patch1 golden (sim traces + farm DOM snapshot + 0 new events); (2) flag on vs off: sim/economy traces byte-identical. Both are hard gates.
    - **C. Patch SHA only:** compare the M5.0 build with the flag on against the patch1 SHA on sim/economy traces, with no in-build on/off run.
    - **D. Keep the v0.4 wording as one gate**, with an explicit exclusion list for flag-on telemetry and DOM.
  - **Recommendation: B.** It matches HoE's "off = patch1 baseline", HoQA's added check and the abilities/streak/Broody plans. It also makes "byte-identical" literally achievable by limiting the on/off comparison to sim/economy state.

## 14f. Changelog (continued)
- **v1.3.7 (~17:18):** HoP pre-build consistency pass.
  - One size (2.05–2.2 dd); header = §12.1; 9 columns.
  - Patch ACs are "specified for the patch; to be verified by QA on patch1".
  - Changelog and review-log times corrected to real Budapest times (from mtimes).
  - SS-20/SS-25 use the fit rule (HoQA SS-G24).
  - SS-21 marked as awaiting HoP's ruling, with options A–D in §13 (ruled Option B in v1.3.8).
- **v1.3.8 (~17:20):**
  - **SS-21 = Option B (D-HOP-2026-10-24-23):** two hard gates. (1) Flag off ≡ patch1 golden: sim/economy traces, farm DOM snapshot, 0 new events. (2) Flag on vs off in the same build: sim/economy traces byte-identical; flag-on telemetry and DOM differences are outside gate 2. The CSV clause covers only this feature's 9 `tc_*` columns. The pending marks are removed.
  - **Art rects signed** (`art-ux/m5-layout-rects-960.md`): SS-16 has a rect table, all 44 px tall: 960×600 x 24–536 (not 12–548), 959×600, 1024×1366, 1280×800.
  - **Chip pill:** max-width 560, centred, never full tablet width. Hit area as then specified (a pseudo-element on phone pills, superseded in v1.3.9).
  - **Font:** Fredoka **700** everywhere (600 doesn't ship). All 9 labels fit at 700.
  - Header and the §12.1 Art row now read "CONFIRMED, rects signed".
- **v1.3.9 (~17:21):**
  - **Art:** signed the derived pill x values (959×600 188–748; 1024×1366 232–792).
  - **Hit area:** the pseudo-element rule is replaced everywhere (SS-16, SS-35(d), §12.1). The chip's button fills `#goal`'s 44 px height, and that is the hit area. The visible pill sits inside it: 40 px with a 2 px inset at phone, 44 / 0 at docked (`--goal-h-lg`). No pseudo-element, no layout shift.
  - **Visible-pill y** added to the SS-16 table (360×640 458–498 from `.goal-pill`; 959×600 414–454; 1024×1366 1180–1220; docked = `#goal`).
- **v1.3.10 (2026-10-28 ~07:49, HoQA SS-G25, non-blocking):**
  - **SS-17 and §4.4:** the worst-case label is now Art's measured 242 px (78 px spare at 360), citing `art-ux/m5-layout-rects-960.md` §E. It replaces the ≈295/320 estimate.
  - **SS-16 table:** the `#goal` box x/y columns are now separate from the chip button / hit-area x (560 px max, centred: 188–748 at 959×600, 232–792 at 1024×1366; the full `#goal` where it's ≤ 560: 360 8–328, 960 24–536, 1280 160–720). The hit area is 44 px everywhere, and the visible pill is 40 px with a 2 px inset at phone. The Width bullet now matches the table, and QA tests the 560 px button.
- **v1.3.11 (2026-10-30 12:32, D-HOP-2026-10-30-16 (2)):**
  - Added `m4.flags.fatigueCue` as the release flag for Rule 2. It's paired with `salesStopped` (same row or `salesStopped` earlier), has no effect when `salesStopped` = 0, and means no Rule 2 HUD chip when it's 0.
  - §6 and SS-23 now list both flags, matching m5-gate-acs.md FC-AC1. The `salesStopped` "gates the chip AND Rules 2–4" wording keeps its meaning, with a note that Rule 2 also needs `fatigueCue`.
  - Also records the v5 L344 note that HoP added under D-HOP-2026-10-29-06 (sha1 `89567243…`; it was v1.3.10 with no version bump).
  - **AC amendment:** SS-23 adds the fatigueCue = 0 clause (= FC-AC1). No other change. *(Wording corrected in v1.3.12 per HoQA; it used to say there was no AC change.)*
- **v1.3.12 (2026-10-30 12:38, HoQA QA-D-1030-SSFC):**
  - Changelog correction only: the v1.3.11 entry now records the SS-23 AC amendment.
  - HoQA's slot question (fatigueCue = 0: reserved or collapsed?) was **not** written into the spec. The Rule 2 HUD chip doesn't render in the goal strip. It renders in the reserved HUD sub-line slot under the top-bar rate (§4.8 Rule 2; fatigue-ux §1, "reserved at all times"; §5 "slot stays reserved"). The goal-strip "fatigue" entry is the Rule 4 bubble. This was escalated to HoP and Art; no rule was written. *Cleared in v1.3.13 (SS-23f, Art ruling 12:39).*
- **v1.3.13 (2026-10-30 12:40; Head of Art & UX ruling 12:39):**
  - **AC amendment: SS-23f; Art ruling 12:39; Art re-signs the fatigue UX doc at 14:30.**
  - The Rule 2 `#rate` sub-line slot exists only when `fatigueCue` = 1 (and so `salesStopped` = 1), reserved at all times. With `fatigueCue` = 0 there's no slot and the HUD equals the patch1 golden.
  - §4.8 Rule 2 and the §5 "slot stays reserved" wording are updated to match. The v1.3.12 slot escalation is cleared.
- **v1.3.14 (2026-10-30 12:45; D-HOP-2026-10-30-20 (1)):**
  - **AC amendment: SS-36 (new; Art to sign).** With `rc2Refill` = 1, the asleep chip label is `<Role> asleep · Manage`, and a tap opens the Shift sheet focused on that worker (no refill spent, no cooldown swap). With `rc2Refill` = 0 it's unchanged.
  - Updated the asleep labels in the §4.4 copy table (`mh_asleep`, `ch_asleep`), the §4.4 describedby text ("Tap to manage.", Art to sign), §4.6, the Rush note and §11.
  - Start-align note: N/A. The spec never said the HUD pill is right-aligned (placement is "per fatigue-ux §1", whose v1.2 errata carries start-align), so the spec text isn't amended.
- **v1.3.15 (2026-10-30 12:49; D-HOP-2026-10-30-20 follow-up):**
  - **SS-36 choice CONFIRMED** by HoP and Art: with `rc2Refill` = 1 there's no cooldown swap.
  - §4.4 convention: "never Manage" now has the `rc2Refill` = 1 asleep exception. That was the only occurrence.
  - **Telemetry:** new `resolved_by: chip_manage` (the chip tap opens the Shift sheet). It's a C6 hide, not a clear: timers freeze. A later sheet Refill is `refill_elsewhere`. The §8 enum, the pair rule and SS-36 are updated.
  - **Width:** with `rc2Refill` = 1 the worst case is `Market Hand asleep · Manage` (33 chars, about 256 px Art estimate), measured in the build in SS-17. The 242 px case stays for `rc2Refill` = 0.
  - **AC amendments:** SS-17, SS-36.
- **v1.3.16 (2026-10-30 12:51; D-HOP-2026-10-30-20 addendum 2):**
  - **Option A recorded:** `chip_manage` closes the pair when the sheet opens (text unchanged since v1.3.15).
  - **§8 Manage→Refill conversion join:** the refill events are cited (rc2 `fc83b817` L27/L30, lighter-refill v0.8.9 `3b64af39` L62, envelope `d170eb09` L20). The preferred deterministic join needs PMW fields. The fallback (same `sid` + `worker`, manual, after chip_manage, ≤ N = 60 s `fgMs`, **provisional**) is in force until then. Missing fields are listed for PMW.
  - **Art erratum:** E8 applies to `rc2Refill` = 0 only (SS-36).
  - No AC change.
- **v1.3.17 (2026-10-30 12:54):**
  - **AC amendments:**
    - **SS-36:** the focus target is the asleep worker's row heading, scrolled into view (as CW B10 / refill-flows L89).
    - **SS-12 (d):** with `rc2Refill` = 1 the chip-Refill C4 exception is N/A, and a sheet Refill is an ordinary C4 (`refill_elsewhere`). The §5 row is annotated to match.
    - **New SS-37** = gate card FC-AC9: 8/7/4 at 360×640, golden-egg spec `910098bd` L133 + Art `28dcff19` §2.2. It notes GE-AC15's 360×844 vs 360×640, depends on GE-16 and Art's mock, and card #11 gap 8 (36 vs 17 px) stays open until Art measures.
  - Also updated: §4.6 rc2Refill text (focus).
- **v1.3.18 (2026-10-30 12:56):** citation-only, no AC change. SS-37's baseline now cites Art `28dcff19` §2.2 L37–41 (acknowledged in R13, `910098bd` L133), and its rules cite R14 L134 and R17 L158. The viewport note is replaced: GE-AC15 tests 360×844 by design (PMC), and SS-37 owns 360×640.
- **v1.3.19 (2026-10-30 12:59; Art ruling 12:58; D-HOP-2026-10-30-24; HoQA testability items):**
  - **AC amendments:**
    - **SS-37 restated:** (i) < 740, icon chip, 8/7/4 at 360×640 and 375×667, with Broody slots = flag-off; (ii) ≥ 740, sub-line at 360×740, TBD. The failing 5/5/3 is recorded. Fix (a) is not needed, (b) is superseded and (c) is not needed. Card #11 gap 8 is closed (19 px letterbox).
    - **SS-23f** gains the innerHeight ≥ 740 condition.
    - **New SS-38** (threshold and resize), **SS-39** (icon-only state, spoken name), **SS-40** (tap → non-modal popover → Manage) and **SS-41** (top-bar 44 px targets).
    - **SS-17** adds shots at 360×640, 375×667 and 360×740.
  - **Telemetry unchanged** (D-HOP-24): the icon chip logs `hud_chip`. There's no viewport-height field, which is an open question for HoP.
  - **Evidence:** Art `061f1271` (that's its sha1; its sha256 is `b55ed731…`, in `art-ux/reviews/fc-ac9/SHA256SUMS`, sha1 `135c6dbf`) and decisions L499 (`a3ed018d`).
  - **Art rulings 12:59 folded in:** `(max-height: 739px)` media query with no JS debounce; a threshold swap closes the popover with no focus loss; popover dismissal, outside-tap pass-through and Esc focus return; coverage AC SS-40 (d) (0 spots standard, ≤ 1 fallback); SS-41 covers coins, rate, basket, chip and settings in 3 engines.
  - **Pending:** the 740 value (Art's threshold run), the popover and top-bar rects plus the coverage bar (Art v1.3, due 16:00), the space-reserved question (SS-39), PMW's copy confirmation, and HoP's viewport-height telemetry question.
- **v1.3.20 (2026-10-30 13:03):** ship/flag text only, no AC change. §12 records the v5 ship state per D-CEO-20261030-09/-10: `salesStopped` and `fatigueCue` ON in v5, no 5.1 deferral, no cut. The D-HOP-29-05 "default 0 / moves to 5.1" line is marked history.
- **v1.3.21 (2026-10-30 13:06; FINAL; Art fatigue-ux v1.3 `115891d4` SIGNED 13:06; D-HOP-2026-10-30-28; HoE 13:03):**
  - **AC amendments:**
    - **SS-37:** 8/7/4 at all six viewports, with the popover open or closed.
    - **SS-38:** CONFIRMED, with the single 740 constant and (e) the `viewport_h` boundary.
    - **SS-39:** no reserved space.
    - **SS-40:** rects, 0-spot coverage (the ≤ 1 fallback is deleted), and pass-through to every target.
    - **SS-41:** rewritten from v1.3 rects; coins and basket are display pills.
    - **New SS-42:** variant tap behaviour.
    - Each maps to Art FC-SV1–FC-SV10.
  - **Correction:** `#rate` shows net income, not X. The popover carries X.
  - **§8:** `session_start.viewport_h` bucket. The line to add to PM Collection's telemetry-spec is noted.
  - **Pins:** fatigue-ux v1.3 `115891d4` and evidence `34e86e22` replace v1.2 `3e4dbc9f` and `061f1271` for the chip. All threshold, coverage and rect TBDs and provisional markers are removed.
- **v1.3.22 (2026-10-30 13:07; D-PMW-2026-10-30-09; HoP decision):**
  - The PMW telemetry key has landed and is verified on disk: rc2 v1.3 `2fdd84a2` L203–208 and lighter-refill v0.8.10 `f71e4516` L62/L107.
  - §8 conversion is now **only** the deterministic `sheet_id` join: chip_manage → `shift_sheet_opened{entry: stall_chip, stall_id}` → `refill_used{by: manual, sheet_id}`.
  - **The 60 s same-sid/worker fallback is RETIRED per HoP** (deleted).
  - The event name is `refill_used` everywhere; there's no `refill`. The "requested from PMW" list is closed.
  - SS-36 cites the refill-side fields. HoE allowlist approval for the new fields is pending.
  - No other AC change.
- **v1.3.23 (2026-10-30 13:28 CET; D-HOP-2026-10-30-38; HoQA test plan §4 SS-G30–G38; Art 13:21 rulings (signed in fatigue-ux v1.3.1 at 13:36, see below); HoE D-HOE-20261030-18 L376/L390; F-4c ruling):** all 9 HoQA gaps closed:
  - G30 → §4.8 focus line, SS-38 (c): focus moves to the equivalent control only from the chip or popover, never `body`. L163 and SS-38 (c) are reconciled.
  - G31 → SS-40 (a): 360×739 = 360×640 rects in 3 engines.
  - G32 → §4.8 breakpoint, SS-38 (f): height-only; 960×600 / 959×600 / 1024×474 / 1280×720 get the icon chip (FC-SV13; CLOSED).
  - G33 → §4.8 a11y, SS-39: the ≤ 739 chip name ends `Show details.`; the ≥ 740 sub-line name = its visible text, with the sentence in describedby; Asleep strings approved (FC-SV14).
  - G34 → §4.8 a11y, SS-40 (a): `role=group`, `aria-labelledby`, `aria-expanded` + `aria-controls`, Manage after the chip.
  - G35 → §4.8, SS-47: the popover closes, focus goes to the stall chip, no event, the episode continues.
  - G36 → §4.8, SS-40 (d), SS-48: costliest worker, `entry: fatigue_chip`, HoE-approved.
  - G37 → §8, SS-48: `fatigue_cue_tapped` once per chip tap.
  - G38 → §4.8, SS-41: coins and basket are non-focusable and non-interactive.
  - **F-4c:** `suppressed_by_stall` kept; `fatigue_cue_shown` once per episode; no resolved pair (§8 reworded; SS-49).
  - **§7.5 v5 save shapes and SS-43–SS-46:** nothing is persisted for either feature (as built); the Rule 5 flags are PROPOSED for Saves only if ever pulled.
  - §8 cites rc2 v1.3.3 `fatigue_chip` and HoE's approval; the fatigue-cue conversion join is added.
  - No number, threshold or rect changes.
- **v1.3.23 completed in place (13:31 CET; Art fatigue-ux v1.3.1 `b72e8ba565e501bdb4be5dd60ca0bbff11a8a461` SIGNED 13:36, `art-ux/decisions.md` L535; pre-edit `2bafd9b3`):**
  - The relayed Art 13:21 citations are replaced by FC-SV11–16, and the short-viewport source is re-pinned to v1.3.1.
  - **Sub-line a11y fix (WCAG 2.5.3):** the ≥ 740 sub-line name = exactly its visible text `Tired −$X/s`, and the `… Open workers.` sentence moves to `aria-describedby`. The ≤ 739 chip is unchanged: its name is the sentence ending `Show details.`, describedby `Tired −$X/s`. No line now says the sub-line name ends `Open workers.`.
  - The Asleep strings are copied verbatim from FC-SV14.
  - G32 is closed: height-only, and 1280×720 docked gets the chip.
  - No AC count, threshold or telemetry change.
- **v1.3.24 (13:34 CET; PM Market; pre-edit v1.3.23 `15b36fe78a8f56aa4d65354aa2984aa25a7ba1f0`):**
  - **G37 RULED:** `fatigue_cue_tapped` fires once per chip tap, including a tap that closes the popover. No new field. Updated in §8 (F-4c firing line) and SS-48. Errata rev 3 L101 needs aligning (PMC rev 4).
  - **G-13 #1–3 field types (PM Market proposal, PMC to adopt):** added to §8:
    - `loss_per_s`: int cents/s.
    - `loss_share`: float in [0,1], 3 dp.
    - `n_*`: int 0–4, sum ≤ 4.
    - `sales_stall`: `stall_id` a per-session int counter; egg counts floored ints; seconds 1 dp.
  - **Sub-line name = its visible text at each width** (WCAG 2.5.3): `Tired −$X/s` < 400 px, `Tired workers −$X/s` ≥ 400 px. The ≥ 400 px case is pending Art's confirmation. Changed in §4.8 a11y and SS-39.
  - No threshold, rect or AC-count change.
- **v1.3.24 completed in place (13:35 CET; pre-edit `45653bc5`):**
  - Art fatigue-ux v1.3.1 is re-pinned to the re-signed `b23ae9e7b9bdbd97ee5d42fb3dd3c302596c771a` (13:40, L541; FC-SV14 only; 5 body cites swapped from `b72e8ba5`). The sub-line name = the visible text at each width (`Tired −$X/s` < 400 px, `Tired workers −$X/s` ≥ 400 px; same for Asleep; never the ⚠). Art CONFIRMED, so 'pending Art' is dropped.
  - **HoQA (a):** the episode end is one sentence everywhere (§8 F-4c, SS-49): Rule 2 hysteresis, share < 0.12 held 2 s.
  - **HoQA (b):** the mid-episode stall rule is stated explicitly in §8 F-4c, SS-47 and SS-49.
  - **HoQA (c):** removed the stray fragment at the end of the §8 'Owner of the change' line (v1.3.23 L291 / v1.3.24 L302). Its content (`fatigue_cue_tapped` fields; `suppressed_by_stall` covering banner/bubble suppression) is now in the Rules 2–4 line and the F-4c sentence.
  - The §8 `fatigue_chip` telemetry-spec line now cites errata rev 3 V-2c.
  - No AC count, threshold or rect change.
- **v1.3.25 (13:39 CET; pre-edit v1.3.24 `b95d5cf8568d772ca66ee450516bef79bafcb578`):** §7.5 and SS-43–SS-46 are marked **Saves CONFIRMED vs rc/v5 e77fc5c** (Saves 13:37; D-HOE-20261030-22 L428). It records the income.ts:83 / flags.ts:9 / balance.json:172 cites and the snapshot line drift. No rule or AC change.
- **v1.3.26 (13:42 CET; pre-edit v1.3.25 `1ea3869d66487ee39238f5bcad29d341d49b3f55`):** citations only. §8 now cites telemetry-spec `d170eb09` + errata **rev 4** `9e02ac3a71ec00395890ed85a45228786ed44fe0` (D-COL-2026-10-30-15; rev 3 `ee707672` frozen). The G-13 types (#1–3) and the G37 tap rule are marked **adopted in errata rev 4** (L55–57, L102). No rule or AC change.
  - **v1.3.26 amendment (13:44 CET; HoQA test plan v0.13 sha256 `7e581eba`, 108 cases):**
    - **SS-G39 ruled:** with `rc2Refill` = 0, the chip-Refill force-clear doesn't end the fatigue episode. Only the Rule 2 hysteresis does, and there's no special path. Added to §8 F-4c, SS-12 (d) and SS-49 (kill-switch build only; logged, not graded).
    - **SS-G40 (1):** §4.8 popover telemetry and SS-40 (d) now match SS-48 (every chip tap logs, including the closing tap; Esc, an outside tap, a resize and the cue clearing log nothing). SS-49 is reworded to match.
    - **SS-G40 (2):** SS-42's 'that worker' now reads 'the named worker, or the costliest by `workerAtRisk` loss'. Ties go in code id order in SS-42, SS-48 and §4.8 Manage.
    - **SS-G40 (3):** the dangling 'see open item' in SS-39 is removed.
    - **SS-G40 (4):** the header cites HoQA plan v0.13, covering SS-1…SS-49.
    - **SS-G42:** §8 drops the stale `manage_used` alias line. There's no alias; `refill_used` only.
- **v1.3.27 (13:46 CET; pre-edit v1.3.26 `1e0aa3a4b829d00e9e360649c247ee03db1ccb1a`, HoQA-verified): FREEZE.** Citations only, no AC changes. §8 re-cites telemetry-spec `d170eb09` + errata **rev 6** `83424120ec7c28560c1852e91955b80da8559ab5` (D-COL-2026-10-30-20; rev 4 `9e02ac3a` and rev 5 `cea3d717` frozen). The L314 `entry_point` quote of rc2 L205 is annotated `+ fatigue_chip` (D-HOE-18 13:21 addendum; rc2 re-quote pending PMW). The header is FROZEN for QA (QA-D-1030-PINFREEZE).
  - **v1.3.27 freeze edit in place (13:48 CET; pre-edit `3f6da993058187b8b70099c0b42249123bfd4be9`; no AC changes):** the telemetry citation in the header and §8 now reads 'telemetry-spec `d170eb09` + PMC errata v5 (rev 6 `83424120` at time of writing; sha of record at gate = the one pinned in `engineering/v5-rc-manifest.md`)', so a rev 7 doesn't unfreeze the spec. Rev 6 = HoQA QA-D-1030-TELERR3 CONDITIONAL PASS-WITH-NOTES.
- **Errata note 1 (2026-10-30 13:56 CET, post-freeze, no AC change; HoQA clarification):** SS-47 L483 "No telemetry is logged" means no **fatigue-cue** events: no `fatigue_cue_shown` re-fire and no `fatigue_cue_tapped` for the auto-close. The stall's own `sales_stall` events still log as normal per §8 (shown/resolved pair keyed by `sid` + `stall_id`). HoQA's reading confirmed.
- **Errata note 2 (2026-10-30 14:11 CET, dated, citation only, post-freeze, no AC change):** Art fatigue UX `art-ux/m4.2-fatigue-visibility-ux.md` is re-pinned to **`ffb13c192ab39427aa5a519c62f8321d9bbaff35`**, replacing `b23ae9e7b9bdbd97ee5d42fb3dd3c302596c771a` (`art-ux/decisions.md` L560, 13:58 CET).
  - Only the §4 fall-asleep toast copy for Hawker/Egg Grader changed. The chip, sub-line and FC-SV ACs are unchanged.
  - Every `b23ae9e7` citation in this spec (L2, L149–171, L449, L847) now reads as `ffb13c19` for the chip, sub-line and FC-SV rows.
- **Errata note 3 (2026-10-30 14:40 CET, dated, clarification + citation only, post-freeze, no AC change; HoQA QA-D-1030-TELERR6 C-1, PM Market ruling D-PMM-2026-10-30-TAPFIELDS):** (a) §8 field types L290–294 are **exact for both** `fatigue_cue_shown` and `fatigue_cue_tapped`: each carries `{surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused}`, with values read at that event's own emit moment (for tapped, the tap). `suppressed_by_stall` is on `fatigue_cue_shown` **only**. A tapped payload of only `{surface, loss_per_s}` (errata row #3 / rev 7) is incomplete; errata rev 13 row #3 and `schema.ts` follow this note. (b) §8 L314: the `refill_used` quote is now rc2-refill **v1.3.16** `e4d986516ba167cde96cdbd4849cb6ef64ffaada` **L211**, whose `entry_point` enum includes `fatigue_chip` (PMW re-quote done; replaces L205 and 'rc2 re-quote pending PMW'). Pause spec is now **v1.3.15** `4c081f6443a9ecfef4a622bf6018263e845a7bf1`.
- **Errata note 4 (2026-10-30 14:55 CET, dated, citation only, post-freeze, no AC change; HoQA re-pin findings on `c29c9285`):** (a) **rc2:** L309 'rc2-refill-proposal.md v1.3 `2fdd84a2` L203–208' and L315 '(L205) … rc2 re-quote pending PMW' now read as rc2-refill **v1.3.16** `e4d986516ba167cde96cdbd4849cb6ef64ffaada`, Telemetry block L209–224, with `refill_used` at **L211**. Its `entry_point` enum already includes `fatigue_chip`, so the PMW re-quote is **done**. (b) **Structure:** note 2's two sub-bullets are moved back under note 2. Note 3 text is unchanged. (c) **Current sources:** the fatigue spec is now `product/workers/m4.2-fatigue-visibility-spec.md` **v0.2.5** `7e1207862922e0f9942f2c821785e23dd3b7ac04`. Its v0.2.3–v0.2.5 changes are copy errata with no change to rules, numbers or flags; v0.2.5 changes L98 Hawker 'fewer customers' to 'sales slowed', which this spec already uses (L640). L6, L143 and L537 read as v0.2.5. Rules 2–4 stay as written in §4.8, which this spec holds. L526, L636 and L640 are history of the v0.2.2 sign-off and old wording, and stay as written. The pause spec is now `m5-worker-pause-spec.md` **v1.3.15** `4c081f6443a9ecfef4a622bf6018263e845a7bf1` (L7, L537). Fatigue UX at L126 reads as Art `art-ux/m4.2-fatigue-visibility-ux.md` `ffb13c19` (current; the `Manage` banner label came in its v1.2 §2 errata and is unchanged since). (d) **Telemetry:** the `fatigue_cue_tapped` field gap is closed in errata **rev 13 `a0e8f6d7`** (all six §8 fields; HoQA TELERR7 PASS, as HoQA reported). Under the §8 L275 rule, the sha of record at the gate stays the one HoE pins in `engineering/v5-rc-manifest.md`.
