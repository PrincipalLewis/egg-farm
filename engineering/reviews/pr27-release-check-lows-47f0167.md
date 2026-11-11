# PR #27 arch/release-check-lows @ 47f0167: CCR review

**Final verdict (04:57 UTC+2, after the box restore): APPROVE, OK to merge. Every gate is green on 47f0167. One minor (m1) is confirmed on the real build and does not block merging.**

*The first pass, from 04:4x UTC+2 before the restore, is kept below for the record.*

## Environment incident (escalate)
- `/workspace/egg-farm-studio/game/.git` has no HEAD, config or refs, and only 432K of objects. The working tree is empty apart from `tests/fixtures/saves`.
- `engineering/` (including every earlier review, among them pr13-*-8475bc4.md and -9db6c1a.md), `node_modules`, `game-rc1-*`, `wt-v4` and all `/workspace/wt-*` git worktrees no longer work as repos. Everything has an mtime of Oct 17 02:43, which looks like a restore or wipe of the box.
- The GitHub repo PrincipalLewis/egg-farm is private, and a clone without credentials fails. I did not use any token.
- So I read the PR via the read-only GitHub MCP (diff plus the full `scripts/release-scan.mjs` and `scripts/check-release-build.mjs` at 47f0167) and ran those two dependency-free scripts standalone in /tmp/ccr27.

## Claims checked
- **L-1:** `check-release-build pass.html pass.html` exits 1 with "expected one path, got 2" (check-release-build.mjs:15). OK.
- **L-2:** a build-id meta or attribute inside `<!-- -->` is ignored, so the count is 0 and the check fails. A data-build-id on another element fails with "must be on the #app element". `id=app` unquoted works, and `id="app2"` / `data-id="app"` are not treated as app. OK, apart from m1.
- **L-3:** the release-scan.mjs:29-31 tamper results (all fail closed, no real global write slips through):
  - `window[/*x*/'foo']=1` is flagged as computed and exits 1.
  - `globalThis['f'+'oo']=1` is flagged as `foo` and exits 1.
  - `self[k]` and `window[k]` are flagged.
  - `window[k // ]\n]=1` and `window[k /* ] */]` are flagged as computed with the full key.
  - Unterminated `window[k // ]` / `window[k /* ]` give `[unparsed key]`.
  - Nested `window[a[b[c]]]`, template `` window[`f${x}`] `` and `window[x/2/*]*/]` are flagged.
  - `window["a//b"]` and `window['/*']` are read as strings, not comments.
  - `window["eggfarmExportTelemetry" // c\n]=1` is flagged and exits 1 (fails closed, as intended). The same applies to `/*a*/"eggfarmExportTelemetry"/*b*/`.
  - The plain allowed writes `window.eggfarmExportTelemetry=` and `window["eggfarmExportTelemetry"]=` pass.
- **serve-own (serve-own.mjs:142-161):**
  - The free port is probed on 127.0.0.1, the same host vite binds with --strictPort.
  - If something grabs the port between probe and bind, vite exits or the own-chunk check fails, so it retries with a fresh port up to 3 times.
  - A false pass is not possible, because the served index must reference this outDir's hashed entry.
  - Live check-globals with PORT unset is NOT run (no build available).
- **ci.yml:2-3:** top-level `permissions: contents: read`. The jobs only check out, run npm and upload an artifact (the artifact upload doesn't use GITHUB_TOKEN scopes), so none needs more. release-asset.yml is a separate workflow and unaffected.
- **ci-gates.md wording:** accurate (post-publish detector, manual `--strict` step, one-path rule, free port).

## Findings
- **minor m1**, scripts/release-scan.mjs:124: the `#app` test matches ` id=app` inside another attribute's quoted value. Combined with L-2 this lets a non-app element satisfy the check. The build is ours, so the risk is low.
  - Repro: body `<div id="app"></div><div title=" id=app " data-build-id="<id>"></div>` passes `check-release-build f.html --build-id <id>` with exit 0.
  - Fix: strip quoted attribute values before testing for id, or parse attributes.
- **nit n1**, scripts/release-scan.mjs:123: the tag regex `<[a-z][^>]*>` stops at a `>` inside a quoted attribute, so `<div id="app" title="a>b" data-build-id=..>` misses the attribute. This fails closed (a false fail).
  - Repro: probe that markup; `attrs` is `[]`.
- **nit n2**, scripts/serve-own.mjs:160: the retry loop also retries non-port failures (missing dist, or a wrong build), which triples the time to fail and only reports the last error. The behaviour is still correct.
- **nit n3**, tests/serve-own.test.ts:243-248: the PORT-default test only regexes the source text, so it doesn't prove that check-globals serves and loads the build on the probed port. A live CI run of release-globals covers that.
- **nit n4**, release-scan.mjs:30: a line comment ended by `\r` alone (no `\n`) gives `[unparsed key]`. This fails closed.

## Gates (re-run 04:47-04:57 UTC+2, detached worktree /workspace/wt-ccr-pr27-47f0167, node_modules symlinked from game/)
| Gate | Result |
|---|---|
| tsc --noEmit | OK |
| sync-economy --check | OK |
| vitest full, run 1 | 54 files, 566/566 |
| vitest full, run 2 | 54 files, 566/566 |
| test:slow | 12 passed, 2 skipped (matches the claim) |
| build | check-release-build dist OK |
| build:html | all check-release-build checks OK |
| check-globals chromium, PORT unset | serveOwn picked free port 45959 and loaded the real build (own-chunk check passed). PASS: only `eggfarmExportTelemetry`. |

## m1 on the real build
- Starting point: `dist-html/egg-farm.html` (build id m3-rc1-pre+47f0167) exits 0 unmodified.
- Spoof: I moved data-build-id to `<div title=" id=app " data-build-id=...>` inside a plain `<div id="app">`, and the check **exits 0 (m1 confirmed)**.
- Control: the same move without the title gives "must be on the #app element" and exits 1.
- Severity stays **minor**, because the release html is produced by our own build.
