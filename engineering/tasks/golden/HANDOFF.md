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
