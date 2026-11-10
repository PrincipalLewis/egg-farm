# PR #26 (arch/m3-followups) review at f0bac9b (on top of 5aa5472, base main eb97a2a)
Reviewer: Claude Code Reviewer (read-only). Detached worktrees /workspace/wt-pr26 (5aa5472) and /workspace/wt-pr26f (f0bac9b), node_modules symlinked. Claude calls: 0.

## Verdict: APPROVE / PASS. No blocking or major findings. 2 minors, 2 nits.

## Gates (re-run at f0bac9b, code identical to 5aa5472)
- tsc OK; sync-economy --check OK (in npm test); build OK (release checks: version, no eggfarmUi, no QA hooks, globals ok)
- vitest: 515/516. The 1 failure was tests/idb-mirror.test.ts "Reset save clears the mirror (awaited)" under full-suite load, at both 5aa5472 and f0bac9b. It passed 12/12 in isolation 3 times. The PR doesn't touch that file, so this is a pre-existing flake (see m2).
- test:slow: check-vendor-pins 4/4, then 12 passed / 2 skipped
- check-economy-copy --strict: exit 0 (4 vendored files match; data/economy.csv == product/economy.csv)
- check-globals (PORT=5937, chromium): only eggfarmExportTelemetry. PASS. Note: PORT 4791 was refused by serveOwn because something else was serving on it. That failed closed, which is correct.

## 5aa5472..f0bac9b is doc-only
Only engineering/decisions.md (+2) and engineering/status.md (+1) changed. ✔

## Canonical = 57d964d5 vs F1 (#17) and the vendored pins
- data/economy.csv on main, product/economy.csv and /workspace/product (a symlink to the same folder) are all 57d964d5 (pre-F1). That is consistent today.
- The vendored pins don't conflict. SOURCE/SHA256SUMS pin `economy.f1-m4cols.csv` 86f0e80e to `product/economy.f1-m4cols.csv`, a separate file from the canonical one. The sim/*.py and proposal pins are unaffected.
- #17 does conflict, by design. Once #17 makes data/economy.csv 86f0e80e, `--strict` fails until Economy promotes 86f0e80e into product/economy.csv. The ADR says so explicitly, and `--strict` is a release-only gate, so merges aren't blocked. The ac7 and seller-variance suites accept both shas. Action: someone must own the promotion before the rc tag (see m1).

## Diff checks
- seller_variance.json: one line changed (`source` label). All numbers and shas (sim 560ea73b, proposal 17877b41, csv 57d964d5) are byte-identical. ✔
- F1-skip titles: title text only. __pycache__/ added to .gitignore. ✔
- No new product/ reads at runtime or build: src/ and vite config contain only comment references; product/ is read only by opt-in check-economy-copy. ✔

## Tamper runs
check-vendor-pins.mjs (copied to /tmp): clean 0; only-comment SHA256SUMS (empty pins) 1; malformed row 1; SHA256SUMS missing 1 (uncaught throw, non-zero); a pinned file missing 1; a pinned file modified 1; `..` in a path rejected. No fail-open found.
check-economy-copy (covered by the new tests plus the 8569fef matrix): duplicate-only now prints "duplicate (path, sha) row(s) ... 5 rows / 4 unique" without empty "sets differ" lists ✔; `product/..foo_economy_sim.py` is accepted ✔; `product/../economy_sim.py` is still rejected as "outside the product dir" ✔.

## Findings
- **m1 (minor): the LF rule is documented, not enforced.** engineering/decisions.md (04:11 bullet); scripts/check-economy-copy.mjs:64.
  The CSV comparison normalises BOM/CRLF, and the repo has no .gitattributes.
  Repro: `unix2dos` a copy of product/economy.csv, then run with ECONOMY_PRODUCT_DIR pointed at it and `--strict`. It exits 0 even though the sha differs (b294762e happened exactly this way).
  Also, a CRLF checkout of data/economy.csv (Windows autocrlf) changes its sha. The ac7 suite's "economy CSV sha is known" check would then fail, which fails closed but is confusing.
  Suggested fix: in `--strict`, compare raw sha256 of data/economy.csv vs product/economy.csv, and add `.gitattributes` with `*.csv text eol=lf` (plus vendor/** -text or eol=lf so the pins hold). Note that .gitattributes can't cover product/, which is outside the repo; only the raw-sha check can.
- **m2 (minor, pre-existing, not this PR): idb-mirror "Reset save clears the mirror" is flaky under full-suite load.** tests/idb-mirror.test.ts.
  Repro: `npx vitest run` (full suite, default forks) failed 2 of 2 runs; it passes in isolation. This makes the "516/516" gate claim unreliable on a loaded box. Hand to Saves.
- **n1 (nit):** check-vendor-pins.mjs:7 — a missing SHA256SUMS surfaces as an uncaught stack trace rather than an "ERROR" line. The exit code is still non-zero.
- **n2 (nit):** check-vendor-pins.mjs:9 — it checks only listed files. An unlisted extra file under vendor/economy-sim/ (e.g. a new .py the sim imports) isn't flagged here. `--strict` also only walks SOURCE. Consider failing on unlisted files except README/SOURCE/SHA256SUMS.
- Note: main has moved to 4608a4f since the base eb97a2a. Re-check after the main-forward if it is non-trivial.
