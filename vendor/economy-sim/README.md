# Vendored economy reference sim

Pinned copy of Economy's reference sim (`product/sim/economy_sim.py`) plus the one data file it
reads at import (`product/economy.f1-m4cols.csv`, opened via `../economy.f1-m4cols.csv`).
Files are byte-identical to the source; the layout keeps the sim's relative path working.

`tests/economy.test.ts` runs ONLY this copy and asserts the sha256 values in `SHA256SUMS`.
To change it, Economy opens a PR that updates these files, `SHA256SUMS`, `SOURCE` (provenance: source path, full sha256, vendoring date), and `data/economy.csv`
together (see engineering/ci-gates.md).
