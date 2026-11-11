# Architect review · PR #115 Pause/Resume sim (row 31) · `409fa6a` · 2026-11-05 22:42 CET (Europe/Belgrade)

**Requested exact:** `409fa6af032bf17c727239a96d4edb572268fd48`  
**Live headOid:** `409fa6af032bf17c727239a96d4edb572268fd48` — **MATCH (unchanged)**  
**Branch:** `cursor/saves-pause-sim-4c0b`  
**Base:** `fix/saves-endcalls-durs` `e4117c4dfa7b9d9e6ecf8b5b28590936e3df0e58` (#114) — merge-base OK  
**Under:** Features #112 `2ec5b80` (via #114)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/115 (**Draft**)  
**Scope (from PR body / D-HOE Pause row 31 — not invented):** Pause **sim only** behind `m4.flags.pause`. No Pause UI, no G5-P pacing driver, no telemetry emit path for `worker_paused`/`worker_resumed` (UI/Features). `SAVE_VERSION` stays 6. E13 clear-on-save **not** built (D-HOE-20261030-10 / #91 AC-P1).  
**Contracts cited:** Pause spec **v1.3.6** rules as cited in-tree (`src/save/m5-fields.ts`, `tests/v5-m5load-pause-sanitize.test.ts`, `tests/v5-pause-sim.test.ts`): rule 1, rule 3/§6, rule 7 B5, E2/E9/E12, AC-P1, AC-P2. Studio product tree is at **v1.3.15** (record-only bumps after 1.3.6 for these sim rules). D-HOE-20261030-02 (`rest_recovery_mult >= 0`); D-HOE-20261030-10 (E13 vs byte-identical). #114 / D-HOE-41 durS inheritance.  
**Out of scope:** Pause UI, G5-P, `pause_toggle_debounce_s` / `stall_hold_paused_s` readers, #113 ring export, #100.  
**Writes:** `engineering/reviews` + status only. **No Ready / merge / push / messages / implementation.**

## Verdict: **PASS** · Minors: **1 (non-blocking for Architect sim)** · Ready recommendation: **CONDITIONAL YES**

Pause sim matches cited rules; #114 `endCalls`/`durS` tree is byte-identical on this tip. Independent **tsc 0**, focused **7 files / 136 passed** (matches author). Draft CI **SKIPPED**. Ready blocked on hosted gate + HoQA (and HoQA may still want the AC-P13 fixture Minor).

---

## Stack integrity
| Layer | SHA | Role |
|---|---|---|
| #112 abilities | `2ec5b80` | `AbilityState.durS` at fire; no top-level `abilityDurS` |
| #114 endCalls | `e4117c4` | load/offline honor `durS` |
| **#115 Pause** | `409fa6a` | merge commit + pause sim + drop duplicate durS tests |

`git diff e4117c4..409fa6a -- src/save/m5-fields.ts tests/v5-f2-m5-fields.test.ts` → **empty** (PR claim verified). Delta vs #114: 7 files, +237/−10 (`pause.ts`, `tick.ts`, `workers.ts`, `income.ts`, `m5-rules.ts`, pause + f3-config tests).

---

## Claim matrix (sim / save / boundary)

| Claim | Result | Evidence |
|---|---|---|
| Flag off: pause/resume no-op; stray `paused` drains/works | **PASS** | `isPaused` requires `flagOn(pause)`; AC-P1 |
| Rule 1 / AC-P2: unlock farm, hired only | **PASS** | `pauseWorker` guards; tests |
| Rule 3 / §6: recover `rest_recovery_mult` × drain rate, cap 100, no drain; 0 freezes | **PASS** | `pausedRecoveredEnergy`; validation `>=0` and `<=0.35` (D-HOE-02 / §6) |
| No wage / collect / sell / price·demand while paused; MH not stalling player | **PASS** | tick skips actions; income `isPaused`; `marketHandStalled` false when paused; grader/hawker mult → 1 |
| Unpaid+paused: recovers, stays unpaid (no wage resume) | **PASS** | test + tick guard |
| B5: MH resume sets `callLockoutS = tc_pause_call_lockout_s` (45); sim-time countdown; absent ≤ EPS | **PASS** | `resumeWorker` / `tickCallLockout`; focus:false still counts |
| Offline / hidden ≥ 60 s freeze lockout+recovery; <60 s steps | **PASS** | `m5Offline` identity on workers; Game `onHidden`/`onShown` AC |
| Load sanitiser (#91) unknown/junk guards | **PASS** | inherited `pauseLoad` + `v5-m5load-pause-sanitize` (non-boolean paused, lockout cap/drop, below-unlock clear) |
| #114 durS inheritance | **PASS** | m5-fields identical; D-HOE-41 ACs in focused 136 |
| No `abilityDurS`; `SAVE_VERSION` 6 | **PASS** | grep-clean src; save.ts |
| E13 clear-on-save omitted | **PASS (ruled)** | D-HOE-20261030-10; AC-P1 byte-identical wins |
| Telemetry / UI / G5-P | **N/A (scoped out)** | PR + manifest: Features UI + G5-P after Pause sim |

---

## Architecture notes

### Save / game / telemetry boundary
- **Save:** pause fields live on `Worker` (`paused`, MH `callLockoutS`); no schema bump. Flag-off: fields inert + preserved (#91). Flag-on load: `sanitizePausedOnLoad` + lockout clamp/drop (E9/E12).
- **Game:** no new cross-tab API. Hidden ≥60 uses existing `m5Offline` then offline grant; short hide uses `m5ShortGap` + continued `step` (lockout/recovery advance). Newer-save / tab-guard paths untouched.
- **Telemetry:** this tip does **not** emit `worker_paused` / `worker_resumed` (no UI toggle wiring). Spec §12 emit rules belong with the Pause UI / rc2 Rest exclusive-emission work — **not a sim Fail** for row 31 as scoped.

### Clock / duration / focus
- Energy recovery + lockout use **sim `dt`** inside `step` (including `focus: false`). Ability focus timers remain focus-gated elsewhere; Pause lockout intentionally sim-time (B5 / AC).
- Offline / hidden ≥60: `step` not applied to kept state → freeze (tested).

### Flag-0
All behavioural reads go through `isPaused` / `flagOn(b,'pause')`. Income/tick/workers/pause APIs identity or drain-as-normal when flag off (AC-P1 + f3-is-paused grep contract).

### Unknown-save / sanitiser
`pauseLoad` iterates `WORKERS` only (unknown ids pass through — D-HOE-10 N2 intent). Junk `paused` / `callLockoutS` stripped or capped when flag on. Flag off: load leaves pause fields untouched (byte-identical path).

---

## Minors

| ID | Severity | Note |
|---|---|---|
| **m1** | Minor (QA deliverable) | Spec v1.3.10 / §15 / QA-D-1030-ACP1-B: Pause PR should ship a **committed tracksV7 fixture with ≥1 hired worker** so formal AC-P13 can run. This tip covers freeze/reload with **synthetic** `Game.state` assignment + m5Load round-trip, but **adds no fixture file**. Does not invalidate sim logic; HoQA may still require the fixture or a waiver before Ready. |

Non-issue: in-egg-farm-git absence of `product/workers/m5-worker-pause-spec.md` (PR discloses; studio pin used). Spec header now v1.3.15 — cited sim rules unchanged since v1.3.6.

---

## Gates / provenance

| Gate | Status |
|---|---|
| `tsc --noEmit` | **0** independent |
| Focused vitest (pause + D-HOE-41 fields + abilities + sanitiser + f3 isPaused/config + f2 game settle) | **7 files / 136 passed** @ 22:41 CET, flock `.vitest-eng.lock` + `nice -n 10` — **author 136 claim verified** |
| Full suite | **Not re-run** (avoid redundant; #114 already 2066/1 on base tip; this delta is pause-sim focused) |
| Hosted gate / pacing / release-globals | **SKIPPED** (Draft) |
| verify-24h | Unchecked — **not required** for Architect sim PASS (no pacing driver in tip); HoQA/G5-P may ask later |
| Artifacts | No `artifacts/…409fa6a` bundle found; author evidence = PR body + local 136. UI dryrun `artifacts/v5-ui/dryrun-m5-pause-c8c5d0c` is unrelated tip |

Logs: `scratch/architect/review115-409fa6a/` · WT `/workspace/wt-review-115-409fa6a`

---

## Ready recommendation (no mutation) — separate from merge clearance

**CONDITIONAL YES** for Architect content. Recommend undraft/Ready only when:

| ID | Blocker? | Detail |
|---|---|---|
| B1 | **YES** | Undraft + hosted **`gate` SUCCESS** at frozen `409fa6a` |
| B2 | **YES** | **HoQA** exact-head ACK (may include m1 fixture or waiver) |
| B3 | No (Architect) | Extra full vitest / verify-24h for this tip |
| B4 | Process | Pause **UI** + **G5-P** remain Features follow-ups — do **not** block Architect sim PASS; they do block full ship-set Pause card closure |

**Merge clearance:** not granted here. Stack merge order remains HoE/HoQA (#114 then #115, or combined stack policy). #112 Ready still keyed off #114 endCalls path; #115 does not re-open that residual.

**#114 / #113:** prior Architect results stand (#114 APPROVE + independent 2066/1; #113 PASS 102) — not re-litigated.
