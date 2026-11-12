# HANDOFF · gen/golden (sim/logic only) · WIP

**Date:** 2026-11-12 23:06 CET (Europe/Belgrade, UTC+1)
**Branch:** `gen/golden` · worktree `/workspace/wt-gen-golden`
**Base:** `origin/rc/v5` was `006bdd72` at branch-cut; will merge-forward onto current `origin/rc/v5` (F6 is not an ancestor; sim does not need F6 APIs)
**Spec:** `product/collection/m5-golden-egg-spec.md` v1.3.3 sha1 `2eb630e398686f4c81e9650684de18af21d00a3d` (verified)
**Flag:** `m4.flags.golden` default 0 (already in rc/v5)

## Already on rc/v5 (do not duplicate)
#107 rewards, #108 spawn/lifetime/tap, #109 persist B, #111 Game wiring.

## This PR (sim only, flags 0)
1. `goldenFrozen(s, b)` (v1.3.3 R5g): pause on, F ≥ `tc_pause_unlock_farm`, ≥1 hired worker `isPaused`. Used by goldenTick, frenzyTick, frenzyFactor (×2 off, streak kept), tapGolden (no collect, no evRng), spawnDue.
2. Session_end helper (T-AC9): `golden_spawned`, `golden_collected`, `golden_cents`, `frenzy_extra_cents`; `golden_frozen_s` (0.1 s) when pause is also on. Session-only, stripped on save.
3. QA hooks (dev/`build:qa`, `eggfarmQa`): `tc.spawn`/`tc.state`, `frenzy.start`, plus X5 `golden.{state,seed,spawnNow,forceReward,setAge}`. Overlay/audio/DOM parked.

## Parked (UI stage, open questions)
GLD-AC4/7/8 UI, GLD-UI1, GE-AC40 style/bubble/a11y, GE-AC40b, GE-AC41 pill/chip, GE-AC42 bubble, audio.log, F6 overlay, art/sfx. GE-AC42 mid-fade (R18 wins): existing sim expires at 30.0 s, no mid-fade sim state — left unchanged (conservative). `worker_paused.golden_on_screen`/`frenzy_active`: helper exported; emitter is Saves (#128, now on rc/v5 — check whether to wire). G5-P 1–200 parity waits for that driver to import our function.

## Status
Box rebooted 22:47 CET; red-first commit `e79652f9` was lost (not in object store). Implementation on disk survived for game.ts / golden.ts / main.ts / golden-qa.ts. Restoring lost tests, `golden-frozen.ts`, effects/state/save patches, then merge-forward and re-run gates via lane-run.
