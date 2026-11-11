# Self-review: breeds PR B @ d7df1f9 (Saves)

- **Scope:** 10 files, +328/−9 on top of A. It fits ≤400 because telemetry (BR-AC27, flock_complete) went to PR C.
- **TDD caveat:** for PR B I wrote the implementation before its test file. There is no formal red run. Evidence instead:
  - 22 mutations, 21 killed.
  - B9 survived the first pass, and d7df1f9 adds the test that kills it.
  - B11 is an equivalent mutant at shipping values.
- **Exactness of the roll:**
  - The Q3 test compares `rollBreed` with an independent port of the harness `roll()` on xorshift `nextRand`, over 3,000 random states, checking both the id and the rng state.
  - The rarity boundary uses the harness's `u <= 0` test, not `< 0`.
- **Q4 mechanism:** an optional `slotsFarm` on FrameClock/StepClock, which `tickClock` copies only when defined. That keeps the existing clock tests' object shapes unchanged; f1b and tick tests pass.
- **Hook units:** BR-AC31e lists ETAs (85/95 s), while the hook takes incomes ($/s), as the spec's hook text says. The tests use a fixed need of $9,000 and incomes of 9000/ETA. The 90.0 boundary is exact: $100/s gives 90.0 s.
- **Not in this PR:**
  - Traits are not applied to the lay rate, the offline grant or the Broody nest (BR-R12..R15).
  - No telemetry events.
  - No Flock UI, so `Game.breedsEstimateOverride` is only read by the hook for now. Lane U should pass it to `hatchEstimate`.
- **E10 shadow:** `placeBreed` clears `breedsRawSlots[slot]`. A move from a raw-id slot can't happen, because that slot is null at runtime.
