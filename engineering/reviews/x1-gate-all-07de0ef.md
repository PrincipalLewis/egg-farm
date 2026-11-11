# Review: X-1 scripts/gate-all.sh (PR #2 @ 07de0ef). Reviewer: Head of Engineering
Verdict: **CHANGES**

Scope: 2 files (scripts/gate-all.sh, package.json `gate-all` script). No workflow changes, so it uses no hosted Actions minutes. OK.
Coverage present: economy-copy, sync-economy --check, unit tests (TR-5 excluded), tsc, build + check-release-build, QA build, check-globals and rc0 per engine, TR-5 report-only (TR5_BLOCKING=1 makes it blocking). OK.
Run: `npm ci` was clean and Playwright is 1.64.1. The full gate run was interrupted at about 84s, so this review doesn't record a run. The Architect's 07de0ef run was green.

Findings:
1. **No node_modules / npm ci check.** After the box reboot, node_modules was missing and every gate failed with confusing npx errors. Add a preflight that exits 2 with "run npm ci" when node_modules is missing or older than package-lock.json, and check that the Playwright browsers are installed.
2. **Not fail-fast.** It's `set -uo pipefail` without `-e`, and `run` keeps going after a FAIL, so a red tsc still costs about 15 minutes of browser runs. Stop at the first blocking failure by default and offer `KEEP_GOING=1` for a full report. The exit code is non-zero on failure, which is correct.
3. **Dirty-tree check comes after the release build and only warns.** Move it before release-build and make it a FAIL (or SKIP the release gates) so the cause is clear.
4. **No flake policy.** There's no auto-retry, which is good, but the WebKit 375px 'no sideways scroll' flake was "fixed" by a manual rerun that the output doesn't record. Add an optional `RETRY_BROWSER=1` that does one rerun and reports `FLAKY  rc0-webkit (failed 1/2, log kept)`, with an exit code that marks the run not fully green. Never hide a retry.
5. `ls $TR5_GLOB` relies on word-splitting and globbing (and filenames can't contain spaces). That's fine, but print the TR-5 files that were picked up, so it's clear what "SKIP" means.
6. Gate order: run tsc before the unit tests. It's cheaper, which helps fail-fast.
7. Nit: the summary should include the engine list and the run's total time, and should keep logs under `/tmp/gate-all.*`. Document cleanup.

## Recheck @ a0da3e4 (code read only; no gates run because QA holds the lock and the box is under load). 21:40 CEST
Verdict: **APPROVE**

1. Preflight: FIXED. It checks node_modules, whether node_modules is older than the lockfile, the .bin tools and the per-engine browser executables. Exit 2 says "run npm ci".
2. Fail-fast: FIXED. `stop_if_failed` runs after every gate, and KEEP_GOING=1 gives a full report. Exit codes: 0 green, 1 red, 2 preflight failed, 3 flaky.
3. Clean tree: FIXED. It's checked before release-build and counts as a FAIL, and release-build is SKIPped.
4. Flake policy: FIXED. Retry is opt-in (RETRY_FLAKY/RETRY_BROWSER), runs once, reports `FLAKY` with the first log kept, and exits 3 (never green).
5. TR-5 transparency: FIXED. A SKIP prints the patterns it looked for, and a PASS/WARN lists the files.
6. tsc runs before unit: FIXED.
7. Summary/cleanup: FIXED. It shows the engines, total time and log dir, and the header documents `rm -rf /tmp/gate-all.*`. There's also an EXIT trap that kills only the script's own process tree.
CEO load rule: MET. Every browser step (including the retry) runs under `flock "$BROWSER_TEST_LOCK"` (default /workspace/egg-farm-studio/.browser-test.lock), and the lock wait is logged. vitest gets `--poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1` for both the unit run and TR-5.

Non-blocking nits:
- a. If the lock file's directory is missing, flock fails and that shows up as a gate FAIL rather than a preflight error. Add a `mkdir -p "$(dirname "$BROWSER_TEST_LOCK")"` to preflight.
- b. The FLAKY line leaves out the elapsed time and lock wait. It's cosmetic.
- c. /workspace/x1-gates5.out is empty (0 bytes, 21:18), so there's no run evidence for a0da3e4 yet. Get one green run once the lock is free, before merge.
