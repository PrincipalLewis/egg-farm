# PR #75 @ 75efc4f: VER-1d (CCR m1 / N-c on #74). Architect self-review

- PR https://github.com/PrincipalLewis/egg-farm/pull/75 (Draft), head `75efc4fff2d5713a512346004b3fb6d4f2240b22`, branch tools/verify-test-gaps off main `9a5aaf1`. Worktree /workspace/wt-ver1d.
- Files: scripts/verify.ts (+23/-9), tests/verify.test.ts (+114/-2 incl. imports), scripts/README.md (+4/-2). No src/, data/ or .github/ diff. Schema unchanged (4).

## Changes
- **N-c:** writeEarly no longer throws:
  - The report text is built in its own try/catch, and each out dir is handled in its own try/catch.
  - A failure goes to `writerFailed`, which logs one sanitised stderr line.
  - The call sites are unchanged. `code` and `throw e` survive, so CCR's M21/M22/M30 regexes still apply.
- **Test-only hooks:**
  - `VERIFY_OUT_ROOT` replaces `<repo>/verify-out` at both default-dir sites.
  - `VERIFY_TEST_THROW=after-shot` writes a stand-in png and then always throws, so it can never PASS.
  - Both are documented in scripts/README.md.

## Tests (7 new; all out dirs are mkdtemp; nothing is written to the worktree)
- (a) M31: the repo's tracked and untracked files (`git ls-files -co --exclude-standard`) are copied to a temp dir, with node_modules symlinked and a TS2322 appended to src/main.ts. Verify runs there without `--skip-build`. The test asserts TS2322 in stderr, exit 3, and a FAIL json with stage build. About 5 s.
- (b) M28/M29: VERIFY_OUT_ROOT/<gitBuildId(ROOT)> is seeded, and `--hours 0` must give exit 2, a FAIL json, no png, and the decoy kept. When the dir is absent, it is not created.
- (c) M17/18/19: an async spawn of `--hours 24`, SIGKILLed on the `verify: run 24 h` line. The test asserts the signal is SIGKILL, neither verify.* file remains, and the decoy is kept.
- (d) M33: VERIFY_OUT_ROOT/m4.1+0000000 is seeded, with the matching fake html, `--skip-build` and VERIFY_TEST_THROW=1. The test expects exit 1, a FAIL json stage run in that dir, and no HEAD-id dir.
- (e) M27: VERIFY_TEST_THROW=after-shot, which must leave no png.
- N-c EISDIR: verify.json is a dir. The test expects exit 1, the log line, the original ERR_FS_EISDIR on stderr, and the inner file kept.
- N-c EACCES: a 0555 out dir with a usage error must exit 2 and log the line. It is skipped under uid 0.

## Mutants (CCR's pr74 script, paths re-pointed to /workspace/.ver1d-mut, run unchanged + NC1/NC2)
- Files: `ver1d-75efc4f-mutants.sh.txt`, `ver1d-75efc4f-mut.sh.txt` and `ver1d-75efc4f-mutants.out.txt`.
- All 36 applied. **34 killed**: M1–M33 33/33 (the 8 former survivors are now killed) and NC1.
- Survivors:
  - M34: equivalent, per CCR.
  - NC2: the report-text catch rethrows. That path can't be reached without fault injection, because git() and sanitize() don't throw.
- Verify exit codes in the harness aren't meaningful (the mutated tree is +dirty).
  - Note: under M25 the existing N-b CLI test runs without `--skip-build`, so it builds dist-html in the scratch clone (seen in the M26 vlog). That only happens to the mutant sandbox, and it was the same in CCR's run.

## Gates (75efc4f)
- tsc 0. sync-economy --check up to date.
- vitest 1558 passed, 1 skipped (115 files).
- test:slow 16 passed, 1 skipped.
- build 0. check-globals 3/3 PASS (under flock .browser-test-2.lock).
- verify --hours 24: PASS, m4.1+75efc4f, clean.
  - Trace 2c0d3ec37be1…883d, goldens f90d1678 / a54c9cf9.
  - Label ok, PNG "All upgrades done!" +$2.8K/s.
- The added-lines grep for tokens, home paths and e-mails found 0 hits. gitleaks isn't installed on the box, so it wasn't run.

## Risks / notes
- (b) and (d) compute gitBuildId(ROOT) in the test. If another process changed the tree's dirtiness between the test's call and the child's, the dir name could differ. The window is sub-second.
- (a) runs `npm run -s build:html` in the temp copy (it isn't a git repo, so the id is `m4.1+unknown`, clean). It fails at tsc before any build output. If tsc ever passed, it would build only inside the temp copy.
