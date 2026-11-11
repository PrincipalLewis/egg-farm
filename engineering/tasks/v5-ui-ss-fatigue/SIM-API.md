# v5-ui-ss-fatigue sim API (owner Saves 3ba38cf3; moved verbatim from HANDOFF.md by lane U 2026-11-10 01:34 CET to keep HANDOFF <=400 words)

**Rev 3 (2026-11-10 04:03 CET).** Every edit bumps the rev, and the new sha256 is announced to Features 95daf662, backfill 1d79672c and Hire 2 821caad7. Changes since the pinned rev 1 (sha256 3a4b62a7): rev 2 added the Progress section (status only); rev 3 added the Changes section (HoE rulings 03:25 for #128: at fatigueCue=0 the Rule 2 state is kept and only the hud_chip event and taps are suppressed; new setUiGates(s,b,{farmScreenActive,onboardingDone}); no fatigue_cue_shown outside an open episode; workerAtRisk is clamped to 0; stallId is number|null; never-saved stallSession is excluded from the flag-off compare) plus this header. The pinned signatures above are otherwise unchanged.

## Pinned sim API (Saves, HoE ruling 2026-11-10 01:31 CET; paper, code lands from Thu restart in the Saves risk-helpers PR, before #5b)
Saves owns the helpers, the stall timers, the Rule 2 hysteresis and the sales_stall / fatigue_cue_* emitters. #5b/#11 are UI only and read these; they don't re-derive.
All timer state is never-saved session state (same pattern as pausedForS), on focusClock (dt ≤ 1.0 s, 0 offline). A gap ≥ 60 s or welcome-back resets it through the single resetStallTimers() path (spec L246).
```ts
// src/econ/income.ts (signatures from income-ts-out-of-scope.patch, unchanged)
workerAtRisk(id: WorkerId, s: GameState, b: Balance): number
workersAtRisk(s: GameState, b: Balance): Record<WorkerId, number>
costliestAtRisk(s: GameState, b: Balance): WorkerId | null
fatigueShare(s: GameState, b: Balance): number            // 0..1; paused workers excluded (FC-AC3)

// stall + cue read shape (sim; UI reads every frame, never writes)
export type StallCause = 'mh_asleep'|'mh_paused'|'mh_unpaid'|'no_mh'|'ch_asleep'|'ch_unpaid'|'other';
interface StallView {
  shown: boolean;              // hold elapsed and a trigger is met (T-SELL / T-COLLECT, §4.x L61-68)
  trigger: 'sell'|'collect'|null;
  cause: StallCause|null;      // re-evaluated each tick; a change = one resolved/shown pair, emitted by sim
  stallId: number|null;        // int, = sales_stall.stall_id (Changes 03:25; was string)
  noSaleS: number;             // focus seconds
  noCollectS: number;
}
interface FatigueCueView {
  share: number;               // = fatigueShare(s,b)
  shown: boolean;              // Rule 2 state: show at share ≥ tc_fatigue_cue_show_share held tc_fatigue_cue_hold_s; clear at < clear_share held clear_hold_s
  episodeId: string|null;
  suppressedByStall: boolean; // true while the stall chip is visible: HUD display hidden, state machine keeps running (spec §5 L216); UI shows the hud_chip only if shown && !suppressedByStall
}
stallView(s: GameState, b: Balance): Readonly<StallView>
fatigueCueView(s: GameState, b: Balance): Readonly<FatigueCueView>
resetStallTimers(s: GameState): void       // single reset path (gap ≥ 60 s / welcome-back)

// UI → sim notifications (sim emits the telemetry; UI emits nothing itself)
noteStallChipTap(s: GameState, action: 'refill'|'sell_all'|'collect'|'manage'): void
noteFatigueCueShown(s: GameState, surface: 'hud_chip'|'banner'|'bubble'): void   // idempotent per (episodeId, surface): sim dedupes, safe to re-call on re-mount/resize (FC-SV11)
noteFatigueCueTap(s: GameState, surface: 'hud_chip'|'banner'|'bubble'): void
```
Flag-off (salesStopped = 0): every view returns shown:false, null ids, and no events, byte-identical to today. fatigueCue = 0 means FatigueCueView.shown is always false for the hud_chip surface only (Rules 3–4 unaffected). Exact field names may get additive fields only; renames need the backfill engineer's OK.

### Additions (Saves, 2026-11-10 01:36 CET, per UI backfill asks; additive only)
- `FatigueCueView.suppressedByStall: boolean`, the stall-chip precedence, computed in sim.
- `noteFatigueCueShown` is idempotent per (episodeId, surface); the sim dedupes, so re-calls never emit twice.
- Exported types from the module: `StallCause`, `StallResolvedBy` (chip_refill|chip_sell_all|chip_collect|chip_manage|refill_elsewhere|sell_elsewhere|collect_elsewhere|auto_resume|queue_empty|basket_empty|paused|focus_lost|cause_changed|none), `StallView`, `FatigueCueView`, `FatigueSurface` ('hud_chip'|'banner'|'bubble').
- `noteStallChipTap(..., 'manage')` stays in the type but is unused while rc2Refill = 0 (SS-36).

## Progress (Saves, status only; no API edits)
- 2026-11-10 03:17 CET: Draft PR #128 `saves/v5-risk-helpers` @ b70c9c5, red-first tests (`tests/v5-risk-helpers.test.ts`). Implementation next. Module: `src/econ/stall.ts`, every name above re-exported from `src/econ/income.ts`.
- 2026-11-10 03:22 CET: PAUSED for #125. WIP @ e9459a2: all SIM-API names implemented (`src/econ/stall.ts`, re-exported from `income.ts`), signatures unchanged; tsc 0; vitest not run yet. Next: get the focused tests green, then add the AC trace table and mark Ready.

## Changes (HoE rulings 2026-11-10 03:25 CET; Saves #128; tell the UI backfill engineer)
```ts
// src/econ/stall.ts, re-exported from src/econ/income.ts
export interface UiGates { farmScreenActive: boolean; onboardingDone: boolean; }
setUiGates(s: GameState, b: Balance, gates: UiGates): void   // NEW
interface StallView { /* ... */ stallId: number | null; /* ... */ } // was string | null; = telemetry sales_stall.stall_id (int >= 1)
```
- `setUiGates`: the UI calls it every frame or whenever a gate changes (values stay until the next call). It mutates `s` the same way the note* hooks do. It's a no-op with salesStopped = 0, so flag-off stays byte-identical. Until the first call both gates read false, so no chip and no `sales_stall` (the UI must wire it).
  - `onboardingDone` = onboarding.ts `finished`. It is part of the T-SELL / T-COLLECT state conditions (§4.1, §4.3): while it is false, `noSaleS`/`noCollectS` stay at 0.
  - `farmScreenActive` = the farm screen is the active view. Leaving it only hides the chip (HoE d / §4.5 C6): the pair closes as `focus_lost` (or `chip_manage` after a manage tap), the timers keep running, and on return the chip reshows at once with a new `stall_id` and `prev_stall_id`. Rule 2 is not gated by it.
- `workerAtRisk` is clamped at 0 (never negative).
- fatigueCue = 0: `FatigueCueView.shown` keeps the Rule 2 state (Rule 4 bubble uses it); only `fatigue_cue_shown{hud_chip}` and hud_chip taps are suppressed. The UI must not render the hud_chip at fatigueCue = 0 (no slot, SS-23f).
- `noteFatigueCueShown` with no open Rule 2 episode logs nothing: banner/bubble emit only inside an episode.
- 2026-11-10 03:52 CET: #128 READY @ b7a562f. All SIM-API names + Changes (setUiGates, int stallId) implemented; tsc 0, sync-economy 0, focused vitest 142/142, touched suites 591/591. Awaiting hosted CI + HoQA.
