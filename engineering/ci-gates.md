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
- `--strict` implies `--product` (a mistyped release-gate command cannot pass green) and makes the check exit 1 on a mismatch or a missing product file. It also compares the sha256 of every vendored file listed in `vendor/economy-sim/SOURCE` against its `product/` counterpart (and against the SOURCE pin), failing closed on drift or a missing file.
- `product/economy.csv` is the single canonical shipping file (ADR M3-ECON-1, decisions.md): `--strict` always compares `data/economy.csv` with it, never with a variant such as `product/economy.f1-m4cols.csv`. Economy promotes the shipping variant byte-for-byte into `product/economy.csv` before an rc tag.
- `npm run test:slow` first runs `scripts/check-vendor-pins.mjs` (every `vendor/economy-sim/SHA256SUMS` pin), so the slow suites alone never run a tampered vendored sim; the default suite checks the same pins in `tests/economy.test.ts`.
- `ECONOMY_VENDOR_DIR` (test-only) overrides the vendor dir read by `--strict`. It is honoured only when `process.env.VITEST` is set (the path is printed to stderr); outside vitest it is ignored with a warning, so a release-gate run always checks the in-repo `vendor/economy-sim`. Under `--strict` the (path, sha) sets of SOURCE and SHA256SUMS must be identical, and SOURCE paths resolving outside the vendor dir are rejected.

## Economy numbers: decided rule

(a) Every Economy number change lands as a repo PR that updates `data/economy.csv`, plus the vendored sim
    and `vendor/economy-sim/SOURCE` / `SHA256SUMS` if the sim changed. Economy does not commit in the repo:
    Economy writes the CSV and sim in `product/`, keeps `product/economy.csv` in step, runs
    `npm run check-economy-copy -- --product` before each handoff, and hands the sha(s) to
    **Features (Senior Engineer, Features & Economy Wiring), who opens the repo PR.**
(b) The pre-release checklist runs `npm run check-economy-copy -- --product --strict` on a studio machine and
    **blocks the release on drift** between the repo and `product/`. **Owner: the release owner.**
