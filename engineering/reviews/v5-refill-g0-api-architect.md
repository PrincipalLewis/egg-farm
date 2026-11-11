# Architect review: G0 API note, rc2Refill + autoRefill sim (HoE/v5-refill-sim)
**Reviewer:** Architect · **When:** 2026-11-10 03:15 CET · **Paper review, read-only on the repo, no code, no push.**
**Reviewed:** `engineering/tasks/v5-refill-sim/G0-API.md` sha256 `b456e6eb58a951216c2cfa10926a09f15bb387724be739010c35dbfae7ec8947` (Saves, 03:03 CET). §7 has no HoE edits (re-checked 03:08 CET, same sha).
**HANDOFF integrity:** `HANDOFF.md` is now `6f10e81b…`. Lines 1-58 hash to `c9d13db877e3…`, the original. Saves only appended L59 (blank) and L60 (the G0 pointer). OK.
**Base:** `origin/rc/v5` `d65391b0868cc993aa39e5bde49d279967c3b8af`. Specs: rc2 v1.3.16 sha1 e4d98651, lighter v0.8.14 sha1 c4c1a5cd, save shapes v1.0.5 sha1 3b34c0be (all verified), and pause spec v1.3.19.
**HoE rulings adopted as given (relayed 03:08 CET, not yet in decisions.md):** 7.1 `tc_autorefill_*` are economy.csv columns. 7.3 `rank_by_risk` is 1-based in `shiftOrder`. 7.7 Refill owns `asleep_s`, and clockWage adds to it. Also standing: no SAVE_VERSION bump, additive optional v6 keys, sanitiser defaults, and a v5→v6 round-trip test.

## Verdict: **APPROVE with conditions** (0 Blocker, 4 Major, 7 Minor)
The shape is right: pure views, sim-owned emitters, reducers that return `{state, events}`, and the flag-0 contract. Every key can be optional, so no HoE bump item. Hire 2 (821caad7) and Features can stub against §2/§3 now. Fold M1–M4 into a G0 v2 diff of the note, or into the G1 push description. I check them at G1 and need no separate G0 round.

## Major
- **M1. Combo name (G0 L57, "I'll map it in R1").** This contradicts **D-HOE-20261030-30** (`engineering/decisions.md` L499-504). The CSV columns are renamed to `tc_combo_window_s` / `tc_combo_boost_duration_s` in Econ's combined CSV PR and reach `m4.tc` through `scripts/sync-economy.ts:185`. They are **not** added to `M5_MAPPED_COLS`, and "no other alias is accepted". So R1 adds **no** `combo_boost_s`→`combo_boost_duration_s` mapping. R1 adds the D-HOE-30 sync test instead (both keys exist when abilities and rc2Refill are on). Unit tests use a fixture balance until Econ's PR lands. The same Econ PR adds constant columns `tc_autorefill_at_pct` = 30 and `tc_autorefill_reserve` = 0 (HoE 7.1), and the sim reads `tcNum(b,'autorefill_at_pct')` and `tcNum(b,'autorefill_reserve')`. Never hand-set these in `balance.json m4.tc`: `fitM4` rebuilds `m4.tc` from the CSV (`sync-economy.ts:184-186`) and would wipe them. The other rc2 columns (`charge_regen_s`, `charge_cap`, `refill_threshold_pct`, `start_charges`, all constant per row, `data/economy.csv` cols 109-111/116) are added to `M5_MAPPED_COLS` under their own names (`sync-economy.ts:152-155`, the sanctioned F3 pattern, no alias). Add `m5-rules` validation when rc2Refill = 1.
- **M2. Session boundary (G0 L13, L33, L45).** `refillSession` (sheetSeq and counters) is said to be stripped on save, but a telemetry session can rotate without a reload: TEL-AC1 rotates on hidden ≥ 60 s (v5-tel-envelope). `sheet_id` is a **per-session** counter ≥ 1 (`schema.ts:63`, D-HOE-18), and the `session_end` totals are per session. Required boundary:
  - Add a pure view `refillSessionTotals(s, b)` that the telemetry `session_end` builder reads. Telemetry never reaches into state.
  - Add a reducer `resetRefillSession(s)` that Game calls on session rotation, right after `session_end` is built. It zeroes the counters and resets `sheetSeq` so the next sheet gets 1. `autoToastQueue` survives the rotation, and `refillAgoMs` is sim state, not telemetry, so it is not reset.
  - Add a test: rotate, then the first `shift_sheet_opened.sheet_id` is 1 and the totals are 0.
- **M3. `rest_toggled{on:false}.paused_duration_s` has no source (G0 L44).** `schema.ts:246` requires it on `on:false` (a count, `schema.ts:182`), and `pause.ts` keeps no clock ("paused? boolean; no clock", save shapes L62). Name one session-only per-worker age in **sim ms** (for example `pausedAgoMs?: Partial<Record<WorkerId,int>>` in `M5_SESSION_FIELDS`):
  - It is ticked only while `isPaused` and the sim advances.
  - It is emitted as whole seconds (floor).
  - It is shared with #119's `worker_resumed.paused_duration_s`. If #119 already carries one, reuse it: one source for both families.
  - A pause that spans a reload counts from load. Say so in the note.
- **M4. Integer sim-ms arithmetic (G0 L9, L12, L40).** `dt` is `1/tickHz` s (`balance.json:3`, 10 Hz), a float. `chargeNextMs`, `refillAgoMs`, `pausedAgoMs` and the `shortageS`/`chargeStarvedS`/`chargesCappedS`/`asleep` accumulators must advance by an integer `Math.round(dt*1000)` per fixed step, never by an accumulated float. Convert at emission: `shortage_s` as whole seconds (floor), and the S1 fields at 0.1 s. This keeps the SG-3 boundary exact (10000 ms combo, 10001 ms not; `abilities.ts:62` inclusive) and the traces stable. `src/sim/refill.ts` must contain no `Date.now`, `performance.now` or `Math.random`. Sort with a total-order comparator (risk desc, energy asc, then the WORKERS index), so ties never depend on float noise or sort stability.

## Minor
- **m1 `energy_pct` integer.** `Worker.energy` is a float, and `PCT = I(0,100)` (`schema.ts:60`) needs an int. Use one helper, `pct(w) = clamp(Math.round(w.energy),0,100)`, for `refill_used` and `rest_toggled`. FYI, outside this PR: `ability_used` emits a raw `w.energy` (`abilities.ts:82`).
- **m2 Sanitiser order and early-out (G0 L14).** `anyFlag` (`m5-fields.ts:26`) excludes rc2Refill and autoRefill. The separate early-out, like the breeds one, is correct, and the tests should cover the rc2Refill-only and autoRefill-only configs. Run the refill sanitiser **after** `pauseLoad` (`m5-fields.ts` m5Load), so the `restAuto` drop (F-8a) sees the sanitised `paused`. With pause = 0, `paused` and `restAuto` stay verbatim, and `restState` reads through `isPaused` (`pause.ts:12`), so the worker is `active`.
- **m3 Charge materialisation (G0 L16).** Prefer a lazy accessor, `chargesOf(s,b) = s.refillCharges ?? tc start_charges`, and write the key on the first mutation. That avoids a state write at tick time with no player action, and an untouched flag-on save stays stable. If you keep the tick-time write, pin it in the flag-on trace.
- **m4 Error precedence.** Fix the `RefillBlock` order for tests: `flag_off` > `not_hired` > `unpaid` > `above_threshold` > `no_charges`.
- **m5 Worker type (G0 L14).** `restAuto?` and `autoRefill?` go on the `Worker` interface (`sim/workers.ts`). `M5_SAVED_FIELDS` (`m5-state.ts:69`) takes only the top-level `refillCharges` and `chargeNextMs`.
- **m6 Toast drain (G0 L37).** The UI calls `takeAutoRefillToast` on any frame with no overlay open, and on sheet closeComplete (lighter edge 5, AC-LR14). It always returns one coalesced toast.
- **m7 `charge_starved_s` / `shortage_s` / `asleep_s` gating.** As G0 §4 has it: `shortage_s` when rc2Refill = 1; `refills_*` and `charge_starved_s` when autoRefill is effective (rc2Refill && autoRefill); `asleep_s` when autoRefill || clockWage (FC L168). Exclude offline time and dropped hidden sim from all of them.

## Checks
| Area | Result |
|---|---|
| Determinism | OK with M4: sim clock only, offline and hidden ≥ 60 s frozen, first 60 s of a visible stall credited (G-5), no RNG. |
| Boundaries | OK with M2: sim computes and emits; UI reads views and sends notes; telemetry reads views; econ supplies `workerAtRisk` (SIM-API, Saves risk-helpers PR); save sanitises in `m5-fields.ts`. |
| Data-driven | OK with M1: every number is a `tcNum` read; no literals except `ENERGY_FULL` (100). |
| Flag 0 | OK (§5): keys untouched and written back verbatim, `manageCdS` path unchanged (`tick.ts:59`), no events. Byte-identical save goldens, AC7 trace 19d4034d and the v5 suites stay green. |
| Migration/sanitiser | OK with m2: F-4, F-5a/b, F-8a and AC-LR16 match D-HOE-25 and save shapes. No bump. Round-trip and flags-0 write-back tests come first (§6). |
| Telemetry vs schema | Fields match `schema.ts:94-96,177-184` and errata rev 7 row 5. `charges_capped_s` is not on the allowlist (item 2). Card toggle `sheet_id` gap (item 9). |
| Testability | Every listed AC maps to a pure-reducer unit test: RF2/3/4/6/10, LR1/3/8/13/15/16/19/20/21, the sanitiser matrix, the round-trip and a one-event-per-toggle assert per flag config. |

## §7 rulings
1. **HoE (adopted):** both keys are economy.csv constant columns (`tc_autorefill_at_pct` 30, `tc_autorefill_reserve` 0) in Econ's CSV PR; read via `tcNum`. Combo: **do not map in R1**; D-HOE-30 renames the columns to `tc_combo_*` (see M1). The other rc2 columns go into `M5_MAPPED_COLS` under the same names.
2. **Architect, with HoE allowlist:** `charges_capped_s` is **not emitted** in v5. The closed schema (`schema.ts:86-99`) would fail it, and adding it is an HoE/PMC allowlist change. Keep `chargesCappedS` in `refillSession` (a few lines) for the R9 harness only. Not blocking.
3. **HoE (adopted):** 1-based position of `worker` in `shiftOrder(s,b)` (hired), so `rank_by_risk` is in [1, hired count]. `best_worker = shiftOrder[0]`. Test: rank = 1 ⇔ worker = best_worker.
4. **Product gap → HoP. Default to build now:** exclude Paused from `refillable_n` and `shortage_s`, the same predicate as `charge_starved_s` (hired, not Paused, not Unpaid, ≤ `refill_threshold_pct`, Asleep included). Grounds: pause rule 8 ("N counts only workers that aren't paused"), the label table (Paused shows its own label, not "Refillable"), and the HoE-adopted `charge_starved_s` definition. Expose one predicate, so an HoP override is a one-line swap. `lowest_worker` uses the same set (fallback: the refilled worker).
5. **Architect: confirm the proposal.** Rest = Pause + `restAuto` (pause spec §4, "nothing rebuilt"), so `setRest` goes through `pauseWorker`/`resumeWorker`. That means Rest needs `m4.flags.pause` and `tc_pause_unlock_farm`, and the B5 Market Hand lockout starts on every resume, `manage` and `auto_full` included (rule 7, "after the Market Hand resumes"; `pause.ts:30-36`). With pause = 0, `setRest` is a no-op returning the same state and no events, and the sheet does not offer Rest.
6. **Architect: confirm the proposal.** At rc2Refill = 1, `manage`/`manageAll` return the same state object and no events, and `manageCdS` is not ticked (AC-RF1/RF10; rc2 v1.0 "Refill all is dropped"). Grounds: one refill entry point. At rc2Refill = 0 they stay byte-identical. Test both.
7. **HoE (adopted):** Refill builds the one `asleep_s` accumulator, and clockWage adds to it and gates on clockWage. Definition (FC L168): Market Hand + Coop Hand worker-seconds in mood `asleep` and not `isPaused`, sim time, 0.1 s, excluding offline and dropped hidden sim. Emitted if autoRefill || clockWage. *Not paused* is my default; HoP may override.
8. **Architect: confirm the proposal.** A Paused worker above `refill_threshold_pct` gets `above_threshold`, the same as an Active one. Grounds: pause rule 8 ("works under its normal rule: energy ≤ threshold") and the rc2 copy "Rested, refill below 50%".
9. **Spec gap → HoP (product: what a Workers-tab card Pause/Resume is at rc2Refill = 1) plus HoE/PMC (schema rule `schema.ts:242`). Default so Hire 2 isn't blocked:** emit `rest_toggled{cause:'manual', entry_point:'card', sheet_id:null}`, with no `stall_id` and the usual `on:true`/`on:false` fields. `RefillCtx` already allows `sheetId:null`. This needs one errata change: "sheet_id null only for cause auto_full **or a toggle outside a sheet (entry_point card)**". Until it is ruled, mark the validator case for the card toggle pending. Do not mint a fake `sheet_id`: it would break the `shift_sheet_opened`↔`sheet_id` join.

## Items for HoE / HoP
- **HoE:** item 2 (allowlist, default not emitted) and item 9 (schema rule change). Neither blocks G1; item 9 must close before G2/QA.
- **HoP:** item 4 (Paused in `refillable_n`/`shortage_s`, default exclude), item 9 (card toggle product meaning), and the item 7 *not paused* clause.

## Addendum 03:12 CET: delta to G0 530efcb4 (§8 HoE, §9 HoP appended; §1-§7 unchanged)
- 7.2, 7.5: §9 matches my rulings.
- 7.4: HoP overrides my default. Paused workers at ≤50% COUNT in refillable_n/shortage_s; Unpaid excluded. Adopted.
- 7.9: HoP ruling adopted (no card Pause/Resume at rc2Refill=1; Rest in the Shift sheet opened with entry:card emits its real sheet_id). My null-sheet_id errata is withdrawn. Consistent with 7.6: the sim reducers manage/manageAll stay no-ops at rc2Refill=1; the UI Manage button only opens the sheet (UI action, no sim mutation).
- 7.7: Refill owns asleep_s incl. autoRefill time (HoE). Paused-exclusion stays my default until HoP rules.
- M1 vs §8 7.1: §8 says R1 maps combo_boost_s -> combo_boost_duration_s citing D-HOE-30, but D-HOE-30 (decisions.md L499-504) says rename to tc_combo_* with no alias. Raised to HoE; until ruled, Saves reads the name that is in balance.json today and adds no alias layer.
- Verdict unchanged: APPROVE with conditions (M1-M4).
- 03:13 CET: HoE ruled D-HOE-30 stands (D-HOE-57 in engineering/decisions.md): rename to tc_combo_* in Econ's CSV PR, no combo_boost_s alias in R1. M1 closed as written.
