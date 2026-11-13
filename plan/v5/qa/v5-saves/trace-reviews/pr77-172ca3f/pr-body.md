**v5 F1a: M5 GameState fields, SimEvent members and `m4.flags.*` plumbing** (engineering/m5.0-sizing.md §1 F1(d)(e), §4 PR split; D-HOE-20261029-02). Draft into `rc/v5`. Manifest row 5.

## What
- `src/sim/m5-state.ts`: every new M5.0 `GameState` field declared once, optional, absent while its flag is off (§4 hotspot 3). Saved: `evRngState`, `nextSpawnRemainingS`, `frenzyRemainingS`, `broodyNestCents`, `broodyHenIdx`, `abilities.{id}.{readyAt,activeS}`, `abilitiesUnlocked`, `abilitiesCoachSeen`. Session only (F2 strips them): `goldenEgg`, `streakS`, `streakHoldS`, `tapCreditCdS`, `irefRingCents`, `refWarmS`, `broodyNestScaled`. Exported lists `M5_SAVED_FIELDS` / `M5_SESSION_FIELDS` for F2 (Saves).
- `sim/workers.ts` `Worker`: optional `paused`, `callLockoutS` (Pause, sizing §9.2 G3 / B5).
- `sim/events.ts`: `M5SimEvent` (`collectible_spawned/collected/expired`, `frenzy_started/ended`, `streak_started/peak`, `abilities_unlocked`, `ability_used/blocked/ended`), `collect.credited` / `bonus_cents`. Field names are the spec telemetry names; Game adds the UI-only `collectible_id`, `layout`, Broody `slot_id`/`restored`.
- `src/config/flags.ts`: `M5_FLAGS`, `flagOn(b, f)` = `m4.enabled && m4.flags[f] === 1`, `evRngFlagOn`. `M4Params.flags?`.

## Flags (HoE D-C1: one namespace `m4.flags.*`, default 0)
`golden, streak, tapCoins, abilities, broody, salesStopped, pause, rc2Refill, autoRefill, clockWage, breeds, zeroGainUi, bestBuyV2`. These are the names the specs use. **Deviations:** HoE's examples `goldenEgg`/`tapIncome` aren't used, because the specs and sizing §12.1 D-C1 say `golden`/`tapCoins`. The M5.1 specs spell `m5.flags.zeroGainUi` / `m5.flags.bestBuyV2`; here they are `m4.flags.*`. The sizing §1 `m4.tc.*_enabled` names are replaced. `balance.json` gets the block in F3.

## No behaviour change
Types plus one pure helper. `balance.json` and `data/` are untouched. Flags off means byte-identical: flag-off golden `f90d1678`, M4-on `a54c9cf9`, 24 h trace `2c0d3ec3…` (all matched, below).

## Gates (local, HEAD ea6b6db; gate id `v5-f1a-ea6b6db`)
tsc 0 · vitest (--minWorkers=1 --maxWorkers=2) 1571 passed / 1 skipped · test:slow 16 passed / 1 skipped · sync-economy --check 0 · build 0 · check-globals chromium 0 · verify --hours 24 PASS (goldens f90d1678 / a54c9cf9 match; trace 2c0d3ec3… unchanged).
Artifacts: `/workspace/egg-farm-studio/artifacts/v5-f1a-ea6b6db/results/` (SHA256SUMS verified) and `artifacts` branch `v5-f1a-ea6b6db/results/`. CI `gate` skips Drafts.

## Tests
`tests/v5-f1a-fields.test.ts`: lists are disjoint; `initialState` has no M5 field; 10 min of play with flags off creates none; `flagOn` truth table (needs `m4.enabled`, exactly 1).

Self-review: engineering/reviews/pr77-ea6b6db.md (studio folder). Under D-CEO-20261028-02, Minor/Nit fixes ship on self-review.

## Update 2026-10-29 21:4x CET: merged rc/v5 406e455 (#81 F2), head 008bcca
Merged, not rebased (no force-push). Conflicts resolved per Saves' merge note (take F1a's declarations, drop F2's duplicates):
- `src/sim/state.ts`: kept `GameState extends M5Fields`; dropped F2's inline M5 field copies (same names/shapes).
- `src/sim/events.ts`: kept F1a's `M5SimEvent` union; dropped F2's duplicate `collectible_expired` / `ability_ended` members.
- `src/config/formulas.ts`: kept `flags?: M5Flags` (superset of F2's 6-name record).
F2's src (`save/m5-fields.ts`, `save.ts`, `game.ts`) and tests are unchanged; F2 tests pass against F1a's declarations.
Gates at 008bcca: sync --check 0 · tsc 0 · vitest 1618 passed / 1 skipped · goldens f90d1678 / a54c9cf9 byte-identical (4/4) · build + check-release-build 0 · build:html 0 · check-globals chromium 0 (3× PASS, flock .browser-test-2.lock, load ≤ 12).


## Update 2026-10-29 23:1x CET: head 172ca3f (final for Saves QA)
Merged rc/v5 d3b5a53 (#78 bot-m5) with `git merge` (no rebase). CCR PASS at 008bcca (0 Blocker / 0 Major / 1 Minor / 1 Nit, engineering/reviews/pr77-008bcca-ccr.md).

### Post-CCR delta (008bcca → 172ca3f), one line per commit
| commit | category | what |
|---|---|---|
| c7bcec7 | rc/v5 merge | `git merge origin/rc/v5` (d3b5a53, #78: tests/ + scripts/verify only, no conflict) |
| 37f24c1 | CCR Minor + nit | m1: `M5_SESSION_KEYS = M5_SESSION_FIELDS` (one list, sim/m5-state.ts; `brRngState` declared in F1a, as #79 does); N-1: `M5Flag` re-exported from config/flags.ts, `m5Flag = flagOn`; pin test |
| 2e18aba | AC tags + trace table | AC ids in test titles; new `[F1(d)]` flags-off no-M5-event test; `[CCR-77-N1]` m5Flag == flagOn test |
| 172ca3f | Saves QA test gaps | `[F1(d)]` M5SimEvent members + fields pinned to the spec tables (type-level exact Eq, tsc-enforced); `[D-C1]` M5_FLAGS pinned to the 14 ruled names. This needs `'fatigueCue'` in `M5_FLAGS` (config/flags.ts, one line, byte-identical to #82's line, D-HOP-2026-10-29-05); no behaviour change (no balance flags block in F1a; flag off) |
No other production-code change. Goldens and trace unchanged (below).

### Self-review of CCR minors/nits (D-CEO-20261028-02)
- **m1 (Minor)** src/save/m5-fields.ts:26 vs src/sim/m5-state.ts:67: F2's strip list is now a re-export of F1a's `M5_SESSION_FIELDS`, so there is one list. `brRngState` moved into F1a's `M5Fields` + list (it was already in F2's strip list; #79 adds the same two lines, merge is clean). Test `[CCR-77-m1][D-C4]` asserts identity, pins the 8 spec keys, and checks that persist and serialize drop each one. Mutants M77-2/M77-3 below fail it.
- **N-1 (Nit)** second `M5Flag` type / `m5Flag()`: `M5Flag` is re-exported from config/flags.ts and `m5Flag(b,k) = flagOn(b,k)`. Test `[CCR-77-N1][D-C1]` (truth table over all 14 flags × enabled × value). Mutant M77-4 fails it.

### AC trace (Saves QA table qa/v5-saves/trace-reviews/pr77-37f24c1.md, extended). 13 rows
| AC id | test file::test name |
|---|---|
| F1(e) declared once | tests/v5-f1a-fields.test.ts::F1a M5 fields > [F1(e)] saved and session lists are disjoint and unique |
| F1(e) absent while off / AC-M5A-16 | tests/v5-f1a-fields.test.ts::F1a M5 fields > [F1(e)][AC-M5A-16] initialState carries no M5 field (flag-off saves stay byte-identical) |
| F1(e) absent while off (play, Worker paused/callLockoutS) / AC-M5A-16 | tests/v5-f1a-fields.test.ts::F1a M5 fields > [F1(e)][AC-M5A-16] 10 min of 10 Hz play with every flag off never creates an M5 field |
| F1(e) session strip / D-C4 / CCR-77-m1 | tests/v5-f2-m5-fields.test.ts::F2 persist (save shape) > [CCR-77-m1][D-C4] the strip list IS F1a M5_SESSION_FIELDS, pinned to the 8 spec keys; each one is dropped by persist and serialize |
| F1(d) SimEvent members + fields (spec) | tests/v5-f1a-fields.test.ts::F1a SimEvent members > [F1(d)] M5SimEvent members and sim fields are pinned to the spec telemetry tables (11 members; collect + credited/bonus_cents) |
| F1(d) flags off: no M5 event | tests/v5-f1a-fields.test.ts::F1a SimEvent members > [F1(d)] 10 min of play with every flag off emits no M5SimEvent and no collect.credited / bonus_cents |
| D-C1 names (14 ruled) | tests/v5-f1a-fields.test.ts::F1a flag plumbing (m4.flags.*) > [D-C1] M5_FLAGS is exactly the 14 ruled names, in order (D-HOE-20261029-02; fatigueCue D-HOP-2026-10-29-05) |
| D-C1 name shape | tests/v5-f1a-fields.test.ts::F1a flag plumbing (m4.flags.*) > [D-C1] flag names are unique camelCase |
| D-C1 absent = off | tests/v5-f1a-fields.test.ts::F1a flag plumbing (m4.flags.*) > [D-C1] absent block = every flag off |
| D-C1 flagOn / AC-M5A-16 | tests/v5-f1a-fields.test.ts::F1a flag plumbing (m4.flags.*) > [D-C1][AC-M5A-16] a flag is on only at exactly 1 AND m4.enabled |
| D-C1 one flag rule / CCR-77-N1 | tests/v5-f2-m5-fields.test.ts::F2 flags (D-C1): m4.flags.<item> === 1 and m4.enabled > [CCR-77-N1][D-C1] m5Flag is config/flags flagOn for every M5_FLAGS name (one flag type, one rule) |
| D-C2 / D-C4 scope | tests/v5-f1a-fields.test.ts::F1a flag plumbing (m4.flags.*) > [D-C2][D-C4] evRng is live for golden or broody only |
| flags off = goldens (AC7, AC-M5A-16) | engineering/golden/flagoff-golden.a01faea.test.ts::golden > storage bytes / sim trace; engineering/golden/m4on-golden.90a9c84.test.ts::golden > storage bytes / sim trace; `npm run verify -- --hours 24` (f90d1678 / a54c9cf9 / trace 2c0d3ec3) |
Every row was checked against `vitest --reporter=verbose` output at 172ca3f.

### Mutation checks (each applied locally, run, reverted; tree clean after)
| id | mutant | result |
|---|---|---|
| M77-1 | drop `'fatigueCue'` from M5_FLAGS | FAIL [D-C1] M5_FLAGS is exactly the 14 ruled names |
| M77-2 | drop `'brRngState'` from M5_SESSION_FIELDS | FAIL [CCR-77-m1][D-C4] |
| M77-3 | `M5_SESSION_KEYS` = own copy minus `refWarmS` | FAIL [CCR-77-m1][D-C4] |
| M77-4 | `m5Flag` ignores m4.enabled | FAIL [CCR-77-N1][D-C1] (+ F2 shipped-balance test) |
| M77-5 | `collect` event always carries `credited` | FAIL [F1(d)] no M5 event |
| M77-6 | rename `streak_peak.max_tier` → `maxTier` in events.ts | tsc FAIL in tests/v5-f1a-fields.test.ts (field pin) |
| M77-7 | drop the `streak_started` member | tsc FAIL in tests/v5-f1a-fields.test.ts (member + field pin) |

### Gates at 172ca3f (gate id v5-f1a-172ca3f)
tsc 0 · sync-economy --check 0 · vitest (flock .vitest-eng.lock, nice 10, --minWorkers=1 --maxWorkers=2) 1633 passed / 1 skipped · test:slow 16 passed / 1 skipped · build (incl. check-release-build) 0 · check-globals chromium 0 · verify --hours 24 PASS: goldens f90d1678 / a54c9cf9 match, trace 2c0d3ec3… MATCH. Artifacts: /workspace/egg-farm-studio/artifacts/v5-f1a-172ca3f/results/ (SHA256SUMS ok). CI `ci` run 40960891916: gate success.

