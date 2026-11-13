**v5 F1b: evRng/brRng streams, focus (attended) clock in step()/advance(), wall-clock timers against an injected now** (engineering/m5.0-sizing.md §1 F1(a)(b), §12.1 D-C2/D-C3/D-C4, §13 GE-15). Draft into `rc/v5`. Manifest row 6.

**Stacked on #77 (F1a).** This PR's own change is commit `a6b4fe4`. The diff against rc/v5 includes F1a until #77 merges. Merge after #77.

## What
- `src/sim/rng.ts`: `evRngState = mixSeed(state.rng ^ 0x6576526E)`, taken **once** on the first tick with `golden` or `broody` on (D-C2, HoE Q4). `brRng = mixSeed(evRngState ^ 0x62724E67)`, re-derivable and never saved (D-C4). `evDraw`/`brDraw` are pure and never read or write `state.rng`. `brDraw` never advances `evRngState`. Also `isRngState` (D-C5 sanitising rule) and `pickIndex` (the UI passes the valid-spot list and the sim draws an index into it, §12.2).
- `src/sim/clock.ts`: `StepClock {focus, nowMs}` per tick and `FrameClock {focusMs, nowMs}` per frame. `focusFrameMs` = min(gap, `FOCUS_DT_MAX_S` 1.0 s); it's 0 when not attended, for a gap ≤ 0, or at ≥ `offlineMinSeconds` (§9.1a). **D-C3:** the first ⌈focusMs / tick⌉ ticks of a frame carry focus and the rest run with M5 effects suspended. `wallRemainingMs`/`wallReady` read epoch timers against an injected now, clamped to [0, cap] on every read (abilities E2b), and a non-finite value counts as ready.
- `src/sim/timers.ts`: `stepTimers()`, one sub-call per M5 system (§4 hotspot 4). It runs at the end of `step()` only while some `m4.flags.*` is on. Today it holds one system, evRng seeding.
- `tick.ts`: `step(s, dt, b, ev?, clock?)` and `advance(..., clock?)`. `game.ts`: `setAttendedProbe(fn)` (default `() => false`, so no focus accrues until F6's `dialogOpen()` wires it). Visible frames pass `{focusMs, nowMs}`. Hidden frames, the hidden settlement and `debugAdvance` pass no clock (no focus). `readOnly` blocks focus (golden R5c).
- `m5-state.ts`: `brRngState` (session only).

## Flags off: byte-identical
`stepTimers` doesn't run while every flag is off, and without a clock every tick is unfocused. flag-off f90d1678, M4-on a54c9cf9 and the 24 h trace 2c0d3ec3… all match.

## Gates (HEAD a6b4fe4; gate id `v5-f1b-a6b4fe4`)
tsc 0 · vitest (--minWorkers=1 --maxWorkers=2) 1585 passed | 1 skipped (1586) · test:slow 16 passed / 1 skipped · sync-economy --check 0 · build 0 · check-globals chromium 0 · verify --hours 24 PASS (goldens match; trace 2c0d3ec3… unchanged).
Artifacts: `/workspace/egg-farm-studio/artifacts/v5-f1b-a6b4fe4/results/` (SHA256SUMS) and `artifacts` branch `v5-f1b-a6b4fe4/results/`.

## Tests (`tests/v5-f1b-clock-rng.test.ts`)
- **evRng independence:** with golden+broody on and evRng/brRng drawn every tick, `state.rng`, the whole state (minus the RNG fields) and every SimEvent are byte-identical to flags off over 10 min × 3 seeds.
- Seeding: D-C2/GE-AC33 derivation, seeded once, invalid values re-derived, no field with flags off or with `m4.enabled` 0.
- **Attended-only timer advance:** stepTimers counts only focus ticks. D-C3: a 59 s frame gives exactly the first 10 ticks focus (1.0 s) and 580 suspended. `focusFrameMs` edges are covered. Flags off: `step` with any clock equals `step` without one. Game: visible frames read the probe, and attended vs not gives an identical game state with flags off.
- Wall-clock: remaining, clamp after a clock rollback, NaN/undefined count as ready.

## Questions (all RULED, D-HOP-2026-10-29-06; see the update below)
- Q-F1b-1: the first `evRngState` is seeded at the end of the first flag-on tick, after that tick's customer draws (`state.rng` may have moved during the tick). GE-AC33 says "golden on from tick 0, the reference is `mixSeed(mixSeed(7) ^ salt)`". That holds only if no customer arrives on tick 0, which is true for `initialState` (`first_customer_s` > 0.1 s). The test pins the post-tick derivation. Should GE-AC33 be read as "the rng value at the seeding tick"? Owner: HoQA/PM Collection.

Self-review: engineering/reviews/pr79-a6b4fe4.md (studio folder).

## Update 2026-10-29 21:4x CET: merged #77 (incl. rc/v5 406e455 #81 F2), head 6ece3e0
- Merge conflict in `src/game.ts` `frame()`: kept both F1b's focus clock (`focusFrameMs`, `{focusMs, nowMs}` into `advance`) and F2's `m5Offline` on a gap >= maxMs.
- **Q-F1b-1 RULED (D-HOP-2026-10-29-06)**: the default stands. evRngState is seeded once at the END of the first flag-on tick, after that tick's customer draws (= GE-AC33 for initialState). Code comment in `src/sim/timers.ts` names Q-F1b-1 / D-HOP-2026-10-29-06. Single seeding path: F2's `save/m5-fields.ts` now re-exports `EV_RNG_SALT` / `ensureEvRng` from `sim/rng.ts` (identical formula, no behaviour change). New test pins both cases (no arrival on tick 0 = mixSeed(mixSeed(7) ^ salt); arrival on the first flag-on tick seeds from the post-draw rng).
Gates at 6ece3e0: sync --check 0 · tsc 0 · vitest 1633 passed / 1 skipped · goldens 4/4 byte-identical · build + check-release-build 0 · build:html 0 · check-globals chromium 0 (3× PASS, flock .browser-test-2.lock, load ≤ 12).
