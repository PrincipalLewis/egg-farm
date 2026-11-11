# Architect review: breeds PR A (#95) @ a452dd0bc0f9064342f31cf14ca1c44788206ebf

Reviewer: Senior Software Architect · 2026-10-30 13:32 CET · Draft PR, not pushed or commented by me · no Claude review
Base: rc/v5 e77fc5c (merge-base checked). Commits: 7408321, 464aea1, a7e1f8e, a452dd0. Diff: **10 files**, +316/−8. The relayed "9 files" is wrong; the PR body's own count of 10 is right.

## Verdict: **PASS with Minors**. Merge is OK at flag 0. Two Major items are flag-on gates, not code defects.

## Spec of record
- Live: `product/m5.1-breeds-spec.md` rev 3.8.8, **sha1 254acea385a64ad6fc1ba14a1d37dc15df1a1151**.
- Code and PR body cite rev 3.8.6 `13d5255e` (frozen copy `m5.1-breeds-spec.13d5255e.md`). 3.8.7 only adds the RC pins, and 3.8.8 is an AC9 wording erratum. Neither changes anything PR A implements.
- Rules checked: §4.2 BR-R8/R9/R11, §4.7 BR-R18–R20, §4.8 E10–E12, §6 (save fields, migration, no bump), §7 (flag), BR-AC1/1b/2/2c/2e/25/25b/26.

## Evidence I checked myself
- `artifacts/v5-breeds-sim-a452dd0/results/SHA256SUMS`: sha256 = `44125a84cdc8397a477b335ce80d7168f626c434dea1ea4d8f934450798f4332` (matches the claim). `sha256sum -c` passes on all 30 entries.
- `03-vitest-targeted.log`: 16 files, 245/245 passed, EXIT=0. `mutation-summary.txt`: M1–M20 all KILLED (20/20).
- My own runs in a detached worktree at a452dd0:
  - `tsc --noEmit` exit 0.
  - `tests/v5-breeds-state.test.ts` + `tests/v5-f1a-fields.test.ts`: 45/45 pass.
- Diff 464aea1..a452dd0 (what the 464aea1 self-review didn't cover), 4 files, +48/−9:
  - PMC Q7: invalid `freeHatchUsed` → 1, and invalid pity/hatches → 0 (was int0).
  - PMC Q5/E10: session shadow `breedsRawSlots` plus `breedsSaveView` write-back. The shadow is in `SESSION_ONLY_KEYS` (m5-fields.ts:34), not in the F1a list.
  - The first-load event check now compares the save view, so an E10-only load is no longer a sanitise.
  - I reviewed all of it below.

## Architecture checks
| Check | Result |
|---|---|
| Deterministic, fixed-step, separate from UI | OK. Pure functions in `src/sim/breeds.ts`. No wall clock: offline uses the capped `awayMs` passed in. `Game.pendingReveal` is the only UI-facing field and is never saved. |
| Flag default 0; flag-off byte-identical | OK. Every entry point guards with `flagOn(b,'breeds')` and returns its input (breeds.ts:20,25,49,59). The `m5Load` early-out is kept for six flags plus a breeds-only branch (m5-fields.ts:59). M3/M4 are killed. My probe (3 seeds × 20k ticks with collect/sellAll/buyFarm, flag on vs off with no hatch) shows state minus `breeds`, and the event streams, identical on every tick. |
| Saves | OK. `breeds?` is optional and absent means default. No SAVE_VERSION bump, per spec §6 R5. Old→new→old is tested across ls/bak/idb. The F1a pinned 8-key `M5_SESSION_FIELDS` is untouched; `breeds` was added to `M5_SAVED_FIELDS` and the F1a test still passes. |
| RNG | OK. `breeds.rng = mixSeed(s.rng ^ 0x62726473)`, taken once. `s.rng` is never advanced. brRng is not used (BR-R9). |
| Tunables data-driven | **Not yet** (Major 1). |
| Module boundaries | OK. sim/breeds imports only config/sim. save/m5-fields imports the sim sanitiser, which is the existing pattern. |
| Big numbers | Only the refund path; see Minor 3. |
| D-HOE-20261030-05 | No literal balance.json value is asserted. The tests use live `b.offline.offlineCapSeconds` in derived expressions. The 60_000/300_000 literals are `BC_SPEC_DEFAULTS` code values today; see Minor 4. |

## Findings
**Major 1 (flag-on gate, tracked): the `bc_*` tunables are code constants, not data.**
- Where: `src/config/breeds.ts:18-25`. `bc(_b, k)` ignores the balance and returns `BC_SPEC_DEFAULTS`.
- `sync-economy --check` passes only because no `bc_*` columns exist yet. Spec §5 / RC-PIN-2b says the breeds-gate CSV is PENDING (Econ).
- The single switch point is the right design. But spec §7 says "the `bc_*` columns are read only when the flag is on", so this must be closed before any flag-on RC.
- Owner: Saves + Econ.

**Major 2 (flag-on gate): no BR-AC1 / BR-AC2 trace test.**
- Both are [sim, CI] criteria: seeds 1–200 AC7 hashes, flag off vs the RC-PIN-3 reference, and flag on with no hatch vs flag off, including `s.rng`.
- PR A tests shape and identity at function level only.
- My probe passes, so the risk is low. Note that enabling breeds alone makes `anyM5FlagOn` true (tick.ts:28), which turns on F1c `fx` suspension and `attendedNow`. That is harmless only while no other timed effect is live, so it deserves a committed test.
- Its hash pin is PENDING (RC-PIN-3, and the flags-0 golden regen was stopped by D-CEO-20261030-09). Until then, an on-vs-off same-SHA test is enough.

**Minor 1: the E10 shadow can resurrect a raw id after a real slot change.**
- Where: `breedsSaveView` (breeds.ts:89-93) restores `raw[i]` whenever `slots[i]` is null at save time. Nothing clears `raw[i]` when the auto-slot fills slot i (revealHatch / breedsOffline / PR B breedsTick).
- Repro on the #96 head:
  1. Load with `silkie` in slot 1.
  2. The reveal auto-slots `brahma` into slot 1.
  3. The player moves brahma to slot 2.
  4. The save writes `['leghorn','silkie','brahma']`.
- That contradicts PMC Q5 ("a real change overwrites the raw id"). The M16 test only covers the "still filled at save" case.
- Fix: clear `breedsRawSlots[i]` wherever a slot is written. The simplest place is one helper used by revealHatch's callers and placeBreed (both `from` and `slot`).
- Exposure is nil until a build ships a 9th breed id. Also tracked on #96.

**Minor 2: a corrupt `owned` entry for a known id grants the breed.**
- Where: breeds.ts:63-64. `owned: {leghorn: null}` (or a non-object) becomes `{stars: 0}`, so the player owns it.
- Spec E12 only clamps stars. Suggest dropping known-id entries that aren't objects. The probe confirms the current behaviour.

**Minor 3: the refund is unbounded.**
- Where: breeds.ts:68. An unknown incubator breed refunds `int0(costCents)` with no upper bound: `1e300` is "an integer ≥ 0", and my probe gives coins = 1e300.
- Local saves are player-editable anyway, but other loaders clamp to safe ranges.
- Suggest clamping to `Number.MAX_SAFE_INTEGER`, or to the `hatchCostCents` ceiling: one Farm step of row 30 = 62,431,600¢.

**Minor 4: D-HOE-05 readiness.**
- When `bc()` switches to balance data, the literal 60_000 / 300_000 / 0x62726473-derived assertions in `tests/v5-breeds-state.test.ts` become balance-value asserts.
- At that point they must read a `tests/fixtures/` CSV/balance copy with a sha256 assert. Please note this in the bc() switch-over follow-up.

**nit 1:** the spec cites in `src/config/breeds.ts:2` and `src/sim/breeds.ts:3` still say 3.8.6/13d5255e. Re-cite 3.8.8 `254acea3` in the next touch. The PR body also still calls BR-AC9 ambiguous; rev 3.8.8 fixed that wording to match the implementation.

**nit 2:** E10 vs E12 conflict. An unknown id in a slot past the unlocked count is written back by the shadow (raw is computed for all 3 indices, breeds.ts:81), so the save keeps a non-null entry past the unlocked count. E10 ("kept untouched") wins, which I accept. Add a one-line comment.

**nit 3:** the BR-R18 comment in `offline.ts` and breedsOffline is fine. `applyOffline`'s new `reveal` key changes the return shape; the existing callers pass.

## Roll parity
Not applicable to PR A, which makes no draws. The roll lives in #96; see `v5-breeds-b-d7df1f9-architect.md` (PASS).

## Mutation evidence
20/20 is credible. The mutants map one-to-one onto spec rules: min-gap, cap, flag-off creation/sanitise, salt, rng re-derive, frozen sinceUnlock, pendingReveal, dup slot, refund, backfill, the offline settle, the auto-slot settle, and the PMC set M14–M20. The obvious gap is the resurrection path in Minor 1 (no mutant or test).
