# CCR review: PR #66 `rc0: default to a free port (CCR n-d)` @ f8ba53c

Reviewer: Claude Code Reviewer (read-only). Date: 2026-10-22 (Europe/Belgrade).
Worktree: /workspace/review-pr66-f8ba53c (detached, npm ci). Claude calls: 1/15 (PASS_ID pr66-f8ba53c).
Scope: my nit n-d from reviews/pr62-delta-09cee47.md. rc0 defaulted to fixed port 4181 and once served a stale foreign build.

## Delta
- **Size:** one commit on merge-base dd223f5 (= origin/main), 3 files, +23/−7.
- **Files:** scripts/rc0-browser.mjs, scripts/release-globals-browser.mjs, scripts/serve-own.mjs.
- **(e) Product code:** none changed. No src/, data/, engineering/golden, tests/ or config change (`git diff --stat dd223f5 f8ba53c`).

## Verification
**(a) Free port and TOCTOU.**
- `freePort()` (serve-own.mjs:7-8) binds 127.0.0.1:0, closes, then vite binds with `--strictPort`.
- If the port is grabbed in that gap, vite fails and the HTML-own-chunk check rejects the foreign page. `serveOwn` then retries on a fresh port, up to 3 times (:23-27).
- A foreign server can only get through if it serves our byte-identical entry chunk **and** a HEAD build-id. Then it is the same build, and losing that server mid-run fails loudly (connection refused), not silently.
- **Parallel runs:** 8 concurrent `serveOwn('dist-qa')` calls got 8 distinct ports, and all passed expectHeadBuild. check-globals got 38447/38759 and rc0 got 45869 while the #64/#65 reviews were running. No collision.

**(b) Explicit PORT is honoured and guarded.**
- PORT=4331 is used as-is (serve-own.mjs:22), and expectHeadBuild still runs (rc0-browser.mjs:13). Repros are below.
- Note n3: a non-numeric PORT silently becomes a free port.

**(c) expectHeadBuild.**
- It reads the served `<meta name="build-id">`, which vite.config.ts:13-16 sets from `gitBuildId()` = `m3-rc1-pre+<git rev-parse --short HEAD>[+dirty]`.
- It checks that `git rev-parse HEAD` starts with that hash (serve-own.mjs:33-38). This is a git sha, not a content stamp.
- `+unknown`, `+dev`, missing meta and foreign HTML all fail. A build from any other commit fails, even when only docs changed (over-strict, but safe).
- **It can false-pass on dirty state.** See m1. The M4 flag lives in src/config/balance.json (m4.enabled=1), so a flag-off browser build needs a dirty tree. The build-id carries no flag information, and the dirty marker is ignored.

**Repros on explicit PORT=4331. All servers were stopped afterwards, 4331 is free, and there are no leftover vite processes.**

| Case | Result |
|---|---|
| R1: own dist-qa with build-id rewritten to `+dd223f5` (stale) | rc0 **exit 2**: `served build-id "m3-rc1-pre+dd223f5" … is not HEAD f8ba53c` |
| R2: foreign python http.server serving unrelated HTML | rc0 **exit 2**: `port 4331 is not serving dist-qa … (vite exit null …)` |
| R3: foreign server serving a copy of our dist-qa with a stale build-id | rc0 **exit 2** (build-id mismatch) |
| R4: foreign server, copy with `+f8ba53c+dirty`, clean tree | **passes** (m1) |
| R5: foreign server, exact copy of our dist-qa | passes (same build, benign; n1) |
| R6: dist/ build-id stale → `npm run check-globals -- chromium` | **exit 1** with an uncaught-Error stack (n2) |

**(d) check-globals.** It still serves the real release `dist` through `serveOwn` (port was already 0 → free before this PR). `ALLOWED` and every check are unchanged; the only addition is `expectHeadBuild`. The checks are tighter, not looser. CI (ci.yml:38-41) builds and checks in the same checkout, so build-id = HEAD there.

**(f) Exit codes.**
- rc0: a preflight failure exits 2 (rc0-browser.mjs:12-13), and check failures set exitCode 1 (:19). rc0 has no npm script and isn't in CI.
- check-globals: a mismatch is an unhandled rejection, so it exits 1. npm and CI propagate it (verified via `npm run check-globals`).

## Findings
Blocking 0, Major 0, Minor 1, Nit 5.

**m1 (Minor): expectHeadBuild ignores the `+dirty` marker and current tree state.** serve-own.mjs:36-37.
- The regex captures `(\+dirty)?` but never compares it with the tree. A build made from a dirty tree (e.g. flag-off via balance.json m4.enabled=0) passes after the tree is reverted. A clean HEAD build also passes after uncommitted src/balance edits that were never rebuilt.
- **Effect:** rc0 can run a flag-off or uncommitted bundle while it reports `dist-qa m3-rc1-pre+<HEAD>` as verified. That is the "wrong build, silently" class n-d was about, narrowed to same-HEAD.
- **Repro R4:** serve a dist-qa whose meta is `m3-rc1-pre+f8ba53c+dirty` on a clean f8ba53c tree, then call `serveOwn('dist-qa',4331)` + `expectHeadBuild` → returns OK. Equivalent: flip m4.enabled, `npm run build:qa`, revert, run rc0 → exit 0 on the flag-off build.
- **Fix:** compare the build's `+dirty` with `isDirty(git status --porcelain)` from scripts/build-id.ts. Fail on `+dirty` unless e.g. `ALLOW_DIRTY=1`, as artux-shots.mjs:15 already refuses dirty builds. Print the id in check-globals too.
- **Not blocking:** this is test harness only, it was unchecked before this PR, and the release path (`npm run build` → check-release-build) already rejects `+dirty`.

**n1 (Nit): "foreign server" detection is content-based, not ownership-based.** serve-own.mjs:12-15.
- The first fetch hits whatever is already listening. Then the 300 ms wait usually ends before `npx vite` has failed on `--strictPort` (R2 shows `vite exit null`).
- A foreign server serving the same build (R5) is accepted, and rc0 then depends on that server's lifetime.
- It's benign (same bytes), but the comment's "page on that port is OUR build" overstates it. Re-checking `srv.exitCode` after the probe (or after ~1 s) would make it ownership-based.

**n2 (Nit): check-globals mismatch exits 1 with a stack trace, not 2 like rc0.** release-globals-browser.mjs:7.
- It's indistinguishable by exit code from a real globals failure. CI still fails correctly.
- **Repro:** R6.
- **Fix:** add `.catch(e => { console.error(e.message); process.exit(2); })`.

**n3 (Nit): non-numeric PORT is silently ignored.** rc0-browser.mjs:12, release-globals-browser.mjs:5.
- `+'abc'` is NaN, which is falsy, so a free port is used.
- **Repro:** `PORT=abc` → `serveOwn` picked 42399.
- **Fix:** exit 2 on `PORT` that isn't an integer.

**n4 (Nit): server leak on non-mismatch failures.** serve-own.mjs:33 and rc0-browser.mjs:13/797.
- If `fetch(srv.url)` rejects or hangs (no timeout), or anything throws after `serveOwn` (e.g. browser launch, a mid-run exception), the detached vite is never stopped. Only the mismatch path calls `srv.stop()`.
- This is pre-existing in rc0. Free ports now keep a leaked server from poisoning later runs.
- **Fix:** `try/finally { srv.stop() }` and `AbortSignal.timeout` on the fetch.

**n5 (Nit): the no-git path warns and passes.** serve-own.mjs:34-35.
- Any `git rev-parse` failure (including "dubious ownership") is treated as "no git", and the check is skipped. It can't happen in the CI checkout.
- **Fix:** consider failing unless `ALLOW_NO_GIT=1`.
- Also: `expectHeadBuild` takes its own `cwd` instead of reusing the one `serveOwn` got; store it on `srv`.

**Out of scope, as the PR says:**
- d2-kill (PORT 4720/port+1) and tab-guard (4740) keep fixed ports and don't call expectHeadBuild. These are the follow-up the PR notes.
- ~15 older one-off scripts (smoke.mjs 4174, perf-sm9 4176, artux-shots, ac14-browser, recovery-v11-browser, …) still spawn vite on fixed default ports. Worth folding into that follow-up.

## Gates (f8ba53c, my worktree)
- tsc --noEmit: OK
- npm test (vitest): **980/980**, 86 files
- flag-off + golden (tests/m4a-flag-off + engineering/golden): **6/6**. Golden f90d1678 / a54c9cf9 files untouched.
- npm run build (incl. check-release-build) OK; build:qa OK. Build-id `m3-rc1-pre+f8ba53c` (clean).
- check-globals chromium (PORT unset, free port 38447): **3/3**
- rc0 Chromium (PORT unset → 45869, AXE_PATH=/tmp/ccr-axe/…/axe.min.js): **348/348**, axe `[]`. 348 vs 354 on #62 is expected, because #62's +6 B3 checks aren't on dd223f5.

Not run: rc0 Firefox/WebKit, check-globals Firefox/WebKit, test:slow, d2-kill and tab-guard.

## Verdict
**PASS: Blocking 0, Major 0, Minor 1 (m1), Nits 5.** n-d is resolved: no fixed default port, an explicit PORT is honoured and guarded, and stale or foreign builds fail loudly with exit 2. m1 is recommended as a quick follow-up (or in this PR) so that dirty and flag-off builds can't pass as HEAD. It doesn't block the merge.
