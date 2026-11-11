# Trace review: PR #79 "v5 F1b: evRng/brRng streams, focus clock in step(), wall-clock timers vs injected now" @ 9bebf4b7f1c4
- **Base** rc/v5 · Draft · stacked on #77 (head contains 37f24c1) · manifest row 6 · reviewed 2026-10-29 22:4x CET, read-only.
- **Governing spec:** engineering/m5.0-sizing.md (42a19857) §1 F1(a)(b), §12.1 D-C2/D-C3/D-C4/D-C5, §13 GE-15, §9.1a; product/collection/m5-golden-egg-spec.md (f6b3a05e) GE-AC33 (seed part only); abilities spec (06f98b49) E2b; ruling D-HOP-2026-10-29-06 Q-F1b-1.
- **Head note:** 9bebf4b = CCR N-1 self-review commit on top of 6ece3e0 (CCR SHA in decisions.md L249).

## Verdict: **RETURN TO AUTHOR**
## Gaps (exact)
1. **No trace table in the PR body** (blocking by rule, decisions.md L247).
2. **D-C3 / F1(b) at advance() level: test doesn't assert what its name claims.** `tests/v5-f1b-clock-rng.test.ts::advance(): focus ticks = ceil(focusMs / tick); state equals the clockless run while M5 timers are inert` only checks `ticks === 590`, state equality (timers inert) and the `focusTicks` helper. It never checks that `advance()` hands focus to the first ⌈focusMs/tick⌉ ticks and not the rest. **Mutant evidence:** `src/sim/tick.ts` `nFocus = clock && clock.focusMs > 0 ? Infinity : 0` (every tick of a 59 s frame gets focus) → **16/16 tests still pass**. The D-C3 test above it drives `tickClock` by hand, not `advance()`. Needed: register a recording TimerSystem (or a fixture timer) and assert through `advance(…, {focusMs: 1000})` over a 59 s frame that exactly 10 ticks carry focus (Σ focus = 1.0 s).
3. **F1(b) Game wiring: no test that focus is withheld when it must be.** PR body: "hidden frames, the hidden settlement and `debugAdvance` pass no clock; `readOnly` blocks focus (golden R5c)". The two Game tests only count probe reads with a flag on; none asserts focus = 0 for readOnly, hidden frames, settlement or debugAdvance. **Mutant evidence:** removing `!this.readOnly &&` from `frame()`'s `focusFrameMs(...)` call → **16/16 pass**. Needed: with a flag on and a recording timer system, assert zero focus for readOnly, a hidden frame, `settleHiddenPeriod` and `debugAdvance`, and > 0 for a visible attended frame.
4. **GE-AC33 is only partly in scope:** derivation/seed-once are tested; the fixed draw order (gap/slot/reward) and "reload continues from evRngState, no repeat/skip" belong to F2 (#81) and golden #1. The trace table must mark GE-AC33 as *partial (seed derivation)* and name where the rest is traced, not claim it whole.

## Requirement → test check
| req | requirement | test file::name @9bebf4b | asserts it? | status |
|---|---|---|---|---|
| D-C2 / GE-AC33 (seed) | evRngState = mixSeed(state.rng ^ 0x6576526E), once, on first golden/broody tick | ::derivation matches D-C2 / GE-AC33 (initialState(b,7) at tick 0); ::Q-F1b-1 (D-HOP-2026-10-29-06): seeded at the END of the first flag-on tick… | yes (both the no-arrival and arrival cases; single seeding path with F2) | OK |
| D-C2 seed-once | never re-reads state.rng | ::seeded once: later ticks never re-read state.rng | yes (3000 ticks with customers moving state.rng) | OK |
| F1(a) isolation (GE-AC3/BH-AC15 isolation part) | spawns/rolls never draw state.rng; customer sequence byte-identical | ::isolation: golden/broody on + evRng/brRng drawn every tick leaves the customer sequence byte-identical | yes (3 seeds × 10 min: rng, state minus RNG fields, every SimEvent) | OK, strong |
| D-C4 | brRng own stream, never advances evRngState | ::evDraw is xorshift32 from the seed and never touches rng; brDraw never advances evRngState | yes | OK |
| D-C4 not saved | brRngState session-only | tests/v5-f2-m5-fields.test.ts::CCR m1 (#77)… (brRngState in the 8 stripped keys) | yes | OK (cite) |
| D-C5 | invalid evRngState re-derived | ::invalid evRngState (0, negative, NaN, > uint32, float) is re-derived… | yes | OK |
| F1(a) flags off | no evRngState with flags off / non-RNG flags / m4.enabled 0 | ::flags off (or only non-RNG flags on)… | yes | OK |
| F1(b) attended-only timers | M5 timers advance only on focus ticks | ::stepTimers advances an M5 timer only on focus ticks | yes (stepTimers level) | OK |
| GE-15 / §9.1a | focusDt = min(dt, 1.0 s); 0 if not attended, ≤ 0, NaN or ≥ 60 s | ::focusFrameMs: clamp to 1.0 s, 0 when not attended… | yes | OK |
| D-C3 (tick split) | first ⌈focus/tick⌉ ticks focus, rest suspended | ::D-C3: a 59 s frame gives exactly the first 10 ticks focus… | yes for `tickClock`+`stepTimers`; **not for `advance()`** | **GAP 2** |
| F1(b) advance wiring | advance passes focus to the first n ticks | ::advance(): focus ticks = ceil(…) | **no** (mutant survives) | **GAP 2** |
| F1(b) Game wiring | visible attended frames focus; hidden/settle/debugAdvance/readOnly none | ::flags off: the probe is never read…; ::visible frames read the probe once an M5 flag is on | partial (probe read count only) | **GAP 3** |
| flags off byte-identical | step with any clock == without | ::flags off: step with any clock == step without one | yes | OK |
| E2b | wall timers vs injected now, clamped [0,cap] every read; non-finite = ready | ::remaining ms against now, clamped to [0, cap] on every read (abilities E2b) | yes | OK |
| §12.2 pickIndex | index in range | ::pickIndex stays in range | yes | OK |

## Proposed trace table for the PR body
| AC id | test file::name |
|---|---|
| D-C2, GE-AC33 (seed derivation only) | tests/v5-f1b-clock-rng.test.ts::derivation matches D-C2 / GE-AC33…; ::Q-F1b-1 (D-HOP-2026-10-29-06)… |
| D-C2 seed once | ::seeded once: later ticks never re-read state.rng |
| F1(a) isolation (GE-AC3 / BH-AC15 isolation part) | ::isolation: golden/broody on + evRng/brRng drawn every tick… |
| D-C4 | ::evDraw is xorshift32…; tests/v5-f2-m5-fields.test.ts::CCR m1 (#77)… |
| D-C5 | ::invalid evRngState … is re-derived… |
| F1(a) flags off | ::flags off (or only non-RNG flags on)… |
| F1(b) | ::stepTimers advances an M5 timer only on focus ticks; **+ new advance()-level test (GAP 2); + new Game focus-withheld test (GAP 3)** |
| GE-15, §9.1a | ::focusFrameMs: clamp to 1.0 s… |
| D-C3 | ::D-C3: a 59 s frame gives exactly the first 10 ticks focus…; **+ GAP 2 test** |
| E2b | ::remaining ms against now, clamped… |
| flags off byte-identical | ::flags off: step with any clock == step without one; ::flags off: the probe is never read… |
