# v5 Saves: breeds PR B — tick countdown, hatch + roll, placement + settle gate, BR-AC31e hook (feat/saves-v5-breeds-hatch @ d7df1f9)

**Stack:** on top of feat/saves-v5-breeds-sim (PR #95). It merges the updated A at a452dd0.

**Commits:**
- 053006fd: merge of a452dd0.
- 3c247495753cf7feaf917988cc15472676c29713: src + tests.
- d7df1f96dfae5a1cdb852f117940d5659f5ff524: tests only; kills survivor B9.

**Diff:** PR B alone (053006f..d7df1f9) is 10 files, +328/−9. Against rc/v5 (A+B) it is 16 files, +640/−13. Gate: m4.flags.breeds (default 0). No SAVE_VERSION bump. Not pushed.

**Bundles** (each `--not --remotes=origin` + verify OK):
- scratch/bundles/feat-saves-v5-breeds-hatch-053006f.bundle
- scratch/bundles/feat-saves-v5-breeds-hatch-3c24749.bundle
- scratch/bundles/feat-saves-v5-breeds-hatch-d7df1f9.bundle

**Spec:** 13d5255e (rev 3.8.6) §4.1–4.2, E1/E4–E7/E15. **Semantics:** engineering/reviews/v5-breeds-tick-semantics.md points 1–4. **Rulings:** D-HOE-20261030-14 (Q1–Q4) and PMC E10/Q5.

## What changed
- **`breedsTick`:** runs at the end of step, after streak, on sim dt (never focus time). Order:
  1. settle timers;
  2. incubator countdown, then reveal + auto-slot into the first empty slot with a full 300 s settle (not decremented that tick);
  3. sinceUnlockMs.
  A reveal never draws.
- **Q2:** the breeds TimerSystem is `ensureBreeds(breedsTick(...))`, so the tick that creates `breeds` counts nothing.
- **Q4:** `FrameClock`/`StepClock.slotsFarm` carries the Farm level at the start of the frame. Game records it after each visible frame (`frameFarm`), so a slot unlocked by a buy in the same frame can't take the auto-slot. Ticks with no clock (bots, hidden sim) use the current level.
- **`rollBreed` (Q3):** Econ's confirmed harness `roll()`. Draws come from `breeds.rng` only.
  - Free hatch: 1 draw, uniform over eligible Commons.
  - Paid hatch: if pity ≥ bc_pity_rare_after − 1 and some Rare+ is eligible, narrow to Rare+. Then 1 rarity draw, with weights summed only over rarities that have an eligible breed (an empty rarity drops out; no redraw). Then 1 uniform breed draw.
  - E6: if pity is due but no Rare+ is eligible, draw from the normal pool and keep counting.
  - The free hatch counts as a non-Rare+ draw; any Rare+ hatch resets pity to 0.
- **`hatchCostCents`:** BR-R5, planner income (`assumeWorking`) with the house-rounded Farm branch.
- **`startHatch`:** BR-R6/R7 and E1/E4/E5. Charges the cost of the press's own frame; when coins are short, the flock is complete, nothing is eligible, the incubator is busy or F < 10, it does nothing and draws nothing.
- **`placeBreed`:** BR-R3/R4. A move keeps the settle state; a new placement gets the full settle. It also clears the E10 raw-id shadow for that slot (PMC Q5: a real change overwrites the raw id).
- **`slotTraitBp`:** 0 bp while settling or empty, otherwise the §4.3 star value. Traits are not yet applied to production, sales or the offline grant; that is the traits PR.
- **`hatchEstimate` + `eggfarmQa.breeds.hatchEstimate`** (`src/debug/breeds-qa.ts`):
  - The hook sets the default and `assumeWorking` incomes ($/s), each optional; null means the real estimators. It returns both ETAs.
  - The note shows iff the default ETA ≤ `FARM_SOON_HATCH_MULT` (2) × bc_hatch_cost_s. It never shows for the free hatch, a complete flock or Farm MAX.
  - It never changes cost, rng, state or bots, and the Hatch press still starts with the note showing.
  - `main.ts` imports the hook only under `IOS_FLAG_ENABLED`, so it is not in the release build.
- **Actions:** `hatch` and `placeBreed`.
- **New named constants** (config/breeds.ts): `CENTS_PER_DOLLAR`, `BP_ONE`, `BP_HALF`, `RARITY_WEIGHT`, `FARM_SOON_HATCH_MULT`.

## BR-AC9 wording issue and Econ's confirmation
- Spec L774 (BR-AC9) says "the free hatch then 7 Commons, then the 8th real hatch at F ≥ 14 is Rare+". That doesn't match BR-R9 as Econ's harness implements it.
- Econ CONFIRMED Q3 against spec d43e2ce3 (BR-R9, E6) and harness `h/breeds.ts` 76c07ecf L39-45: after the free hatch plus 6 paid Commons, the 7th paid hatch (the 8th draw overall) is forced Rare+.
- This PR implements the harness semantics. The tests cover that case exactly (pity 7 forces; pity 6 doesn't) and the property that no run of 8 consecutive draws lacks a Rare+.
- Econ is flagging the AC9 wording to HoP/PMC.

## AC → file::test trace (tests/v5-breeds-hatch.test.ts unless noted)
| AC / rule | Test(s) |
|---|---|
| BR-AC5 | F10 free hatch: 0¢, Common, freeHatchUsed 1, exactly 1 draw, pity 1, state.rng untouched |
| BR-AC7 (+E1/E4/E5) | cost − 1¢ → nothing; cost → charged exactly, 2 draws · busy incubator / flock complete / F9 / all Commons 2★ at F13 → identity |
| BR-AC6 basis | cost formula at F10/16/26/30 (min form vs the code's guard form) |
| BR-AC8 | integer −100 per tick, reveal at n + 600, breed stored at start |
| BR-AC9 | ±3 pp of 70/22/7/1 over 1,000 draws (pity off) · no 8-run without a Rare+ (5,000 draws) · harness semantics (free + 6 paid Commons → 7th paid forced; pity 6 not forced) · Rare+ resets pity · E6 fallback |
| BR-AC10 | F13: no Rare+ in 1,000 draws; F23: no Legendary |
| BR-AC11 | duplicate → +1★ (capped); a 2★ breed is never drawn |
| BR-AC25 (hidden 30 s) | Game hidden 30 s: 40,000 → 10,000 |
| BR-AC4 / BR-AC4b | move keeps settle, same-slot no-op, not-owned no-op · 0 bp for 2,999 ticks, 437 bp at 3,000 (Ayam Cemani 1★) · tick order (settle, reveal + full settle, sinceUnlockMs) |
| BR-AC31e | 85/95 → note, 95/85 → none, 90.0/95 → note, 90.1/85 → none · hook through Game (sets both, returns both ETAs, no state/cost change, press still hatches, null = real) · no note for free hatch / complete flock / MAX |
| BR-AC26 E10 / PMC Q5 | place then clear a raw-id slot → saved null |
| BR-AC1 | flag off: hatch and placeBreed are no-ops |
| D-HOE-20261030-14 Q1 | rolls draw only from breeds.rng (salt 0x62726473); state.rng, evRngState and brRngState untouched |
| Q2 | the creating tick counts nothing; the next tick counts 100 ms |
| Q3 | exact draw order vs an independent port of the harness roll() over 3,000 random states · empty rarity drops its weight (R/E/L shares of 30) |
| Q4 | Game: a reveal in the frame after a buy that unlocks slot 3 doesn't auto-slot there; without the buy it does |

**Deferred to PR C (Saves):**
- BR-AC27 (T-sub telemetry: hatch_started, breed_revealed, breed_slotted coalescing, session_end fields, schema.ts).
- The flock_complete part of BR-AC11; `flockCompleteLogged` is not set yet.
- The "More breeds at Farm 14" / "Flock complete" UI copy (lane U).

## Gates at d7df1f9 (artifacts/v5-breeds-hatch-d7df1f9/results/; SHA256SUMS sha256 b33453ae210ba18756cba015323717dcc9dc85c0bdc9bc14a5bdd8402281f0b5)
- tsc: EXIT 0.
- sync-economy --check: EXIT 0.
- Targeted vitest (19 files, maxWorkers=1): 289/289 pass.
- `npm run build` (release) + check-release-build: EXIT 0. dist grep for eggfarmQa / hatchEstimate / installBreedsQa: 0 hits.
- build:qa positive control: the hook is present (1 hit).
- Mutations: 21/22 KILLED (results/mutation-summary.txt).
- B11 (house half-up term) is an equivalent mutant at the shipping bc_hatch_farm_share_bp = 10000 (BR-R5: "exact at 10000 bp today").
- Full suite: not run (load caps). CCR: post-merge if Claude is available, otherwise recorded as "no Claude review".
