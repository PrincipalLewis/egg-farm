# Gate 5 (PR #41 M4-on) shot scripts · QA Engineer UI/Layout · 2026-10-19
Implements art-ux/reviews/m4-on-checklist.md §A. The SHA is a parameter, so the same scripts run on #41 without changes.
## Run
1. Make a clean worktree at the SHA, run `npm run build`, and serve `dist/` on your own port (never 4173), e.g. `python3 -m http.server 4417 --bind 127.0.0.1`.
2. `./run.sh <sha40> http://127.0.0.1:<port>/ <outdir> [chromium firefox webkit]`. This runs one engine at a time under `flock … timeout 600` (lane 2 for Chromium only when the 1-min load is under 12, else lane 1). firefox/webkit use the playwright-core bundled browsers (~/.cache/ms-playwright).
3. Open the Settings shots and confirm the label reads `m3-rc1-pre+<sha7>`, then run `SHA=<sha40> PUSHED=1 LABEL_EYEBALLED=1 BRANCH=<branch> node manifest.mjs <outdir>`. It exits 1 if any PNG lacks an entry or any entry lacks its file.
## What it does
- States: fresh; L10 (F10 C9 H9 V7, 2 workers, 2 orders); L30 (all 30, $1.5T, 4 workers, B/T orders); migrated-acdbedc (`fixtures/acdbedc-v6rich.json`, a real acdbedc v6 save). It also shoots 2 explainer frames (showing, after Got it) when the explainer exists. Inline states patch the build's own fresh save, so the save version always matches the build.
- Sizes: 360x800, 375x800, 390x844, 1280x800 (docked:true).
- Screens: farm, market, upgrades-collection, upgrades-farm, upgrades-workers, upgrades-farm-tracks (only when `[data-kind=hens]` exists, otherwise listed in skipped-<engine>.txt), settings (asserts the `.version` text equals the label).
- Each state aborts unless `meta[name=build-id]` == `m3-rc1-pre+<sha7>`. Each probe asserts `[data-tab=X].active` plus that tab's card (h3 `Collect per tap` / `Farm level` / worker rows), or the Market panel plus `#sellAll`, or no open sheet for farm. It measures (doc overflow, element overflow, sub-44px taps, NaN/undefined/1000K text) and then shoots immediately. Animations are paused (noted in `state`).
- manifest.json follows screenshot-manifest-template.md, with per-shot `asserted_tab`, `asserted_panel` and `checks`.
## Shot count
dd52bfd (M4 off): 96 per engine (4 sizes × 4 states × 6 screens), 20 skips (tracks ×16, explainer ×4).
#41 (M4 on): expected 120 per engine (+16 tracks, +8 explainer frames), 360 for 3 engines.
