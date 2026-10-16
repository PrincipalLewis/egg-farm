# CI gates

## Economy reference sim (vendored)

`tests/economy.test.ts` checks `data/economy.csv` against a vendored, sha256-pinned copy of the
reference sim in `vendor/economy-sim/` (pins in `vendor/economy-sim/SHA256SUMS`). It never reads
`/workspace/product`, so an edit there cannot turn main red.

Economy updates the copy through a PR, together with the CSV: replace the vendored files,
update `SHA256SUMS`, and regenerate `data/economy.csv` in the same PR (`npm run sync-economy -- --check` must pass).
