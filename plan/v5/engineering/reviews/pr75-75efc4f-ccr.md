# PR #75 @ 75efc4f: VER-1d (fixes CCR m1 / N-c on #74). CCR review: **PASS** (0B/0M/0m/4n)

- PR https://github.com/PrincipalLewis/egg-farm/pull/75, head `75efc4fff2d5713a512346004b3fb6d4f2240b22`, base main `9a5aaf13` (#74 merged at 01:22 CET). Merge-base = 9a5aaf1. One commit.
- Reviewer: Claude Code Reviewer, read-only, own detached worktree. Review ran 02:01–03:15 CET and was interrupted once at about 02:50 CET (no reboot). Evidence was in /workspace/.pr75-ev, now removed; repro scripts are kept as pr75-75efc4f-ccr-*.txt.
- The Architect's self-review (pr75-75efc4f.md) and mutant log (ver1d-75efc4f-mutants.out.txt) were read as data only. Every number below was re-measured.

## 0. File list
`git diff --stat 9a5aaf1 75efc4f`: scripts/README.md +4/-2, scripts/verify.ts +32/-13 (net), tests/verify.test.ts +114. That is 3 files, as claimed. No src/, data/ or .github/ diff.

## 2. Build id derivation
scripts/build-id.ts:13-19. The id is `git rev-parse --short HEAD` + `+dirty` if `git status --porcelain` lists any non-ignored path. Vite's `vite.config.ts.timestamp-*` is ignored by both .gitignore and IGNORED_DIRTY. It is not time- or mtime-based, so clock granularity plays no part.

## 1. Test hooks: VERIFY_OUT_ROOT and VERIFY_TEST_THROW=after-shot (sandbox done)
- Code:
  - `OUT_ROOT` = `resolve(VERIFY_OUT_ROOT)` (path-resolved against cwd, not realpath'd) or `<repo>/verify-out` (scripts/verify.ts:33).
  - It is used only for the HEAD-id default dir (:55) and the html-id default dir (:79). `--out` is unaffected.
  - `after-shot` hook (:130): it writes a stand-in png and then always throws.
- bwrap, tmpfs `/`, scratch clone at /repo, decoys (verify.json/png, decoy.json, verify.json.bak, verify.png.old, package.json.copy) in /, /work, /target, /victim and the id dirs. Hashed listings were compared before and after each case. Script: pr75-75efc4f-ccr-sandbox-cases.sh.txt.
- 14 cases:
  - `VERIFY_OUT_ROOT=/` (no id dir / id dir / full run)
  - `..` (usage / full)
  - symlinked root
  - symlinked verify.* files
  - id dir that is a symlink
  - empty value
  - after-shot with `--out /` and with `OUT_ROOT=/`
  - `VERIFY_TEST_THROW=yes`
  - build-id traversal
  - `OUT_ROOT=` repo root
- Results:
  - Only verify.json/verify.png in `<OUT_ROOT>/<id>/` ever changed. `/verify.json` and every decoy were untouched.
  - The symlinked files were unlinked and their targets kept.
  - An empty `VERIFY_OUT_ROOT` falls back to the default.
  - `VERIFY_TEST_THROW=yes` is inert (a normal run).
  - after-shot: exit 1, FAIL json (`stage:run`), the stand-in png removed.
- Neither hook can produce PASS or exit 0. The after-shot hook throws unconditionally, and `VERIFY_OUT_ROOT` changes only where the report goes, not what it says.
- Gating: the hooks are env-only. No workflow or package.json script sets any `VERIFY_*`; verify-smoke.yml passes only `HOURS`.
- If a user sets one by accident:
  - `VERIFY_TEST_THROW=1|after-shot`: always exit 1, FAIL. Any other value is inert.
  - `VERIFY_OUT_ROOT`: the default-dir report lands under that dir instead of verify-out/. It is not recorded in verify.json (unlike VERIFY_HTML), which is a harmless location change.
  - `--out` (which CI uses) is unaffected.
- Documented as test-only: README:94 lists both with "(tests: …)" next to VERIFY_HTML / VERIFY_TEST_SKIP_MARKER. Code comments at verify.ts:31-32 and :128-129 say the same.
- **Out-root escape (V13, pre-existing, not widened by this PR):** the html-id default dir is `join(OUT_ROOT, buildId)` with `buildId` read from the html's `<meta name="build-id">` (:79).
  - A hostile html (`content="../../victim"`, via VERIFY_HTML or a tampered dist-html with `--skip-build`) makes verify create `<OUT_ROOT>/../../victim/` and write verify.json there.
  - It still only touches verify.json/verify.png. Before #75 the same happened relative to `<repo>/verify-out`. Observation O-1.
- An id dir that is itself a symlink (V8) is written through. That matches `--out` to a symlinked dir (#74 C4); only verify.* are touched.

## 3. N-c guard (scratch clone; out dirs under the evidence dir; 0555 out dir unless noted)

| Case | Exit | stderr |
|---|---|---|
| usage `--hours 0` | **2** | the usage message, then one line `verify: could not write the FAIL report (<dir>): EACCES: …; exit 2 and the original error are kept`; no stack |
| unavailable profile | **2** | the same one line, exit 2 kept |
| real tsc break (`src/main.ts` type error) | **3** | `FAIL build (npx tsc --noEmit) exited 2` + one line, exit 3 kept |
| `VERIFY_TEST_THROW=1` | 1 | one line + the **original** `Error: VERIFY_TEST_THROW…` stack (7 frames) |
| full run, `--flags m4.enabled=0` (would be exit 4) | 1 | the full-report write (:154) is not guarded, so EACCES is an uncaught error, exit 1, with stack. It is non-zero and visible, and outside N-c's scope (O-2) |
| `<out>/verify.json` is a dir + usage / + full run | 1 | the **clear step** (claimOut rmSync) throws ERR_FS_EISDIR before parsing. That is the original error and its stack is shown; the writer line follows. The inner file is kept, verify.png removed |
| 0555 dir with a stale verify.png | 1 | the clear step's EACCES unlink is the original error (stack shown) + writer line |

- The writer never throws. Both catch blocks (:172, :176) call `writerFailed`. The catch at :181-184 always rethrows and the normal path sets `process.exitCode = code` (:186-187), so exit 0 can't come out of a failure.
- **The log line is not free of absolute paths** (N-1): `writerFailed` (:162-163) applies `sanitize()` (repo root → `.`, home → `~`, user, host) but not the `leaks()` redaction. The dir name and the fs error message (`open '/workspace/.pr75-ev/nc/ro-usage/verify.json'`) are printed absolute when the out dir is outside the repo and home. See N-1. The line has no stack and no secrets.

## 2. Build-id race in tests (b) M28/M29 and (d) M33
- What causes it:
  - The id is git sha + porcelain dirtiness (build-id.ts:13-19). There is no time component, so clock granularity and cold runners don't matter.
  - The race needs the worktree's dirtiness to flip between the test's `gitBuildId(ROOT)` (tests/verify.test.ts:164 and :194/:198) and the child's own call (verify.ts:55).
  - Nothing in the suite does that: no test writes non-ignored files into the repo, and test (a) copies the repo out to tmp. Vite's `vite.config.ts.timestamp-*` is ignored by both .gitignore and IGNORED_DIRTY. CI checks out clean and nothing writes into the tree.
- Provoking it (the 3 tests (b), (d) and SIGKILL, `-t "M28/M29|M33|M17/M18/M19"`):

| Run | Conditions | Failures |
|---|---|---|
| A | 40×, maxWorkers=2, idle | **0/40** |
| B | 40×, maxWorkers=8, plus 8 busy loops (one per core) | **0/40** |
| B2 | 40×, as B, re-run | **0/40** |
| C | 3 loops of 15 in parallel, maxWorkers=8, while the full suite ran at maxWorkers=8 | **0/45**; the full suite under that load passed 1558 + 1 skipped |

- **Total 0/165.**
- Forced: in a throwaway clone, an external loop created and deleted an untracked `FLIP.tmp` every 20 ms. Then **15/30** runs failed (`<root>/m4.1+75efc4f[+dirty]/verify.png: expected true to be false`). That confirms the mechanism. It needs someone writing into the worktree during the test.
- **Severity: Nit (N-2).** There is no CI risk. Locally it can flake only if files in the tree are saved or created while verify.test.ts runs. A fix that removes the race: seed both `<id>` and `<id>+dirty` under VERIFY_OUT_ROOT and assert on whichever the child claimed, or have the child log the dir it claimed.

## 5. Test hygiene (worktree run of tests/verify.test.ts, /tmp listed before and after)
- **Worktree:** `git status --porcelain` is empty after every run (single run, 165 race iterations, full suites). No process is left: `pgrep vite-node` gives 0 after the run, and the SIGKILLed child is reaped.
- **Stray temp dirs (N-3):** each run of tests/verify.test.ts leaves **9 `/tmp/v1d-*` dirs**, KB-sized, with the seeded decoy.json / FAIL verify.json / old.html. The box already held 351 of them from earlier runs.
  - Only the tsc-break copy is removed (tests/verify.test.ts:160), and only when its assertions pass: it isn't in a `finally`, so a failing run also leaks a ~full-repo copy.
  - The other `tmp()` dirs (tests/verify.test.ts:131) are never removed. The 0555 dir is restored to 0755 in a `finally` (:230) but not deleted.
  - The older `v-*` dirs (15 per run) come from pre-existing tests, not this PR.
- **Time:** the 7 new tests take about 10.2 s (tsc break 4.8 s, after-shot 2.7 s, the others 0.4–0.9 s). tests/verify.test.ts goes from 37.5 s (#74) to about 46 s, and the full suite is about 209 s at maxWorkers=2.

## 6. Determinism
- 24 h seed 1: det1 and det2 (worktree) and det3 (fresh clone) are **byte-identical**.
  - JSON `17f1a37b18425d45…065b`
  - PNG `735e78490c816d72…2f7e`
- The json says PASS, `m4.1+75efc4f`, dirty false, trace **2c0d3ec3**, goldens **f90d1678 / a54c9cf9**.
- The PNG shows **"All upgrades done!"**, **+$2.8K/s**, $210.7M and the label "Egg Farm m4.1+75efc4f".
- The local 1 h run equals the CI artifact byte for byte (JSON `07dadd5b…`, PNG `797b1454…`, trace 198992ff078e).

## 7. Leaks
- gitleaks v8.21.2 (re-downloaded):
  - `git --log-opts=9a5aaf1..75efc4f`: no leaks.
  - `dir` on the sandbox outputs and the N-c outputs: no leaks.
- The added-lines grep (ghp_/github_pat/GITHUB_TOKEN/Bearer//home//Users//workspace/e-mail) finds 0 hits.
- FAIL json reasons stay redacted as in #74. The only path exposure is the stderr line in N-1.

## 4. m1 closed: mutants (scratch clone; each = `verify --hours 1 --skip-build` + `vitest run tests/verify.test.ts`, 43 tests; killed = tests fail)
- My #74 harness, run unchanged: all regexes still apply. M22 deletes one line; every other mutant is a 1-for-1 line swap.
- Added: the Architect's NC1/NC2 and 5 new mutants of my own. Script and output: pr75-75efc4f-ccr-mutants.sh.txt / -mutants.out.txt.
- **My 8 former survivors are all killed now:**

| Mutant | Tests failed |
|---|---|
| M17 clear no-op | 2 |
| M18 clear json only | 1 |
| M19 clear png only | 2 |
| M27 writeEarly keeps png | 1 |
| M28 default dir not cleared | 1 |
| M29 default dir not written | 1 |
| M31 real build failure exits 1 | 1 |
| M33 html dir not claimed | 1 |

- **The Architect's set (M1–M34 + NC1/NC2): 34/36 killed.** That matches their log. Both survivors are equivalent:
  - **M34** (no mkdir of `--out` before parse): writeEarly :175 and :80 mkdir anyway, as found on #74.
  - **NC2** (rethrow in the report-text catch, :172): not reachable. Nothing in :168-171 can throw: `git()` returns '' on failure, `sanitize` catches userInfo, the leak regexes are constant, and JSON.stringify gets plain strings and numbers.
- **My new mutants:**

| # | Mutant | Result |
|---|---|---|
| NC3 | writerFailed logs nothing (:162-163) | killed (2) |
| NC4 | writerFailed line not sanitised (:163) | **survived**. Not equivalent: an out dir under the repo or home would print absolute. Tests use /tmp dirs, where sanitize is a no-op anyway (see N-1) |
| NC5 | `break` after the first bad dir (:176) | **survived**. Not equivalent: with two claimed dirs (HEAD-id dir + html-id dir under `--skip-build`), a failure in the first would skip clearing the second's png. No test has two claimed dirs where one fails. Narrow (N-4) |
| H1 | VERIFY_OUT_ROOT ignored (:33) | killed (2) |
| H2 | after-shot hook skips writing its stand-in png (:130) | **survived**. The M27 test (tests/verify.test.ts:201-208) never checks that the stand-in existed before removal. Its png assertion is already met by the clear step, so the test passes without proving anything if the hook stops writing. M27 is still killed today because it removes the writeEarly rm; with H2 applied as well, a regression would go unseen (N-4) |

- **Overall 36/41 killed. Of the 39 non-equivalent mutants, 36 are killed.** The 3 non-equivalent survivors (NC4, NC5, H2) are test-strength nits, not product defects.

## 8. Gates and CI
- Gates in my detached worktree:

| Gate | Result |
|---|---|
| tsc --noEmit | 0 |
| vitest run 1 | **1558 passed, 1 skipped** (115 files), 209 s |
| vitest run 2 | 1558 passed, 1 skipped, 586 s (under mutant load) |
| vitest run 3 | 1558 passed, 1 skipped, 208 s |
| vitest under maxWorkers=8 + 3 parallel loops | 1558 passed, 1 skipped |
| test:slow | **16 passed, 1 skipped** |
| build | 0 (check-release-build ok) |
| check-globals | 0 (3/3 PASS) |

  - vitest flakes across all runs: **0**.
  - `git status` is clean after the gates.
- CI on 75efc4f, read with `gh api` (60 s timeout). The PR is OPEN, not a draft:

| Check | Run / check id | Result | Completed |
|---|---|---|---|
| verify-smoke | run 40612383261 (check 122566787756) | **success** | 02:01 CET |
| ci / gate | run 40612383195 (check 122566787296) | **success** | 02:15 CET |
| release-globals | — | skipped | — |

  - The CI artifact (downloaded with a 120 s timeout) is byte-identical to my local 1 h run.

## Findings
No Blocking, Major or Minor findings. Nits:

### N-1. The writer-failure stderr line can print absolute paths
- File: scripts/verify.ts:162-163 (`writerFailed`).
- Cause: the line gets `sanitize()` (repo → `.`, home → `~`, user, host) but not the `leaks()` redaction used for the json.
- Repro: 0555 out dir under /workspace/… with `--hours 0` prints `verify: could not write the FAIL report (/workspace/.pr75-ev/nc/ro-usage): EACCES: permission denied, open '/workspace/.pr75-ev/nc/ro-usage/verify.json'; exit 2 and the original error are kept`.
- Impact: stderr only, no stack, no secrets. The same paths already appear in node's own crash stack. In CI the out dir is `./verify-out/ci`, so it would print sanitised.
- Fix (optional): apply `leaks()` redaction to the line, or print `relative(process.cwd(), dir)`.

### N-2. Tests (b) and (d) can flake if the worktree's dirtiness flips mid-test
- Files: tests/verify.test.ts:164, :194, :198, against scripts/verify.ts:55.
- Not reproducible under normal or heavy load: 0/165 runs, plus 3 full-suite runs and a full suite at maxWorkers=8, all clean.
- Forced with an external writer creating and deleting an untracked file every 20 ms: 15/30 failed. There is no CI risk. See check 2 for the fix.

### N-3. The new tests leak temp dirs (9 `/tmp/v1d-*` per run), and the tsc copy leaks on a failed run
- Files: tests/verify.test.ts:131 (`tmp()` never removed) and :160 (`rmSync(copy)` not in `finally`).
- Repro: list /tmp before and after `vitest run tests/verify.test.ts` and you get 9 new `v1d-*` dirs. This box has accumulated >1,600.
- Fix: track the dirs and remove them in `afterAll`, and put the copy removal in `finally`.

### N-4. Three non-equivalent test-strength survivors
- **NC4** (:163): the log isn't checked for sanitisation.
- **NC5** (:176): no case where one of two claimed dirs fails.
- **H2** (:130 / tests :201-208): the M27 test doesn't prove the stand-in png existed. Asserting `readFileSync` of the png inside a hook-only run, or checking stderr, would close it.
- None affects shipped behaviour.

### Observations
- **O-1** (pre-existing, not widened): a hostile `<meta name="build-id">` (`../../x`) in a `--skip-build`/VERIFY_HTML html moves the html-id default dir outside VERIFY_OUT_ROOT or verify-out (sandbox V13). Only verify.json/png are touched. A cheap hardening would be `/^[\w.+-]+$/` on buildId before `join` (:79).
- **O-2:** when the full report itself can't be written (read-only out dir on a run that would exit 4), the unguarded write at :154 gives an uncaught error and exit 1 with a stack, not 4. It's non-zero and visible, and outside N-c's scope.
- **O-3:** with `<out>/verify.json` a directory, any invocation exits 1 at the clear step (claimOut rmSync, ERR_FS_EISDIR) before args are parsed. That is the true original error, and the brief's "verify.json as a dir + usage 2 / build 3 / mid-run throw" all collapse to it. Exit-code preservation for 2/3/1 was shown with a 0555 out dir instead (check 3).
- **O-4:** the VER-1d row in m4.1-backlog.md matches the PR. Claims checked: 3 files, 0 src/data/workflow diff.

## Verdict: **PASS**. 0 Blocking / 0 Major / 0 Minor / 4 Nits (N-1…N-4) / 4 observations
- m1 from #74 is closed: all 8 former survivors are killed.
- N-c is closed: the exit code and the original error are kept, and the writer never throws.
- The test hooks can't produce a PASS and don't widen what is deleted.
- Determinism, leaks, gates and CI are all green.
- Claude calls used: 0/15.
