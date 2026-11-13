head b0415619ccc46adb36a2968b5e49fa1e8a68aa52
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


## Update 2026-10-29 23:2x CET: head b041561 (final for Saves QA)
**Still stacked on #77**: the diff against rc/v5 includes F1a until #77 merges. Restacked by merging parent heads only (no rebase, no force-push). CCR PASS at 6ece3e0 (0 Blocker / 0 Major / 0 Minor / 1 Nit, engineering/reviews/pr79-6ece3e0-ccr.md).

### Post-CCR delta (6ece3e0 → b041561), one line per commit
| commit | category | what |
|---|---|---|
| eb2f110 | rc/v5 merge | merge #77 head 37f24c1 (carries rc/v5 d3b5a53 #78); one import-line conflict in src/save/m5-fields.ts resolved (`m4On`/`mixSeed` no longer used) |
| 9bebf4b | CCR nit | N-1: `frame()` reads the attended probe only while some M5 flag is on |
| 56bdd4f | rc/v5 merge (parent head) | merge #77 head 2e18aba (AC tags) |
| f5265b7 | AC tags + trace table | AC ids in test titles; new `[AC-M5A-3]` wall-clock cooldown test |
| 2f1298a | rc/v5 merge (parent head) | merge #77 final head 172ca3f |
| b041561 | Saves QA test gaps | new tests/v5-f1b-focus-wiring.test.ts: advance()-level D-C3 focus ticks; Game focus withheld for readOnly / hidden frame / settleHiddenPeriod / debugAdvance |
No other production-code change. Goldens and trace unchanged (below).

### Self-review of CCR minors/nits (D-CEO-20261028-02)
- **N-1 (Nit)** probe read every frame with all flags off (src/game.ts:411): now `!readOnly && anyM5FlagOn(b) && probe()`. Goldens stay byte-identical (with every flag off no M5 timer runs, so focus has no effect). The old test asserted `calls >= 120` on the all-off balance, which is now wrong by design; it is replaced by a stricter pair: flags off → **0** probe reads and identical state attended or not; a flag on → ≥ 120 reads. Mutant M79-6 fails it. #80 moves the same check into `attendedNow()` so player-sale dispatch also skips the probe.

### AC trace (Saves QA table qa/v5-saves/trace-reviews/pr79-9bebf4b.md, extended). 21 rows
| AC id | test file::test name |
|---|---|
| D-C2, **GE-AC33 partial (seed derivation only)** | tests/v5-f1b-clock-rng.test.ts::F1b evRng / brRng > [GE-AC33][D-C2] derivation matches D-C2 / GE-AC33 (initialState(b,7) at tick 0) |
| Q-F1b-1, GE-AC33 partial | tests/v5-f1b-clock-rng.test.ts::F1b evRng / brRng > [Q-F1b-1][GE-AC33] Q-F1b-1 (D-HOP-2026-10-29-06): seeded at the END of the first flag-on tick, after that tick's customer draws |
| D-C2 seed once | tests/v5-f1b-clock-rng.test.ts::F1b evRng / brRng > [D-C2] seeded once: later ticks never re-read state.rng |
| F1(a) isolation (GE-AC3 / BH-AC15 isolation part), D-C4 | tests/v5-f1b-clock-rng.test.ts::F1b evRng / brRng > [F1(a)][D-C4] isolation: golden/broody on + evRng/brRng drawn every tick leaves the customer sequence byte-identical |
| D-C4 own stream | tests/v5-f1b-clock-rng.test.ts::F1b evRng / brRng > [F1(a)][D-C4] evDraw is xorshift32 from the seed and never touches rng; brDraw never advances evRngState |
| D-C4 not saved | tests/v5-f2-m5-fields.test.ts::F2 persist (save shape) > [CCR-77-m1][D-C4] the strip list IS F1a M5_SESSION_FIELDS, pinned to the 8 spec keys; each one is dropped by persist and serialize |
| D-C5 / D-C2 invalid re-derived | tests/v5-f1b-clock-rng.test.ts::F1b evRng / brRng > [D-C2] invalid evRngState (0, negative, NaN, > uint32, float) is re-derived; draws refuse an unseeded state |
| F1(a) flags off | tests/v5-f1b-clock-rng.test.ts::F1b evRng / brRng > [D-C2] flags off (or only non-RNG flags on): no evRngState is ever created |
| §12.2 pickIndex | tests/v5-f1b-clock-rng.test.ts::F1b evRng / brRng > [F1(a)] pickIndex stays in range |
| F1(b) attended-only timers | tests/v5-f1b-clock-rng.test.ts::F1b focus (attended) clock > [F1(b)] stepTimers advances an M5 timer only on focus ticks |
| GE-15 / §9.1a / GE-AC31 (clamp part) | tests/v5-f1b-clock-rng.test.ts::F1b focus (attended) clock > [F1(b)][GE-AC31] focusFrameMs: clamp to 1.0 s, 0 when not attended, non-positive or >= 60 s (§9.1a) |
| D-C3 tick split (tickClock level) | tests/v5-f1b-clock-rng.test.ts::F1b focus (attended) clock > [D-C3][GE-AC31] D-C3: a 59 s frame gives exactly the first 10 ticks focus (1.0 s), the other 580 suspended |
| **D-C3 / F1(b) advance() wiring** | tests/v5-f1b-focus-wiring.test.ts::F1b advance(): D-C3 focus ticks > [D-C3][F1(b)] a 59 s frame with focusMs 1000 gives focus to exactly the first 10 of 590 ticks (sum 1.0 s), through advance() |
| F1(b) advance state | tests/v5-f1b-clock-rng.test.ts::F1b focus (attended) clock > [F1(b)][D-C3] advance(): focus ticks = ceil(focusMs / tick); state equals the clockless run while M5 timers are inert |
| F1(b) Game: visible attended (control) | tests/v5-f1b-focus-wiring.test.ts::F1b Game: focus only on a visible, attended, live frame (flag on) > [F1(b)] visible attended frames: focus > 0 (control) |
| **F1(b) / golden R5c readOnly** | tests/v5-f1b-focus-wiring.test.ts::F1b Game: focus only on a visible, attended, live frame (flag on) > [F1(b)][R5c] read-only game: ticks run, focus is 0 |
| **F1(b) hidden frame** | tests/v5-f1b-focus-wiring.test.ts::F1b Game: focus only on a visible, attended, live frame (flag on) > [F1(b)] hidden frames: ticks run, focus is 0 |
| **F1(b) settleHiddenPeriod** | tests/v5-f1b-focus-wiring.test.ts::F1b Game: focus only on a visible, attended, live frame (flag on) > [F1(b)] settleHiddenPeriod (gap < 60 s, uncovered time simulated): focus is 0 |
| **F1(b) debugAdvance** | tests/v5-f1b-focus-wiring.test.ts::F1b Game: focus only on a visible, attended, live frame (flag on) > [F1(b)] debugAdvance: focus is 0 |
| E2b, AC-M5A-3 | tests/v5-f1b-clock-rng.test.ts::F1b wall-clock timers (injected now) > [F1(b)] remaining ms against now, clamped to [0, cap] on every read (abilities E2b); tests/v5-f1b-clock-rng.test.ts::F1b wall-clock timers (injected now) > [AC-M5A-3][F1(b)] a 300 s cooldown keeps counting on wall clock: not ready at 299 s, ready after a 60 s menu + 10 min offline (t = 610 s) |
| flags off byte-identical, CCR-79-N1 | tests/v5-f1b-clock-rng.test.ts::F1b focus (attended) clock > [F1(b)] flags off: step with any clock == step without one (byte-identical sim); tests/v5-f1b-clock-rng.test.ts::F1b Game wiring (attended probe) > [CCR-79-N1][F1(b)] flags off: the probe is never read, and attended or not the game state is identical; tests/v5-f1b-clock-rng.test.ts::F1b Game wiring (attended probe) > [CCR-79-N1][F1(b)] visible frames read the probe once an M5 flag is on (streak) |
GE-AC33's fixed draw order (gap/slot/reward) and reload continuation are NOT claimed here: they belong to F2 #81 (evRngState save/load) and golden #1. Rows checked against `vitest --reporter=verbose` at b041561.

### Mutation checks (applied locally, run, reverted; tree clean after)
| id | mutant | result |
|---|---|---|
| M79-1 | tick.ts `nFocus = clock && clock.focusMs > 0 ? Infinity : 0` (every tick focus) | FAIL [D-C3][F1(b)] … through advance() |
| M79-2 | drop `!this.readOnly &&` in frame() | FAIL [F1(b)][R5c] read-only game |
| M79-3 | hidden frame passes `{ focusMs: step }` to advance | FAIL [F1(b)] hidden frames |
| M79-4 | settleHiddenPeriod passes `{ focusMs: uncover }` | FAIL [F1(b)] settleHiddenPeriod |
| M79-5 | debugAdvance passes `{ focusMs: ms }` | FAIL [F1(b)] debugAdvance |
| M79-6 | frame() reads the probe with every flag off (N-1 reverted) | FAIL [CCR-79-N1] flags off: the probe is never read |
| M79-7 | `wallReady` true within 1 s of readyAt | FAIL [AC-M5A-3] and [F1(b)] E2b |

### Gates at b041561 (gate id v5-f1b-b041561)
tsc 0 · sync-economy --check 0 · vitest (flock .vitest-eng.lock, nice 10, --minWorkers=1 --maxWorkers=2) 1656 passed / 1 skipped · test:slow 16 passed / 1 skipped · build (incl. check-release-build) 0 · check-globals chromium 0 · verify --hours 24 PASS: goldens f90d1678 / a54c9cf9 match, trace 2c0d3ec3… MATCH. Artifacts: /workspace/egg-farm-studio/artifacts/v5-f1b-b041561/results/ (SHA256SUMS ok).

