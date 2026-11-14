# GEN/bc-wiring — HANDOFF (23:10 CET, 2026-11-13)

**State:** Draft. Implementation + local unit tests only. Full gates (suite, seeds 1–200 byte-identity sweep across all profiles, pacing, k10) and Ready wait until #148 (unpaid-trickle) merges; then mergefwd the new origin/rc/v5 tip into `rc5/bc-wiring` and run the gates once. Do not queue HoQA until that pass. `engineering/status.md` untouched.

**PR:** https://github.com/PrincipalLewis/egg-farm/pull/149 (Draft). Branch `rc5/bc-wiring`, worktree `/workspace/wt-rc5-bc-wiring` (standalone clone; the shared `game/.git` in this sandbox was missing HEAD/config).
**Base:** origin/rc/v5 `32307f32` (Merge #146, tree `232de8aa`). #148 still OPEN at implementation time (`ea5f5328`, title unpaid_trickle).

This PR is step 1 for closing RC item 2 (HoQA QA-D-1114-K10-WIRE). Authority: Econ BRIEF `93ac121e` §1 + D-HOP-2026-11-14-14 (bc()/ROSTER reading Balance, byte-identical at defaults).

## Step 0 verification (BRIEF 93ac121e §1 at 32307f32) — CONFIRMED

| Site | Claim | Verified at `32307f32` |
|---|---|---|
| `tests/k10-breeds-offset.ts` `bcFromCsv()` | K10 harness already reads `bc_*` (BC_COLS + traits + calm + incubators) | Yes. K002 32 `bc_*` values equal `BC_SPEC_DEFAULTS` / `ROSTER` (except `bc_lay_cap_farm`, which is not a fixture column; default 18 remains code-only). |
| `scripts/sync-economy.ts` | No `bc_*` mapping; extra columns ignored | Yes. `fitM4` copied only `tc_*` + `M5_MAPPED_COLS`. |
| `src/config/balance.json` | No `bc_*` / `m4.bc` keys | Yes. `m4` keys: enabled, flags, zeroGain, hens, offline, eggValue, milestones, tc. |
| `src/config/breeds.ts` `bc()` | Ignored `Balance`; returned `BC_SPEC_DEFAULTS` | Yes: `(_b, k) => BC_SPEC_DEFAULTS[k]`. |
| `ROSTER` | Trait bp hardcoded (Cochin 1500); no `BcKey` for traits | Yes. Only shipping read of trait bp was `slotTraitBp` via `ROSTER[id][2]`. |
| Shipping `data/economy.csv` | No `bc_*` columns | Yes (approved `58dcf20e`). |

## Implementation

- `fitBc()` in `scripts/sync-economy.ts`: if any `bc_*` header is present, every such column must be known (`bc_<BcKey>` or `bc_trait_<id>_bp`) and constant; mapped to `m4.bc` (prefix stripped). Unknown `bc_*` fails the sync. No `bc_*` headers ⇒ no `m4.bc` block (shipping `--check` unchanged).
- `bc(b, k)` reads `m4.bc[k]` when present, else `BC_SPEC_DEFAULTS[k]`.
- New `rosterTraitBp(b, id)` reads `m4.bc.trait_<id>_bp` when present, else `ROSTER[id][2]`. `slotTraitBp` uses it (the one shipping trait-bp site).
- `ROSTER` tuples, rarity/family, and hardcoded defaults are unchanged.
- No `SAVE_VERSION` bump (stays 6). No `unpaid_trickle` / `unpaidTrickle` touch (disjoint from #148). Shipping `data/economy.csv` and `src/config/balance.json` unchanged.

## AC4 (one value-check, not a sim comparison)

`tests/v5-bc-wiring.test.ts`: take K002, set `bc_trait_cochin_bp=0`, run `parseEconomyCsv` + `buildBalance` + `validateBalance`, then assert `rosterTraitBp` / `bc()` equal `bcFromCsv()` on that same CSV for every harness-mapped key and every roster id. Cochin is 0 (not the 1500 default).

## Byte-identity evidence at defaults (32307f32)

- `npm run sync-economy -- --check`: EXIT 0, `balance.json up to date with economy.csv`. Unit test also asserts `buildBalance(shipping csv)` is byte-identical to committed `balance.json` and has no `m4.bc`.
- Shipping `bc()` / `rosterTraitBp` equal `BC_SPEC_DEFAULTS` / `ROSTER`.
- Serialized default save: `sha256(serialize(initialState(shipping, 7), T0=Date.UTC(2026,9,29,12), 5))` = `2dd2ab452531079ccbb8173884f90ba256c56e75993ef56227724e1b55a3dfdf` (save.ts / initialState / balance.json are the 32307f32 bytes).
- Save/load round-trip goldens: `tests/v5-f2-roundtrip.test.ts` — F2 fixture still `serialize(m5State, T0, 5)` exactly; LS/bak/idb hop pins unchanged (`a6d21272` / `ebd90e76` / `bc35f034` for ls+idb; `deccfead` / `074071f0` / `521c2e10` for bak).

## Local unit tests (23:10 CET, 2026-11-13)

- `tsc --noEmit`: EXIT 0.
- Focused vitest (flock `.vitest-eng.lock`, `--reporter=verbose`): 3 files, 16 passed, 0 skipped, EXIT 0. Files: `v5-bc-wiring.test.ts` (5, including AC4), `v5-f2-roundtrip.test.ts` (4), `v5-breeds-family-caps.test.ts` (7).
- `npm run sync-economy -- --check`: EXIT 0.

Not run (wait for #148 mergefwd): full `npm test`, seeds 1–200 byte-identity sweep, pacing, k10, Ready.

## After #148 merges

1. Fetch; ordinary mergefwd of the new origin/rc/v5 tip into `rc5/bc-wiring` (no rebase/force). Expect a conflict or additive change on the K10 fixtures (`unpaid_trickle=0`) and possibly `sync-economy` / `validateBalance` — keep both, do not drop #148's mapping, do not add a SAVE_VERSION bump.
2. Run the full gates once: tsc, full npm test, ST-AC19/20 whole file 16/16 0 skipped, flag-0 / M4-on goldens unchanged (`f90d1678` / `a54c9cf9`), seeds 1–200 byte-identity across all profiles, build, then hosted pacing + k10.
3. Mark Ready only after that pass. Do not queue HoQA from this HANDOFF.
