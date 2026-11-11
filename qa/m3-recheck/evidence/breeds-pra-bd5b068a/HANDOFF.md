# HANDOFF — breeds PR-A pre-bar (filed)

TASK HoQA/PRA-PREBAR (resumed under HoQA/TRAIN-RESUME-U / D-CEO-20261110-16)
- Bundle: scratch/bundles/breeds-ui-pra-bd5b068a.bundle (ref refs/heads/v5/breeds-ui-a)
- Head: bd5b068acff63694f02b334a3fad065e9a53b017
- Tree: d767dfd48894bc716443f19846e870a6e0496503
- Base: d65391b0 (rc/v5 d65391b0868cc993aa39e5bde49d279967c3b8af)
- Scratch clone: /workspace/egg-farm-studio/qa/scratch/breeds-pra-bd5b068a/repo (branch `pra` = head, clean, node_modules installed with Node v20.19.2; push URL DISABLED).
- Report: qa/m3-recheck/breeds-pra-bd5b068a.md (sha256 0ad57cfe8af7d12582c357e42544a97ad8c34311f9abb1bf6ad57b7825726760). WIP backup: qa/m3-recheck/breeds-pra-bd5b068a.md.bak-e4114eac (sha256 e4114eac49460a8f5484efb4beb095335096e914f7eb3ba230e71d1e2795683d).
- Cases: qa/m3-recheck/breeds-ui-cases-v1.md sha256 1addc5368990fafde5b021c9b731690ca32f0ac20b15d7b2ab44cc6405c4413b.
- Evidence SHA256SUMS: qa/m3-recheck/evidence/breeds-pra-bd5b068a/SHA256SUMS (see that file's own sha256 in the report / listing).

## Done
1. Identity/tree/base/docs-only after 0ae9d907: PASS
2. npm ci EXIT=0; tsc EXIT=0 (Node v20.19.2): PASS
3. Full vitest --minWorkers=1 --maxWorkers=2: PASS (159 files, 2340 passed / 1 skipped, EXIT=0)
4. Flag-0 goldens: PASS (GOLDEN1 flag-off f90d1678…, m4-on a54c9cf9…, ZG-FLAGOFF-DOM 9c4b6439…, GOLDEN2 b69c5783/2ac7070d/4fd46759/652d1b26)
5. build / build:html / build:qa + check-release-build: PASS; qaBreeds rejected in release dist and dist-html, present in dist-qa
6. Runtime helper diff tests/helpers/breeds-on.ts: PASS (only m4.flags.breeds 0→1; balance.json stays 0)
7. Chromium probe of the 30 PR-A + both cases (port 47122, attempt 6 EXIT=0): filed. Tallies 11 PASS / 11 FAIL Major / 6 BLOCKED / 1 NOT RUN (BR-UI-22) / 1 OBSERVATION (BR-UI-39). All 8 code-read leads confirmed FAIL Major. Runtime build-id m4.1+bd5b068 matched.

## Left (explicitly not PASS; do not re-run passing work)
- BR-UI-22 (offline welcome-back) NOT RUN
- FF/WK cells (14, 16, 34, 39) NOT RUN — engines not installed
- Abbreviated substeps: 01 base-rect + 120s telemetry; 07 sales 30s; 15 85/95 matrix; 18 hidden-50s + t300; 24 IoU / 9/9 human
- BR-UI-39 Present-badge cells (PR-B) NOT RUN
- Hosted (item 8) NOT RUN — not pushed; inherit only if pushed tree == d767dfd4
- BLOCKED on this head (re-bar later on the named dependency): 04, 05 (abilities=1), 08 (rc2Refill=1), 30, 32 (Present gate), 37 (telemetry emitters)
- Deferred: BR-AC23b to RC; BR-AC34 part 2 to RC

**No merge-go.** Overall report verdict: FAIL.

## lane-kill outputs (rc 0)
- Halt: TERM 647361 (group)
- Resume: GONE 705343, GONE 783861, GONE 798967, GONE 829508, GONE 848195, GONE 893450, GONE 922645, GONE 959608, GONE 1001373
- End-of-bar: every pid in .pids/uiqa-breeds-pra.pids lane-killed again; /proc leaders GONE; no readable survivor with LANE_RUN_TAG uiqa-breeds-pra.
