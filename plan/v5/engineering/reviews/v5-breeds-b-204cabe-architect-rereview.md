# Architect re-review: breeds PR B (#96) @ 204cabe5219cc0987c4243cf139143b2b26b0747

Reviewer: Senior Software Architect · 2026-10-30 14:45 CET · no Claude review · nothing pushed or commented by me
Previous review: `v5-breeds-b-d7df1f9-architect.md` (CHANGES REQUESTED). Delta doc: `v5-breeds-hatch-204cabe-pr-body-delta.md`.
Spec: `product/m5.1-breeds-spec.md` rev 3.8.8, sha1 `254acea385a64ad6fc1ba14a1d37dc15df1a1151`.

## Verdict: **PASS with Minors**. Roll parity: **PASS** (unchanged after the merge).

## Provenance and merge
- `origin/feat/saves-v5-breeds-hatch` = 204cabe, a fast-forward of d7df1f9 (`merge-base --is-ancestor` OK). Commits: b3e9700 (merge of rc/v5 65a7443, the #95 squash), a4b3b52 (fixes), 204cabe (test only).
- **The merge is clean.**
  - `diff(65a7443, b3e9700)` is byte-identical to `diff(053006f, d7df1f9)`, so PR B alone still differs from rc/v5 by exactly PR B.
  - `d7df1f9 → b3e9700` brings in only the 17 #93 pacing-x1 files, with no src change: rc/v5 src = a452dd0 src.
  - Against rc/v5: 10 files, +392/−10.
- Artifacts: `artifacts/v5-breeds-hatch-204cabe/results/SHA256SUMS` sha256 `2063a20b7c166aa3c36ec98444f932605cd43efa2107e47da3ab1623cf903be9` (matches), and `sha256sum -c` is OK.

## My gates at 204cabe (detached worktree; vitest under the eng lock, nice, maxWorkers=1)
- `tsc --noEmit`: exit 0.
- The 19 targeted files from Saves' gates script: **297/297 pass**, matching the claim.
- Full suite: not run.

## Claims verified
| Claim | Result |
|---|---|
| Major 1: `hatchCostFrom` extracted; BR-AC13 …688/…689; BR-AC6 literals | **Closed.** breeds-hatch.ts: `hatchCostCents` now delegates, and the formula and guard are unchanged. The tests cover …688 → 9,007,199,254,740,960 (Number path) and …689 → Farm branch 9,007,199,254,740,990, both equal to a BigInt `min()` and safe integers. They also cover the guard equality case (3040 vs 3041 at 136,801), 12,508,785 / 136,800 / 12,508,695, the 50,000 floor, and live-value parity at F10/14/20/28/30. |
| Minor 1: `dropRawSlots` at target, source, tick auto-slot, offline auto-slot, with my repro | **Closed.** `dropRawSlots` (sim/breeds.ts) clears raw[i] whenever before[i] ≠ after[i], plus `also`. It's called from `placeBreed`, `breedsTick` and `breedsOffline`. My repro (auto-slot, then move) is now a test. Mutants X9 (offline no-drop) and X11 (tick no-drop) are KILLED. |
| Minor 2: integer slot check | **Closed.** `Number.isInteger(slot)` plus a range check. Tested with 0.5 / −1 / NaN / 3 / Infinity (same object). X10 KILLED. |
| nit 1: crafted-rng `<=` test | **Closed.** rng 0xee007000 gives u = 0.875 at tot 8 (E+L). It asserts Epic and equality with the harness port. **X3 KILLED.** |
| nit 3: cite 3.8.8 254acea3 | **Closed** in breeds-hatch.ts:3. sim/breeds.ts and config/breeds.ts are now rc/v5 code from #95 and still cite 3.8.6; carry that to the next #95 follow-up. |
| Mutation 31/33 | Re-ran X2 and X3 myself: **both KILLED** (X2 by the BR-AC13 test, X3 by the boundary test). |
| B11 equivalent | Confirmed again. With integer cents c and share 10000, `floor((c·10000+5000)/10000) = c`. It becomes killable once bc() reads data and a non-10000 bp fixture exists (#95 follow-up M1). |
| X7 equivalent ("guard without floor") | **Confirmed for integer planRef.** For integer p, `p > floor(q) ⇔ p ≥ floor(q)+1 ⇔ p > q`. My probe of 2M random integer pairs found 0 mismatches. The only caller passes `Math.round(...)`, so it holds. Caveat: `hatchCostFrom` is exported and takes any number. A non-integer p in (floor(q), q] would differ (nit A). |

## Roll parity after the merge: **PASS**
- `git diff d7df1f9 204cabe -- src/sim/breeds-hatch.ts` doesn't touch `eligible` / `rollBreed` / `nextRand` / `RARITY_WEIGHT` / pity.
- config/breeds.ts and sim/state.ts are as reviewed at d7df1f9.
- The Q3 exact-order test (3,000 states vs the harness `roll()` port) and the new boundary test both pass.
- The parity table in the d7df1f9 review still applies: identical to `h/breeds.ts` (sha256 76c07ecf) and the K10 harness copy (`econ/k10-harness` 8a66fb5). Only the RNG source differs, by design.

## New findings (all non-blocking)
- **Minor A: mutant X8 survives.** Dropping the `also` argument of `dropRawSlots` (placing `null` over a runtime-null slot that has a raw id) breaks no test. The "source-slot" test changes slot 0 anyway. Add a one-line test for `placeBreed(s, b, i, null)` on a raw-id slot (save → null), or remove `also` if the UI never offers clearing an empty slot.
- **nit A:** `hatchCostFrom` relies on an integer `planRefCents` for the guard's floor equivalence (X7). Document it in the JSDoc, or assert `Number.isSafeInteger` in tests.
- **nit B (defensive):** a non-finite `planRefCents` (NaN from income) gives `Math.max(min, NaN) = NaN`. Then `coins < NaN` is false, so the hatch would start and set coins to NaN. This is unreachable with today's `incomePerSec`, but a `Number.isFinite` guard (treat it as the Farm branch) is cheap.
- **nit C:** `farmStepCents = farmCost(F)·100` has no `Math.round`, unlike Econ's `costCents`. It's exact today because `farm.costTable` is enforced integer (formulas.ts:61). The curve fallback could give a non-integer.

## Deferred items: what must land before the final v5 RC (HoE: breeds ships flag-on in v5)
| Item | Before the final RC? | Why |
|---|---|---|
| **Minor 6: telemetry (PR C)**: BR-AC27 `hatch_started` (pinned), reveal/slot events, `flock_complete` + `flockCompleteLogged`, session_end fields, schema.ts | **YES, must** | Pinned events in spec §8. Without it, `sinceUnlockMs` never freezes and flock_complete never fires. |
| **Minor 4: BR-AC2b import-boundary vitest** | **YES, must** | A [CI] criterion. Cheap, about 30 lines. Direct imports are clean today. Rule on whether the bots' transitive reach through `sim/actions` is allowed, and write that into the test. |
| **#95 Major 1: `bc()` reads the RC-PIN-2b `bc_*` CSV** (+ D-HOE-05 sha256 fixtures for the literal asserts, + the share-bp fixture that makes B11 killable) | **YES, must** | Spec §5/§7: the tunables come from data when the flag is on. Pending Econ's CSV. |
| **#95 Major 2: BR-AC1/BR-AC2 trace test** (flag-on with no hatch ≡ flag-off, including `s.rng`; seeds 1–200 per the AC) | **YES, must** | A [sim, CI] AC, and the flag-on RC gate depends on it. My 3-seed probe passes. |
| Traits PR: `neutral(s)` in `hatchCostCents` / `hatchEstimate` (BR-R5 §4.6) | YES, if traits ship in v5 | It becomes wrong once a Present/Away trait changes income. |
| Minor 5: `hatchEstimate` → `secondsToAffordSteady` | Recommended, not blocking | Equivalent math today. Best done with lane U's Flock note, so the visible note uses the named estimator. |
| Minor 3: sim → econ import | No (5.1, or a recorded HoE exception) | No cycle; architectural hygiene. |
| #95 Minor 3: refund bound | Recommended (cheap) | Tamper-only. |
| #95 Minor 2 (owned null), nit 2 (inert `breedsEstimateOverride`), nit 4 (`breedsTick` identity), Minor A / nits A–C above | No | Cosmetic, defensive or test-only. |

## Mutants run by me at 204cabe (breeds-hatch + breeds-state tests)
X2 KILLED · X3 KILLED · X7 SURVIVED (equivalent, proof above) · X8 SURVIVED (Minor A) · X9 KILLED · X10 KILLED · X11 KILLED. The tree was restored after every mutant (`git status` clean).
