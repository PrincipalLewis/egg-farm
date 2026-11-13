# Review: PR #24 arch/no-product-reads — 650439d (base = main dfd53b9, #21 merged)

Read-only, one pass, no Claude calls. Worktree /workspace/review-650439d (detached). Runs in /tmp/np/game, a clone with **no sibling product/** (`ls /tmp/np` shows `game` only).

## Verdict: APPROVE the code. MAJOR process gap that needs an owner (not a code blocker).

## Verified
- **src untouched:** `git diff main...650439d -- src` is empty.
- **Clean run without product/:**
  - `npm test`: 49 files, **473/473 passed, 0 skipped**.
  - `npm run build`: passes, including check-release-build.
  - `check-economy-copy --product`: `WARNING /tmp/np/product/economy.csv not found`, exit 0.
- **gen-sim-fixtures** now imports `vendor/economy-sim/sim`. Regenerating gives a byte-identical `tests/fixtures/economy_sim.json`. I ran this by accident in the review worktree; the only side effect was `__pycache__`, which I removed, and the worktree is clean.
- **Grep** (scripts, tests, workflows, configs, excluding reviews/json) for `../product`, `/workspace`, `/home/`, `/tmp/`, `egg-farm-studio`:
  - The only code hit outside the repo is the opt-in `check-economy-copy.mjs:12` default `../../product`, which isn't reached by default.
  - Pre-existing and unrelated: `scripts/rc0-browser.mjs:60` reads `/tmp/axe/node_modules/axe-core/axe.min.js`, an absolute path in a manual browser script outside npm test/CI. Nit n1.
  - The rest are docs (ci-gates.md, m4-design.md) and a saves README.
  - Note: PR #19's `scripts/gen-seller-variance-fixtures.py` still defaults `SV_SIM_DIR` to `../product/sim`. It isn't on main yet, but it will be a new outside-repo default once #19 merges (m2).
- **economy-copy.test** uses temp dirs via `ECONOMY_PRODUCT_DIR` and checks every path: the default no-op (pointed at `/nonexistent…`), match with CRLF normalisation, mismatch → `WARNING …differs`, and missing → `WARNING …not found`. All assert exit 0, which is the intended behaviour but means **no failing path remains to test** (see m1).
- **In-repo checks that still fail closed:**
  - `vendor/economy-sim/SHA256SUMS` pins (sim eddf945d, f1 csv 86f0e80e), checked in `tests/economy.test.ts:43-52`, with SOURCE provenance equal to the pins.
  - AC6: every `data/economy.csv` cell is reproduced from the config formulas.
  - `sync-economy --check`: balance.json vs data/economy.csv.
  - Parity of the vendored-sim fixture.

  So the repo is **internally consistent**: csv ↔ formulas ↔ vendored sim ↔ fixture.
- **Drift today:** none. product/sim/economy_sim.py = eddf945d = pin. product/economy.f1-m4cols.csv = 86f0e80e = pin. product/economy.csv matches data/economy.csv after CRLF normalisation.

## Findings
### M1 (major, PROCESS GAP — needs an owner) — nothing now detects drift from Economy's source of truth
Before this PR, `npm test`/`npm run build` on a studio machine failed when `data/economy.csv` ≠ `product/economy.csv`. CI never had this gate in practice, because product/ is absent there and the step was skipped. After this PR, **every comparison with product/** (the CSV copy and the live-sim-vs-vendored sha warning in `tests/economy.test.ts:60-61`) is opt-in and warn-only. If Economy edits `product/economy.csv` or `product/sim/economy_sim.py` and doesn't open a PR, the repo keeps shipping the old numbers, and no automated check tells anyone. The in-repo pins guarantee consistency with *the vendored copy*, not with Economy's current source.

Ownership: Economy (or Head of Engineering) needs to own one of these:
- (a) Economy's sim/CSV change procedure requires a repo PR; the rule exists in ci-gates.md but nothing enforces it.
- (b) A scheduled/studio-side job that runs `check-economy-copy -- --product` plus the sha check, and **escalates** on drift.
- (c) A `--strict` opt-in (below), used in a pre-release checklist.

### m1 (minor) — opt-in mode can't fail even when explicitly asked
`scripts/check-economy-copy.mjs:13-19` always exits 0, including on `--product`. There is no way to use it as a gate in a release checklist or a studio cron job. Suggest `--strict` (or `ECONOMY_PRODUCT_CHECK=strict`), which exits 1 on a mismatch or a missing file, plus a test for that.

### m2 (minor) — #19's generator will add a new outside-repo default
`scripts/gen-seller-variance-fixtures.py` (PR #19) defaults `SV_SIM_DIR=../product/sim`. To follow this PR's rule, point it at `vendor/economy-sim/sim` (and vendor `seller_variance_sim.py` with a pin), or require the env var. Coordinate the merge order.

### n1 (nit) — absolute path in a manual browser script (pre-existing)
`scripts/rc0-browser.mjs:60` uses the absolute `/tmp/axe/...`. It's manual and not run in CI, but it's an outside-repo read; resolve axe-core from node_modules instead.
