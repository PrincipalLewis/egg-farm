# Workers spec ↔ rc/v5 drift audit (read-only), tip eed62687, 2026-11-09
- **Task:** HoP/PMW-drift-audit. Read-only audit of the Workers spec ACs against rc/v5 at its current tip. Write scope: this one file. No code, commits, PRs or messages. P41-6 standing.
- **Tip audited:** `origin/rc/v5` = **eed62687db4aa05167e5e7f8b14e1674715dfc4a** (Merge PR #107 feat/v5-golden-rewards, 2026-11-06 03:39 CET). Fetched 2026-11-09 ~23:50 CET. The tip *is* the #107 merge.
  - Ancestry (`git merge-base --is-ancestor`): #115 merge **71375901** ✔, #107 **eed62687** ✔ (= tip), Architect fix **57c187e** (offlineAccrualFrozen removed) ✔.
- **Specs audited (live files, `sha1sum` on disk 2026-11-09):**

| Spec | Version | Expected | On disk | |
|---|---|---|---|---|
| m4.2-fatigue-visibility-spec.md | v0.2.5 | 7e120786 | 7e120786 | ✔ |
| m5.1-worker-failure-cost-proposal.md | v0.3.24 | 54b994bd | 54b994bd | ✔ |
| m5-worker-pause-spec.md | v1.3.15 | 4c081f64 | 4c081f64 | ✔ |
| m5.1-lighter-refill-proposal.md | v0.8.14 | c4c1a5cd | c4c1a5cd | ✔ |
| m5-worker-abilities-spec.md | v1.3.12 | 9d521aa8 | 9d521aa8 | ✔ |
| v5-workers-save-shapes.md | v1.0.5 | 3b34c0be | 3b34c0be | ✔ |
| rc2-refill-proposal.md | v1.3.16 | e4d98651 | e4d98651 | ✔ |
| m2-proposal.md (M2 Workers core, v1.1) | v1.1 | (none given) | 168da210 | record |
| **product/m5-gate-acs.md** | v1.3.2 hdr | **d3acc0c8** | **12792ddd** | **✘ MISMATCH** (see notes N1) |

- **Ruling of record:** decisions.md D-HOP-2026-11-06-01 (L2337): option (a), hen offline grant unchanged whatever the worker pause/hire state; worker freezes kept (pause §3 L88, AC-P13 L330, rule 11, E1).
- **Method:** `git archive eed62687` into `/workspace/scratch-pmw/full` (the shared clone's working tree was not touched). I read `src/sim/{workers,pause,offline,tick,timers,abilities,actions,m5-state,state}.ts`, `src/save/{m5-fields,hidden-time}.ts`, `src/game.ts` (hidden path), `src/econ/income.ts`, `src/telemetry/schema.ts` and the tests. `git diff 71375901 eed62687` covers the #107 delta. Tests run: `npm ci --prefer-offline` in the scratch copy, then a focused vitest run on 8 files: v5-pause-sim, v5-m5load-pause-sanitize, v5-f3-is-paused, workers, workers-v11, v5-abilities-sim, offline, v5-golden-rewards. **129/129 pass.** The full default suite gives **2234 pass / 6 fail / 1 skip**. All 6 failures come from the git-less archive (pacing-x1-ac7 R3 ×4 needs `git` refs, telemetry-m3 BUILD_ID needs HEAD, verify VER-1d needs a repo copy), so none touch Workers. I ran 3 throwaway probe tests (kept outside the repo at `/workspace/scratch-pmw/probe-copy/probe.test.ts`) to confirm D1/D2. Gate card ACs come from m5-gate-acs.md Cards #5, #6a, #6b, #7 and #10, plus #11 for FC-AC3 only. All line refs below are at eed62687.
- **Verdicts:** MATCH = code matches the spec and a test covers it · DRIFT = code differs from the spec · UNTESTED = code matches but no test · NOT-FOUND = not implemented at the tip.

## AC table
| # | AC | Spec cite | Code / test evidence @ eed62687 | Verdict |
|---|---|---|---|---|
| 1 | PAU-AC1 / AC-P1 flag-off inert (sim) | pause L310, E13 | `pause.ts:12` isPaused needs flag; `pause.ts:25,32,42` no-op flag off; tests `v5-pause-sim.test.ts:33-55`, `v5-f3-is-paused.test.ts:19-37` (incl. QA-10 grep :48). The DOM scan and 5d9efa61 trace compare are QA/browser checks, out of unit scope | MATCH |
| 2 | PAU-AC2 / AC-P1(a) validate→m5Load→serialize vs abilities-only golden | gate L271, gap 1 | `engineering/golden/` holds only flagoff-golden.a01faea and m4on-golden.90a9c84. There is no `m5-abilities-only` golden | NOT-FOUND (known BLOCKED, gap 1) |
| 3 | PAU-AC3 / AC-P1(b) boot+save <60 s byte-identical, fields preserved | E13 | `m5-fields.ts:86` (pauseLoad only when flag on); test `v5-m5load-pause-sanitize.test.ts:59-70` (same object, written back) | MATCH |
| 4 | PAU-AC4 / AC-P2 unlock F10 (sim side) | rule 1, E12 | `pause.ts:27` (farmLevel < tc_pause_unlock_farm → no-op); `m5-fields.ts:93-106` + `pause.ts:15` sanitise below unlock; tests `v5-pause-sim.test.ts:57-75`, `v5-m5load-pause-sanitize.test.ts:35`. The DOM toggle is in row 32 (#22) | MATCH |
| 5 | AC-P3 MH/CH 0 actions, 0 wage; Hawker 1.00 | rule 4/5 | `tick.ts:83` (`isPaused` → continue: no action, no wage, cdS untouched); `tick.ts:74` (no wage resume); `workers.ts:51`; `econ/income.ts:34,65`; tests `v5-pause-sim.test.ts:100-126,246-263` | MATCH |
| 6 | AC-P4 Grader 1.00 paused / 1.15 asleep / 2.00 working | rule 4 | `workers.ts:45` (paused → 1, before the asleep share). Test `:127-135` asserts paused = 1 and live > 1 only. The exact tier-2 1.15/2.00 values are not asserted | MATCH (minor test gap, N4) |
| 7 | AC-P5 recovery 0.25× (+1%/36 s), cap 100, stays paused | rule 3, §6 | `pause.ts:20-22`; `tick.ts:25`; tests `v5-pause-sim.test.ts:77-98` | MATCH |
| 8 | AC-P6 cdS frozen, continues on Resume | rule 5, G4 | `tick.ts:83` skips before `cdS - dt` (:84); `pause.ts:28,35` never touch cdS; tests `:101-116`, `:263` | MATCH |
| 9 | AC-P7 2 s toggle debounce | rule 2 | `tc pause_toggle_debounce_s` = 2 (`balance.json:427`) but **no reader in src** (rg). `pauseWorker`/`resumeWorker` have no debounce. Expected in the Pause UI row 32 (not started) | NOT-FOUND |
| 10 | AC-P8 pause ends running call ≤1 tick, readyAt kept | rule 6, G1 | `abilities.ts:107-111` (early `paused`, clears activeS/durS only); test `v5-abilities-sim.test.ts:189-203` | MATCH |
| 11 | AC-P9 / B5 MH lockout 45 sim s, CH none, sim-clock countdown, frozen offline | rule 7 | `pause.ts:31-37` (MH only), `:41-48`; `tick.ts:30`; `abilities.ts:53` (reason `lockout`); tests `v5-pause-sim.test.ts:137-178`. The button "0:ss" UI is in row 32 | MATCH (sim) |
| 12 | AC-P10 Unpaid survives Pause/Resume (G3) | rule 7/10 | `tick.ts:74`; `pause.ts:35` keeps `unpaid`; test `v5-pause-sim.test.ts:90-98` | MATCH |
| 13 | AC-P11 no free action from 20 Pause/Resume pairs | G4 | Structurally holds: `tick.ts:83-84`, `pause.ts:28,35` never reset cdS. **No test** of the pair-spam bound | UNTESTED |
| 14 | **AC-P12 Manage on paused → refill + resume; Manage all skips paused, N counts unpaused** | rule 8, AC-P12 L326 | `actions.ts:97-101`: refills to 100 but **leaves `paused: true`** and emits only `worker_manage`, with no `worker_resumed{cause:"manage"}`. `workers.ts:27` `needManage` has no `isPaused` filter, and `actions.ts:102-108` **refills paused workers in Manage all** and counts them in N. Probe at eed62687, flag on: Manage → `{"energy":100,"cdS":1,"paused":true}`; `needManage` → `["market_hand"(paused),"coop_hand"]`; Manage all set the paused MH to 100 | **DRIFT** (D1) |
| 15 | **Rule 10 paused worker not in the R9 resume reserve** | rule 10 L163-165 | `tick.ts:72` reserve counts every `!unpaid && energy>0` worker, **including paused ones**. Probe: paused MH (80%), Unpaid CH, coins 601 ≥ CH need 600 → CH **stays Unpaid** because the paused MH reserved 300 | **DRIFT** (D2) |
| 16 | AC-P13 hidden ≥60 s / offline: +0 recovery, lockout frozen, paused kept; <60 s simulated; reload round-trip | rule 11, E1, E2 | `game.ts:394` (`this.state = h.state`, provisional sim dropped), `:396` m5Offline, `:397` grant; `game.ts:380-389` <60 s simulated; `m5-fields.ts:86,93-106`; tests `v5-pause-sim.test.ts:161-178` (120 s hide frozen, 5 s hide live), `:189-335` (committed tracksV7 hired fixture `tests/fixtures/saves/m5-pause-committed-hired.json`, round-trip, legacy load); sanitize tests `:20-57`. The exact 59.9 s → +1.66% boundary has no unit test (QA S1) | MATCH |
| 17 | **D-HOP-2026-11-06-01 offline egg grant parity** (all-paused / mixed / unpaused / none; flag-off; <min; >cap) | ruling (a); §3 L88; AC-P13 L330 | `offline.ts:21-29` applyOffline reads hens/farm/tracks/cap only, **no worker or pause read** (comment :21-22 cites the ruling); `game.ts:116` constructor path, `:397` hidden path. `rg offlineAccrualFrozen\|accrualFrozen\|allPaused\|everyPaused` in src+tests = **0 hits**. Tests `v5-pause-sim.test.ts:264-274` (paused/mixed/none = unpaused grant; flag-off equal; under-min and over-cap equal), `:277-282` (real hide/show: grant = unpaused grant, coins/basket/workers frozen), `:285-310` (no double credit on resume) | MATCH |
| 18 | E9/E13 save shape `paused?`, `callLockoutS?` (non-boolean→absent, cap 45, MH only, flag-off preserved, no SAVE_VERSION bump) | save shapes L62-63; pause E9/E13 | `pause.ts:15`; `m5-fields.ts:93-106`; tests `v5-m5load-pause-sanitize.test.ts:20-75`; fixture version 6 (`v5-pause-sim.test.ts:206`) | MATCH |
| 19 | AC-P14 G5-P bands / G1 vs X1 / L0-9 byte-identity | §10 | No G5-P driver in tree (row 32 "Pause UI + G5-P driver", not started). Not run in this pass | NOT-FOUND |
| 20 | PAU-AC13 / RF-AC12 `worker_paused` / `worker_resumed` exclusive emission | §12; gate L294 | Schema only: `telemetry/schema.ts:121-122` (pinned). **No emitter**: `pause.ts:24-38` push no events; no src caller of pauseWorker/resumeWorker (rg: only pause.ts + tests) | NOT-FOUND |
| 21 | AC-P18 no Pause-specific coop-full UI/events | AC-P18 L355 | Vacuously true: no pause coop-full code; `coop_hand_state` exists only as an optional schema field (`schema.ts:111`). No test | UNTESTED |
| 22 | Pause UI: toggle DOM (AC-P2), lockout button (AC-P9 UI), AC-P15 layout, AC-P17 copy, rule 9 "All workers paused" | §8, AC-P15/17 | No pause toggle or pause copy in `src/ui` (rg). Manifest row 32 `v5-pause-ui` "not started" | NOT-FOUND |
| 23 | AB-AC5 / AC-M5A-4..6 blocked reasons Asleep/Unpaid/Paused/lockout; mid-call end | abilities rule 4/6 | `abilities.ts:45-56` (order asleep→unpaid→paused→lockout→cooldown), `:101-115`; tests `v5-abilities-sim.test.ts:31-40,189-203` | MATCH (sim) |
| 24 | AB-AC3/AB-AC4 30 s focus duration, 300 s wall cooldown | rule 2/3/10 | `abilities.ts:77-80,105-112`; tc `ability_s` 30, `ability_cd_s` 300 (`balance.json:391,393`); v5-abilities-sim tests | MATCH |
| 25 | AB-AC7/AB-AC8 reload/offline ends call once (`offline`), readyAt clamp ≤ now+300, rc1 load all ready | E2, §11 | `m5-fields.ts:54-66` endCalls, `:78-83` readyAt clamp, `:108-111` m5Offline; v5-abilities-sim tests. Known open: save-shapes L65 durS clamp text stale (N2) | MATCH |
| 26 | AB-AC12 rule 11 combo hook (sheet Boost ≤ combo_window_s after manual refill) | rule 11 | `abilities.ts:58-63,74-77` (needs rc2Refill; inclusive window; viaAll never combos). The caller that measures `refillAgoSimMs` belongs to rc2 (#30) and is not built | MATCH (sim hook) |
| 27 | Abilities UI: AB-AC2/6/9/10 (DOM, Activate-all rect, names, FX cap, sheet auto-close) | §5 | No `src/ui` caller of fireAbility/activateAll (rg). `origin/feat/v5-abilities-ui` exists but is **not merged** into rc/v5 | NOT-FOUND |
| 28 | Activate-all skips paused / ineligible workers silently | rule 6/7, E14(c) | `abilities.ts:89-96` → fireAbility eligibility (`:52-53`) with viaAll → no blocked event (`:71`); v5-abilities-sim tests | MATCH |
| 29 | RF-AC1 / CW-AC1 / AR-AC1-2 flag-off byte-identity for rc2Refill / autoRefill / clockWage | FC-R7/R9, AC-FC16(b), AC-LR7/19 | Flags 0 (`balance.json:180-182`). No sim reads them except `abilities.ts:61` (combo, rc2 gate). Goldens `engineering/golden/flagoff-golden.a01faea.test.ts`, `m4on-golden.90a9c84.test.ts` pass in the full run | MATCH |
| 30 | rc2Refill behaviour: RF-AC2..AC9, AC15-17 (charges, regen, Shift sheet, Rest, Manage-cooldown skip) | rc2 v1.3.16 | No charges/rest/sheet code in src (rg `charges`, `resting`, `refillCharges` = schema only). Manifest row 25 "not started"; save shapes §1 "not built" | NOT-FOUND |
| 31 | RF-AC10/13/14 rc2 telemetry (`refill_used`, `rest_toggled`, `shift_sheet_opened`, `first_worker_hired`) | rc2 Telemetry | Schemas and rules exist (`schema.ts:177-182,238-247`), **no emitters** | NOT-FOUND |
| 32 | autoRefill AR-AC3..AC11 (incl. AR-AC4 paused/offline no auto spend) | lighter-refill v0.8.14 | No code (rg `autoRefill` = flags/balance only). Row 25 | NOT-FOUND |
| 33 | clockWage CW-AC2..AC7 (Asleep pays on cdS; resume need MH 300 / CH 600) | failure-cost v0.3.24 FC-R1..R7 | No clockWage code. `tick.ts:83` skips Off workers (rc1 behaviour, correct at flag 0). CW-AC4's "paused pays 0" already holds via #5. Row 26 "not started" | NOT-FOUND |
| 34 | M2 core Workers: hire, mood/energy, wages (S2-8 exact rate), Unpaid + R9 ordering, Manage/Manage all (≤50%, 30 s shared cd), offline = workers frozen | m2-proposal v1.1 §8; pause §3 L88 | `actions.ts:84-89` (hire at start_pct, cdS 0, E8 new hire unpaused); `workers.ts:16-30,55-64`; `tick.ts:20-31,66-101`; `actions.ts:97-108`; `offline.ts:23-29` (workers untouched); tests `workers.test.ts` (10), `workers-v11.test.ts` (23), `offline.test.ts` (6). The AC-W1..W6 pacing gates are Econ bot ACs and were not re-run (N5) | MATCH |
| 35 | Fatigue FC-AC3 / SS-31 paused worker excluded from `fatigueLoss`, counted in `n_paused` | fatigue v0.2.5; gate Card #11 (PM Market) | `fatigueLoss` / chip not in src (schema `n_paused` only, `schema.ts:72,234`). PM Market-owned (D-HOP-2026-10-30-16 (2)) | NOT-FOUND |
| 36 | Save shapes for unbuilt worker fields (`refillCharges`/`chargeNextMs`, `workers.{id}.autoRefill`, `restAuto`) | save shapes §1, §2a, E9 | Not in src (only `paused` and `callLockoutS` are built, see #18). Rows 25/26 | NOT-FOUND |

**Counts (36 rows):** MATCH **20** · DRIFT **2** · UNTESTED **2** · NOT-FOUND **12**. 11 of the 12 NOT-FOUND rows are features whose build rows haven't merged (rows 25, 26 and 32, the abilities UI, the pause/rc2 telemetry emitters, and PM Market's fatigue chip). The 12th, #2, is the known missing golden. None of these is drift.

## Specific confirmations
1. **No offline egg suppression keyed to pause or hire. CONFIRMED.** `offlineAccrualFrozen` and any equivalent are absent from src and tests at eed62687. `applyOffline` (`offline.ts:23-29`) takes no worker input. Both grant paths use it: load at `game.ts:116` and hidden ≥60 s at `game.ts:397`. Parity across all-paused, mixed, unpaused, none-hired, flag-off, under-min and over-cap is asserted at `v5-pause-sim.test.ts:264-282` and passes.
2. **Worker freezes while paused. CONFIRMED present.**
   - Wages and actions: `tick.ts:83`, `:74`, `income.ts:65`.
   - Recovery: `pause.ts:20-22` and `tick.ts:25` online only. Offline and hidden ≥60 s restore the hide snapshot (`game.ts:394`).
   - Call lockout: `pause.ts:41-48`, frozen offline. Calls are blocked through `abilities.ts:52-53`.
   - Hidden ≥60 s: tested at `v5-pause-sim.test.ts:161-178` and `:277-282`.
   - Two gaps: Manage-resume (D1) and the reserve exclusion (D2) drift from rule 8 / rule 10.
3. **No regression from the 71375901 → eed62687 merges. CONFIRMED.** `git diff 71375901 eed62687` touches 6 files: `config/formulas.ts` (golden tc keys), `config/m5-rules.ts`, `sim/effects.ts` (frenzy factor), `sim/golden.ts`, `sim/timers.ts` (adds `frenzy` between incomeRef and abilities in TIMER_SYSTEMS, `timers.ts:65`) and `tests/v5-golden-rewards.test.ts`. It does **not** touch offline.ts, tick.ts, pause.ts, workers.ts, abilities.ts, actions.ts, m5-fields.ts or game.ts. The frenzy timer is identity unless `golden` is on and doesn't read workers. The pause, abilities, workers and offline tests all pass at the tip. Pause E14 (Frenzy unaffected by Pause) holds by construction: the frenzy factor reads `frenzyRemainingS` only (`effects.ts`).

## Drift needing an Eng ticket
- **D1 · Major · "Pause rule 8 / AC-P12: Manage on a paused worker must end the pause; Manage all and needManage must skip paused workers"**
  - Owner lane guess: Saves (manifest row 31 pause sim, the #115 author) for `sim/actions.ts` + `sim/workers.ts`. Features (row 32) if HoE scopes it into the UI PR.
  - Evidence:
    - `actions.ts:97-101`: refill to 100, `paused` kept, no `worker_resumed{cause:"manage"}`.
    - `workers.ts:27`: needManage has no `isPaused` filter.
    - `actions.ts:102-108`: Manage all refills paused workers and they count in N.
    - Probe output in row 14.
  - Gate PAU-AC8 (AC-P12) fails as built once `pause` = 1. The flag is 0 in shipped balance and 1 in the v5 ship-set.
  - Fix shape (spec-side only): resume on Manage; filter `isPaused` in needManage. Only while the flag is on, so flag-off stays byte-identical.
- **D2 · Minor · "Pause rule 10: exclude paused workers from the R9 Unpaid-resume coin reserve"**
  - Owner lane guess: Saves (row 31).
  - Evidence: `tick.ts:72` adds `resumeNeedCents` for any non-Unpaid worker with energy > 0, paused included. Probe: a paused MH delays an Unpaid CH resume at coins 601 vs need 600.
  - Spec rule 10 (L163-165) says a paused worker "is not counted in the `resumeNeedCents` coin reserve".
  - No current test covers it; it is not one of the numbered gate ACs (rule-level).

## No-ticket notes
- **N1 Gate card sha mismatch.** `product/m5-gate-acs.md` on disk is **12792ddd**, not **d3acc0c8**. The last recorded pin is decisions.md L2284 / status.md L524 (2026-11-05 22:13 CET, gate e19a3174 → d3acc0c8). I found no later re-pin and no frozen `m5-gate-acs.d3acc0c8.md` copy, so I can't diff. The Workers Card #7 line L407 still cites abilities v1.3.12 9d521aa8, and the Pause, rc2 and autoRefill pins match the table above. The change is probably in another owner's section (for example the PL-AC5(i) Card #4 amendment noted at decisions.md ~L2334). HoP/PMW should record the new gate sha. This audit used the on-disk 12792ddd content.
- **N2 Known, not re-litigated:** save shapes v1.0.5 L65 durS clamp text is stale (Saves-owned; code `m5-fields.ts:54-66` honours durS). Architect m2 LOCK=45 is still open (code reads `tc_pause_call_lockout_s` = 45, `balance.json:426`, test `LOCK` constant `v5-pause-sim.test.ts:23`). HoQA's offline bar is pending; the unit parity evidence is in row 17, and QA's real-path bar is still owed per the D-HOP-2026-11-06-01 close condition.
- **N3 Stale in-tree cite (cosmetic):** the `tests/v5-pause-sim.test.ts:2` header cites pause spec "v1.3.6"; line 3 cites v1.3.15 and the ruling correctly. Comment-only, so no ticket. Fold it into D1's PR.
- **N4 Test gaps worth folding into D1's PR (no separate ticket):**
  - AC-P4 exact tier-2 values 1.15/2.00 (row 6).
  - The AC-P11 pair-spam bound (row 13).
  - The AC-P13 59.9 s → +1.66% boundary (row 16; QA S1 also covers it).
- **N5 Not run in this pass (cost):** AC7 / E-G4 bots, G5-P (AC-P14), AC-W1..W6 pacing and `*.slow.test.ts`. These are Econ/QA-owned and the flag-on AC7 rows are blocked on Econ's bot-config doc anyway.
- **N6 Unbuilt rows (tracked by the manifest, not drift):** row 25 rc2Refill + autoRefill, row 26 clockWage, row 32 Pause UI + G5-P driver (also owns AC-P7 debounce, the pause telemetry emitters and the All-paused line), the abilities UI (`origin/feat/v5-abilities-ui`, unmerged), and fatigueCue (PM Market). The rc2/pause telemetry schemas are already pinned in `schema.ts`, so each feature PR only adds emitters.
- **N7 Fatigue spec cite:** gate Card #11 L570 still names fatigue v0.2 `b88083db` as the derivation source, while the live fatigue spec is v0.2.5 `7e120786`. Card #11 is PM Market-owned; flag for their next re-cite.
- **Scratch left on the box:** `/workspace/scratch-pmw/full` (archive + node_modules, outside the repo) and `/workspace/scratch-pmw/tip`. Safe to delete. No long-running process was started.
