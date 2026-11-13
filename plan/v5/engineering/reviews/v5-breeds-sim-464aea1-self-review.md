# Self-review: breeds PR A @ 464aea1 (7408321 + tests-only 464aea1) (Saves)

- **Scope:** +275/−6 lines; PR A only. The split was needed: hatch, roll, tick, hook and their tests would add roughly 250 more lines.
- **Flag-off identity:** every entry point checks `flagOn(b,'breeds')` first.
  - `m5Load` keeps its six-flag early-out and adds a breeds-only branch.
  - `applyOffline` returns `br.state === s` when the flag is off.
  - The TimerSystem only runs while some M5 flag is on.
  - Proven by the BR-AC1 tests and by mutations M3 and M4.
- **applyOffline return shape:** it gains a `reveal` key. The existing callers (tests/offline, m4a-*, f1c) still pass.
- **Telemetry route:** load-time `save_migrated` goes through `m5Load`'s ev → `Game.emit` → telemetry. Listeners attach after the constructor, so the tests read the telemetry store rather than notify. That matches BR-R18's "telemetry only via the SimEvent sink".
- **Q4 offline:** the Farm level can't change during an offline gap, so `unlockedSlots(F)` is exact. The online frame rule lands in PR B.

## Judgement calls (flagged for HoQA/PMC)
1. **E10 unknown id in a slot:** I null it in state, so the null gets saved. The spec says "slot set to null for this load", which may mean the save keeps the id. Unknown ids in `owned` are kept.
2. **E12 non-finite `remainingMs`:** I clamp it to the max (60,000). The spec's "clamped to [0, max]" doesn't define NaN. Max is the conservative choice: no free reveal.
3. **Extra sanitising beyond E12:** an invalid `rng` is re-derived from `mixSeed(state.rng ^ K)`. It only affects future rolls; a running hatch keeps its stored breed (BR-R9). `hatches` and `pity` must be integers ≥ 0, and `freeHatchUsed` must be 0 or 1.
4. **bc_* source:** the §5 values are code defaults behind `bc()`, pending Econ's CSV columns. That is the same situation as the G3 streak tc keys before the CSV PR.

## Load-cap note
- My first red run started at 5-min load 11.25, just over the >11 rule. It sat queued on the flock, and I killed it with lane-kill.
- All later runs went through a wait-for-load ≤ 11 loop.
- **Mutation:** M3 (flag-off creation) and M9 (duplicate-slot dedupe) survived at 7408321. M3's flag-off test never reached stepTimers, and M9's AC26 case was already nulled by the unlocked-count rule. Commit 464aea1 adds the two tests; 13/13 now KILLED.
