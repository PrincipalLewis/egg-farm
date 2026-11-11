# G0 API note: rc2Refill + autoRefill sim (HoE/v5-refill-sim, R1-R9)
**Owner:** Saves (3ba38cf3), builder · **Reviewer:** Architect (205f4268), G0 = APPROVE/CHANGES · **When:** 2026-11-10 03:03 CET · **Paper only, no code.**
**Rev 6 (2026-11-10 04:03 CET).** Every edit bumps the rev, and the new sha256 is announced to Features 95daf662, backfill 1d79672c and Hire 2 821caad7. Changes since the pinned rev 1 (sha256 b456e6eb): rev 2 added §8 (HoE rulings 03:07); rev 3 added §9 (HoP D-HOP-2026-11-10-20: tc_autorefill 30/0, charges_capped_s internal only, the paused/unpaid ≤50% rule, Rest gating plus the B5 lockout, no card Pause at rc2Refill=1); rev 4 added §10 (D-HOE-57: no combo alias, Econ renames the columns tc_combo_window_s and tc_combo_boost_duration_s); rev 5 added §11 (Hire 2 builds asleep_s, Refill adds to it with cwAdd(id,s,0)); rev 6 added §12 (Features' Shift-sheet answers: wrappers, RefillCtx, restEligibility and etaTiredS/etaAsleepS in G2, a session-only toast queue, chargesView before the first tick) plus this header. §1–§7 are unchanged except where §8–§12 supersede them.

**Base:** `origin/rc/v5` d65391b0. **Pins:** HANDOFF.md sha256 c9d13db8; rc2 v1.3.16 sha1 e4d98651; lighter v0.8.14 sha1 c4c1a5cd; save shapes v1.0.5 sha1 3b34c0be; D-HOE-20261030-20/-25; pause spec §4 / rule 8; SIM-API.md (risk helpers) sha256 3a4b62a7. Style follows SIM-API.md: views are pure, the UI reads them every frame and never writes, the UI emits no telemetry, and every event is emitted by the sim. A name can only gain fields; renaming one needs the consumers' OK (Features 95daf662, Hire 2 821caad7, backfill 1d79672c).

## 1. State keys (all OPTIONAL; SAVE_VERSION stays 6; no migration, no `save_migrated`)
| Key | Type / unit | Saved | Default when absent | Load sanitiser (rc2Refill=1 only) |
|---|---|---|---|---|
| `refillCharges?` (top level) | int [0, `charge_cap`] | yes | `start_charges` (2), G-3: also for a new game, a first hire and a pre-refill save | NaN, negative or non-integer → 0; over the cap → cap (F-5b) |
| `chargeNextMs?` (top level) | int **sim** ms until the next charge | yes, only below the cap | below the cap: full `charge_regen_s`×1000 | missing, bad or non-integer → full regen (F-5a); valid → clamp [1, regen]; present at the cap → dropped (F-4) |
| `workers.{id}.restAuto?` | `true` only, next to `paused: true` | yes | absent = Pause (no auto-end) | not `true`, or no `paused: true` → dropped (F-8a) |
| `workers.{id}.autoRefill?` | `true` only (written only when on) | yes | false | with rc2Refill=1 && autoRefill=1: anything but `true` → dropped (AC-LR16); either flag 0 → preserved verbatim |
| `refillAgoMs?` | `Partial<Record<WorkerId, int>>`, sim ms since that worker's last **manual** refill | **no** (session, G-11; HANDOFF calls it `refilledAtS`; GameState has no absolute sim clock, so the sim stores an age) | absent = no combo | stripped by `m5Persist`; `step()` adds dt ms and deletes the entry once it is > `combo_window_s`×1000 |
| `refillSession?` | `{sheetSeq, refillsManual, refillsAuto, chargeStarvedS, shortageS, chargesCappedS, autoToastQueue: WorkerId[]}` | **no** | zeros | stripped |
- I add the saved keys to `M5_SAVED_FIELDS` (`m5-state.ts:69`) and the session keys to `M5_SESSION_FIELDS`. `m5Load` gets an rc2Refill/autoRefill early-out like the breeds one (`m5-fields.ts:57`), so the six-flag paths don't change (F-9 / G-15).
- **Can every key be optional? YES.** No key needs a bump, so I raise no bump item for HoE.
- Charges are materialised on the first rc2Refill=1 tick with at least one worker hired (G-3). A later hire doesn't reset them.

## 2. Pure read views (`src/sim/refill.ts`; UI-safe, no side effects)
```ts
export interface ChargesView { charges: number; cap: number; nextChargeMs: number | null } // null at the cap (F-4)
chargesView(s, b): Readonly<ChargesView>
export type RefillBlock = 'flag_off'|'not_hired'|'unpaid'|'above_threshold'|'no_charges';
refillEligibility(s, id, b): { ok: true } | { ok: false; reason: RefillBlock } // ≤ refill_threshold_pct (50) incl. Asleep and Paused; Unpaid blocked
shiftOrder(s, b): WorkerId[]                // hired, workerAtRisk desc → lower energy → market_hand…grader (AC-RF3 / AC-LR5), from SIM-API costliest ordering
refillableCount(s, b): number               // = refill_used.refillable_n, see OPEN-4
restState(w, b): 'active'|'paused'|'resting'  // = rest_toggled.state (D-HOE-33)
refillAgoSimMs(s, id): number | undefined   // passed to fireAbility FireOpts.refillAgoSimMs (#116 / Boost slot)
autoRefillOn(s, id, b): boolean             // the switch's state; false when rc2Refill=0
```
## 3. Mutators / notes (pure reducers returning `{state, events}` like `fireAbility`; Game wraps them)
```ts
export interface RefillCtx { sheetId: number | null; entryPoint: 'nav'|'card'|'stall_chip'|'fatigue_chip'; stallId?: number }
noteShiftSheetOpened(s, b, entry: ShiftSheetEntry, stallId?: number): { state; events; sheetId: number } // emits shift_sheet_opened; sheetSeq++ (per-session counter ≥ 1)
refillWorker(s, id, b, ctx: RefillCtx): { ok: true; state; events } | { ok: false; reason: RefillBlock; state; events: [] }
setRest(s, id, on: boolean, b, ctx: RefillCtx): { state; events }  // sheet Rest: paused+restAuto; off → resume
setAutoRefill(s, id, on: boolean, b): { state; events }            // autorefill_toggled; no-op unless rc2Refill && autoRefill
takeAutoRefillToast(s): { state; toast: { n: number; worker: WorkerId | null } | null } // AC-LR14: one coalesced toast, drained by the UI on sheet closeComplete
```
- **refillWorker:** spends 1 charge and sets energy to 100. It never writes `cdS` (U1, AC-LR20). A paused worker gets resumed through `resumeWorker`, which emits `rest_toggled{on:false, cause:'manage'}` (rule 8). The call sets `refillAgoMs[id]=0` (manual only, AC-RF4). From the cap it starts a full `chargeNextMs` (F-4). Chip: `noteStallChipTap(s,'manage')` (SIM-API) stays the chip→sheet path; at rc2Refill=1 the chip never refills directly.
- **Tick (R2/R4/R6), only when rc2Refill=1:** charge regen runs on the sim clock, including during Rest and under modals. It is frozen offline and when hidden ≥ 60 s. A visible stall credits the first 60 s (G-5). A Rest worker recovers at `rest_recovery_mult` and auto-ends at 100 with `rest_toggled{on:false, cause:'auto_full', entry_point:'auto', sheet_id:null}`. After that, auto-refill runs (rc2Refill && autoRefill, AC-LR19): it picks workers that have auto on, energy ≤ `tc_autorefill_at_pct`, charges > reserve, not paused and not Unpaid (Asleep included). The costliest goes first, by `shiftOrder`. A manual refill in the same tick goes first (AC-LR15). It never fires offline (AC-LR3) and does not touch `refillAgoMs`. `manageCdS` is not ticked (AC-RF10), and the `manage`/`manageAll` reducers become no-ops (OPEN-6).

## 4. Telemetry the sim emits (schema already on d65391b; the UI emits nothing)
- `shift_sheet_opened{entry, sheet_id, stall_id?}` comes from `noteShiftSheetOpened`. `refill_used{worker, energy_pct (pre-refill), charges_left, rank_by_risk, by, sheet_id|null, entry_point, stall_id?, refillable_n, best_worker, lowest_worker}`: auto refills carry `entry_point:'auto'` and `sheet_id:null`.
- `rest_toggled{…}` is the merged definition. `on:true` carries farm/mood/unpaid/ability_active/golden_on_screen/frenzy_active, and `on:false` carries `paused_duration_s`. **Exclusive emission:** at rc2Refill=1 only `rest_toggled` is emitted, and `worker_paused`/`worker_resumed` plus `session_end.paused_worker_s`/`all_paused_s` (#119) are suppressed. At rc2Refill=0 the reverse holds. QA asserts one event per toggle.
- `autorefill_toggled{worker, on, farm_level}`. On `session_end`: `shortage_s` (rc2Refill), and `refills_manual`, `refills_auto`, `charge_starved_s` (autoRefill on, lighter §6 allowlist).

## 5. Flag contract
- **rc2Refill=0:** none of the §1 keys are read, ticked, cleared or created. Saved values are written back verbatim (G-4). `manageCdS`/`manage` behave exactly as on d65391b. All views return the flag_off/empty state. No new events. Save goldens, the AC7 trace 19d4034d and the v5 suites stay byte-identical.
- **rc2Refill=1, autoRefill=0:** no auto-refill and no `autorefill_toggled`. `autoRefill` keys are preserved. The trace is pinned at build (AC-LR7; FC open item).

## 6. Save plan (G1, red-first)
1. Red: a v5→v6 round-trip (a pre-refill save with SAVE_VERSION 6 and no keys → load with the flags on → defaults → save → reload gives the same state), plus a flags-0 write-back of hand-inserted keys that comes back byte-identical.
2. Sanitiser matrix for F-4, F-5a/b, F-8a and AC-LR16, plus .bak restore G-14 and offline/hidden freeze.
3. Then implement: R1 sync, R2/R3, a G1 push. R4-R8 go to G2.

## 7. OPEN (spec undefined; I don't invent numbers or behaviour)
1. **R1 / Econ-PMW-HoE:** where do `tc_autorefill_at_pct` (30) and `tc_autorefill_reserve` (0) live? A balance.json constant or new CSV columns? The CSV also has `combo_boost_s`, but the code reads `combo_boost_duration_s` (D-HOE-30). I'll map it in R1. Please confirm.
2. **`charges_capped_s`** (rc2 L31, HANDOFF R7) is missing from schema.ts `session_end` and from errata row lists. Should it go on the allowlist (HoE/PMC), or should I drop it? I keep only a session counter until that's ruled.
3. **`rank_by_risk`:** is it 0- or 1-based, and is it ranked among hired workers or among Refillable ones? Proposal: 1-based position in `shiftOrder` (hired).
4. **`refillable_n` / `shortage_s` predicate:** do they include Paused workers ≤50% (refillable, rule 8) or exclude them like `charge_starved_s` does? Unpaid is excluded in both cases.
5. **Rest gating:** does Rest need `m4.flags.pause` (isPaused) and the `tc_pause_unlock_farm` floor? Does the Market Hand `callLockoutS` (B5) apply on `manage`/`auto_full` resume? Proposal: reuse `pauseWorker`/`resumeWorker`, so yes to both.
6. **`manage`/`manageAll` reducers at rc2Refill=1:** proposal is no-op (one entry point, AC-RF1/RF10). Architect, please confirm.
7. **`session_end.asleep_s`** (lighter §6: autoRefill or clockWage): is it built by Refill or by clockWage (Hire 2)?
8. **Refill above the threshold on a Paused worker** (the sheet shows "Rested"): blocked as `above_threshold`, which is the same as for Active. Confirm.
9. **Card pause toggle at rc2Refill=1** (Hire 2's pause UI): the schema rule says `rest_toggled.sheet_id` may be null only for `cause:auto_full`, and the entry_point enum has no 'card-outside-sheet' value. Which `sheet_id`/`entry_point` should a Workers-tab card Pause/Resume carry? (Spec gap, PMC/HoE.)

## §8 HoE rulings (Nov 10 03:07 CET)
- 7.1: tc_autorefill_at_pct / tc_autorefill_reserve become economy.csv columns → balance.json (no code constants; values from Econ/PMW via HoP). R1 maps combo_boost_s → combo_boost_duration_s (D-HOE-30).
- 7.3: rank_by_risk = 1-based position in shiftOrder among hired workers.
- 7.7: Refill builds session_end.asleep_s (incl. autoRefill time); clockWage (Hire 2) adds its time to the same counter later.
- 7.6: manage/manageAll are no-ops at rc2Refill=1. 7.8: a Paused worker above 50% is blocked as above_threshold. (Architect confirms in G0 review.)
- 7.2/7.4/7.5/7.9: with HoP. Interim, behind the flag: session counter only; Paused ≤50% counts as refillable; Rest reuses pause/resume; card Pause toggle left unwired at rc2Refill=1 until HoP rules.

## §9 HoP rulings (D-HOP-2026-11-10-20, product/decisions.md 365248e5), supersede §8 interim
- 7.1: tc_autorefill_at_pct=30, tc_autorefill_reserve=0 as economy.csv columns → balance.json (Econ adds at restart; until then read the same keys from balance.json).
- 7.2: charges_capped_s is sim-internal only. It is not emitted and not on the allowlist.
- 7.4: refillable_n/shortage_s include Paused workers at ≤50% and exclude Unpaid.
- 7.5: Rest is gated on the pause flag + tc_pause_unlock_farm and reuses pause/resume. B5 callLockoutS applies on every resume (incl. manage and auto_full).
- 7.9: at rc2Refill=1 the card has no direct Pause/Resume. Manage opens the Shift sheet with entry:card, and Rest there emits rest_toggled with that sheet_id and entry_point:card. No new enum value.

## §10 D-HOE-57 (Nov 10 03:12 CET), supersedes §8 7.1 combo mapping
- No combo_boost_s → combo_boost_duration_s alias in R1. Econ CSV PR renames to tc_combo_window_s / tc_combo_boost_duration_s. Build to Architect review 03b4cb58 (M1–M4 at G1).

## §11 D-HOE-57 amendment (Nov 10 03:27 CET), supersedes §8 7.7 build order
- Hire 2 (clockWage) builds session_end.asleep_s now, gated on clockWage and independent of rc2Refill (live asleep seconds only, paused workers excluded), plus a per-role welcome-back view. Refill later adds autoRefill time to the same field. No second field.

## §12 Shift-sheet answers to Features (Nov 10 03:55 CET)
1. Game wrappers OK: g.openShiftSheet(entry, stallId?) → sheetId; g.refill(id, ctx) → {ok:true} | {ok:false, reason}; g.setRest(id, on, ctx) → same shape; g.setAutoRefill(id, on); g.takeAutoRefillToast().
2. One RefillCtx {sheetId, entryPoint, stallId?} built at open and reused until closeComplete: OK.
3. openShiftSheet reads StallView.stallId itself (no 4th arg). noteStallChipTap(s, …) is called ONLY by the chip tap handler, never by openShiftSheet.
4. Button mapping OK (above_threshold → Rested, no_charges → countdown, unpaid → Unpaid; paused/asleep from worker state). No separate threshold view: use refillEligibility's reason.
5. chargesView.nextChargeMs is the sim value. The UI shows max(0, ceil(ms/1000)). It can read ≤ 0 between a regen boundary and the next tick. The UI shows whatever the sim clock does under modals and doesn't run its own timer.
6. NEW: pure restEligibility(s, id, b) → {ok:true} | {ok:false, reason} (Saves adds it at G2).
7. NEW: restState(s, id, b) gains etaTiredS / etaAsleepS that apply the Rest multiplier at rc2Refill=1 (G2).
8. The auto-refill toast queue is session-only (never saved) and is drained by takeAutoRefillToast whenever the UI chooses. Losing it on reload is intended.
9. Before the first materialising tick, chargesView returns the load-sanitised values: charges = cap (2) when the key is missing, and nextChargeMs = null at the cap.
10. refillAgoSimMs(s) is the view, and the window length is the balance key tc_combo_window_s (D-HOE-57). The combo decision belongs to #116.
