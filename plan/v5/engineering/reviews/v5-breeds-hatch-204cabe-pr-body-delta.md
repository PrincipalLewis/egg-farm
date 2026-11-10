# #96 delta: Architect review d7df1f9 fixes (feat/saves-v5-breeds-hatch @ 204cabe)

Replaces the d7df1f9 head. Fast-forward of d7df1f9 (no rebase, no amend, no force). Not pushed.

**Commits on top of d7df1f9:**
- b3e9700cf012c338e23aa53c77117a81f07bc18f: merge rc/v5 65a7443 (#95 squash). The 4 conflicts (config/breeds.ts, game.ts, sim/breeds.ts, sim/timers.ts) resolve to PR B's side, since rc/v5's src is byte-identical to a452dd0. Checked: diff(d7df1f9, merge) == diff(a452dd0, rc/v5) (the 17 #93 pacing-x1 files only), and diff(rc/v5, merge) == diff(053006f, d7df1f9) (PR B alone).
- a4b3b52325600598920f67defb2c5cb4d4e9966c: the fixes (3 files, +74/−12).
- 204cabe5219cc0987c4243cf139143b2b26b0747: test only, kills survivor B26.

**Diff vs rc/v5 65a7443 (PR B alone now):** see `git diff --stat 65a7443 204cabe`.

**Spec:** rev 3.8.8 sha1 254acea3. The BR-AC9 wording issue is RESOLVED by rev 3.8.8's erratum (free hatch then 6 paid Commons, the 7th paid hatch / 8th draw is Rare+).

## What changed (Architect review engineering/reviews/v5-breeds-b-d7df1f9-architect.md)
- **Major 1 (BR-AC13 / BR-R17):** `hatchCostFrom(planRefCents, farmStepCents, b)` split out of `hatchCostCents`; the formula and guard are unchanged.
- **Minor 1 (E10 / PMC Q5):** `dropRawSlots` (sim/breeds.ts) clears the raw-id shadow at every slot index whose runtime value changes: placement target and source, tick auto-slot (`breedsTick`), offline auto-slot (`breedsOffline`).
- **Minor 2:** `placeBreed` rejects a non-integer slot (`Number.isInteger`).
- **nit 1:** crafted `breeds.rng` = 0xee007000 (u = 7/8) at tot = 8 (Epic + Legendary only) pins the harness `<=`.
- **nit 3:** re-cited spec 3.8.8 254acea3.
- **Not in this PR (Architect: follow-ups):** Minor 3 (sim→econ import), Minor 4 (BR-AC2b import-boundary test), Minor 5 (hatchEstimate → secondsToAffordSteady), Minor 6 (telemetry, PR C, before any flag-on build), nit 2 (inert breedsEstimateOverride), nit 4 (breedsTick identity).

## AC → test trace (new, tests/v5-breeds-hatch.test.ts, describe "#96 Architect review d7df1f9 …")
| AC / rule | Test |
|---|---|
| BR-AC13 | ...688 → 9,007,199,254,740,960 (Number path, == BigInt min); ...689 → Farm branch 9,007,199,254,740,990 (== BigInt min, safe integer) |
| BR-AC13 guard boundary | planRef 3040 vs floor(136,801/45)=3040 → 136,800; 3041 → 136,801 |
| BR-AC6 | 277,973 / F28 row → 12,508,785; 8,486 / 136,800 → 136,800; 277,971 / F30 row → 12,508,695; min floor 50,000; hatchCostCents == hatchCostFrom on live values F10/14/20/28/30 |
| BR-AC26 E10 / PMC Q5 | tick auto-slot over a raw-id slot drops the shadow; moving on doesn't resurrect (Architect repro) · source-slot clear · offline auto-slot drops the shadow |
| BR-AC4 (Minor 2) | slot 0.5 / −1 / NaN / 3 / Infinity → same state object |
| BR-AC9 harness boundary | u = 7/8 at tot 8 → Epic; == harness roll() id + rng |

## Red run (tests written first)
At a4b3b52's src minus the fix (the merge b3e9700 tree): 7 of the 8 new tests FAILED (hatchCostFrom missing ×3, shadow ×3, slot 0.5). The nit-1 test passed on the old code by design: it pins existing behaviour (and kills X3).

## Gates (artifacts/v5-breeds-hatch-204cabe/results/; SHA256SUMS sha256 2063a20b7c166aa3c36ec98444f932605cd43efa2107e47da3ab1623cf903be9)
- at-a4b3b52/ (src final): tsc EXIT 0 · sync-economy --check EXIT 0 · targeted vitest 19 files 297/297 · `npm run build` + check-release-build EXIT 0 · dist grep eggfarmQa|hatchEstimate|installBreedsQa 0 hits.
- at-204cabe/ (test-only change on top): tsc EXIT 0 · targeted vitest 19 files 297/297.
- Mutation at 204cabe (breeds-hatch + breeds-state tests, maxWorkers=1): 31/33 KILLED. Survivors are equivalent:
  - B11 (no half-up): equivalent while share_bp = 10000 (Architect-confirmed). Killable once bc() reads data and a 7,777 bp fixture exists (#95 follow-up M1).
  - X7 (guard without floor): equivalent for integer planRef (p > floor(q) ⇔ p > q for integer p); planRef is always Math.round output.
  - New killed this round: B17/B24 (shadow), B25 (tick auto-slot), B26 (offline auto-slot, killed after 204cabe), B27 (integer slot), X1–X6 (Architect's mutants: X2 and X3 now KILLED).
- Bundles (scratch/bundles/, each `--not --remotes=origin`, verify OK): b3e9700 1cfcddd4…, a4b3b52 7387c965…, 204cabe 7d66e1e3… (204cabe carries all three commits).
