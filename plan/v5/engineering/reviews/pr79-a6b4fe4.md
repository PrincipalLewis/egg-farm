# Self-review: PR #79 v5 F1b (evRng/brRng, focus clock, wall-clock timers) at a6b4fe4
Senior Software Architect, 2026-10-29 CET. Stacked on #77 (ea6b6db). Own diff (a6b4fe4): 7 files, +249 / −5: src/sim/{rng,clock,timers}.ts (new), src/sim/tick.ts, src/game.ts, src/sim/m5-state.ts, tests/v5-f1b-clock-rng.test.ts.

## Checked
- **Isolation (GE-AC3/BH-AC15):** nothing in rng.ts reads `state.rng` except the one-time `deriveEvRngState`, called by `ensureEvRng` only while `evRngState` is invalid. A test draws evRng and brRng every tick for 10 min × 3 seeds with golden+broody on; the customer sequence, every event and the state (minus the RNG fields) are byte-identical to flags off.
- **D-C4:** `brDraw` seeds from `evRngState` once and then uses its own `brRngState`. It never writes `evRngState` (tested).
- **Flags off:** `step()` calls `stepTimers` only when `anyM5FlagOn(b)`, and `advance()` without a clock passes `undefined`. All existing callers (bots, verify, goldens, hidden sim) are unchanged. The goldens and the 24 h trace match.
- **D-C3 / GE-15:** `focusFrameMs` clamps to 1.0 s and returns 0 for a gap ≥ 60 s (§9.1a), when not attended, for a gap ≤ 0 or NaN, and when read-only. `focusTicks` = ⌈focusMs / tick⌉ with a float guard. The 59 s frame test shows exactly 1.0 s of focus, on the first 10 ticks.
- **Wall clock:** step() never calls `Date.now`. Game injects `nowMs = this.now()` (the same injectable clock tests use). `wallRemainingMs` clamps on every read (E2b).
- **Perf:** `anyM5FlagOn` costs 13 property reads per tick. The slow suites (AC7, worst-seed) ran in the normal time (test:slow 456 s vs 464 s on F1a).

## Findings
| # | Severity | Finding | Action |
|---|---|---|---|
| 1 | Minor | `setAttendedProbe` defaults to "not attended", so with a flag on and no UI wiring, M5 timers never move. That's the safe default, but F6/#1 UI **must** call `game.setAttendedProbe(() => !dialogOpen())`. | In the API sheet for UI; checked at the #1 UI review |
| 2 | Minor | The evRng seed is taken at the end of the first flag-on tick, after that tick's customer draws. For `initialState` this equals GE-AC33's `mixSeed(mixSeed(7) ^ salt)`, since `first_customer_s` = 10 s means no draw on tick 0. For a running save it uses the rng at that tick, which is deterministic per save (golden spec Q4 note). | Q-F1b-1 recorded for HoQA/PM Collection |
| 3 | Nit | `TIMER_SYSTEMS` is a readonly array, so a test injects systems through `stepTimers`'s last parameter. `advance()` can't take injected systems; the D-C3 test drives `tickClock`/`stepTimers` the same way advance does. | Accepted |
| 4 | Nit | The hidden < 60 s sim passes no clock, so M5 effects are suspended for its sales (golden X2: no uplift while hidden), but I_ref still counts them (#3 will read sim time, not focus). | Matches the spec; noted for #3 |

No Blocker, Critical or Major findings.
