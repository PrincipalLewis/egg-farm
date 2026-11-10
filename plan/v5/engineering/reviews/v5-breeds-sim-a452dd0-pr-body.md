# v5 Saves: breeds PR A, state + save/load + migration + offline settle (feat/saves-v5-breeds-sim @ a452dd0, Draft PR #95)

**Commits** (on origin/rc/v5 e77fc5c, #83):
- 74083210561f974b021d9810dbd108c4e3487c1e: src + tests.
- 464aea17b8f45bf54bc98a456b1b4d430bc83576: tests only; kills the M3/M9 survivors.
- a7e1f8e1c20eb38312d6645e4393f730ea136260: PMC rulings E10/Q5, Q6, Q7. Its targeted gate failed one test ([CCR-77-m1] pins the F1a session list to 8 keys), so it is superseded by the next commit.
- a452dd0bc0f9064342f31cf14ca1c44788206ebf: moves the session shadow out of the F1a list (the streakRun precedent) and makes the E10 write-back a single per-slot condition.

Diff vs rc/v5: 10 files changed, 316 insertions(+), 8 deletions(-). No SAVE_VERSION bump. Not pushed (HoE pushes).
**Bundles** (one per commit, `--not --remotes=origin`, `git bundle verify` OK):
- scratch/bundles/feat-saves-v5-breeds-sim-7408321.bundle
- scratch/bundles/feat-saves-v5-breeds-sim-464aea1.bundle
- scratch/bundles/feat-saves-v5-breeds-sim-a7e1f8e.bundle
- scratch/bundles/feat-saves-v5-breeds-sim-a452dd0.bundle

The branch slash becomes a dash in the bundle file name.
**Spec** product/m5.1-breeds-spec.13d5255e.md (rev 3.8.6; live rev 3.8.7 d43e2ce3 is pins only). **Semantics** engineering/reviews/v5-breeds-tick-semantics.md points 1-4.
**Gate** m4.flags.breeds (default 0). With the flag off, every new function returns its input object, so breeds data is never written, cleared or changed (E11, D-HOE-20261030-10).

## Split (≤400 lines)
- **PR A (this):** state, save/load, migration (creation), sanitise, offline settle, `pendingReveal`.
- **PR B (next, Saves):** tick countdown (settleMs, incubator, sinceUnlockMs on sim dt), hatch action (BR-R5 cost, BR-R7, roll per Econ Q3 confirmation), `eggfarmQa.breeds.hatchEstimate` (BR-AC31e, debug-only).
- **Later:** traits (Present/Away/Broody, BR-R12..R15) are out of scope for both.

## What changed
- **`src/config/breeds.ts`**
  - The §4.3 roster.
  - `BC_SPEC_DEFAULTS`: the §5 values of record. `bc()` is the single switch-over point once Econ lands the bc_* CSV columns; CSV 8dc90e2b has none.
  - Q1 `BREEDS_RNG_SALT` = 0x62726473 ('brds').
  - `SLOT_IDX` and `BREEDS_SANITISE_EVENT`.
- **`src/sim/breeds.ts`**
  - `ensureBreeds`: Q2, runs at the end of the first flag-on tick. It writes the §6 shape with `rng = mixSeed(state.rng ^ K)`. `sinceUnlockBackfilled` = 1 at F ≥ 10 (BR-AC2e).
  - `revealHatch`: BR-R11. New breed → 0★, duplicate → +1★. Auto-slots into the first open slot with a full settle. Q4: the caller passes `slotsOpen`.
  - `breedsOffline`: BR-R18. Closed form; uses the capped gap; does nothing under 60 s; makes no rng draw; settleMs does not run offline (BR-R4). sinceUnlockMs is frozen after flock_complete.
  - `sanitizeBreedsOnLoad`: E10-E12 plus an rng/counter repair. Emits one `save_migrated{breeds_sanitise,6,6}`.
- **Wiring**
  - `m5Load` → sanitise.
  - `applyOffline` → settle, and returns `reveal`.
  - `Game.pendingReveal` is set in `grantOffline` (both the load path and the hidden ≥ 60 s path).
  - A `breeds` TimerSystem runs after `streak`.
  - `breeds` added to `M5_SAVED_FIELDS`; `save_migrated` added to the SimEvent union.

## Rulings used (HoE may re-rule; each one sits behind a named constant or a commented spot)
- **Q1:** `BREEDS_RNG_SALT` (config/breeds.ts).
- **Q2:** `ensureBreeds` plus the `breeds` TimerSystem (sim/timers.ts).
- **Q4:** the `slotsOpen` parameter of `revealHatch`. In PR B, `step` will pass the slot count from the start of the frame.
- **Q3 (roll, Econ CONFIRMED against d43e2ce3 and the harness 76c07ecf L39-45):** implemented in PR B.
  - Free hatch: 1 draw, uniform over eligible Commons.
  - Paid hatch: pity check, then a rarity draw with weights summed only over rarities that have an eligible breed, then a uniform breed draw.
  - Pity: after the free hatch plus 6 paid Commons, the 7th paid hatch is forced Rare+.
  - E6: if pity is due but no Rare+ is eligible, draw from the normal pool and keep counting.
- **BR-AC9 wording:** spec L774 is ambiguous about the pity count. Econ is flagging it to HoP/PMC. PR B follows BR-R9 as the harness does.

## AC → file::test trace (tests/v5-breeds-state.test.ts; every title carries its BR-AC id, QA-D-1029-V5SCAP)
| AC | Test(s) |
|---|---|
| BR-AC1 | flags off: 600 ticks + save never write a breeds key · other M5 flags on, breeds off: never created · flag off with breeds data: byte-identical breeds, no offline decrement (E11) · flag on clean round-trip · E11 corrupt save untouched with flag off |
| BR-AC1b | old -> new -> old starting in ls / bak / idb (3 stores): breeds bytes, SAVE_VERSION 6, not read-only |
| BR-AC2 (§6 separate rng) | Q1 salt, state.rng not advanced, never re-created |
| BR-AC2c | no sinceUnlockMs → no save_migrated, key stays absent; frozen after flock_complete (1 h offline) |
| BR-AC2e | F12 first flag-on tick → §6 shape + backfilled 1; F9 → no backfilled key |
| BR-AC25 | 10-min reload: reveal in applyOffline, pendingReveal = the breed rolled at start · hidden ≥ 60 s path + auto-slot settle · cap 7,200 s · once per gap · tamper (future savedAt) · reload never re-rolls (BR-R9) |
| BR-AC25b | 50 s → 40,000 remain; 59,999 ms → no reveal; exactly 60 s → reveal |
| BR-AC26 | E10/Q5 raw slot id kept on a save with no change · real change (auto-slot) overwrites it · Q6 non-finite remainingMs ×5 · Q7 freeHatchUsed / pity ×2 / hatches / rng, one save_migrated each · stars 5 / duplicate slot / silkie kept / one save_migrated · duplicate slot at F20 · unknown incubator breed refunded, remainingMs clamp · slot past the unlocked count, flockCompleteLogged / backfilled / sinceUnlockMs repair |
Deferred to PR B: BR-AC5/7/8/9/10/11 (hatch, roll, tick), BR-AC25's hidden 30 s online clause (it needs the tick countdown), BR-AC27, BR-AC31e (hook).

## PMC rulings (E10/Q5, Q6, Q7), applied at a7e1f8e + a452dd0
- **E10/Q5 (spec-literal):**
  - An unknown slot id is null at runtime: no trait, never drawn, and it counts as empty for the auto-slot.
  - The raw id is kept in the save. The session-only shadow `breedsRawSlots` lives in m5Persist SESSION_ONLY_KEYS and is never saved. `breedsSaveView` writes the raw id back while that slot stays null.
  - A real change overwrites it: the auto-slot makes the slot non-null, and PR B's placeBreed clears the shadow entry.
  - The unknown id also stays in `owned`.
  - An E10-only load logs no save_migrated, because the save is unchanged.
- **Q6:** a non-finite remainingMs (NaN, ±Infinity, null, a non-number) becomes 60,000. The code already did this; it is now tested per value.
- **Q7:**
  - freeHatchUsed that is not 0 or 1 becomes 1. It was `hatches > 0 ? 1 : 0`.
  - An invalid pity becomes 0 (unchanged).
  - An invalid hatches value becomes 0 (unchanged).
  - An invalid rng becomes mixSeed(state.rng ^ K) (unchanged).
  - Each case logs the single save_migrated breeds_sanitise.

## Gates at a452dd0 (artifacts/v5-breeds-sim-a452dd0/results/; SHA256SUMS sha256 44125a84cdc8397a477b335ce80d7168f626c434dea1ea4d8f934450798f4332)
- tsc: EXIT 0. sync-economy --check: EXIT 0 (up to date).
- Targeted vitest, `--maxWorkers=1`: 16/16 files, 245/245 tests. Files: the breeds file plus the F1a/F1b/F1c/F2/F3/streak/pause-sanitise/offline/m4a/save/hidden-path files.
- Red run on base + new modules: 15 failed / 6 passed.
- Mutations: 20/20 KILLED at a452dd0 (results/mutation-summary.txt). The run covers M1-M13 plus the PMC set M14-M20: save view, persist, overwrite, freeHatchUsed, pity, non-finite remainingMs, raw id recording.
- Full suite: not run (load caps). CCR: post-merge if Claude is available, otherwise recorded as "no Claude review".

## Follow-ups
- **k10-breeds-offset CI job:** deferred. It needs:
  - Econ's harness landed in-repo (scratch/k10-breeds today; it uses m5tap + h/breeds.ts, not src/);
  - the bc_* CSV columns (RC-PIN, Econ);
  - a vite-node entry with fixed seeds 1–200 and the D-HOP-47 pass bar;
  - a CI job (owner Architect, alongside #93 X1).
  None of that is small.
- bc_* reader: switch `bc()` to balance data when Econ's CSV lands (owner Saves with Econ).
