# PR #13 review: check-release-build single-file HTML @ 6cc37f6
QA, 2026-10-17 00:22 to ~01:20 CEST. This is a read-only review. The PR was fetched into /tmp/qa-x (worktrees pr13b = 6cc37f6, pr13g = 6cc37f6 + the PR #14 golden file, v4b = 7d52952). Nothing was pushed, merged or commented. Earlier results at 3d76861 are kept only as history in `pr13-release-check-3d76861/`. Evidence: `pr13-release-check-6cc37f6/`.

## Verdict: CHANGES REQUESTED (1 Major in build:html, 1 Medium in CI gating). The scanner itself is good.

| # | Check | Result |
|---|---|---|
| 1 | All 24 must-fail fixtures fail, each for the intended reason | PASS. 23 `fail-*` fixtures exit 1 with the reason named in release-html.test.ts; `pass` and `pass-assign-allowed` exit 0 (fixtures-24.log). The 24th must-fail case is the dist-mode test (CSS/.map/index.html), which is covered in vitest. |
| 2 | The real v4 asset (sha 32d7cd53…8e1a) passes | PASS with `--build-id m3-rc1-pre+7d52952` (v4-and-ce7d59a.log) |
| 3 | ce7d59a dev build, single-file (dist-qa inlined by our inline-dist.mjs) | PASS (caught). The CLI exits 1 at the hook check: `window.eggfarm, eggfarmOnb, eggfarmQaRecovery, get("debug")…`. Called directly, the global scanner returns `eggfarmOrderList, eggfarmQaRecovery, eggfarmOnb, eggfarm`. Note: the CLI is fail-fast, so eggfarmOrderList appears only in the scanner output, not in the CLI message (Low). |
| 4 | Our injection variants (34, from 3d76861, rerun) | 30 caught, 4 missed (table below). At 3d76861, 9 were missed; 6cc37f6 fixes Reflect.set/defineProperty, `window.window.x`, `(0,window).x` and `window [ 'x' ]`. |
| 5 | `npm run build:html` builds and passes check-release-build | PASS. dist-html/egg-farm.html, m3-rc1-pre+6cc37f6, every gate ok (build-html.log) |
| 5b | build:html output behaves the same as the v4 release | **FAIL, Major (F1)** |
| 6 | CI release-html job | Runs `npm ci && npm run build:html` on push and pull_request, and it ran green on 6cc37f6. **It blocks nothing (F2, Medium).** |
| 7 | dist CSS scan | PASS. The vitest dist-mode test covers css url()/@import, .map files and a missing index.html. In single-file mode, `<style>` sits inside the scanned html, which the fail-css-url and fail-css-import fixtures confirm. |
| 8 | engineering/ci-gates.md matches the code | Mostly yes; 2 inaccuracies (F3, Low) |
| 9 | Full vitest (max 2 workers, lock) with the PR #14 golden fix + tsc | PASS: 499 passed + 2 skipped of 501, tsc clean |

## Findings
**F1 (Major): build:html breaks every @font-face URL, so the artifact differs from v4.**
- Cause: in `scripts/build-html.mjs`, the asset rewrite regex `(?:\.)?\/((?:assets|fonts)/…)` consumes only one leading dot. The CSS `url(../fonts/x.woff2)` therefore becomes `url(.data:font/woff2;base64,…)`. That is a relative URL, not a data URI.
- Effect on fonts: all 4 custom fonts (Fredoka 500/700, Nunito 400/700) fail to load and the game falls back to system fonts. Over http each font becomes a ~21 KB request path: 431 errors on a default Node server, 404s on a large-header server. Over file:// the browser looks up nonexistent files.
- Console errors: the same harness as the v4 confirm gives a check-6 FAIL with console errors on the build:html output, against 0 on the v4 release.
- Why the gate misses it: check-release-build passes because the URL is relative, not external.
- Repro:
  1. Run `npm run build:html` and `grep -o 'url(\.data:' dist-html/egg-farm.html | wc -l`. The result is 4, against 0 in the v4 asset, which has 4× `url(data:`.
  2. Serve the file and load it. Evidence: probe-431.mjs/.log and run-buildhtml-7d52952-chromium.log.
- Fix: match `(?:\.\.?\/)+` (or resolve relative to the CSS file), and add a check-release-build rule or test that fails on `url(.data:` or any non-data relative font URL in single-file mode.

**Byte diff of build:html vs v4, apples to apples:** PR #13's build-html.mjs at 7d52952 gives sha 23002f1c…, 470,902 B, against v4's 471,475 B.
- Markup outside script and style: identical.
- `<style rel="stylesheet" crossorigin>` in v4 becomes `<style>`: harmless.
- CSS: equal apart from F1 (`.data:` vs `data:`, ×4) and a trailing newline.
- JS: v4 includes Vite's modulepreload polyfill (~0.5 KB); build:html sets `modulePreload.polyfill:false`. That is harmless for a single inline module, but it shifts minifier names (`kr` vs `kn`, …). With the polyfill removed, the code differs only in identifier names.
- Behaviour in Chromium (same harness as the v4 confirm): build id, all old/a01faea saves load with no loss, core loop, globals: all PASS. Console errors: FAIL, from F1.

**F2 (Medium): release-html doesn't actually gate anything.**
- `main` is unprotected: `protected:false`, no required status checks.
- Releases and tags are created outside CI, so a red release-html job doesn't stop a merge or a release.
- The job is also a parallel duplicate of the build path, not wired into how the actual release asset is produced: v4 was built from /workspace/m4v2-tools.
- Ask: make release-html (and release-globals) required checks on main, and make the release process build its asset with `npm run build:html` and attach that exact file, or run check-release-build on the uploaded asset with `--build-id`.

**F3 (Low): ci-gates.md inaccuracies.**
- (a) It says "no hosted Actions minutes are used today; run the same commands locally", but Actions ran all 5 jobs on 6cc37f6.
- (b) It doesn't say the jobs are not required (see F2), or that the CLI is fail-fast (it reports only the first failing category).
- Everything else matches the code: build-id rules, hooks, eggfarmUi, the allowlist, the external-ref and sourcemap list, fail-closed `</script`, and the documented alias gap.

**F4 (Low, accepted gap, documented):** the injection misses below, all covered by the runtime `check-globals`.

## Injection variants @ 6cc37f6 (fixtures in pr13-release-check-3d76861/fixtures/, log injections.log)
Caught (30):
- Window writes: computed `window['egg'+'farm']`; computed via a variable key; template `` window[`eggfarm`] ``; template with an expression.
- Reflect and Object: Reflect.set; Reflect.defineProperty; Object.defineProperty (including a computed key); defineProperties; Object.assign.
- Roots and aliases: globalThis.x (eggfarm and other keys); `self['eggfarm']`; globalThis alias; comma alias; the typeof-globalThis alias with an eggfarm key; `window.window.x`; `(0,window).x`; `window [ 'x' ]`.
- Build ids: `+dirty`; `-dirty` inside the prefix (as a mismatch); duplicate mismatched ids; a second id in a second script; a split id or an id only in markup (no build id); a longer hash mismatch; a 6-char hash (no id).

Missed (4):
| Variant | Severity | Why |
|---|---|---|
| `var a=self; a.qaHook=1` (alias, non-eggfarm key) | Low | Documented accepted gap; minified alias reuse. The runtime gate covers it. |
| `var G=typeof globalThis<"u"?globalThis:window; G.qaHook=1` | Low/Minor | Bundlers do emit this global-detect pattern, but only an eggfarm* key is flagged through it. Same documented gap; the runtime gate covers it. |
| `m3-rc1-pre+abc1234-dirty` (hyphen suffix) | Low | The regex stops at the hash and reads a clean id. Our generator (`formatBuildId`) only ever emits `+dirty`, so it isn't realistic. |
| The same id twice | Info | Benign: the same literal used twice. |

## vitest (6cc37f6 + PR #14 golden overlay)
PASS. Run under `flock .browser-test.lock timeout 600`, max 2 workers, 01:09 CEST: 50/50 files, 501 tests = 499 passed + 2 skipped (the same 2 pre-existing skips as main), exit 0. release-html.test.ts 30/30. The golden a01faea suite passes 2/2 with the PR #14 path fix. tsc --noEmit exit 0 (tsc.log).

## Not run
- Firefox/WebKit behaviour of the build:html output (Chromium only).
- A file:// run of the build:html output (F1 already fails it).
- The CI annotations (2 per job, likely the Node 20 deprecation notice) were not read.
- No browser `check-globals` run on the build:html output (CI ran it on dist).

## Addendum 2026-10-17 01:15 CEST: build-id meta / ancestry (Head of QA question, re Claude Gamer B1)
Evidence: qa/scratch/pr13-meta/ (v4.html = unmodified copy of the v4 asset, sha256 32d7cd53…8e1a; run-v4.log). Clone /tmp/qa-x/pr13b = 6cc37f6 (pr13 = 3d76861, not used).
1. **The v4 asset has no build-id meta and no data attribute. B1 is correct.** It has only 3 `<meta>` tags: charset, viewport and theme-color. `data-build` has 0 hits, and `name="build-id"` / `data-build-id` has 0 hits. The id exists only as a JS constant: `const Ca="m3-rc1-pre+7d52952",ts=Ca`. Our file:// check read it from Settings, which renders that constant, so the "build-id verified at runtime" claim stands only through the Settings UI. No DOM hook was involved.
2. **ccd7bf9 is not an ancestor of 7d52952.** `git merge-base --is-ancestor ccd7bf9 7d52952` gives exit 1. ccd7bf9 is "rc1/ux-clarity: build-id meta+data attr, …". It is not an ancestor of 6cc37f6 either (exit 1).
3. **check-release-build at 6cc37f6 does not check for a meta or attribute.** The script (67 lines) gets ids only through `findBuildIds(js)` over the inline script bodies (l.25–42). It never inspects `<meta>` or `data-build-id`. No stripping was needed to test this, because the real v4 asset already lacks both: `node scripts/check-release-build.mjs v4.html --build-id m3-rc1-pre+7d52952` gave **rc=0, all ok**.

### Finding PR13-F-META (Major for the smoke-check/runtime-id contract, not data loss)
A release html with no runtime build-id meta or data attribute passes the release gate. So the smoke check, which reads the id from the DOM, cannot read the id from any asset the gate approves, and v4 already shipped like this.
Suggested fix:
- Once ccd7bf9 (or an equivalent) is merged into the release line, make check-release-build in single-file mode require exactly one `<meta name="build-id" content="X">` and one `data-build-id="X"`, and require both to equal the JS id and the expected id.
- Add must-fail fixtures for: meta missing, attribute missing, and meta ≠ JS id.
- Until then, the smoke check should fall back to the JS constant or the Settings text.
