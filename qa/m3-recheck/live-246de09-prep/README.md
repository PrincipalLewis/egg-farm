# Live (published) build run: 246de09. PREP ONLY (QA Engineer UI/Layout, 2026-10-19 ~09:05 Europe/Belgrade)
Nothing here has touched a live URL yet. Run it only after HoE posts the release URL. Never use :4173. Never push, merge or tag.

## What changed (all in qa/; backups in ./bak/)
- `gate5-final-prep/exp-cardreload.mjs`: `node exp-cardreload.mjs <engine> <outdir> <baseUrl> <sha40> <sizes>`. Sizes take `390,1280` (or `390x844,1280x800`).
  - Reads `meta[name=build-id]` at boot and after **every** reload, and aborts (exit 4) unless it equals `EXPECT_BUILD_ID` (default `m3-rc1-pre+<sha7>`, which must contain sha7).
  - Flow: blocked → reload while blocked → writable → next load (card once, flag saved) → **Got it → reload: no card, flag persisted, tab asserted**. Each step is shot right after its own measurement.
- `gate5-pr44/shoot.mjs`, `gate5-pr44/probes.mjs`, `gate5-final-prep/shoot-ext.mjs`, `gate5-final-prep/exp-final.mjs`: accept `EXPECT_BUILD_ID` (default unchanged). They already took `URL`.
- `exp-final.mjs` C5-gate-readonly is re-graded **by design** (HoQ 07:51): no card in the blocked session after it becomes writable.
- `gate5-final-prep/run-ext.sh`: lane 2 for **chromium only** (load < 12). `run-fix.sh` was fixed earlier; `gate5-pr44/run.sh` was already lane 1 only.
- New: `run-live.sh` (stage runner), `make-rc0-live.mjs` (rc0 pointed at BASE, no local server), `mk-manifest.py` (cardreload manifest with full SHA, pushed branches, sha256, by-design grading), `dryrun-local.sh`.

## Commands (set BASE to the URL HoE posts; keep the trailing slash)
```
cd /workspace/egg-farm-studio/qa/m3-recheck/live-246de09-prep
SHA=246de09c8b329360754cc0d77a6cd6b6788b6ad4; BASE='<live release URL>/'; OUT=/workspace/egg-farm-studio/qa/m3-recheck/live-246de09
# If the published build labels itself differently, export EXPECT_BUILD_ID=<exact label containing 246de09> after HoQ confirms it.
bash run-live.sh setup      "$BASE" $SHA $OUT            # own worktree /tmp/qa-live-246de09 + node_modules + rc0-live.mjs (no network to BASE)
bash run-live.sh check      "$BASE" $SHA $OUT            # curl build-id; must equal m3-rc1-pre+246de09, else exit 4. Stop if it fails.
bash run-live.sh cardreload "$BASE" $SHA $OUT            # chromium -> firefox -> webkit, sizes 390,1280 (override SIZES=...)
W2=1 bash run-live.sh g5    "$BASE" $SHA $OUT            # gate5 shots + chromium probes (lane 1), then run-ext.sh PROFILE=B
SIZES=360x800,375x800,390x844,1280x800 bash run-live.sh artux "$BASE" $SHA $OUT   # EXP1 v1.15 A&UX set. Run AFTER g5 (run.sh resets entries-*.jsonl)
PUSHED=1 BRANCH=rc/m4-t3-capped LABEL_EYEBALLED=1 bash run-live.sh manifest "$BASE" $SHA $OUT   # LABEL_EYEBALLED=1 only after opening the Settings label shots
```
- Engine order is always chromium → firefox → webkit, run serially (one engine at a time). Restrict with trailing args, e.g. `... $OUT chromium`.
- Ext groups: use `EXT_GROUPS="max coins goal f2 f3 h6 expgate expui"` for live. Leave out `exp1` (pre-v1.15, uses a fresh save, which never shows the explainer per D-HOP-13, so it only logs PENDING). Leave out `expoff` unless `FLAGOFF_URL` is given. `cap c4 l5x` are N/A under profile B anyway.
- Outputs: `$OUT/` (g5 + artux, `manifest.json` via gate5 `manifest.mjs`) and `$OUT/cardreload/` (`manifest.json` via `mk-manifest.py`).

## rc0 smoke: NOT runnable against the published build
rc0-browser.mjs waits for `window.eggfarm`. That hook is compiled out of release builds (`src/main.ts:112`, `IOS_FLAG_ENABLED`). The dry run against the local release build timed out on it (0/2). `run-live.sh rc0` exists, but on a release build it will fail the same way.
Option for HoQ: run rc0 on a local `npm run build:qa` of the same SHA 246de09, which is how rc0 has always run (`PORT=<free> node scripts/rc0-browser.mjs <engine>` in the worktree, under the lane rules). Everything else here runs on the live build.

## Dry run (local 246de09 release build, :4825, chromium only), evidence in dryrun-local/
- Negative checks: a wrong EXPECT_BUILD_ID makes `check` and `exp-cardreload` exit 4.
- check: build-id m3-rc1-pre+246de09 OK.
- cardreload 390 + 1280, real + mock: 4/4 PASS by design. 20 shots. I opened the 1280 next-load card and reload-after-Got-it shots.
- g5 (STATES=L10, SIZES=360x800, W2=0, EXT_GROUPS=exp1): shots + probes pl1/g3/m1/milestones ran; manifest 24 shots, 0 entry-check fails, 0 missing. One orphan (probe-milestones png), the same as before. The ext exp1 skip is expected (fresh save).
- artux exp-final 1280: 13/13 PASS (after the C5-readonly re-grade).
- rc0 ONLY=tabs,bug9: 0/2, `window.eggfarm` absent in the release build (see above).
