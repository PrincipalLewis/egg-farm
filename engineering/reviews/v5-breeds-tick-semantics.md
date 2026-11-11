# v5 breeds: tick semantics for the Econ K10 model (design only, Saves lane, 2026-10-30)
Sources: spec rev 3.8.6 `product/m5.1-breeds-spec.13d5255e.md` (sha1 13d5255e; the live rev 3.8.7 only adds pins). Code: `origin/rc/v5` 3f582db, which has the same code as a923206 (#92 is CSV/data only). Build plan 5667ac63 §L59. Econ model: `scratch/m51-econ/h/breeds.ts` (sha1 73ac6759), used by `scratch/k10-breeds/tools/gap-breeds.ts`.

1. **Phase.** Breeds is one `TimerSystem` added after `streak` in `TIMER_SYSTEMS` (sim/timers.ts:21-22, the streak precedent). It runs at the end of `step`, after production, timeouts, arrivals and the worker sales (tick.ts:29,55-57). It runs only while an M5 flag is on (tick.ts:28,57). It is a no-op unless `m4.flags.breeds` is on and `s.breeds` exists (§6 Code isolation, E11). Order inside the system on each tick:
   - (a) `settleMs[i] -= dtMs` for slots that were filled before this tick;
   - (b) `incubator.remainingMs -= dtMs`. If it is now ≤ 0, call `revealHatch` (stars, then auto-slot into the first empty slot with `settleMs = bc_settle_s×1000`, not decremented this tick; BR-R8/R11);
   - (c) `sinceUnlockMs += dtMs`, unless frozen.
   So a reveal never changes eggs or coins on its own tick. A newly slotted breed is settling, so its trait is 0 (BR-R4).
2. **dt.** Use sim dt, not focus dt. `dtMs = 1000/tickHz` = 100 (an integer, BR-R8). Use `dt`, not `focusS` (clock.ts:17). The incubator and settle timers keep running while the tab is hidden for less than 60 s (`advance`, game.ts:409-425, focusMs 0), with menus open, and in Pause (BR-R19, E14). Only Present uses focus time: it applies on the LAY/coop phase with `fx`, tick.ts:28-29 (BR-R12/R15; #79's `StepClock` replaces the spec's `focusDt` arg).
3. **Offline.** The settle is closed-form and lives inside `applyOffline` (sim/offline.ts:20-24, BR-R18). Two paths reach it:
   - load: `m5Load`, game.ts:94, then `grantOffline`, game.ts:100;
   - hidden ≥60 s: `m5Offline`, then `grantOffline`, game.ts:387-388.
   Rules for the settle:
   - Subtract `min(awayMs, offlineCapSeconds×1000)` as integer ms, the same cap as the egg grant (offline.ts:23). Apply it only if awayS ≥ 60, even when the grant is 0 eggs.
   - At most one `revealHatch` runs, which sets `Game.pendingReveal`.
   - `settleMs` is NOT decremented offline (BR-R4 "offline not"). `sinceUnlockMs` += the same capped ms.
   - With a throttled visible gap ≥60 s, the incubator gets exactly 60 s of stepped ticks and no grant (game.ts:423-425).
   - Idempotence comes from the one-grant-per-gap discipline that already covers eggs: `savedAt`/hide snapshot are re-stamped, and an invalid `savedAt` gives no catch-up (`validSavedAt`). `revealHatch` with `incubator: null` is a no-op.
4. **RNG.** Breeds must NOT use `brRng`. `brRng` is Broody's stream, it is never saved, and it is re-derived on load (sim/rng.ts:15-16,26-31). That would break BR-R9's guarantee that a reload never re-rolls. Breeds uses the saved `breeds.rng` = `mixSeed(s.rng ^ K)`, taken once when `breeds` is created (§6 Migration). `s.rng` is never advanced (BR-AC2, BR-BB5).
   - Draws happen only at the Hatch press (BR-R9, an action, not a tick). Reveal and offline settle make zero draws, so offline ordering is moot.
   - Proposed draw order per hatch, matching Econ's model `roll()` (h/breeds.ts:39-46):
     - free hatch: 1 draw, an index over eligible Commons;
     - paid hatch: apply the pity filter, then draw u1 for rarity (weights summed over the rarities that have an eligible breed), then draw u2 for the index within that rarity via `pickIndex`.
5. **`eggfarmQa.breeds.hatchEstimate`** (BR-AC31e, build plan L59). It is debug-only and stripped from release builds. It sets the **default** income and the **`assumeWorking`** income independently. Those two feed only the BR-R7b note's next-Farm-step ETA, so the note shows iff the default ETA ≤ 2×`bc_hatch_cost_s` (inclusive at 90.0). It returns both ETAs for the QA log. It never changes `hatchCostCents`, the incubation, rng, ★ or the bots. Clearing it restores the real estimators.

Econ model deltas: incubation is `rem` in float seconds with a `1e-9` tolerance (h/breeds.ts:52), where the sim uses integer ms. The model's RNG is mulberry32 seeded with `seed*2246822519+7`, where the sim uses xorshift `mixSeed`. Results agree statistically, not bit-for-bit. That is fine for the K10 offset test.

Open questions (spec ambiguities, not invented):
- Q1: K (the salt for `breeds.rng`) is undefined in §6. Proposal: ASCII "brds" 0x62726473 (≠ EV/BR salts).
- Q2: When is `breeds` created for a fresh game with the flag on? §6 only says "first load with the flag on". Proposal: lazily at the end of the first flag-on tick, like `seedEvRng` (Q-F1b-1).
- Q3: Draw order and draw count per hatch are not in the spec, including whether the free hatch makes 1 or 2 draws. Also unspecified: if a rarity has no eligible breed, is its weight dropped (as Econ's model does) or redrawn?
- Q4: E15 "reveal first, then the slot unlock" vs a Farm buy applied before `advance` in the same frame: may the auto-slot target the newly unlocked slot?
- Q5: Does K10 need `step` callers with dt ≠ 1/tickHz? The sim will use `Math.round(dt×1000)`.
