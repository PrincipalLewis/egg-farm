# CI gates

GitHub-hosted Actions run these jobs on every push and pull_request (all 5 `ci` jobs ran on PR #13 at 6cc37f6).
**None of them is a required status check today:** `main` has no branch protection, so a red job does not block a merge, and
releases/tags are cut outside CI. Run the same commands locally before merging or releasing.

| Workflow / job (check name in GitHub) | Command | What it gates |
|---|---|---|
| ci / `unit` | `npm run check-economy-copy`, `npm test` | economy copy matches product/, balance.json in sync, vitest |
| ci / `release-globals (chromium)`, `release-globals (webkit)`, `release-globals (firefox)` | `npm run build` (ends in `check-release-build dist`), `npm run check-globals -- <engine>` | dist release build + **runtime** window-globals allowlist |
| ci / `release-html` | `npm run build:html`, then `check-release-build dist-html/egg-farm.html --build-id <BUILD_PREFIX>+<commit>`; uploads `egg-farm-html` artifact | single-file release html |
| release-asset / `check-uploaded-html` | on release published/edited (or manual): `gh release download <tag> --pattern '*.html'`, `check-release-build <file> --build-id <BUILD_PREFIX>+<tag commit>` | the html actually attached to the release |

### Recommendation (repo setting, not changed by this PR)
Protect `main` and make `unit`, `release-globals (chromium|webkit|firefox)` and `release-html` required status checks; build the
release asset with `npm run build:html` and attach that exact file, so `check-uploaded-html` re-verifies what players download.

## check-release-build (`scripts/check-release-build.mjs`, scans in `scripts/release-scan.mjs`)
`node scripts/check-release-build.mjs <dist-dir | file.html> [--build-id <id> | --build-id=<id>]`
The tool is **fail-fast**: it exits 1 at the first failing check and reports only that category; fix and rerun to see the next.
- Build id: present, not `+dirty`/`+unknown`; single-file (or `--build-id`): exactly one id, equal to `--build-id`/`EXPECT_BUILD_ID`, else `<BUILD_PREFIX>+<HEAD>`.
- No `eggfarmUi`, QA hooks (`eggfarmPerf`, `eggfarmOnb`, `eggfarmQaRecovery`, `?debug`/`?perf`/`?ios`), sampler/panel chunks.
- Single-file build-id markup (F-META): exactly one `<meta name="build-id" content>` and exactly one `data-build-id`, both equal to the script id (and `--build-id`).
- Single-file inlining (QA F1): every `url()`, `@import`, src/href/srcset/poster/`<object data>` is a `data:` URI (or external, caught below); no `url(.data:`; no `./assets/…`/`../fonts/…` file path left in a JS string.
- Window-global writes: only `eggfarmExportTelemetry` (static; see header of release-scan.mjs for the shapes covered).
- External refs in JS, CSS (dist `assets/*.css` too) and markup: src/href/srcset/`<object data>`/meta refresh, `url()`/`@import`,
  import/`import()`, fetch, XHR open, WebSocket/EventSource/Worker/sendBeacon, ws(s) URLs, `.src`/`location` writes, `window.open`;
  any `sourceMappingURL` and any `.map` file in dist.
- Bracket keys the scanner can't parse (unbalanced, >4000 chars, regex literal holding `]`) are flagged `[unparsed key]` (fail closed).
- Single-file script extraction fails closed on unbalanced `<script>` tags (a literal `</script` in inline JS).

### Accepted gap (static scan)
Minifiers reuse short names (`t` is `window` in one scope and a DOM node in the next), so through an **alias** of window only
`eggfarm*` keys are flagged. `h=window; h.dbg=1`, `h[k]=` with a variable key, window passed as a function parameter, and a URL
held in a variable then fetched are not caught statically. A local `var self` / `self` parameter anywhere in the bundle drops
`self` as a root. **The runtime `npm run check-globals <engine>` (own-property diff of window) is the authoritative globals gate.**
