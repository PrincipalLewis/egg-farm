# PR #24 check-economy-copy opt-in/strict + vendored generators — QA verdict @ 8569fef (stated final)

**Verdict: PASS** (2 Nits)

Tested on a local merge of 8569fef + origin/main 2700804 (local commit 1a55416, not pushed). The worktree sits at /tmp/pr24env/game, so ../../product is a scratch copy (scratch/qa-pr24); the real product/ was never touched. Merges cleanly with main.

| Check | Result |
|---|---|
| grep: no reads outside the repo | PASS. Only scripts/check-economy-copy.mjs (opt-in path, ECONOMY_PRODUCT_DIR or ../../product) |
| npm test, product/ present | PASS 481/481 |
| npm test, product/economy.csv + product/sim/economy_sim.py (COLL_SHARE/SELL_EVERY) + seller_variance_sim.py edited | PASS 481/481 |
| npm test, product/ hidden | PASS 481/481 |
| check-economy-copy default (match / drift / hidden) | PASS. Prints "opt-in only … skipped", exit 0, never reads product/ |
| --product with csv drift | PASS. WARNING, exit 0 |
| --strict alone (implies --product) | PASS. Reads product/: match → exit 0; csv drift → ERROR exit 1; product sim drift → ERROR "vendored … (eddf945d) differs … (5a36a706)" exit 1; product/ hidden → 4 ERROR not found, exit 1 |
| SOURCE row count | PASS. Extra distinct row → "SOURCE has 5 file row(s) but SHA256SUMS has 4", exit 1; duplicate row → count test fails; missing row → "3 … but 4" + set diff names seller_variance_sim.py, exit 1; vitest count/provenance tests fail in each case |
| Tampered vendored sim | PASS. economy_sim.py → economy.test "sha256 … != pin eddf945d…" fails; seller_variance_sim.py → "… != pin 560ea73b…" fails |
| Generators read only vendor/ | PASS. gen-sim-fixtures.py + gen-seller-variance-fixtures.py run with product/ hidden, exit 0 |
| Regenerated fixtures byte-identical | PASS. `git diff --exit-code tests/fixtures` = 0 |
| tsc / sync --check | PASS |
| test:slow run 1 / run 2 | PASS. 11/11 both |

**Nit 1:** with seller_variance_sim.py tampered, `npm run test:slow` alone still passes 11/11 (it uses the JSON fixture and doesn't check the pins). The default suite catches it, so CI is red overall. Optional: call the pin check in the slow suite's beforeAll too.
**Nit 2:** running the generators leaves vendor/economy-sim/sim/__pycache__/ untracked and not git-ignored. Add `__pycache__/` to .gitignore (or run python with -B).

Not run: browser checks (only rc0-browser.mjs AXE_PATH env override changed; no src/).
Evidence: pr24-evidence-8569fef/ (grep-product, unit-A/B/C, copycheck-*.log, source-rowcount.log (first attempt; its vitest part errored on my harness flag) + tamper-and-rowcount-rerun.log (valid), regen-fixtures, tsc, sync, slow-run1/2, head.txt). Harness: batch-0218/pr24.sh.
