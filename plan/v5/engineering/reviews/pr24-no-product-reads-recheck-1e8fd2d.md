# Re-check: PR #24 arch/no-product-reads — 1e8fd2d (vs 650439d; main = 2700804)

Read-only delta re-check, no Claude calls. Worktree /workspace/review-1e8fd2d (detached). Runs in /tmp/np2/game, a clone with **no sibling product/**.
Previous report: pr24-no-product-reads-650439d.md.

## Verdict: PASS (approve). m1 and m2 are closed. M1 is mitigated by `--strict`, but it still depends on a checklist with an owner. Two new minors and one nit.

## Verified
- **package.json merge:** the script **key set equals main's** (2700804; there's no script diff vs 3fab7a4 either). `test:slow` is present. `build`/`test` differ from main only by dropping `node scripts/check-economy-copy.mjs &&`, which is this PR's intent. CI `slow` still runs `npm run test:slow` (ci.yml:20).
- **Vendored files == product's current copies:** seller_variance_sim.py 560ea73b and seller-variance-proposal.md 17877b41 match `product/sim/` byte for byte. SHA256SUMS and SOURCE list all 4 files. `tests/economy.test.ts:47` requires exactly those 4.
- **Pins fail closed:** appending to the vendored proposal makes `vitest run tests/economy.test.ts` exit **1**: `FAIL … vendored sim/seller-variance-proposal.md sha256 cc1ed3cb… != pin 17877b41…`. The pin check runs in beforeAll, so the dependent tests show as skipped (37), but the file FAILS, so nothing is hidden.
- **No product/ sibling:**
  - `gen-seller-variance-fixtures.py` (SV_SIM_DIR unset) and `gen-sim-fixtures.py` both regenerate **byte-identical** fixtures (`git status` clean).
  - `npm run test:slow`: 11/11.
  - `vitest run`: 49 files, 474/474, 0 skipped. Two consecutive runs.
- **m1 (`--strict`):** it's **in this PR** (d9e0ee7, merged in via 3fab7a4). `--product --strict` exits 1 on a mismatch or a missing file and 0 on a match, with tests at `tests/economy-copy.test.ts:25-32`. ci-gates.md:23/32 makes it a pre-release-checklist step. Closed. HoE's "blocks rc tags" depends on that checklist actually being run (see n-M1 below).
- **Grep for `../product` defaults:** the only code default is `check-economy-copy.mjs:14` (`../../product`), which is opt-in. Everything else is comments.

## Findings
### n-M1 (process, carried over, now mitigated) — drift detection relies on a manual checklist step
`--strict` exists, but nothing runs it automatically (it isn't in CI, by design), and it compares **only economy.csv**: there's no check that product/sim/*.py still equals the vendored pins. The owner of the rc-tag checklist (HoE/Architect) must run `npm run check-economy-copy -- --product --strict`. Consider extending it to compare the SOURCE-listed product files' sha256 against SHA256SUMS.

### m1 (minor) — `--strict` without `--product` silently does nothing
`scripts/check-economy-copy.mjs:10-12`: `--strict` alone prints "opt-in only … skipped" and exits 0. The test at `:32` asserts this on purpose. As a release gate, a mistyped checklist command (`check-economy-copy -- --strict`) passes green. Make `--strict` imply `--product`, or exit 1 if it's given without it.

### m2 (minor) — one unreproduced failure in `npm test`
The first `npm test` in /tmp/np2 reported `1 failed | 473 passed (474)`. The failing test's name wasn't captured, because grep filtered it out. Two more full `vitest run`s right after passed 474/474. It's probably a load/timeout flake (it ran alongside the regen and the slow suite on the shared box). Worth watching in CI; I can't say more.

### n1 (nit) — stale product/sim references in comments and the fixture `source` field
`scripts/gen-seller-variance-fixtures.py:62` still writes `source='product/sim/seller_variance_sim.py …'` into the fixture. `tests/seller-variance.slow.test.ts:5-6` still says "Regenerate: SV_SIM_DIR=<product/sim>". Point both at vendor/economy-sim/sim. Changing `source` changes the fixture bytes, so regenerate it in the same change.
