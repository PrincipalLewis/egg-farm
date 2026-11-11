# Flags-on v5 RC: save impact, gate delta, duration estimate (Saves QA, DRAFT 2026-10-30 ~13:05 CET)
Context: D-CEO-20261030-09 (12:51): v5 = one release, every M5 feature ON, one full gate on the final RC. Ship-set NOT yet published.
Evidence: read-only `git show/grep` at rc/v5 3f582db; dry-run qa/v5-saves/dryrun/gate-DRYRUN-3f582db/results/status.log; m5-flag-reads-3f582db-5.1-evidence.md.
Nothing run in a browser for this note (static analysis only, no lock taken).

## 0. Open question that drives everything
"Every M5 feature on" vs the 14 m4.flags keys (src/config/flags.ts:9-10): M5.0 = golden, streak, tapCoins, abilities, broody, salesStopped, fatigueCue, pause;
M5.1 = rc2Refill, autoRefill, clockWage, breeds, zeroGainUi, bestBuyV2 (flags.ts:10 comment "// M5.1"). Row 34 ship values had salesStopped/bestBuyV2/breeds (+ zeroGain.confirm) OFF.
Also manifest rule (v5-rc-manifest.md:25): a flag may be 1 only on a `built` row whose gate passed; rows 15 (abilities sim) and 20 (broody sim) are `not started` at 3f582db.
=> the ship-set file must name the value of each of the 14 keys; QA cannot infer it.

## 1(a) M5 save fields and migrations needed by a flags-on build
SAVE_VERSION = 6 at 3f582db (src/save/save.ts:7); F2 policy = NO bump, optional fields (m5.0-sizing §1 F2; m5-fields.ts header). Migrations table save.ts:74-84 stops at 5->6; no M5 migration exists or is planned (fields are absent = default).
Persist filter: m5Persist (m5-fields.ts ~L43) drops session keys; load sanitiser m5Load (m5-fields.ts:56) runs only when any of golden/streak/tapCoins/broody/abilities/pause is on (anyFlag).

| Field | Flag | Saved? | In 3f582db | Spec | Test-ready? |
|---|---|---|---|---|---|
| evRngState (u32) | golden/broody | saved | EXISTS sim/m5-state.ts:30, sanitised m5-fields.ts (isU32, re-derived D-C2) | golden v1.3.2.2 + sizing §12.1 D-C2/D-C5 | YES |
| nextSpawnRemainingS (focus s, clamp [0,tc_egg_gap_max_s]) | golden | saved | EXISTS m5-state.ts:32 | golden v1.3.2.2 R2/R3 | YES, but errata v1.3.3-DRAFT pending |
| frenzyRemainingS (clamp [0,tc_frenzy_s]); legacy frenzyEndAt deleted on load | golden | saved | EXISTS m5-state.ts:34 | golden R23 | YES (errata pending) |
| goldenEgg (on-screen) | golden | session | EXISTS m5-state.ts:36 | golden R10a | YES (assert never saved) |
| streakS / streakHoldS / tapCreditCdS | streak/tapCoins | session | EXISTS m5-state.ts:39/41/43 | streak-tap-coins v1.3.2 R10/R11 | YES |
| streakRun | streak | session | EXISTS sim/state.ts:34 | streak #2 streak_peak | YES |
| irefRingCents / refWarmS | tapCoins | session | EXISTS m5-state.ts:45/47 | streak-tap-coins §I_ref | YES |
| broodyNestCents (int, clamp 1e15) / broodyHenIdx (0..11) | broody | saved | EXISTS m5-state.ts:50/52 | broody v1.3.2 | fields YES; NO sim (manifest row 20 not started) |
| broodyNestScaled / brRngState | broody | session | EXISTS m5-state.ts:55/57 | broody (2) | YES |
| abilities.{id}.{readyAt epoch ms clamp [now,now+cd], activeS} | abilities | saved | EXISTS m5-state.ts:15/59; endCalls on load | abilities v1.3.3 §6/AB-1 | fields YES; NO sim (row 15 not started) |
| abilitiesUnlocked / abilitiesCoachSeen (bool) | abilities | saved | EXISTS m5-state.ts:60/61 | abilities v1.3.3 L80-81 | YES |
| workers.{id}.paused (bool) / callLockoutS (sim s, market_hand only, cap tc_pause_call_lockout_s) | pause | saved | EXISTS sim/workers.ts:11; pauseLoad m5-fields.ts; sanitizePausedOnLoad sim/pause.ts:13 | pause v1.3.10 rule 1/7, B5, E9, E12 | YES; isPaused is dead code at 3f582db (evidence doc) |
| streakBest | streak | ? | NOT YET IN CODE (listed in sizing F2 only) | none decides saved vs dropped | NO - need ruling |
| rc2Refill charges + partial regen progress | rc2Refill | saved per spec | NOT YET IN CODE | rc2-refill-proposal v1.3 (12:49 today) L159: "partial regen progress is saved; start = cap 2 for new game / first hire / rc1 save" | NO - no field name/type/clamp/offline rule |
| fatigueCue explainer-seen + first-Asleep toast-seen ("once per save") | fatigueCue | saved per spec | NOT YET IN CODE | m4.2-fatigue-visibility v0.2 L26/29, AC-F6 | NO - no field name/default/migration |
| autoRefill / clockWage / breeds / bestBuyV2 / salesStopped / zeroGainUi state | M5.1 + salesStopped | ? | NOT YET IN CODE (no readers except flag list; zeroGainUi spec E15/L409: no save field) | breeds spec m5.1-breeds-spec.md, sales-stopped-spec.md, art-ux m51-clock-wage-fit | NOT CHECKED (time); zeroGainUi = no field (OK) |

Specs we still need (each: field name, type, default, migration from v4/v6 saves, .bak/reconcile, crosses offline clock or pause?):
1. rc2Refill charges/regen: all six items missing; must say whether regen accrues offline (wall) or focus clock, and whether Pause stops it.
2. fatigueCue seen-flags: name/type/default; v6 save with already-Tired workers -> show or suppress? (.bak restore must not re-show).
3. streakBest: saved or not; if saved, sanitiser + whether reload/offline resets it.
4. Cross-cutting (sizing §6 risk 4, not specified anywhere): downgrade M5 save -> m4.1 build (unknown fields kept or dropped on next write?); M4-19 rank/.bak rotation with M5 fields; tab reconcile when two tabs differ only in M5 fields (saveSeq tie-break, session keys); quota/headroom with larger saves (abilities map, workers.paused).
5. Pause x offline: callLockoutS is sim seconds - does it drain during offline catch-up / hidden >=60 s? (pause v1.3.10 rule 7 / B5 read covers load clamp only).
6. Golden errata v1.3.3-DRAFT must be final before golden cases are pinned.
7. Any M5.1 flag set to 1 (breeds, clockWage, autoRefill, bestBuyV2): its save section must be reviewed; breeds may need SAVE_VERSION decision.
8. Global: any-flag-on switches sim to the focus-clock path (sim/tick.ts:28, game.ts:402/423) -> offline catch-up spec under focus clock is the HoE §9.1/9.1a text; needs an explicit oracle for QA (expected coins after N s hidden / offline).

## 1(b) Gate steps and cases: change / stay / new
Stay (same expectation): G0-*, G1-build, G1-build-id, V-oq2, V-noreg-base (INFO), B-csr8-lease (plus pause/streak keys in lease payload - check only).
Change:
- G1-flags-ship-set: all-0 -> equals ship-set file (draft in qa/scratch/draft-flagson/).
- S-{chromium,firefox,webkit}: no-loss oracle (lib.mjs noLoss) must include M5 saved fields; session keys asserted absent from saved bytes.
- T-chromium / T2-*: FLAGS auto-derived (gate L99) becomes non-empty; telemetry rule flips from "any M5 flag-gated event fails" to "events of ON flags expected, OFF flags still fail" (the package-(2) delta drafted earlier).
- V-noreg-rc / V-noreg-compare: byte-identical-to-base no longer holds with flags on -> needs an allow-list of expected diffs, or run on a flags-0 override build.
- B-resetat-AC1-3 / AC4-CLK: any flag on = focus-clock path -> expected values re-derived.
- U-ss15-share-guard: N/A only while salesStopped=0; if ship-set has salesStopped=1 it becomes a live HARD step (UI ss15 sample + Saves step that was moved to 5.1).
- FO-1..10 -> replaced by flags-on rows (FN-*); keep FO-style row for every key the ship-set leaves 0.
New:
- S-M5-<field> on 3 engines: one per saved field (10 today + up to 3-4 not in code): round-trip, sanitiser (non-finite, negative, wrong type), session keys never saved.
- S-MIG v4/v6 -> v6+M5: old fixture loads, M5 fields absent = defaults; abilities unlock/Broody unlock on first load (broody L47).
- S-BAK: .bak + IDB mirror round-trip with M5 state; restore keeps readyAt clamp.
- B-RECON: two tabs, pause + streak state, lease/reconcile winner by saveSeq; session keys don't leak.
- B-OFFLINE-FOCUS: offline / hidden >=60 s catch-up on the focus clock; calls end (ability_ended cause offline), egg expires, streak 0, nest no accrual.
- B-QUOTA: headroom with larger saves (M5 map) + telemetry ring 5000.
- S-DOWNGRADE (if spec says so): M5 save in m4.1 build.

## 1(c) Duration estimate, flags-on full gate, 3 engines
Measured (dry-run 3f582db, 12:18:16-12:44:21 CET = 26.1 min): lock HOLD per step (s): S-chr 45, S-ff 50, S-wk 48, T-chr 29, T2-ff 9, T2-wk 9, B-csr8 99, B-resetat-AC1-3 318, B-resetat-AC4-CLK 248 = 855 s; non-lock steps ~26 s (G1-build 10, V-noreg 4, rest <1). Active = ~14.7 min.
Lock WAITS (separate): S-chr 160 s (ui lane), B-resetat-AC1-3 13 s (Art fit.cjs), B-resetat-AC4-CLK 511 s (ui lane rc0-browser) = 684 s = 11.4 min.

| | Low | Likely | High |
|---|---|---|---|
| Existing steps (re-expected) | 15 min | 17 min | 20 min |
| New S cases x3 engines | +4 min | +7 min | +12 min |
| New B/T steps (recon, offline-focus, quota, golden first spawn 45 s focus, ss15 live) | +4 min | +8 min | +15 min |
| One engine re-run (flake) | 0 | 0 | +5 min |
| **Active total** | **~23 min** | **~32 min** | **~52 min** |
| Lock waits | 0 (lanes off, as agreed for 13:50) | 0-3 min | +12-25 min (dry-run pattern: 11.4 min; ui timeout-900 holders) |
| FN rows runner (separate from gate; FO runner not timed in status.log) | +3 | +5 | +8 |

Assumptions: lanes stay off the lock; no time-acceleration change in the build; low = final RC lands little new code beyond 3f582db (plumbing + streak), so most new cases are field round-trips; high = abilities/broody/rc2Refill/fatigueCue sims land with new saved fields and focus-clock oracles need re-derivation. Lock window 120 min is ample in all cases.
Effort to write new cases once specs exist: ~10-16 QA hours likely (low 6 h if only today's 10 fields; high 20 h if rc2Refill/fatigueCue/breeds fields land): S field cases 0.3-0.5 h each, migration/.bak/recon/offline/quota fixtures 4-6 h, telemetry ON/OFF schema 1-2 h, G1+FN rows 1 h, mutants/self-test 2-3 h. Plus one rehearsal dry-run (~30 min).
