# CI gates

`.github/workflows/ci.yml` lists them (no hosted Actions minutes are used today; run the same commands locally).

| Job | Command | What it gates |
|---|---|---|
| unit | `npm run check-economy-copy`, `npm test` | economy copy matches product/, balance.json in sync, vitest |
| release-globals (chromium/webkit/firefox) | `npm run build` (ends in `check-release-build dist`), `npm run check-globals -- <engine>` | dist release build + **runtime** window-globals allowlist |
| release-html | `npm run build:html` (ends in `check-release-build dist-html/egg-farm.html`) | single-file release html |

## check-release-build (`scripts/check-release-build.mjs`, scans in `scripts/release-scan.mjs`)
`node scripts/check-release-build.mjs <dist-dir | file.html> [--build-id <id> | --build-id=<id>]`
- Build id: present, not `+dirty`/`+unknown`; single-file (or `--build-id`): exactly one id, equal to `--build-id`/`EXPECT_BUILD_ID`, else `<BUILD_PREFIX>+<HEAD>`.
- No `eggfarmUi`, QA hooks (`eggfarmPerf`, `eggfarmOnb`, `eggfarmQaRecovery`, `?debug`/`?perf`/`?ios`), sampler/panel chunks.
- Window-global writes: only `eggfarmExportTelemetry` (static; see header of release-scan.mjs for the shapes covered).
- External refs in JS, CSS (dist `assets/*.css` too) and markup: src/href/srcset/`<object data>`/meta refresh, `url()`/`@import`,
  import/`import()`, fetch, XHR open, WebSocket/EventSource/Worker/sendBeacon, ws(s) URLs, `.src`/`location` writes, `window.open`;
  any `sourceMappingURL` and any `.map` file in dist.
- Single-file script extraction fails closed on unbalanced `<script>` tags (a literal `</script` in inline JS).

### Accepted gap (static scan)
Minifiers reuse short names (`t` is `window` in one scope and a DOM node in the next), so through an **alias** of window only
`eggfarm*` keys are flagged. `h=window; h.dbg=1`, `h[k]=` with a variable key, window passed as a function parameter, and a URL
held in a variable then fetched are not caught statically. A local `var self` / `self` parameter anywhere in the bundle drops
`self` as a root. **The runtime `npm run check-globals <engine>` (own-property diff of window) is the authoritative globals gate.**
