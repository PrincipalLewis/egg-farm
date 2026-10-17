# CI gates

## Economy reference sim (vendored)

`tests/economy.test.ts` checks `data/economy.csv` against a vendored, sha256-pinned copy of the
reference sim in `vendor/economy-sim/` (pins in `vendor/economy-sim/SHA256SUMS`). It never reads
`/workspace/product`, so an edit there cannot turn main red.

Features opens the PR that updates the copy (from the sha Economy hands over; see "decided rule" below), together with the CSV: replace the vendored files,
update `SHA256SUMS` and `SOURCE` (source path, full sha256, vendoring date), and regenerate `data/economy.csv` in the same PR (`npm run sync-economy -- --check` must pass).

## No reads outside the repo

Default CI, `npm test` and `npm run build` read only files in the repo. `data/economy.csv` is the
source of truth for builds; Economy changes it through a PR.

- `scripts/gen-sim-fixtures.py` (`npm run gen-fixtures`) imports the vendored sim in `vendor/economy-sim/sim/`.
- `scripts/check-economy-copy.mjs` (`npm run check-economy-copy`) is an **opt-in, warn-only** drift report
  against the studio's `product/economy.csv`. It runs only with `--product` or `ECONOMY_PRODUCT_CHECK=1`
  (directory override: `ECONOMY_PRODUCT_DIR`), always exits 0, and is not part of `npm test`, `npm run build` or CI.
  Example: `npm run check-economy-copy -- --product`.
- The drift warning in `tests/economy.test.ts` (local `product/` sim vs vendored sha) also runs only with `ECONOMY_PRODUCT_CHECK=1`.
- `--strict` makes the opt-in check exit 1 on a mismatch or a missing product file.

## Economy numbers: decided rule

(a) Every Economy number change lands as a repo PR that updates `data/economy.csv`, plus the vendored sim
    and `vendor/economy-sim/SOURCE` / `SHA256SUMS` if the sim changed. Economy does not commit in the repo:
    Economy writes the CSV and sim in `product/`, keeps `product/economy.csv` in step, runs
    `npm run check-economy-copy -- --product` before each handoff, and hands the sha(s) to
    **Features (Senior Engineer, Features & Economy Wiring), who opens the repo PR.**
(b) The pre-release checklist runs `npm run check-economy-copy -- --product --strict` on a studio machine and
    **blocks the release on drift** between the repo and `product/`. **Owner: the release owner.**
