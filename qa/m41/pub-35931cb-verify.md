# Verify-before-publish: egg-farm v4.1 (D-CEO-20261019-13). Merge 35931cb, QA-passed 5d9efa6
Saves QA. Run on 2026-10-24, 17:25–17:31 CEST. Evidence is in `qa/m41/pub-35931cb/`.

## Verdict: **GO** for Latest v4.1, but only with the QA-passed asset and with the tag on **5d9efa6**
- **Asset:** publish `egg-farm.html` with sha256 `ccb87daa60b5b8f722504642561f8a6061c8335555fd669a16872add2e88d5e1` (build-id `m4.1+5d9efa6`).
- **Tag target:** put the tag on **5d9efa61c5e6ee31ca9ebdec20ee70167d31d463**. This commit is on main as the 2nd parent of 35931cb, and its tree is the same.
- **Why not tag 35931cb:** `.github/workflows/release-asset.yml` runs `check-release-build --build-id m4.1+<tag commit short>`. If the tag is on 35931cb, the ccb87daa asset (`m4.1+5d9efa6`) **fails** that workflow.
- **The other option is NO-GO under -13.** Tagging 35931cb would need the merge build instead: sha256 `dc0539b1…`, build-id `m4.1+35931cb`. That build-id is not the QA-passed SHA. If HoE wants that option, it needs a new HoQ decision first.

## Checks
| # | Check | Result | Value found |
|---|-------|--------|-------------|
| 1a | origin/main contains 35931cb | PASS | origin/main = 35931cb7efa04e9ef57e8ab491cbf1017b849f29 (fetched dd223f5..35931cb) |
| 1b | tree(35931cb) == passed tree | PASS | 31f66351ab8cd865b04848e4881d39cbcea940cd. tree(5d9efa6) is the same |
| 1c | 5d9efa6 is an ancestor of 35931cb | PASS | It is the 2nd parent. A **true merge commit** (parents dd223f5 + 5d9efa6), made by GitHub and signed |
| 1d | `git diff --stat 5d9efa6 35931cb` is empty | PASS | 0 lines |
| 2a | Clean build at 35931cb (worktree wt-pub-35931cb, npm ci, build:html) | PASS (builds; check-release-build ok; porcelain 0 before and after) | sha256 **dc0539b111de6b4fa0e5fdc1dde6bad1808b86a67df73091d740a45e4d2ebce8**. This is ≠ ccb87daa, as expected (see 2c) |
| 2b | The QA-passed build still hashes to ccb87daa | PASS | The existing wt-rc1-5d9efa6 build (14:44) **and** a fresh rebuild now are both ccb87daa…88d5e1. wt-rc1 is still clean (porcelain 0) |
| 2c | Explain the difference | PASS | The build-id comes from `git rev-parse --short HEAD` (scripts/build-id.ts → vite.config.ts) and is embedded 3×. The two builds differ in 18 bytes (3 × 6 chars). Replacing 35931cb with 5d9efa6 in the merge build gives **byte-identical** ccb87daa |
| 3a | Static build-id (grep) | PASS | ccb87daa: `m4.1+5d9efa6` ×3, no `+dirty`. Merge build: `m4.1+35931cb` ×3, no `+dirty`. The only "dirty" token is a telemetry field |
| 3b | Runtime build-id, Chromium 156 (google-chrome, playwright-core), :5961, under the browser lock | PASS | ccb87daa: the meta and #app[data-build-id] (both set at runtime from BUILD_ID in main.ts) read `m4.1+5d9efa6`, with no +dirty and 0 pageerrors. Merge build reads `m4.1+35931cb`. Lock held 17:26:34–17:26:42. The server PID I started (573291) was stopped, and :5961–5964 are free |
| 4 | GitHub release/tag v4.1 or rc/m4.1-rc1 | NOT RUN (none exists) | `gh release view v4.1` and `gh release view rc/m4.1-rc1` both return not found. There are no draft releases and no m4.1 tags on origin. Current Latest = m4b-dd223f5. No asset to hash |
| 5 | CI green on 35931cb (queue row 9) | PASS | ci run 40106837662: unit, slow, release-html, release-globals ×3 all succeeded, finishing at 17:29:34 CEST |

## Not run
- FF and WebKit runtime (this check is Chromium only; RC1 gate covered both engines).
- The released-asset hash, because there's no release yet. **Post-publish:** I'll download the asset with gh, check that its sha256 is ccb87daa and that release-asset.yml ran green on the tag, then run a smoke test.

## Queue
`qa/queue.md` has no new item for this publish:
- Row 7: RC PASS @ 5d9efa6, "awaiting merge + Saves publish GO".
- Row 9: Latest requires green CI plus verify-before-publish.
- Row P1 (UI QA, after M4.1 Latest): WAITING for a v2 SHA off main after the #67 merge.

## Housekeeping
- Worktree qa/wt-pub-35931cb was removed after a clean status check.
- Nothing was pushed, tagged or edited. GITHUB_TOKEN was never printed.

---
## Post-publish confirmation: release `m4.1-5d9efa6` (run 2026-10-24, 17:33–17:40 CEST, read-only)
### Verdict: **CONFIRMED**
Evidence is in `qa/m41/pub-35931cb/post/`.

| # | Check | Result | Value found |
|---|-------|--------|-------------|
| P1a | The release is Latest, not a draft and not a prerelease | PASS | `gh api releases/latest` returns tag_name `m4.1-5d9efa6`, draft false, prerelease false. Published 17:31:13 CEST. The name is "Egg Farm M4.1 (5d9efa6)" and target_commitish is 5d9efa61c5e6ee31ca9ebdec20ee70167d31d463 |
| P1b | The tag peels to 5d9efa6 | PASS | `refs/tags/m4.1-5d9efa6` points to 5d9efa61c5e6ee31ca9ebdec20ee70167d31d463. It is a lightweight tag, and `^{commit}` gives the same SHA |
| P2a | Asset size | PASS | 537,287 bytes on disk. The GitHub asset size is also 537287. Note: the CI log says "537157 bytes", but that is the UTF-8 character count; I checked that `readFileSync(utf8).length` = 537157 |
| P2b | Asset sha256 | PASS | **ccb87daa60b5b8f722504642561f8a6061c8335555fd669a16872add2e88d5e1**. GitHub's digest field is `sha256:ccb87daa…88d5e1`, which matches |
| P2c | cmp against wt-rc1-5d9efa6/dist-html/egg-farm.html | PASS | Byte-identical. The static build-id `m4.1+5d9efa6` appears ×3 |
| P3 | release-asset.yml run for this release | PASS | Run **40107345648** (event release, head m4.1-5d9efa6 @ 5d9efa6): conclusion **success**, finished **17:31:27 CEST**. Job check-uploaded-html succeeded (17:31:17–17:31:26), and every step succeeded. Log: "build id m4.1+5d9efa6 matches expected ok", "build-id meta + data-build-id = m4.1+5d9efa6 ok" |
| P4a | Runtime build-id (Chromium 156, :5961, the downloaded asset) | PASS | The meta and #app[data-build-id] read `m4.1+5d9efa6` with no +dirty. The same values hold after reload and on the v5 boot |
| P4b | Fresh boot, then play | PASS | No recovery dialog. I tapped Collect 24 times (basket 0→19), then Market → "Sell all (8 eggs · $8.00)", and coins went from $0.00 to $8.00 |
| P4c | Save round-trip | PASS | Autosave wrote eggfarm.save at v6 with coinsCents 800 and basket 11. After reload + Tap to start the screen showed $8.00 / 11, save coinsCents 800, and F0/C0, with no dialog |
| P4d | v5 pre-M4 fixture (m2-rc1-v5-12min.json, sha256 7ae75247…, F10 C11 $150.61) | PASS | It booted with no recovery dialog. The save was rewritten at v6 with F10/C11 kept; coins showed $230.67 at boot and were $310.68 after the offline grant plus live play. `eggfarm.save.v6_backup` was created |
| P4e | Page errors, console errors, HTTP ≥400 | PASS | 0 on both paths |

- **Browser lock:** acquired at 17:38:44 and released at 17:39:17 CEST, about 33 s. The first attempt timed out waiting behind another agent's `rc0-browser.mjs` (UI QA P1 gates); I left it alone.
- **Cleanup:** I started and stopped one server (PID 598757). Ports 5961–5964 are free.
- **Screenshots:** in `post/smoke/` (A1–A5, B1–B2). The script is `post/smoke/smoke.mjs` and the results are in `smoke-result.json`.
- **Not run:** Firefox and WebKit post-publish smoke. The RC1 gate covered both engines on these exact bytes.
