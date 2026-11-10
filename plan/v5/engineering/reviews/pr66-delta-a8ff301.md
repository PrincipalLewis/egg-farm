# CCR delta re-check: PR #66 f8ba53c..a8ff301 (`rc0/check-globals guard: CCR #66 m1 + n2-n5`)

**Run details**
- Reviewer: Claude Code Reviewer (read-only).
- Date: 2026-10-22/23 (Europe/Belgrade).
- Worktree: /workspace/review-pr66-f8ba53c, checked out detached at a8ff301, npm ci.
- Claude calls: 1/5 (RECHECK=1, PASS_ID pr66-delta-a8ff301).
- Prior report: reviews/pr66-f8ba53c.md.

**Scope**
- One commit on f8ba53c, 4 files, +96/−42: scripts/serve-own.mjs, scripts/rc0-browser.mjs, scripts/release-globals-browser.mjs and tests/serve-own.test.ts.
- Against merge-base dd223f5 (= origin/main), the same 4 files change, +102/−32. Nothing in src/, data/, config, engineering/golden or CI changed.
- The release build is unaffected: `npm run build` passes all 6 check-release-build checks, with build-id `m3-rc1-pre+a8ff301` (clean). The tree is still clean after npm ci, build, build:qa and npm test, so CI's release-globals job (clean checkout, build, check-globals, no env) still gets build-id = HEAD.

## Fix verification

| Prior finding | Status | Evidence |
|---|---|---|
| m1: dirty state ignored | **FIXED** | `buildIdProblem` (serve-own.mjs:44-50) refuses a `+dirty` build unless ALLOW_DIRTY=1. It refuses a clean build on a dirty tree always, even with ALLOW_DIRTY. The JS `isDirty` copy matches build-id.ts, and a test pins the two together. See R2-dirty, R5, R5b, F1 and F3. |
| n2: check-globals exit 1 with a stack trace | **FIXED** | `serveForRun` (serve-own.mjs:68-78) prints one line and exits 2. See R6b and R7. |
| n3: PORT=abc silently ignored | **FIXED** | `parsePort` (serve-own.mjs:32-36) rejects anything outside 1..65535, so the script exits 2. See R6, R6b and R6c. |
| n4: server leak / no fetch timeout | **PARTLY FIXED** | 10 s `AbortSignal.timeout` on both fetches. `serveOnce` stops vite on any failure (:13-20). Exit and signal handlers stop vite mid-run (S1/S2). The startup window still leaks (new m1). |
| n5: no-git fail-open / cwd | **FIXED** | git runs in `srv.cwd` (:55). Any git failure is an error and exits 2 unless ALLOW_DIRTY=1 (R8, R8b). |
| n1: content-based ownership | unchanged, as the PR says | R2-same exits 0 (same bytes, benign). |

### Repro matrix (my own runs, not the PR's evidence)
- **Ports:** explicit-port cases ran on PORT=4337; the signal tests used 4337, 4339 and 4343.
- **4331 was occupied:** my first batch found a foreign `python3 -m http.server 4331` on 127.0.0.1. It is pid 909300, PPID 1, started 23:34, with its cwd set to `/tmp/rc0fp-r4/dist-qa (deleted)`. It's evidently left over from the PR author's R4 evidence run. rc0 correctly refused it 6/6 (exit 2, "not serving dist-qa"). **I left it running because it isn't mine**, and the author should kill it.
- **Cleanup:** every server I started was stopped, my ports are free, dist/ and dist-qa/ index.html are restored and rebuilt clean, balance.json is restored, and `git status` is clean.

| # | Case | Result |
|---|---|---|
| R1 | own dist-qa with a stale build-id (`+dd223f5`), PORT=4337 | exit 2, "is not HEAD a8ff301" |
| R2-unrelated | foreign http.server with unrelated HTML | exit 2, "not serving dist-qa" |
| R2-stale | foreign copy of our dist-qa with a stale id | exit 2, "is not HEAD" |
| R2-dirty (old R4) | foreign copy with `+a8ff301+dirty`, clean tree | **exit 2**, "+dirty build … set ALLOW_DIRTY=1" |
| R4b | same, with ALLOW_DIRTY=1 | exit 0 (opt-in) |
| R2-same | foreign exact copy | exit 0 (n1, benign) |
| R5 | clean build, tree dirty (untracked scratch file) | exit 2, "clean but the tree … is dirty" |
| R5b | same, with ALLOW_DIRTY=1 | exit 2 (as claimed) |
| R6 / R6b / R6c | PORT=abc rc0 / PORT=abc check-globals / PORT=99999 | exit 2 each, one line, no stack |
| R7 | stale dist/ via `npm run check-globals` | exit 2, one line |
| R8 | no git (`GIT_DIR=/nonexistent`) | exit 2, "git unavailable … Set ALLOW_DIRTY=1 to skip" |
| R8b | no git, with ALLOW_DIRTY=1 | warns, check skipped, exit 0 |
| F1 | **real flag-off**: balance.json m4.enabled=0, `build:qa` → `+a8ff301+dirty`, rc0 default | exit 2 |
| F2 | same, with ALLOW_DIRTY=1 | runs, 6/6 (ONLY=pt1) |
| F3 | balance.json reverted, flag-off dist-qa **not rebuilt** (the real m1 scenario) | **exit 2** |
| F4 | same as F3, with ALLOW_DIRTY=1 | exit 0 (n1 below) |
| S1 | SIGTERM mid-run (~35 s in) | exit 143; 0 vite, 0 listeners, 0 new Chrome processes left |
| S2 | SIGINT mid-run | exit 130; 0 vite, 0 listeners, 0 Chrome left |
| S3 | SIGTERM at 0.8 s (vite spawned, `serveOwn` not yet resolved) | exit 143, **vite left running on 4343** (pgid 976510, cwd = my worktree) → m1 |

### Mutation check of the 7 new tests
I ran these on a scratch copy (/tmp/pr66-mut) of serve-own.mjs, build-id.ts and the test, with no worktree edits. Baseline: 7/7.
- **Killed (1 failure each):**
  - drop the +dirty refusal
  - drop the clean-on-dirty refusal
  - let clean-on-dirty honour ALLOW_DIRTY
  - make the hash check always true
  - ignore ALLOW_DIRTY
  - drop IGNORED_DIRTY from `isDirty` (caught by the parity test)
  - make parsePort fail open (the old NaN → free port behaviour)
  - drop parsePort's range check
  - make an empty PORT an error
- **Survived:**
  - M10: unanchored id regex. This is effectively equivalent.
  - M11: `expectHeadBuild` passes `dirty=false`.
  - M12: a git failure fails open.
  - M13: `serveForRun` exits 0 on failure.
- M11–M13 are wiring, which none of the 7 tests reach. My repros (R5, R8, R6/R7) cover them at runtime. See n3.

### Flag-off workflow
- The flag-off gates are vitest (tests/m4a-flag-off, engineering/golden/flagoff-golden). They force `enabled: 0` in code, so they need no dirty tree and are unaffected: 6/6.
- No repo script builds a flag-off browser bundle. A manual flag-off rc0 (dirty balance.json) now needs `ALLOW_DIRTY=1` (F1/F2).
- ALLOW_DIRTY is documented only in serve-own.mjs:42-43/53, the rc0-browser.mjs header (:10-11) and the error text. See n2.

## Findings
Blocking 0, Major 0, Minor 1, Nit 5.

**m1 (Minor): a signal during server startup still leaks a detached vite.** serve-own.mjs:68-73 (handlers :70-71; `srv` set only at :73), spawn at :11 (`detached: true`).
- The claimed n4 fix ("vite closed on every exit path including SIGTERM") misses the window between spawn and `serveOwn` resolving. The handler's `stop()` is `srv?.stop()` and is a no-op there. The window is normally ~0.5–2 s, but up to 80 probes plus 3 free-port retries when slow.
- **Repro S3:** `PORT=4343 node scripts/rc0-browser.mjs & sleep 0.8; kill -TERM $!` gives exit 143, but `npm exec vite preview … --port 4343` and its node child stay listening. The next PORT=4343 run at the same HEAD then silently uses that leaked server.
- **Impact:** an orphaned server on a shared box. A same-HEAD reuse is benign; a different HEAD is refused loudly. No wrong-build pass.
- **Fix:** record the child in a module-level variable (or set) right after `spawn` in `serveOnce`, and have the exit/signal handlers kill it. I cleaned up my leaked server.

**n1 (Nit): ALLOW_DIRTY is coarse.** serve-own.mjs:47, :59.
- With ALLOW_DIRTY=1, a `+dirty` build on a now-clean tree passes (F4: a stale flag-off bundle after revert). A `+dirty` build is never current on a clean tree, so it could be refused even with the opt-in.
- ALLOW_DIRTY also doubles as the no-git skip (R8b). A separate `ALLOW_NO_GIT` would keep the two opt-outs from masking each other.
- ALLOW_DIRTY also can't tell a flag-off build from any other dirty edit; printing m4 on/off would help.

**n2 (Nit): the ALLOW_DIRTY workflow is undocumented outside code.**
- rc0-browser.mjs:1-2 still reads `npm run build:qa && node scripts/rc0-browser.mjs`, with no flag-off recipe. There is no README or package script for flag-off rc0.
- The clean-on-dirty error (serve-own.mjs:48) says only "rebuild". With an untracked scratch file, a rebuild produces `+dirty`, which then also needs ALLOW_DIRTY=1 (R5/R5b).
- Suggest one line in the rc0 header: "flag-off: set m4.enabled=0, build:qa, ALLOW_DIRTY=1 rc0; revert and rebuild after."

**n3 (Nit): the tests cover only the pure functions, and 2 tests were deleted.** tests/serve-own.test.ts.
- The old `freePort returns distinct bindable ports` test and the default-port source pin were removed (980 − 2 + 7 = 985). Nothing now pins "PORT unset = free port".
- Mutants M11–M13 survive.
- Suggest restoring the freePort test and adding one subprocess test: `PORT=abc node scripts/release-globals-browser.mjs` → exit 2.

**n4 (Nit, unchanged prior n1): ownership is still content-based.** serve-own.mjs:15-19.
- A foreign server serving an identical build passes (R2-same, and S3's leaked server). The PR leaves this unchanged, as it says; it's benign.

**n5 (Nit, pre-existing, from code reading only): no `'error'` listener on the vite `spawn`.** serve-own.mjs:11.
- If `npx` can't be spawned, that's an uncaught exception (exit 1 with a stack) rather than the one-line exit 2. I didn't reproduce it.

## Gates (a8ff301, my worktree)
- tsc --noEmit: OK
- npm test (vitest): **985/985**, 86 files. The PR's 7 new tests replace 2 deleted ones.
- flag-off + golden (tests/m4a-flag-off + engineering/golden): **6/6**. The golden f90d1678 / a54c9cf9 files are untouched.
- npm run build (includes check-release-build, 6/6 ok): OK. build:qa: OK. Both build-ids `m3-rc1-pre+a8ff301`, clean.
- check-globals chromium (free port 35891): **3/3**
- rc0 Chromium (free port 40091, AXE_PATH=/tmp/ccr-axe/…/axe.min.js): **348/348**, axe `[]`, exit 0. No vite left afterwards.
- PR evidence (/workspace/wt-ui-shots/gates-rc0-a8ff301/evidence.txt) was read; it agrees with my independent runs.

**Not run:**
- rc0 and check-globals on Firefox/WebKit.
- test:slow.
- d2-kill and tab-guard (the follow-up).
- Dubious-ownership git (only `GIT_DIR=/nonexistent` was tested).
- The n5 spawn failure.

## Verdict
**PASS: Blocking 0, Major 0, Minor 1 (m1 startup-signal leak), Nits 5.**
- m1 and n2–n5 from the first pass are fixed. n4 is fixed except for the startup window.
- The real flag-off stale-bundle scenario (F3) now exits 2.
- The release build and CI path are unaffected, and only scripts/ and tests/ changed.
- The new m1 is harness hygiene with no wrong-build pass. Fix it here or in the M4.2 harness follow-up; it doesn't block the merge.
