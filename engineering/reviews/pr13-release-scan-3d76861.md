# Review: PR #13 release-scan / check-release-build single-file — 3d76861

Reviewer: independent read-only review (one pass). Worktree: /workspace/review-3d76861 (detached). Built/ran in /tmp/r13 (local clone with git history).
Claude cross-check: 1 call (sonnet, high), findings merged below after confirming by probe.

## Verdict: APPROVE WITH CHANGES (no blockers)
The real release build passes (no false positives) in both dist mode and a synthesized single-file html (`m3-rc1-pre+3d76861 matches HEAD ok`, exit 0). The tests pass (10/10). The build-id check matches the real `scripts/build-id.ts` output (prefix `m3-rc1-pre`, `+unknown`/`+dirty` rejected). Errors exit 1, and uncaught exceptions also exit non-zero. The static scan has several confirmed false-negative gaps. The runtime `check-globals` stays the real gate for globals, but nothing else gates external refs. Also, CI never runs the single-file path (see M1).

## Findings

### M1 (major) — CI never runs the single-file path
`package.json:8` and `.github/workflows/ci.yml:29`: there is no `build:html` script, and CI only runs `check-release-build.mjs dist`. The single-file html the PR targets is only covered by the hand-made fixtures. Repro: `rg build:html package.json .github` finds nothing. Fix: add a step that builds the single-file html and runs `check-release-build.mjs <file>`.

### M2 (major) — dist mode never scans extracted CSS for external refs
`scripts/check-release-build.mjs:15,52`: in dist mode only `assets/*.js` and `index.html` are scanned. Repro: `cp -r dist /tmp/d; echo '@import url(https://fonts.googleapis.com/x);' >> /tmp/d/assets/index-*.css; node scripts/check-release-build.mjs /tmp/d` gives `no external ... ok` with exit 0.

### M3 (major) — global-write false negatives (confirmed with probes, scripts/release-scan.mjs)
All of the following pass the scan as clean:
- `:21` Nested brackets: `window[a[0]]=1`. `[^\]]` stops at the inner `]`, and this is a common minified shape.
- `:20-21` Compound assignment: `window.eggfarmDbg||={}`, `??=`, `+=`.
- `:26` `Reflect.set(window,"eggfarmDbg",1)`. defineProperty/assign on an alias: `h=window;Object.defineProperty(h,"eggfarmDbg",…)`.
- `:4` Roots `top`, `parent`, `frames` are missing. `(0,window).x=`, `window . x=`, `globalThis.window.x=`.
- `:17` Alias forms not detected: `h=typeof window<"u"?window:globalThis`, `Function("return this")()`, window passed as a function parameter.
- `:24-25` An alias with a non-eggfarm key (`h=window;h.dbg=1`), or a variable key (`h[k]=` where k="eggfarmDbg"), is not flagged. This is intentional (minifier name reuse), but it is an accepted gap and should be documented as one.
Repro: `node /tmp/probe.mjs` (on the box), or call `findGlobalWrites('window[a[0]]=1')` and get `[]`.

### m1 (minor) — external-ref false negatives (`scripts/release-scan.mjs:34-43`)
Missed: `srcset="https://…"`, `new WebSocket("wss://…")` (URL_ only matches `https?:`), `fetch("https://"+h)`, a URL held in a variable then `fetch(u)`, XHR `.open("GET","https://…")`, `<object data=>`, meta refresh, and `//# sourceMappingURL=` (inline or external; no sourcemap check at all). Caught correctly: CSS url(), @import, `<link href>` (quoted and unquoted), `fetch()` with template literals, `import()`, `import from`, iframe.

### m2 (minor) — fixtures leave several failure paths untested
`tests/release-html.test.ts:13-18`: no end-to-end fixtures for `+unknown`, multiple build ids, `defineProperty`/`assign`, CSS url()/@import, srcset, eggfarmUi, or the QA hooks in single-file mode. The fixtures that do exist each fail for the intended reason only (checked).

### m3 (minor) — false positives
- `release-scan.mjs:26`: `Object.assign(window,{eggfarmExportTelemetry:f})` is flagged even though the key is allowed (object literal leads to constKey null).
- `:25`: an alias bracket write with any string key (`h["a-b"]=`) is flagged, which is inconsistent with the eggfarm-only rule on line 24.
- `:4`: `self.x=` on a local `var self=this` is flagged.
None of these appear in the current build.

### n1 (nit) — `--build-id` argument handling
`check-release-build.mjs:7`: `--build-id` as the last argument gives expectId undefined and silently falls back to the HEAD check (exit 0, confirmed). `--build-id=<id>` is treated as the target path and crashes in statSync (it still exits non-zero). Fail if the value is missing, and accept the `=` form.

### n2 (nit) — script extraction and missing index.html
`check-release-build.mjs:15`: single-file script extraction ends at the first literal `</script>`. `:12`: a missing `dist/index.html` is silently treated as `''`.

## Notes
- Older single-file htmls (`/workspace/egg-farm-dd15dbf.html`, `play-single-dist/index.html`) fail with "no build id found". They predate the build id, so this is expected and fails closed.
- The build-id test needs git history (HEAD_COMMIT is set in the test, so it is fine there).
