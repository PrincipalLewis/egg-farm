# Vendored economy reference sim

Pinned copy of Economy's reference sim (`product/sim/economy_sim.py`) plus the one data file it
reads at import (`product/economy.f1-m4cols.csv`, opened via `../economy.f1-m4cols.csv`).
Files are byte-identical to the source; the layout keeps the sim's relative path working.

`tests/economy.test.ts` runs ONLY this copy and asserts the sha256 values in `SHA256SUMS`.
To change it, Features opens a PR (from the sha Economy hands over) that updates these files, `SHA256SUMS`, `SOURCE` (provenance: source path, full sha256, vendoring date), and `data/economy.csv`
together (see engineering/ci-gates.md).

## Config mapping (decisions.md:295)

The freshness test picks the sim `--config` from the sha256 of `data/economy.csv`:

| data/economy.csv sha256 | --config | meaning |
|---|---|---|
| `57d964d5…` | `current` | pre-F1 (P1Q, M2_P4), main today |
| `86f0e80e…` | `f1` | F1 m4cols CSV (#17) |
| anything else | — | hard failure: `unknown economy.csv <sha>: update vendor/economy-sim` |

It compares the 46 columns the sim's CSV writer emits. Pins are verified in a `beforeAll` before the sim runs.
Pinned sim sha eddf945d implements the ruling at decisions.md:295 (Oct 17 01:32): CURRENT reverted to pre-F1, F1 is `--config f1`.
