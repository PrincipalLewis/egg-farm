# HoE/v5-reland-138 — #139 Golden — HANDOFF (04:37 CET, 2026-11-13)

**State:** re-landed onto rc/v5 `425ecdaf` (#138 merged). Reused Architect-PASS scratch `48c50bb4` (tree `22691c29`) resolutions; mergefwd tree is identical to that scratch head. `goldenSession` is state-held: contributor `fields(src)` reads `src ?? this.state`, and `resetGoldenSession` runs in both contributor `reset()` and `resetSessionFields` (idempotent; Architect). Local gates green. PR stays Ready. This HANDOFF commit sits on top of the mergefwd tip.

**PR:** https://github.com/PrincipalLewis/egg-farm/pull/139. Branch `gen/golden`, worktree `/workspace/wt-gen-golden`.
**Gates tip `74a41992`** (tree `22691c29`, parents `cf2e402a` + `425ecdaf`). Src hunks: **same as scratch** `48c50bb4`. This HANDOFF commit sits on top.

**Merges:**
- `74a41992` = `cf2e402a` + `425ecdaf`. Conflict: `src/game.ts`. Also took scratch `src/sim/golden.ts` and `src/sim/session.ts` (`resetGoldenSession` in `resetSessionFields`). Auto-merged remaining src/tests already matched scratch. Existing #142 HANDOFF file was left untouched in the merge and is superseded by this section.

**Resolved hunks (same as scratch 48c50bb4):**
- `src/game.ts` ctor: `registerSessionEnd('golden', { fields: (src) => ({ ...sessionEndGoldenFields(src ?? this.state, this.b) }), reset: () => resetGoldenSession(this.state) })`. Hook order: taps, pause, present, then golden. `endSession` no longer `track('session_end')` / `sessionEndPayload`.
- `src/sim/session.ts`: `resetGoldenSession(s)` in `resetSessionFields`.

## Gates @ 74a41992 (`/workspace/scratch-reland138/logs-phaseb/139/`)
- tsc 0.
- Focused: 9 files / 168 pass (golden freeze/game/m5persist/rewards/spawn, session-clock, rotate-hook, tel-envelope, ST-AC19-20).
- ST-AC20 by name: 5 pass / 11 skipped, EXIT 0.
- Flag-0 goldens: GOLDEN1 `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544` / `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5` unchanged. 2 files pass.
- Full npm test: 169 files, 2555 pass / 1 skip, EXIT 0.
- Build + check-release-build: ok (`m4.1+74a41992`). Re-run on the tip that includes this file is not required (docs-only follow-up).

## Hosted runs @ 74a41992 (auto, 2026-11-13 04:36 CET)
- ci: https://github.com/PrincipalLewis/egg-farm/actions/runs/43360120691 (queued)
- pacing-x1-stack: https://github.com/PrincipalLewis/egg-farm/actions/runs/43360120632 (queued)
- k10-breeds-offset: https://github.com/PrincipalLewis/egg-farm/actions/runs/43360120659 (queued)
PR Ready, base rc/v5, MERGEABLE, mergefwd head 74a41992. Not waited. Hosted ids above are the mergefwd tip; the docs commit will trigger a new set (not waited).

## Left
Parked UI stage unchanged. Architect PASS at scratch `48c50bb4` / mergefwd tree `22691c29`.

---

# HoE/v5-139-reland-142 — #139 gen/golden — HANDOFF (02:24 CET, 2026-11-13)

**State:** re-landed onto rc/v5 `b83ce852` (#142 merged). Only conflict was `tests/v5-telemetry-st-ac19-20.test.ts`. Took #142's version **as-is** (no extra case): pause=1/rc2Refill=0 fields are 0; absent when pause is off or rc2Refill=1; no closed key whitelist. Our prior mergefwd test only asserted presence on pause=1 and absence with pause off, which #142 already covers. No product logic change. Local gates green. PR stays Ready. Architect prior verdict **PASS** at previous head `06ac2996` is carried over.

**PR:** https://github.com/PrincipalLewis/egg-farm/pull/139. Branch `gen/golden`, worktree `/workspace/wt-gen-golden`.
**Gates tip `a7f107f2`** (tree `ad1fc2f3`, parents `06ac2996` + `b83ce852`). This HANDOFF commit sits on top.

**Resolved hunks:**
- Prior game.ts keep-both (`{ ...pauseEnd, ...payload }`) unchanged.
- `tests/v5-telemetry-st-ac19-20.test.ts` **lines 134–141** (took #142 / theirs `b2587b2a`): Before (ours): mergefwd test with `toHaveProperty` on pause=1 and absence with pause off. After: #142 case with exact zeros, pause-off absence, and rc2Refill=1 absence. Extra ST-AC20 case kept: **none**.

## Gates @ a7f107f2 (`/workspace/artifacts/v5-139-reland-a7f107f2/`)
- tsc 0.
- Focused golden + F3 + ST-AC20: 8 files / 171 pass. F3-no-literal (`tests/v5-f3-config.test.ts`) 28; freeze 44; spawn 25; rewards 21; game 21; m5persist 7; is-paused 9; ST-AC20 16 (including the #142 paused_* case, by name).
- Flag-off goldens unchanged: GOLDEN1 `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544` / `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5`. 2 files / 4 pass.
- Full npm test: 166 files, 2521 pass / 1 skip, EXIT 0. ST-AC20 file 16/16 pass.
- Build + check-release-build: ok (`m4.1+a7f107f2`). Re-run tsc+build on the tip that includes this file.

## Hosted runs
Collected after the plain push of this HANDOFF tip; not waited. See the PR checks / the reland report.

## Parked (UI stage) / open questions
Unchanged from the previous section below.

---

# HoE/v5-139-mergefwd2 — #139 gen/golden — HANDOFF (00:54 CET, 2026-11-13)

**State:** merged forward onto rc/v5 `5552556b` (#140 / #132 landed, on top of mergefwd `08e5937e` onto `0755a284` / #119). mergefwd2 onto `5552556b` was a **clean auto-merge**. The only conflict was mergefwd1 in `src/game.ts` `endSession`, resolved by keeping both sides: precompute `pauseEnd` and `sessionEndPayload` (present_* + golden fields) and track `{ ...pauseEnd, ...payload }` (T-AC9). No product logic change. Test-only follow-up: the #123 ST-AC20 subset-isolation guard now expects Saves-owned `paused_*` present when pause=1 (from `pauseSessionEnd`) and still absent when pause is off. Local gates green. PR stays Ready.

**PR:** https://github.com/PrincipalLewis/egg-farm/pull/139. Branch `gen/golden`, worktree `/workspace/wt-gen-golden`.
**Gates tip `1e9ed224`** (tree `0ccddc44`) = test fix on mergefwd **`b9be3663`** (tree `a49d44d9`, parents `08e5937e` + `5552556b`). This HANDOFF commit sits on top.

**Merges:**
- `b9be3663` = `08e5937e` + `5552556b`. Clean auto-merge. Incoming: `src/sim/events.ts` (`worker_paused`), `src/sim/pause.ts`, new `src/sim/pause-events.ts`, `tests/v5-worker-paused.test.ts`.
- `08e5937e` = `0aca2cc2` + `0755a284`. Only conflict: `src/game.ts` `endSession`. `sessionEndPayload` at line 33 unchanged. ST-AC19/20 constructor/tap auto-merged.

**Resolved hunks:**
- mergefwd2 (`5552556b`): **no conflict hunks**.
- mergefwd1 (`0755a284`) @ `08e5937e` `src/game.ts` `endSession`:
  - Before (ours `0aca2cc2` lines 344–346): `this.telemetry.track('session_end', sessionEndPayload(this.state, this.b));` No `pauseSessionEnd`.
  - Before (theirs `0755a284` lines 346–352): `pauseEnd` + `presentEnd`; `track('session_end', { ...pauseEnd, ...presentEnd })`. No sessionEndPayload / golden fields.
  - After **lines 347–351**:
```
    // Row 32 ... T-AC9 ...
    const pauseEnd = pauseSessionEnd(this.state, this.b); // pause §12 L299 ...
    const payload = sessionEndPayload(this.state, this.b); // present_* + golden session_end fields
    this.telemetry.track('session_end', { ...pauseEnd, ...payload }); this.save(); this.telemetry.flush(true); }
```
    `sessionEndPayload` stays at **line 33**: `({ ...sessionEndPresentFields(s, b), ...sessionEndGoldenFields(s, b) })`.
    Import auto-merged at **line 21**: `import { pauseSessionEnd } from './sim/pause';`.

## Gates @ 1e9ed224 (`/workspace/artifacts/v5-golden-1e9ed224/`)
- tsc 0.
- Focused golden + F3: 7 files / 155 pass. F3-no-literal (`tests/v5-f3-config.test.ts`) 28; freeze 44; spawn 25; rewards 21; game 21; m5persist 7; is-paused 9.
- Flag-off goldens unchanged: GOLDEN1 `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544` (flagoff), `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5` (m4on). 2 files / 4 pass.
- Full npm test: 166 files, 2521 pass / 1 skip, EXIT 0.
- Build + check-release-build: ok (`m4.1+1e9ed224`). Re-run on the tip that includes this file.

## Hosted runs
Collected after the plain push of this HANDOFF tip; not waited. See the PR checks / the mergefwd report.

## Parked (UI stage) / open questions
Unchanged from the previous section below.

---

# HANDOFF · gen/golden (sim/logic only)

**Date:** 2026-11-12 23:22 CET (Europe/Belgrade, UTC+1)
**Branch:** `gen/golden` · worktree `/workspace/wt-gen-golden`
**Base:** `origin/rc/v5` `be77b1c0` (#128), ordinary mergefwd `0d6aae89`. F6 is not an ancestor and was not merged (sim does not need F6 APIs).
**Spec:** `product/collection/m5-golden-egg-spec.md` v1.3.3 sha1 `2eb630e398686f4c81e9650684de18af21d00a3d` (verified)
**Art pin:** `art-ux/m4-timed-collectible.md` v1.1 sha1 `28dcff19b697a4fd6752b88562124e5b24dbc934` (verified; UI parked)
**Flag:** `m4.flags.golden` default 0 (already in rc/v5)

## Already on rc/v5 (do not duplicate)
#107 rewards, #108 spawn/lifetime/tap, #109 persist B, #111 Game wiring.

## This PR (sim only, flags 0)
1. `goldenFrozen(s, b)` in `src/sim/golden-frozen.ts` (v1.3.3 R5g / GE-AC44): pause on, F ≥ `tc_pause_unlock_farm`, ≥1 hired worker `isPaused`. Consumers: goldenTick, frenzyTick, frenzyFactor (×2 off, streak kept), tapGolden (identity: no collect, no evRng, no event), spawnDue.
2. Session_end helper (T-AC9): `sessionEndPayload` spreads `sessionEndPresentFields` and `sessionEndGoldenFields` (no comma-bearing calls in the `session_end` literal). Fields: `golden_spawned`, `golden_collected`, `golden_cents`, `frenzy_extra_cents`; `golden_frozen_s` (0.1 s) only when pause is also on (TEL-14). Session-only (`goldenSession`, `goldenForceReward`), stripped on save. TEL-14 uses `pauseOn` in golden-frozen.ts so `flagOn` stays out of golden.ts (F3 literal scan).
3. QA hooks (dev/`build:qa` only; release rejects `eggfarmQa`): `tc.spawn`/`tc.state`, `frenzy.start`, X5 aliases `golden.{state,seed,spawnNow,forceReward,setAge}`. Setters go through Game. `qaGoldenState` uses `tcNum` (no `tc.x ?? N` fallbacks). Overlay/audio/DOM parked.
4. GE-AC2: the first-spawn init tick sets `nextSpawnRemainingS = tc_first_spawn_s` and does not decrement on that same tick.

## Gates (post-22:47 CET reboot, lane-run generalist; src at `d947a198`)
- tsc 0
- full `npm test`: 2443 passed, 1 skipped, 163 files, EXIT 0 (F3-no-literal 28; freeze 44; spawn 25; rewards 21; game 21; m5persist 7; is-paused 9)
- flag-off goldens unchanged: `f90d1678c260e1b6…` (flagoff), `a54c9cf9d6a4c967…` (m4on)
- `npm run build` + `check-release-build`: EXIT 0, `m4.1+d947a198 ok`. Re-run on the tip that includes this file.
- k10 (known-red, not a GO gate): csv=`a8c4e268` bc=defaults seeds=1-200 settle=0; F20-29 median premium g1max **63.12** | no-breeds **63.10** | Present-only **63.10** → FAIL (expected 63.12 vs 63.10)

## Parked (UI stage) / open questions
GLD-AC4/7/8 UI, GLD-UI1, GE-AC40 style/bubble/a11y, GE-AC40b, GE-AC41 pill/chip, GE-AC42 bubble, audio.log, F6 overlay, art/sfx.
- GE-AC42 mid-fade (R18): existing sim expires at 30.0 s — left unchanged (conservative).
- `golden_frozen_s` sums focus-clock seconds only (menus have focusS=0, not counted).
- `worker_paused.golden_on_screen`/`frenzy_active`: `goldenWorkerPausedFields` exported; emitter is Saves (#128) — not wired here.
- G5-P 1–200 parity waits for that driver to import `goldenFrozen`.
- Manage-all lift not tested (#119 not in this base; `resumeWorker` is).
