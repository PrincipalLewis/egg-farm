# PR #26 — #23/#24 nit fixes, ADR M3-ECON-1, check-economy-copy hardening — QA verdict @ dbf940a

**Verdict: PASS with 1 Minor (fix recommended before merge, not blocking Linux CI)**

Tested on a local merge of dbf940a + origin/main 4608a4f (c4aba8e, not pushed; merge is clean). The worktree is /tmp/pr26env/game, and ../../product is a scratch copy (scratch/qa-pr24); the real product/ was only read. Evidence: pr26-evidence-dbf940a/ (complete run, written before the 04:43 box reset). Earlier partial run: pr26-evidence-5aa5472/.

| Check | Result |
|---|---|
| No src/ runtime changes | PASS (files.txt: scripts, tests, fixtures, .gitignore, .gitattributes, package.json, vite.config.ts test block, engineering docs) |
| Merge with main | PASS clean at dbf940a (5aa5472 had a .gitignore conflict; fixed by the main merge) |
| tsc / sync --check / npm run build (incl. check-release-build) | PASS |
| vitest (2 workers) | PASS 564/564 |
| test:slow ×2 | PASS 12 passed + 2 skipped, both runs; vendor-pin check runs first |
| #23 nit: skip reason | PASS. Titles end "(F1 86f0e80e only; skipped on pre-F1 57d964d5)" |
| #24 nit 1: tampered seller_variance_sim.py fails test:slow alone | PASS. "check-vendor-pins: ERROR sim/seller_variance_sim.py sha256 … != pin 560ea73b", exit 1, vitest never starts |
| #24 nit 2: __pycache__ | PASS. Ignored; after both generators run, `git status --porcelain` is empty; fixtures byte-identical |
| check-economy-copy default / --product | PASS. Default "opt-in only … skipped" exit 0 (also with product/ hidden); --product warns on drift, exit 0 |
| --strict raw bytes | PASS. CRLF-only, trailing space on one line, extra trailing newline and BOM each → ERROR "sha256 … differs (raw bytes)", exit 1; exact copy → "byte-for-byte", exit 0. Real /workspace/product/economy.csv (57d964d5) → exit 0 |
| --strict drift / missing / count / sha | PASS. csv drift, product sim drift, product hidden (4 not found), SOURCE duplicate / extra / missing row, tampered vendored sim → all exit 1 with specific errors |
| Hardened pin check | PASS. Clean exit 0; tampered sim, CRLF-converted .md, unlisted extra file, deleted pinned file, emptied SHA256SUMS, `..` row → exit 1; __pycache__ ignored; ECONOMY_VENDOR_DIR ignored outside vitest with a warning |
| ADR M3-ECON-1 spot-check | PASS. --strict compares data/economy.csv only with product/economy.csv (scripts/check-economy-copy.mjs:18), no alternate file; product/economy.csv is now 57d964d5 LF = data/economy.csv; F1 data vs pre-F1 product fails as the ADR states; CSV raw-byte compare matches the LF rule |
| .gitattributes keeps files LF on checkout | **FAIL (Minor)**, see below |

**Minor, .gitattributes covers only `*.csv`:** in a scratch clone checked out with `core.autocrlf=true`, the CSVs stay LF (0 CR lines). The vendored sim files get CRLF: economy_sim.py 466 CR lines, seller_variance_sim.py 496, seller-variance-proposal.md 37. `check-vendor-pins` then fails all three pins (92d78416 != eddf945d, a39440df != 560ea73b, 89d52c12 != 17877b41), so `npm run test:slow`/`npm test` would be red on any Windows/autocrlf checkout. Linux CI is unaffected. Fix: add `vendor/economy-sim/** -text` (byte-exact) or `vendor/economy-sim/** text eol=lf` to .gitattributes. git check-attr also shows SOURCE and SHA256SUMS as unspecified.

Note: my scratch product copy still had the pre-04:11 CRLF product/economy.csv (b294762e), so "match --strict" there exits 1. That is correct under the new raw-byte rule; the real product/ passes.

Not run: browser checks (no src/ change).
