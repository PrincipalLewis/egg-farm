# CCR delta re-check: PR #66 a8ff301..8c568b0 (`rc0/check-globals guard: CCR #66 delta m1 + n1/n2/n3/n5`)

Reviewer: Claude Code Reviewer (read-only). Date: 2026-10-23 (Europe/Belgrade).
Worktree: /workspace/review-pr66-f8ba53c, detached at 8c568b0, with npm ci. Claude calls: 0/5 (PASS_ID pr66-delta-8c568b0); the scope was small and every claim was reproduced directly.
Prior reports: reviews/pr66-f8ba53c.md and reviews/pr66-delta-a8ff301.md.

## Scope
- **Delta:** one commit, 3 files, +114/−14: scripts/serve-own.mjs, scripts/rc0-browser.mjs and tests/serve-own.test.ts.
- **Against merge-base dd223f5 (origin/main):** 4 files, +195/−25, all under scripts/ and tests/. Nothing changed in src/, data/, config, golden or CI.
- **Release build is unaffected:** `npm run build` passes all 6 check-release-build checks, with build-id `m3-rc1-pre+8c568b0` (clean). The tree was still clean after npm ci, the builds and npm test.
- **Ports:** I used 4371–4385. All repros, mutants and servers are cleaned up (details at the end).

## Fix verification

| Prior finding (a8ff301 report) | Status | Evidence |
|---|---|---|
| m1: signal during startup leaks vite | **FIXED** | `children` set filled right after spawn (serve-own.mjs:12-18). `serveForRun` stop also calls `stopAllChildren()` (:86-88). S-matrix: 0 vite and 0 listeners left at every delay. |
| n1: ALLOW_DIRTY too coarse | **FIXED** | A `+dirty` build on a clean tree is always refused (:59). No-git now needs `ALLOW_NO_GIT=1` (:68-75), and ALLOW_DIRTY no longer skips it. See R2-dirty+ALLOW_DIRTY, F4, R8b and R8c. A WARNING prints the working-tree m4.enabled (:78-79). |
| n2: workflow undocumented | **FIXED for rc0** | `--help` prints PORT, ALLOW_DIRTY, ALLOW_NO_GIT and the flag-off recipe (rc0-browser.mjs:2-8,13). The hint now names untracked files (:55). The release-globals header still says nothing (n1 below; the PR lists this as a known gap). |
| n3: tests cover only pure functions | **FIXED** | 15 tests (+8): freePort restored, a default-port source pin, a real-git dirty/no-git wiring test, subprocess PORT=abc and no-npx tests, and a startup-SIGTERM test. The mutants are below. |
| n5: no spawn `'error'` listener | **FIXED** | serve-own.mjs:17,22,24. See R9, R9b and R9c. |
| n4: content-based ownership | unchanged, as declared | R2-same exits 0 (benign). |

### Signal matrix (rc0, explicit PORT, kill after d seconds)

| Signal at d | Port | Exit | vite / listener / new Chrome after |
|---|---|---|---|
| TERM 0.3 s (before spawn) | 4371 | 143 | 0 / 0 / 0 |
| TERM 0.8 s (vite spawned, not listening) | 4372 | 143 | 0 / 0 / 0 |
| TERM 1.5 s (listening, serveOwn pending) | 4373 | 143 | 0 / 0 / 0 |
| TERM 3 s (serveForRun returned) | 4374 | 143 | 0 / 0 / 0 |
| INT 0.8 s | 4375 | 130 | 0 / 0 / 0 |
| INT 3 s | 4376 | 130 | 0 / 0 / 0 |
| TERM 12 s (mid-run, browser up) | 4377 | 143 | 0 / 0 / 0 |
| HUP 3 s | 4385 | 1 (Playwright's SIGHUP handler, then the `exit` hook) | 0 / 0 |

**Process-group safety.**
- Each vite pgid equals its own spawn pid: 1145868, 1145936, … These differ from the rc0 node's pgid (1145793, the same as my shell's).
- `detached: true` makes each `npx` a new group leader, so `kill(-pid)` reaches only npx, its vite child and esbuild. It can't reach the parent, the shell or another agent's processes.
- Only pids recorded in `children` (or the local `srv`) are ever signalled, and only when `srv.pid` is set (:14,18,19).

### Dirty / git / PORT / spawn matrix (ONLY=pt1 where it got past the guard)

| # | Case | Result |
|---|---|---|
| R1 | own dist-qa with a stale id, PORT=4381 | exit 2, "is not HEAD 8c568b0" |
| R2 | foreign http.server on 4381: unrelated / stale copy / `+dirty` copy / exact copy | exit 2 / exit 2 / exit 2 ("+dirty build but the tree … is clean") / exit 0 (benign) |
| R2' | foreign `+dirty` copy, clean tree, ALLOW_DIRTY=1 | **exit 2** (old F4 is now refused) |
| R5 / R5b | clean build plus an untracked file / same with ALLOW_DIRTY=1 | exit 2 / exit 2; the hint names untracked files |
| R6 / R6c | PORT=abc rc0 / check-globals | exit 2, one line |
| R6b | PORT=0 | exit 2, "not a port number" (n2 below) |
| R7 | stale dist via `npm run check-globals` | exit 2, one line |
| R8 / R8b / R8c | no git (`GIT_DIR=/nonexistent`) / + ALLOW_DIRTY=1 / + ALLOW_NO_GIT=1 | exit 2 / **exit 2** / WARNING, exit 0 |
| R9 / R9b / R9c | PATH with only node (no npx): rc0 on a free port / check-globals / rc0 PORT=4381 | exit 2 each: `cannot start vite preview (ENOENT spawn npx ENOENT)`, no stack, nothing left running |
| F1 | **real flag-off**: m4.enabled=0, build:qa → `+8c568b0+dirty`, rc0 default | exit 2 |
| F2 | same, with ALLOW_DIRTY=1 | WARNING `m4.enabled=0`, 6/6, exit 0 |
| F3 / F4 | balance.json reverted, not rebuilt / same with ALLOW_DIRTY=1 | exit 2 / **exit 2** |
| --help | `node scripts/rc0-browser.mjs --help` | prints the usage block, exit 0 |

### Mutation check (scratch copy /tmp/pr66-mut2; no worktree edits; baseline 15/15)
- **Killed:** 16 of 17. The kill counts are failing tests out of 15.
  - M1 drop +dirty refusal (1)
  - M2 drop clean-on-dirty refusal (2)
  - M4 hash check always true (1)
  - M5 ALLOW_DIRTY ignored (1)
  - M6 no IGNORED_DIRTY (1)
  - M7 parsePort fail-open (3)
  - **M11 dirty=false wiring (1)**
  - **M12 git failure fails open (1)**
  - **M13 serveForRun exits 0 (3)**
  - M14 children never recorded (1)
  - M15 serveForRun stop skips stopAllChildren (1)
  - M16 no spawn error listener (1)
  - M17 +dirty on a clean tree allowed with ALLOW_DIRTY (1)
  - M18 ALLOW_DIRTY skips no-git (1)
  - M19 `kill(pid)` instead of `kill(-pid)` (1)
  - M20 no SIGTERM handler (1)
- **Survived:** only M10 (unanchored id regex), which is effectively equivalent.
- This matches the author's 17/18 (/workspace/wt-ui-shots/gates-rc0-8c568b0/mutants-rerun.out).
- M14, M15, M19 and M20 leaked vite in /tmp/pr66-mut2 by design. I killed those groups.

## Findings
**Blocking 0, Major 0, Minor 0, Nit 5.**

**n1 (Nit, known gap per the PR): release-globals header undocumented.** scripts/release-globals-browser.mjs:1-3.
- The header doesn't mention PORT / ALLOW_DIRTY / ALLOW_NO_GIT, and there's no `--help`.
- Only `rc0-browser.mjs --help` documents them. CI is unaffected because it uses a clean tree and no env.

**n2 (Nit): `PORT=0` is now rejected.** scripts/serve-own.mjs:40-42.
- f8ba53c's release-globals comment documented "0 = free port". `PORT=0` now exits 2 ("not a port number"), while unset and empty both still mean a free port.
- No caller uses PORT=0 (grepped scripts, tests, package.json, CI and the studio engineering/qa docs).
- Accepting 0 as a free port, or saying "unset/empty" in the message, would remove the surprise. The message does already say "unset it for a free port".

**n3 (Nit): the startup-SIGTERM regression test never runs in CI.** tests/serve-own.test.ts:100-110.
- It is `it.skipIf(!existsSync('dist-qa/assets'))`, and CI's `unit` job runs no `build:qa`, so the m1 guard only runs locally.
- The spawn-failure and PORT=abc subprocess tests do run in CI.

**n4 (Nit, theoretical): dead children stay in the set.** scripts/serve-own.mjs:12-14.
- A vite that dies by itself after `serveOnce` returned (a mid-run crash) stays in `children`. At exit, `kill(-pid)` targets its old pgid.
- That only matters if the pid has been reused as a new group leader. It is negligible; deleting on the child's `'exit'` event would close it.

**n5 (Nit, carried): ownership is content-based.** serve-own.mjs:22-27. A foreign server serving the identical build passes (R2 exact copy). It's benign and unchanged, as declared.

## Gates (8c568b0, my worktree)
- tsc --noEmit: OK
- npm test (vitest): **993/993**, 86 files. serve-own went from 7 to 15 tests, and the startup-SIGTERM test ran because dist-qa was present.
- flag-off + golden: **6/6**. The f90d1678 / a54c9cf9 golden files are untouched.
- npm run build (check-release-build 6/6 ok): OK. build:qa: OK. Both ids are `m3-rc1-pre+8c568b0`, clean.
- check-globals chromium (free port 42689): **3/3**
- rc0 Chromium (free port 38651, AXE_PATH=/tmp/ccr-axe/node_modules/axe-core/axe.min.js): **348/348**, axe `[]`, exit 0. No vite left afterwards.
- I read the author's logs (/workspace/wt-ui-shots/gates-rc0-8c568b0/), and they agree with my independent runs.
- The orphan python server on 4331 flagged last pass is gone.

**Not run:**
- rc0 and check-globals on Firefox/WebKit.
- test:slow.
- d2-kill and tab-guard (the declared follow-up).
- "Dubious ownership" git; only a missing repo was tested.
- SIGKILL, which can't be handled.

**Cleanup:**
- No vite, python or Chrome processes of mine remain, and ports 4371–4385 are free.
- dist/ and dist-qa/ were rebuilt clean or restored, and balance.json was restored. `git status` is clean.
- /tmp scratch dirs (/tmp/pr66-mut2, /tmp/pr66e-*) hold only copies and logs.

## Verdict
**PASS: Blocking 0, Major 0, Minor 0, Nits 5.**
- Every finding from the a8ff301 pass is fixed: m1 plus n1, n2, n3 and n5. n2 is fixed for rc0; release-globals' header is the declared gap.
- Old n4 stays unchanged, as declared; it is carried here as n5.
- The guard now fails closed on stale, foreign, dirty-mismatch, no-git, bad-PORT and spawn-failure cases. The startup-signal leak is gone, and process-group kills are scoped to our own vite groups.
- The nits are optional and don't block the merge.
