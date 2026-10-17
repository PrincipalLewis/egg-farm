# Vendored economy reference sim

Pinned copy of Economy's reference sim (`product/sim/economy_sim.py`) plus the one data file it
reads at import (`product/economy.f1-m4cols.csv`; also `sim/seller_variance_sim.py`, the AC7 variance reference, and `sim/seller-variance-proposal.md`, whose sha the generator records; both used by `scripts/gen-seller-variance-fixtures.py`, opened via `../economy.f1-m4cols.csv`).
Files are byte-identical to the source; the layout keeps the sim's relative path working.

`tests/economy.test.ts` runs ONLY this copy and asserts the sha256 values in `SHA256SUMS`.
To change it, Features opens a PR (from the sha Economy hands over) that updates these files, `SHA256SUMS`, `SOURCE` (provenance: source path, full sha256, vendoring date), and `data/economy.csv`
together (see engineering/ci-gates.md).

## Config mapping (decisions.md:295)

The freshness test picks the sim `--config` from the sha256 of `data/economy.csv`:

| data/economy.csv sha256 | --config | meaning |
|---|---|---|
| `57d964d5…` | `p1q` | pre-F1 (P1Q, M2_P4) |
| `86f0e80e…` | `f1` | F1 m4cols CSV (#17/#32), main today (`current` == `f1` since sim 10f29a4a) |
| anything else | — | hard failure: `unknown economy.csv <sha>: update vendor/economy-sim` |

It compares the 46 columns the sim's CSV writer emits. Pins are verified in a `beforeAll` before the sim runs.
Pinned sim sha 10f29a4a (Economy, 2026-10-17, HoE go 07:32): CURRENT = F1 and M2_CURRENT = M2_F1 (50/0.5) now that #17 is on main; pre-F1 stays available as `--config p1q`. Replaces eddf945d (decisions.md:295 revert).
Pinned variance sim sha 68a64c59 (Economy, 2026-10-17): adds `M2_F1` (M2_P4 + yawn_at 50, manage_at 50) and sets `M2_CURRENT = M2_F1`. Replaces 560ea73b. The fixture generator reads worker values from data/economy.csv, so only the fixture's sim_sha256 label changed.
