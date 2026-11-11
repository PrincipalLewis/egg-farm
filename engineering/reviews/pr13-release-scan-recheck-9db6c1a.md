# PR #13 release-scan: light re-check of main-forward merge 9db6c1a

- Merge: 9db6c1a = 8475bc4 (approved) + main eb97a2a (#20 #22 #23 #24)
- Worktree: /workspace/wt-ccr-pr13-9db6c1a (detached). Claude calls: 0.
- **Verdict: PASS, OK to merge.**

## Resolution audit
- I ran `git merge-tree --write-tree 8475bc4 eb97a2a` (tree 56b417a) and diffed it against 9db6c1a. Only two files differ, and both are the conflicted hunks:
  - `package.json`: build/test come from main with no check-economy-copy prefix. The same prefix was removed from build:html, and test:slow was added. Nothing else changed.
  - `engineering/ci-gates.md`: both sections are kept. The unit row reads `npm test`, the `ci / slow` row was added and the 6cc37f6 line notes that slow came from #19.
- No hidden resolutions. These match what the Architect described.
- Release-scan from 8475bc4 is intact. `git diff 8475bc4 9db6c1a` doesn't touch scripts/release-scan.mjs, scripts/check-release-build.mjs, scripts/build-html.mjs, .github/workflows/release-asset.yml, tests/release-html.test.ts or the fixtures. The ci.yml diff vs 8475bc4 is only main's change: the check-economy-copy step was dropped and the slow job added.

## #24 drift check (key risk)
- Removing the prefix drops nothing from the release path. The bare `check-economy-copy` prefix ran without `--strict`, and since #24 that mode is opt-in and warn-only. It could never fail a build, and #24 deliberately removed it from test, build and ci.yml.
- `--strict` has never been in build, build:html or CI. It only runs in the pre-release checklist (`engineering/ci-gates.md:69`: `npm run check-economy-copy -- --product --strict` blocks the release on drift, owned by the release owner). That is the intended design, since CI has no access to product/.
- On 9db6c1a, `--strict` exits 0: 4 vendored files match, and economy.csv matches product/.

## Gates (re-run on 9db6c1a)
- tsc OK
- sync-economy --check OK
- vitest 557/557
- test:slow: 12 passed, 2 skipped
- build: check-release-build OK
- build:html: all release-scan checks OK
- check-globals chromium PASS (only `eggfarmExportTelemetry`)
- check-economy-copy --strict: exit 0
- Note: the first check-globals run hit a port collision on 5108 from another worktree. The serveOwn guard refused it correctly, and the re-run with PORT=5391 passed.

## Findings
- **nit**, engineering/ci-gates.md:69 (process, not code): the #24 drift check stays a manual checklist step, so build:html and release-asset don't enforce it. This is by design and only noted for the release owner.
  - Repro: change a vendored file in product/ and run `npm run build:html`. The build passes, and only `check-economy-copy -- --strict` exits 1.
- **nit**, scripts/serve-own.mjs:13: check-globals' default port can collide when worktrees run in parallel. The guard fails closed (good), so this costs a re-run but never gives a false pass.
  - Repro: run check-globals at the same time in two worktrees, then retry with `PORT=<free>`.
