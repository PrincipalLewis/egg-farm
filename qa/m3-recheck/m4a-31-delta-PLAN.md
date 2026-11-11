# M4-A #31 delta plan: 1a44b19 + main-forward (8e6d53e expected), vs c108440 baseline. 2026-10-17 08:45 CEST
Owner: Saves & Release QA (CEO via HoE; Head of QA confirmed). Verdict due 09:45 CEST to HoE (priority DM).
Rule: PASS unless Blocker/Critical/Major; minors and missing screenshots become follow-ups.

## Baseline (complete per UI QA)
qa/m3-recheck/m4a-c108440.md, pass 3, 06:18-07:21 CEST (exits.txt/summary.txt): FF+WK build-id m3-rc1-pre+c108440, globals only eggfarmExportTelemetry, rc0 209/209. Chromium rc0 209/209 is the engineer's claim. Passes 1-2 are invalid.

## Diff c108440..1a44b19 (git fetch 08:41)
Main merges only: #17/#32 (econ f1 cost overrides), #28 (Sell-all label), #33 (vendor economy sim F1 default), plus status commits. 17 first-parent commits; 123 files, +4491/-313 (85 in tests/scripts/vendor).
src: config/balance.json+ts, formulas.ts, game.ts, main.ts, **save/save.ts (+24), save/idb-mirror.ts**, sim/actions.ts, sim/workers.ts, ui/app.ts, format.ts, orders.ts, styles.css; vite.config.ts; new tests incl. m4a-saveseq-carry.test.ts.
Saves-relevant: save.ts/idb-mirror.ts changes (saveSeq carry), so saves/migration is in scope.
ls-remote 08:41: refs/pull/31/head = 1a44b19 (merge-forward NOT pushed yet); main = 8e6d53e.

## Checks on merge SHA (HoE scope)
1. Head check: target descends from 1a44b19, extra commits = merge of main only (commits-since-1a44b19.txt).
2. Worktree build + build:qa, static build-id.
3. Unit, vitest at most 2 workers (covers saves/migration incl. m4a-saveseq-carry, vendor-pins).
4. Per engine, Chromium then Firefox then WebKit, each step flock timeout 600:
   runtime build-id (5761), release globals (5762), rc0 (5763, expect 209 unless tests are added), file:// + served open sanity (5764).
5. Saves/migration browser: rc0 save sections; optional qa/m4a-v3-delta harness D2/D3 if time allows (otherwise listed as not run).
Est. ~10 min build+unit, ~12 min/engine, so ~45 min. To make 09:45: run Chromium + WebKit first, then Firefox; anything unfinished goes on the not-run list.

## Script
`bash qa/m3-scripts/m4a-31-delta.sh <sha> ["chromium webkit firefox"]` writes to m4a-31-delta-<sha7>-evidence/summary.txt. Helper: qa/m3-scripts/m4a-31-fileopen.mjs. The UI QA runners were copied to qa/scratch/m4a-31-delta/ (buildid-probe adapted by copy).
