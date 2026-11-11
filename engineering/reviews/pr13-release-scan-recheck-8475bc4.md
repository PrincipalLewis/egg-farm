# Re-check PR #13 release-scan 6cc37f6 → 8475bc4
Commits 7915691/96756aa/68e7347 (merge of #14 golden fix) + 8475bc4. Read-only. Claude: 0 calls. Runs in /tmp/r13c (local clone at 8475bc4).

## Verdict: PASS. N1/N2 are closed except one residual N1 case (line comment, minor). The workflows are read-only. Two advisory minors.

## N1/N2 (scripts/release-scan.mjs)
- I re-ran the 6cc37f6 probe (import path fixed to /tmp/r13c):
  - **Now caught:** regex `]`, regex `[`, block comment `]`, key >4000 chars (`[unparsed key]`), and the decoy-unbalanced-then-real case.
  - **Still caught:** string `]`, template `${]}`, the unclosed-string cases.
  - **Performance unchanged:** 20k nesting 0.33 s, 200k opens 0.14 s, unterminated strings 0.6 s.
- **Real build, no false positives in either mode:**
  - `npm run build:html` exits 0 with all checks ok.
  - `vite build` + `check-release-build dist` exits 0.
  - `git status --porcelain` stays clean.
- vitest 512 pass + 2 skipped (50/50 files, golden now loads via #14), including the new fail-regex-in-key and no-false-positive fixtures.

## F1 font rewrite + unresolved-ref gate
- build-html.mjs `inlineAssetRefs` rewrites `./`, `../` (any depth) or `/` + assets|fonts paths to the data: URIs built from local dist files. There is no network code: the only `fetch` is a rewrite of the game's runtime mp3 fetch to the inlined map.
- The gate fails closed: appending `@font-face{src:url(../fonts/Nunito.woff2)}` gives "unresolved (not inlined) asset/font URLs … url() ../fonts/Nunito.woff2", exit 1.

## F-META
- The built html has exactly one `<meta name="build-id" content="m3-rc1-pre+8475bc4">` and one `data-build-id` with the same value, matching HEAD 8475bc4.
- A duplicated meta gives "expected exactly one <meta name="build-id">, found 2".
- **Plugin scope:** the Vite plugin (vite.config.ts) is `transformIndexHtml` only (meta and the #app attribute). The game bundle change is main.ts's 5 lines, which set `root.dataset.buildId` and the meta at runtime. That's no window global and no sim or save effect, and check-globals is unchanged.

## Workflows
- **release-asset.yml:**
  - **Triggers:** `release: [published, edited]` + `workflow_dispatch`.
  - **Permissions:** `contents: read`.
  - **Token:** `GH_TOKEN: github.token`, which has read scope only, used for `gh release download`.
  - **No publish or write step:** it downloads the attached .html files and runs check-release-build with `--build-id` = prefix + the tag commit. The tag comes in via env (quoted), not inline `${{ }}` in the shell, so there's no injection.
  - **Can't publish on its own.**
- **ci.yml:** release-html now runs check-release-build `--build-id` against HEAD and uploads the artifact. No write token use.
- check-globals (Chromium): PASS, eggfarmExportTelemetry only; refused boot [].

## Findings
- **MINOR: N1 residual, line comment.** `window[k // ]\n]=1` is still MISSED: the `]=` lookahead regex excludes newlines (`[^;\n]`). Minified release bundles contain no line comments, so the practical risk is low. Fix: allow `\n` in that lookahead when the key slice contains `//`, or strip comments before matching.
- **MINOR: release-asset is a post-publish detector, not a gate.** It runs after the release is already published, and a failure doesn't unpublish or block it. Document it as such in ci-gates.md, and gate the build at the source (release from CI artifacts only, or a required check on the tag commit) if blocking is wanted.
- **NIT:** ci.yml has no top-level `permissions:` (pre-existing). Push/PR runs get the repo-default GITHUB_TOKEN scope; set `permissions: contents: read` for least privilege. No step uses the token for writes today.
