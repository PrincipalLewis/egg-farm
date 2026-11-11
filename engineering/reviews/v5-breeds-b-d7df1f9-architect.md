# Architect review: breeds PR B (#96) @ d7df1f96dfae5a1cdb852f117940d5659f5ff524

Reviewer: Senior Software Architect · 2026-10-30 13:32 CET · Draft PR, not pushed or commented by me · no Claude review
Stack: on #95 a452dd0 via merge 053006f. Commits: 3c24749 (src + tests), d7df1f9 (B9 test). PR B alone is 10 files, +328/−9.

## Verdict: **CHANGES REQUESTED** (small: one Major test gap, two Minor fixes). Roll parity: **PASS**.

## Spec of record
- `product/m5.1-breeds-spec.md` rev 3.8.8, **sha1 254acea385a64ad6fc1ba14a1d37dc15df1a1151**. The code cites 3.8.6 `13d5255e`.
- Rev 3.8.8's BR-AC9 erratum ("free hatch then 6 paid Commons, the 7th paid hatch (8th draw) is Rare+") now matches this PR exactly. The PR body's "AC9 wording issue" section can say it is resolved.
- Rules checked: §4.1 BR-R2–R4, §4.2 BR-R5–R11 (+R7b), §4.5 BR-R17, §4.8 E1/E4–E7/E15, BR-AC4/4b/5–13/31e.

## Evidence I checked myself
- `artifacts/v5-breeds-hatch-d7df1f9/results/SHA256SUMS`: sha256 = `b33453ae210ba18756cba015323717dcc9dc85c0bdc9bc14a5bdd8402281f0b5` (matches the claim). `sha256sum -c` passes on all entries.
- `03-vitest-targeted.log`: 19 files, 289/289 passed, EXIT=0. Mutation summary: 21/22 KILLED, B11 SURVIVED. There is no B8 in the list.
- My own runs in a detached worktree at d7df1f9:
  - `tsc --noEmit` exit 0.
  - `tests/v5-breeds-hatch.test.ts` + `tests/v5-breeds-state.test.ts`: 64/64 pass.
- My release build: `npm run build`, which includes sync-economy --check, tsc, vite build and check-release-build. Exit 0.
  - dist hits: `eggfarmQa` 0, `hatchEstimate` 0, `installBreedsQa` 0, `breeds-qa` 0.
  - The only trace is the inert field initialiser `this.breedsEstimateOverride=null` (nit 2).
  - The hook import sits inside `if (IOS_FLAG_ENABLED)` (main.ts:136-140). check-release-build's eggfarm* identifier allowlist would reject a leak.

## Roll parity vs Econ's reference: **PASS** (algorithmically identical; RNG source differs by design)
- References:
  - `scratch/m51-econ/h/breeds.ts` (sha1 `73ac6759`, sha256 `76c07ecf…`, the "76c07ecf" the PR cites) `roll()` L39-46.
  - The same `roll()` vendored in the K10 harness `econ/k10-harness` 8a66fb5 `tests/k10-breeds-offset.ts` L72-80.
  - #96: `rollBreed`, src/sim/breeds-hatch.ts:38-46.

| Aspect | Econ roll() | #96 rollBreed | Match |
|---|---|---|---|
| RNG source | mulberry32 on `bs.rng`, seeded `seed*2246822519+7` | xorshift32 `nextRand` on saved `breeds.rng` = `mixSeed(s.rng ^ 0x62726473)` | Differs by design (tick-semantics note §4; K10 is statistical) |
| Draws per hatch | free 1; paid 2 | free 1; paid 2 | ✓ |
| Eligibility | stars < cap; C always; R/E at F ≥ 14; L at F ≥ 24 | same (`eligible`, :30-33) | ✓ |
| Empty pool | `null` (no draw) | `null` (no draw) | ✓ |
| Free hatch | uniform over eligible Commons, `floor(u·n)` | same | ✓ |
| Pity | `pity >= pityAfter−1 && rp.length` → Rare+ pool; else normal pool (E6) | same | ✓ |
| Rarity weights / scale | integer weights 70/22/7/1, summed over rarities that have an eligible breed (no bp scale, no redraw) | same, via `RARITY_WEIGHT` → `bc_w_*` | ✓ |
| Rarity order | `Object.keys(byR)` (roster order → C,R,E,L) | fixed `['C','R','E','L']` filtered | ✓ (same order) |
| Boundary | `u -= w; u <= 0 \|\| last` | `w -= w_r; w <= 0`, default last | ✓ |
| Breed pick | `floor(u·len)` over roster order | same | ✓ |
| Pity update | Common → +1, Rare+ → 0, free counts | `rare ? 0 : pity+1` | ✓ |
| Cost | `max(min, min(ref·45, floor((round(fc·100)·bp+5000)/10000)))` | guard form (`planRef > floor(fb/45)`), :50-54 | ✓ (my probe: identical for F0–30) |

The PR's Q3 test (3,000 random states, id + rng state vs a port of the harness on `nextRand`) is a valid exactness check of the algorithm.

## Mutation evidence (no red run)
- The 22 mutants are meaningful. Each targets a spec rule: reveal boundary, settle, Q4, Q2, free-as-paid, pity threshold/reset, empty-rarity weight, coins ≤, the free flag, move settle, settle gate, note basis, hook store, raw clear, E6, star cap, note on free, auto-slot settle, Legendary gate, sinceUnlock.
- **B11 is truly equivalent.** `farmBranch = floor((c·10000 + 5000)/10000)` with integer cents c equals c, because 5000/10000 < 1 and c·10000 is exact (F30: 6.2e11 ≪ 2^53). It only becomes killable at a share ≠ 10000. Because `bc()` is hard-wired (#95 Major 1), no test can vary the share today. When bc() reads data, add a share-bp fixture case, for example 7,777 bp.
- My own mutants, run on `breeds-hatch.test.ts` + `breeds-state.test.ts`:

| Mutant | Result |
|---|---|
| X1 `hatch_min_cents` floor removed | KILLED (BR-AC6 basis) |
| X2 guard `planRef > floor(fb/45)` → `>=` | **SURVIVED** |
| X3 rarity boundary `w <= 0` → `w < 0` | **SURVIVED** (near-equivalent, see below) |
| X4 settle clamp `max(0, v−dt)` removed | KILLED |
| X5 placeBreed owned-check removed | KILLED |
| X6 free hatch over every rarity | KILLED |

- X2 shows the BR-R17 overflow guard is untested at its boundary (Major 1).
- X3 differs only when u·tot lands exactly on a cumulative weight. That is impossible for tot 100 or 30 with u = k/2^32, but possible for tot 8 (E+L, u = 7/8). A crafted-rng unit test would kill it; nit.

## Architecture checks
| Check | Result |
|---|---|
| Deterministic fixed-step | OK. `breedsTick` uses sim dt (`Math.round(dt·1000)`), never focus time. It runs at the end of step after streak. No draws at reveal. The Q4 `slotsFarm` goes through StepClock/FrameClock (copied only when defined, so the existing clock shapes are unchanged). |
| Separate from UI | OK. The UI is not in this PR. The debug hook is in `src/debug/` and only writes `Game.breedsEstimateOverride`. |
| Flag default 0, flag-off identity | OK. `on()` guards every export; the `hatch`/`placeBreed` actions return `s` with the flag off (tested). My #95 trace probe also ran on this head. |
| Saves | No new persisted field. The `breeds` shape is unchanged. `frameFarm` and `breedsEstimateOverride` are Game fields that are not saved. No bump needed. |
| Big numbers | The cost guard is correct by algebra and matches Econ for F0–30. BR-AC13's boundary values are not tested (Major 1). |
| Module boundaries | Minor 3 (sim → econ). econ/best-buy/income do not transitively import breeds (checked). The bots reach breeds-hatch transitively through `sim/actions`; see Minor 4. |
| hatchEstimate excluded from release | OK (verified above). |
| D-HOE-05 | The tests derive cost from live `farmCost`/`incomePerSec` instead of asserting balance literals. The hard-coded 70/22/7/1, 8, 14/24 and 437 bp are `BC_SPEC_DEFAULTS` code values today. They must move to a sha256-pinned fixture when bc() reads data. |

## Findings
**Major 1: BR-AC13 (BR-R17 big-number guard) has no test, and mutant X2 survives.**
- Where: `hatchCostCents` (breeds-hatch.ts:50-54). The comparison form is correct, but nothing exercises `planRefCents` = 200,159,983,438,688 (Number path, exact) vs …689 (Farm branch, equal to the BigInt `min()` reference), or the equality case `planRef == floor(fb/45)`.
- Fix: split a pure `hatchCostFrom(planRefCents, farmStepCents, b)` out of `hatchCostCents` so the AC values can be injected. Then add BR-AC13 (both sides, BigInt reference) and the BR-AC6 literals (12,508,785 / 136,800 / 12,508,695).
- Small, under 30 lines.

**Minor 1: E10 raw-id resurrection.**
- `placeBreed` clears `breedsRawSlots[slot]` (:76) but not `[from]`, and the auto-slot in `breedsTick` (:24) clears nothing.
- Repro at d7df1f9 (probe):
  1. Shadow `[null,'silkie',null]`.
  2. A tick reveal auto-slots brahma into slot 1.
  3. `placeBreed(2,'brahma')`.
  4. The save writes `['leghorn','silkie','brahma']`.
- That violates PMC Q5. Clear the shadow whenever a slot index is written: `slot`, `from`, and the auto-slot index. Add the test. See #95 Minor 1.

**Minor 2: `placeBreed` accepts a non-integer slot.**
- Where: :69. `slot >= 0 && slot < n` lets 0.5 through. The probe shows `slots`/`settleMs` gain a `"0.5"` property.
- JSON drops it, so it isn't persisted, but the runtime state is corrupt. Use `Number.isInteger(slot)`.

**Minor 3: sim depends on econ.**
- Where: `src/sim/breeds-hatch.ts:10` imports `econ/income`. It's the only `src/sim → src/econ` import, and econ already depends on sim. There's no cycle today (checked), but it inverts the sim/econ boundary.
- Suggest moving `hatchCostCents` + `hatchEstimate` into `src/econ/breeds-cost.ts`, with `startHatch` taking the cost from the action dispatcher, or `apply` computing it. Alternatively, record an explicit HoE exception.

**Minor 4: BR-AC2b import-boundary vitest is absent.** It's a [CI] criterion: econ/next-goal/goal-label/pick-hysteresis/bots must not import `sim/breeds*` or read `.breeds`.
- Direct imports are clean today.
- The bots now load breeds code transitively through `sim/actions`, which is harmless because it's flag-gated and never read.
- The test belongs in this PR or PR C. Decide whether the rule is direct-only, and write that down.

**Minor 5: `hatchEstimate` re-implements `secondsToAffordSteady`.**
- Where: :86-92. Spec BR-R7b names the estimator explicitly.
- The math is equivalent today (0 if need ≤ 0, null if rate ≤ 0, need/100/r). Call `secondsToAffordSteady` for the default path so they can't drift; keep the override as the only fork.
- Also note for the traits PR: `hatchCostCents` and `hatchEstimate` read `s`, not `neutral(s)` (BR-R5, §4.6). That's exact now because no trait exists, but it must change when traits land.

**Minor 6: telemetry is deferred to PR C**, which is documented: BR-AC27, hatch_started, flock_complete. Until then `flockCompleteLogged` is never set, so `sinceUnlockMs` never freezes online. Make sure PR C lands before any flag-on build.

**nit 1:** the rarity-boundary near-equivalent (X3). One crafted `breeds.rng` test at tot = 8 pins the harness's `<=`.

**nit 2:** `Game.breedsEstimateOverride` ships in release as an inert `null` field. It's harmless; it could live on a debug-only WeakMap instead.

**nit 3:** re-cite spec 3.8.8 `254acea3` in breeds-hatch.ts:3 and the PR body, and mark the AC9 issue resolved by rev 3.8.8.

**nit 4:** `breedsTick` (:27) always returns a new `{...s, breeds: x}` even when nothing changed. That's fine for correctness, since step already rebuilds state, but it's cheap to return `s` when `x === br(s)`.

## Requested before Ready
Major 1 (BR-AC13 + BR-AC6 literal tests), Minor 1 (shadow clear + test), Minor 2 (integer slot). The rest can be follow-ups.
