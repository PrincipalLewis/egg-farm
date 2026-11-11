# HANDOFF: HoE/v5-refill-sim (manifest row 25: rc2Refill + autoRefill SIM)

**To:** Saves (3ba38cf3), **owner / builder** (D-CEO-20261110-11)
**Reviewer:** Architect (sizing + review gates below). HoQA bar and hosted CI are separate from Architect content PASS.
**From:** Architect · 2026-11-10 01:44 CET · paper only until Thu ~18:00 CET restart · no code, no push.
**Ship value:** `rc2Refill` = 1 and `autoRefill` = 1 (D-CEO-20261110-08: all 14 flags ship 1).
**Base:** `origin/rc/v5` `d65391b0868cc993aa39e5bde49d279967c3b8af`. Branch suggestion: `saves/v5-refill-sim` off rc/v5.

## Pins
- Lighter refill v0.8.14 `product/workers/m5.1-lighter-refill-proposal.md` sha1 `c4c1a5cd` (body = v0.8.13 `13577395`): auto rule §3, edges §5 (1-9), U1/U2 §5a, telemetry §6, AC-LR1-21.
- rc2 Refill base v1.3.16 `product/workers/rc2-refill-proposal.md` (AC-RF1-RF10, v1.2 decisions L155-176, Telemetry v1.3).
- Save shapes v1.0.5 `product/workers/v5-workers-save-shapes.md` sha1 `3b34c0be` + rulings `engineering/decisions.md` D-HOE-20261030-20 (L406-420, incl. 13:45 G-1 correction) and D-HOE-20261030-25 (L443-451, F-4/F-5/F-8/F-9).
- Failure-cost (clockWage) v0.3.24 only for AC-LR20/21 interplay.

## What exists on d65391b
| Piece | State | Cite |
|---|---|---|
| Flag keys `rc2Refill`, `autoRefill` (0) | BUILT | `src/config/balance.json:180-181`, `src/config/flags.ts:10` |
| Abilities combo guard reading an injected `refillAgoSimMs` | BUILT (consumer only) | `src/sim/abilities.ts:28-32,58-62,75` |
| Telemetry schema: `refill_used`, `rest_toggled`, `autorefill_toggled`, `shift_sheet_opened`, session_end `refills_manual/auto`, `charge_starved_s`, `paused_worker_s` (rc2Refill=0 only) | BUILT (schema only, **no emitters**) | `src/telemetry/schema.ts:94-96,177-184` |
| rc2 CSV columns `charge_regen_s`, `charge_cap`, `refill_threshold_pct`, `start_charges`, `combo_window_s`, `combo_boost_s`, `rest_recovery_mult` | in `data/economy.csv:1`; only `rest_recovery_mult` reaches `balance.json:448` | `scripts/sync-economy.ts:177` `fitM4` |
| Manage cooldown path (rc1) | BUILT, still ticked unconditionally | `src/sim/tick.ts:59` (`manageCdS`; was cited as :55 at e77fc5c) |
| Pause `paused` / `isPaused` | BUILT | `src/sim/pause.ts:12`; #119 `fd64aa6c` adds the `worker_resumed` emitter (rc2Refill=0 only) |
| Charges state, regen, Refill action, Rest, auto rule, save keys, emitters | **MISSING** | `git grep refillCharges\|chargeNextMs\|autoRefill d65391b -- src` → only flag key |

## SAVE_VERSION: no bump (correcting the task brief)
The brief says "saved field plus migration with save version bump". The rulings say otherwise: `refillCharges`, `chargeNextMs`, `restAuto`, `workers.{id}.autoRefill` are **optional additive v6 keys, sanitised on load, SAVE_VERSION stays 6** (D-HOE-20261030-20 G-1/G-6; rc2 L175; lighter-refill edge 8 + AC-LR16). So no migration step, no `save_migrated` event. If HoE wants a bump anyway, add +4-6 h (migration, downgrade/newer path, fixtures, goldens).

## Task breakdown (engineer hours to Ready)
| # | Item | Notes / ACs | Hours |
|---|---|---|---|
| R1 | Config + sync | `fitM4` maps the rc2 columns into `m4.tc` (or the workers block) + `m5-rules.ts` validation; decide home of `tc_autorefill_at_pct` (30) / `tc_autorefill_reserve` (0): spec says not a CSV column today → Econ/PMW/HoE call (constant in balance.json vs new CSV cols). Also fixes `combo_window_s` absent for `abilities.ts:62`. | 1.5-2 |
| R2 | Charges state + regen | `refillCharges` int [0,cap], `chargeNextMs` remaining int ms on sim clock; stopped/absent at cap (F-4); regen during Rest and under modals; frozen offline and hidden ≥ 60 s (ruling 3); flag-off: not read/ticked, written back unchanged (G-4). | 2.5-3.5 |
| R3 | Save/load sanitiser hooks (F-9) | in `src/save/m5-fields.ts` beside pause/abilities: missing charges → `start_charges` 2; present-invalid → 0; over max → max; `chargeNextMs` missing/bad → full regen, clamp [1,regen]; `restAuto` without `paused:true` → absent; `autoRefill` boolean per worker, missing → false, kept at flag 0 (AC-LR16). M-3 rest→paused mapping check. Add keys to `M5_SAVED_FIELDS` (`sim/m5-state.ts:69`). | 2-3 |
| R4 | Refill action + Rest + rc1 path swap | `refill{worker}`: ≤ `refill_threshold_pct` (50) incl. Asleep, Unpaid excluded, 1 charge → 100%, ends a pause (pause rule 8); `manageCdS` skipped when rc2Refill=1 (M-5 / AC-RF10, `tick.ts:59`, with test); Rest recovery `rest_recovery_mult` (AC-RF6 3600 s ±2); session-only `refilledAtS` → supplies `refillAgoSimMs` to `fireAbility` (manual only; never auto, AC-RF4/SG-3). Must not write `cdS` (U1, AC-LR20). | 3-4 |
| R5 | Risk ordering | `workerAtRisk` / `costliestAtRisk` from the Saves risk-helpers PR (`engineering/tasks/v5-ui-ss-fatigue/SIM-API.md`); tie → lower energy, then W1→W4 (AC-RF3). Reused, not rebuilt. | 0 (dep) |
| R6 | Auto-refill rule in tick | requires rc2Refill (AC-LR19); per worker on, energy ≤ 30, charges > reserve 0; paused/Unpaid excluded, Asleep included; costliest first; manual same tick wins (AC-LR15); fires next tick after a call's energy cost; never offline; U2 resume path (AC-LR21); one coalesced toast hook for UI (sim exposes, UI renders). | 2.5-3.5 |
| R7 | Telemetry emitters (sim-owned; UI emits nothing) | `refill_used{worker, energy_pct, charges_left, rank_by_risk, by, sheet_id, entry_point, stall_id?}`; `rest_toggled`; `autorefill_toggled`; `shift_sheet_opened` via a UI→sim note hook; session_end `refills_manual/auto`, `charge_starved_s`, `charges_capped_s`, `shortage_s`; exclusive emission with Pause (`worker_resumed` / `paused_worker_s` only at rc2Refill=0). Flag-0 = 0 new events (TEL-AC10). | 2.5-3.5 |
| R8 | Tests | unit: AC-RF2/3/4/6/10, AC-LR13/15/16/19/20/21, sanitiser matrix F-4/F-5/F-8; save round-trip; **flag-0 byte-identical**: save goldens + AC7 flag-off trace `19d4034d` unchanged + existing v5 golden suites; flag-on trace hash pinned at build (FC open item). | 3-4 |
| R9 | Pacing evidence | bot-m5 rc2/auto profiles (`scripts/bot-m5lx.ts`, `scripts/bot-m5-parity/econ-orig/m5lx.ts`) reproduce AC-LR10/11/12 + G1 on shipped CSV, for HoQA/Econ (not a re-tune). | 2-3 |
| | **Total (Saves build)** | | **19-27 h** |
| | Architect review (G0-G2 below) | | 3-4 h |

**Vs Saves' 12-18 h:** Saves' list (charges + saved field + migration, `refill_used`, auto-refill, flags, tests) maps to R2+R3+R6+part R7+R8 ≈ 13-18 h, consistent. The gap is R1 config sync (1.5-2), R4 Refill action/Rest/manageCdS swap (3-4: the rc2 base itself is unbuilt, not just the lighter layer), the wider emitter set (+1), and R9 harness (2-3). Migration work drops out (no bump). Recommend HoE plan **24 h** (mid) for Saves.

## Dependencies
1. **Saves risk-helpers PR** (workerAtRisk / costliestAtRisk; no PR number yet) before R5/R6/R7 `rank_by_risk`.
2. **#119** (pause drift, `worker_resumed`) lands first; R7 makes its emission exclusive on rc2Refill.
3. **#116** abilities UI: the sheet/card passes `refillAgoSimMs` from R4.
4. **Features Shift sheet** (`engineering/tasks/v5-ui-shift-sheet/HANDOFF.md`, 18±3 h) consumes R2/R4/R6 + note hooks; publish the API (R4/R6/R7 signatures) at G0 so Features can stub.
5. **clockWage** (row 26, MISSING, owner TBD): shares `tick.ts`/`workers.ts`; AC-LR20/21 need both flags. Land Refill first; clockWage rebases.
6. **Econ/PMW/HoE:** home of `tc_autorefill_at_pct` / `reserve` (R1). **HoE:** confirm no SAVE_VERSION bump.
7. Lane-U sales-stopped chip: chip Manage → `shift_sheet_opened{entry:stall_chip}` → `refill_used{stall_id}` join (SS-36j).

## Review gates (Architect)
- **G0 API note** (before code, ≤ 1 page in this folder or PR body): state keys, action/hook signatures, emitter list, flag-off contract. Architect replies APPROVE/CHANGES.
- **G1 save + flag-0** (first push): R2/R3 + flag-0 goldens green on Node 20.19.2; Architect checks sanitiser matrix against F-4/F-5/F-8 and byte-identical saves.
- **G2 full content review** at Ready head: R4-R8, one full gate run per head; Content PASS is separate from hosted CI and HoQA. Identical tree inherits a prior PASS (Rule 24).

- **G0 API note (Saves, 2026-11-10 03:03 CET):** `engineering/tasks/v5-refill-sim/G0-API.md` (sha256 b456e6eb), awaiting Architect APPROVE/CHANGES.

## Progress (Saves, 2026-11-10 03:56 CET, WIP stop per D-CEO-20261110-17)
Branch `saves/v5-refill-sim` (from rc/v5 68f58c0), head `7cbbb9b`, Draft PR #133 → rc/v5. Bundles: scratch/bundles/saves-v5-refill-sim-01411e4.bundle, -7cbbb9b.bundle.
**Done**
- 01411e4: red-first `tests/v5-refill-save.test.ts`. Covers keys/pins, M1 validateBalance, the v5→v6 round-trip (R / RA / rc2-only), flags-0 byte-identical write-back (b, autoRefill-only, pause-only), the F-4/F-5a/F-5b/F-8a/AC-LR16 matrix, m2 configs, no input mutation, .bak G-14, and offline/hidden freeze. Not run yet. It is red by construction: `src/sim/refill.ts` is missing.
- 7cbbb9b (WIP): R1. M5_MAPPED_COLS += charge_regen_s, charge_cap, refill_threshold_pct, start_charges (no combo alias). balance.json regenerated: +4 m4.tc keys, values 150/2/50/2.
**Next (G1)**
1. `tests/v5-f3-config.test.ts` L41 pins M5_MAPPED_COLS to 2 entries. Update it to 6 and add a sync test.
2. `m5-rules.ts`: M5_REQUIRED_TC.rc2Refill = the 4 keys, plus bounds: cap int ≥ 1, start int 0..cap, regen > 0, threshold int 1..100. autoRefill keys (tc_autorefill_at_pct/reserve) are added when their reader lands (G2), and only via the Econ CSV.
3. m5-state.ts: refillCharges?/chargeNextMs? go in M5Fields and M5_SAVED_FIELDS. refillAgoMs?/refillSession? go in M5_SESSION_FIELDS. Update the pin in v5-f2-m5-fields L81–84 to 10 keys. workers.ts Worker gets restAuto?/autoRefill?.
4. `src/sim/refill.ts`: lazy chargesOf (m3); chargesView (cap/null before the first tick, §12 b; {0,0,null} when the flag is off).
5. m5-fields.ts m5Load: a refill sanitiser after pauseLoad/breeds, with its own early-out on rc2Refill (m2). restAuto runs only when rc2Refill && pause. autoRefill runs only when both rc2Refill and autoRefill are on. Write chargeNextMs = regen only when refillCharges is present and below the cap.
6. Gates: tsc, sync-economy --check, focused vitest via lane-run (new test plus save*, v5-f2-*, v5-golden-*, v5-f1a-fields, v5-f3-config, staging-f1-m4cols, bot-m5, verify, pacing-x1-ac7). AC7 19d4034d is a Python CSV-harness trace. The CSV is unchanged, so it should stay identical; confirm via pacing-x1-ac7.
**Open G0 conditions:** M1 is part-done (R1 mapping; the combo rename is Econ's; autorefill keys wait on the Econ CSV). M2 (refillSessionTotals/resetRefillSession + registerSessionEnd; tel-envelope landing not checked), M3 (pausedAgoMs session ms, shared with #119), M4 (int ms, no Date.now/Math.random, total-order sort), and m1, m4, m6, m7 are all open (G2). §11 build order and §12 (a: asleep_s never saved, reset on rotate, owned by Hire 2; b: restEligibility + restState etas at G2; c: no duplication of #119 manage-resume, rc2Refill=1 manage no-op, Refill ends Rest via resumeWorker+B5, nothing writes cdS) are open.
**Key optionality:** every key can be optional. No bump.
