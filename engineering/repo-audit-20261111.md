# Engineering repo audit, 2026-11-11 (HoE)

Task HoE/repo-audit. Branch `hoe/repo-audit-20261111`, based on `origin/rc/v5` @ 68f58c0f.

## Convention and base
- The repo already stores Engineering docs at `engineering/` (repo root) on both `main` (22eac98, 2026-10-28) and `rc/v5`. `rc/v5` has a superset (it adds `reviews/telemetry-v062-generalist-slice.md` and newer `status.md`), so the branch is based on `origin/rc/v5` and mirrors box `egg-farm-studio/engineering/` to repo `engineering/`.
- Already in the repo before this audit (8 files): ci-gates.md, decisions.md, golden/flagoff-golden.a01faea.test.ts, golden/m4on-golden.90a9c84.test.ts, m4-design.md, reviews/m4-on-test-triage.md, reviews/telemetry-v062-generalist-slice.md, status.md.

## Classification (box engineering/ = 1612 files, 73 MB)
- In sync: 1 (reviews/telemetry-v062-generalist-slice.md)
- Repo-only (not on box, kept as is): 4 (ci-gates.md, m4-design.md, golden/flagoff-golden.a01faea.test.ts, golden/m4on-golden.90a9c84.test.ts)
- Out of date / diverged: 3. The repo copies are curated "repo copy" documents with content the box canonical lacks (for example ADR M4-1..7 in decisions.md; the FINAL triage in m4-on-test-triage.md), so they are NOT overwritten. The box canonical versions are added alongside:
  - engineering/decisions.md -> added engineering/decisions-canonical.md
  - engineering/status.md -> added engineering/status-canonical.md
  - engineering/reviews/m4-on-test-triage.md -> added engineering/reviews/m4-on-test-triage-saves-c3811f7.md
- Missing (box-only), added: 1587 files + the 3 canonical copies = 1590 files, plus this report.

| folder | files added |
|---|---|
| (top-level) | 28 |
| design | 3 |
| hiring | 5 |
| reviews | 537 |
| scratch | 30 |
| screenshots | 520 |
| tasks | 438 |
| triage | 29 |

Includes every HANDOFF.md under tasks/, tasks/v5-refill-sim/G0-API.md, tasks/v5-ui-ss-fatigue/SIM-API.md, tasks/v5-ui-streak-tapcoins/literals.md, v5-flag-table.md, v5-sim-build-state.md, v5-ui-build-state.md, v5-rc-manifest.md, hiring/ specs, design/ notes and reviews/ (with evidence shots).

## Skipped
- engineering/builds/*.html (13 files, ~6 MB): single-file build outputs; reproducible from their shas.
- *.bundle (8 files: tasks/bbv2/gen-bbv2-*.bundle x5, tasks/zeroGainUi/gen-*.bundle x3): git bundles (commit transport), not docs.
- Nothing over 5 MB; no node_modules or caches inside engineering/.

## Secrets
- Scanned all text files for GitHub/AWS/Slack/OpenAI-style tokens, private keys, .env/.pem/.key files and password/secret/token assignments. None found; nothing excluded.

## Code: unpushed local branches (game repo, 255 local branches)
45 branches have commits that are on no remote. None pushed by this audit (see PR notes). Format: commits | branch | remote state | last commit (CET/CEST) | author | worktree.

- 1|saves/103-zg-smoke-30df38c|no-remote|2026-11-05 22:15:28 +0100|Senior Engineer, Saves & Persistence|/workspace/wt-saves-103-zg-smoke
- 2|architect/pr84-resume|no-remote|2026-11-05 20:56:07 +0100|Senior Software Architect|/workspace/wt-v5-review84
- 3|backup/v5-golden-rewards-2c16832|no-remote|2026-11-05 20:51:51 +0100|Senior Engineer, Features & Economy Wiring|none
- 2|archive/v5-tapcoins-f7303c6|no-remote|2026-11-05 20:31:37 +0100|Senior Engineer, Features & Economy Wiring|none
- 1|archive/v5-income-ref-afa8038|no-remote|2026-11-05 20:29:04 +0100|Senior Engineer, Features & Economy Wiring|none
- 2|fix/v5-sim-flag-list|no-remote|2026-10-30 16:01:46 +0100|Senior Software Architect|/workspace/wt-arch-sim-flag-list
- 5|gen/bbv2-base65a7443|no-remote|2026-10-30 15:01:28 +0100|Senior Engineer, Generalist (Sim/TS + UI)|none
- 5|fix/v5-ccr-f2-f6|no-remote|2026-10-30 13:59:14 +0100|Senior Engineer, UI & rc1 Fixes|/workspace/wt-v5-ccr-f2-f6
- 6|fix/v5-wk375-gotit-focus|no-remote|2026-10-30 13:52:38 +0100|Senior Engineer, UI & rc1 Fixes|/workspace/wt-v5-gotit-focus
- 2|econ/k10-harness|no-remote|2026-10-30 13:50:28 +0100|Economy/Balance Designer|/workspace/scratch-econ-k10
- 1|econ/source-o1a|no-remote|2026-10-30 12:32:25 +0100|Economy/Balance Designer|/workspace/scratch-econ-source
- 1|tests/bot-m5b-port-rf3-rf4|no-remote|2026-10-30 12:16:38 +0100|Senior Engineer, Saves & Persistence|/workspace/wt-pr94-rf
- 3|fix/v5-ccr-f2|no-remote|2026-10-30 12:05:17 +0100|Senior Engineer, UI & rc1 Fixes|/workspace/wt-v5-ccr-f2
- 2|fix/v5-ff375-sell-clip|no-remote|2026-10-30 11:44:53 +0100|Senior Engineer, UI & rc1 Fixes|/workspace/wt-v5-sell-clip
- 1|x1/dryrun-pr92-2d15dac|no-remote|2026-10-30 11:00:21 +0100|Senior Software Architect|none
- 2|econ/ac7-gate-csv-arg|no-remote|2026-10-30 10:57:48 +0100|Economy/Balance Designer|/workspace/scratch-econ-ac7csv
- 1|wip/f3-pause-bound-0.36-tests|no-remote|2026-10-30 08:44:43 +0100|Senior Software Architect|none
- 1|feat/saves-v5-streak-sim|no-remote|2026-10-29 20:59:06 +0100|Senior Engineer, Saves & Persistence|none
- 2|econ/m51-farm-cost-r27-29-pre-b563c75|no-remote|2026-10-29 20:40:59 +0100|Economy/Balance Designer|none
- 6|m41-patch1-local|no-remote|2026-10-24 17:23:28 +0200|Senior Engineer, UI & rc1 Fixes|/workspace/wt-scratch-asleep-sizing
- 1|scratch/m41-patch1|no-remote|2026-10-24 16:42:22 +0200|Senior Engineer, UI & rc1 Fixes|none
- 1|fix/saves-csr-loadsafe|DIVERGED|2026-10-22 22:20:09 +0200|Senior Engineer, Saves & Persistence|none
- 1|wip/m41-9-bignum-6d6293e|no-remote|2026-10-22 21:39:29 +0200|Senior Engineer, UI & rc1 Fixes|none
- 2|wip/m41-9-ux-minors-1ad65d6|no-remote|2026-10-22 21:30:23 +0200|Senior Engineer, UI & rc1 Fixes|none
- 8|tmp/cand-b-l30code|no-remote|2026-10-19 09:08:56 +0200|Senior Software Architect|/workspace/wt-arch-cand-b-l30
- 1|test/m4on-saves-artifacts|no-remote|2026-10-19 00:14:27 +0200|Senior Engineer, Saves & Persistence|/workspace/wt-m4on-triage
- 10|fix/saves-sd5-1b|no-remote|2026-10-17 10:05:21 +0200|Senior Engineer, Saves & Persistence|/workspace/wt-saves-1b
- 3|econ/l30plus-c2|no-remote|2026-10-17 09:31:50 +0200|Senior Engineer, Features & Economy Wiring|/workspace/wt-l30c2
- 1|m4/m4a-tracks-v4-frz|no-remote|2026-10-17 09:20:36 +0200|Senior Engineer, Features & Economy Wiring|/workspace/wt-m4a-frz
- 4|econ/f1-workers-gate-v3|remote-exists-FF|2026-10-17 08:16:27 +0200|Senior Engineer, Features & Economy Wiring|/workspace/wt-f1-workers-gate-v3
- 1|econ/l30plus-v2|remote-exists-FF|2026-10-17 07:33:03 +0200|Senior Engineer, Features & Economy Wiring|/workspace/wt-l30
- 2|art/pr25-48px|no-remote|2026-10-17 07:32:46 +0200|Senior Engineer, Saves & Persistence|none
- 2|econ/f1-cost-overrides-crlf|no-remote|2026-10-17 07:07:29 +0200|Senior Engineer, UI & rc1 Fixes|/workspace/wt-f1-crlf
- 1|fix/b5-fixture-threshold-f1|no-remote|2026-10-17 07:03:58 +0200|Senior Engineer, UI & rc1 Fixes|/workspace/wt-b5f1
- 1|econ/f1-workers-gate-v2|no-remote|2026-10-17 00:43:54 +0200|Senior Engineer, Features & Economy Wiring|/workspace/wt-f1-workers-gate-v2
- 1|econ/f1-workers-gate|no-remote|2026-10-17 00:35:02 +0200|Senior Engineer, Features & Economy Wiring|/workspace/wt-f1-workers-gate
- 1|fix/saves-sd5-1|remote-exists-FF|2026-10-17 00:34:38 +0200|Senior Engineer, Saves & Persistence|/workspace/wt-saves
- 4|m4/m4a-migration-wip|no-remote|2026-10-16 22:37:50 +0200|Senior Engineer, Features & Economy Wiring|none
- 1|m4a/farm-badge-v3|no-remote|2026-10-16 22:09:22 +0200|Senior Engineer, Features & Economy Wiring|none
- 1|m4a/debug-buttons-v3|no-remote|2026-10-16 22:09:22 +0200|Senior Engineer, Features & Economy Wiring|/workspace/wt-features
- 4|feat/build-html-singlefile|no-remote|2026-10-16 21:09:58 +0200|Senior Engineer, UI & rc1 Fixes|/workspace/wt-html
- 3|fix/rc1-b1-coop-full|no-remote|2026-10-16 21:09:06 +0200|Senior Engineer, UI & rc1 Fixes|/workspace/wt-b1
- 5|fix/rc1-cuta-followups|no-remote|2026-10-16 20:55:29 +0200|Senior Engineer, UI & rc1 Fixes|/workspace/wt-cuta
- 1|m4a/debug-buttons|no-remote|2026-10-16 20:29:59 +0200|Senior Engineer, Features & Economy Wiring|none
- 1|feat/ui-audio-juice-v1|no-remote|2026-10-16 19:42:10 +0200|Senior Engineer, UI & rc1 Fixes|/workspace/wt-audio

Note: `fix/saves-csr-loadsafe` has DIVERGED from origin (needs force: not pushable as-is). Separate repo /workspace/scratch-econ-ac7csv-rebase (Economy, origin is a local path) was not audited further.

## Code: uncommitted changes in worktrees (412 worktrees scanned; report only, nothing touched)
Format: path | HEAD | changed entries | first entries.

- /workspace/egg-farm-studio/game|f1/cost-segments|2|?? dd223f510e9acabf9b1915b56e39da8b88dcac63;?? qa/;
- /tmp/h3-trial|HEAD|6| M src/ui/features.ts; M src/ui/streak-meter.ts; M tests/v5-streak-app.test.ts;?? probe.mjs;
- /workspace/egg-farm-studio/art-ux/scratch/m41-846178a-l30csv|HEAD|2| M data/economy.csv; M src/config/balance.json;
- /workspace/egg-farm-studio/art-ux/scratch/rc1-5d9efa6|HEAD|1|?? scripts/art-sweep.mjs;
- /workspace/egg-farm-studio/game-m3|m3/xbrowser-harness|5| M package-lock.json; M package.json;?? scripts/make-m1rc2-fixture.mjs;?? scripts/xbrowser-smoke.mjs;
- /workspace/egg-farm-studio/qa/scratch/pr7-3b464ea|HEAD|1|?? qa-mut/;
- /workspace/egg-farm-studio/qa/scratch/pr7-b1004e7|HEAD|1|?? qa-mut/;
- /workspace/egg-farm-studio/qa/wt-l30fix-C2|HEAD|5| M data/economy.csv; M src/config/balance.json; M tests/ac7-worst-seed.slow.test.ts; M tests/fixtures/seller_variance.json;
- /workspace/egg-farm-studio/scratch/artux-1371305|HEAD|3|?? artux-probe.mjs;?? build-qa.log;?? npmci.log;
- /workspace/egg-farm-studio/scratch/artux-8932a01|HEAD|1|?? build-qa.log;
- /workspace/egg-farm-studio/scratch/artux-main|HEAD|1|?? build-qa.log;
- /workspace/egg-farm-studio/worktrees/rev-clockwage-S1S2|HEAD|2| M src/sim/tick.ts;?? tests/zz-arch-seam-probe.test.ts;
- /workspace/egg-farm-studio/worktrees/scratch-hire3-visual|HEAD|14| M src/config/balance.json; M src/ui/features.ts;A  src/ui/streak-chips.ts;A  src/ui/streak-f6-stub.ts;
- /workspace/iso-review-107-proposed-19121b7|HEAD|7|M  src/config/formulas.ts;M  src/config/m5-rules.ts;M  src/sim/effects.ts;A  src/sim/golden.ts;
- /workspace/play-build|HEAD|1|?? .play-single.config.mjs;
- /workspace/review-4b099b1|HEAD|1| M tests/fixtures/product/economy.csv;
- /workspace/review-6b0bfd7|HEAD|1| M tests/fixtures/product/economy.csv;
- /workspace/review-7380b86|HEAD|1| M tests/fixtures/product/economy.csv;
- /workspace/review-a3dada7|HEAD|1| M tests/fixtures/product/economy.csv;
- /workspace/review-b765e14|HEAD|1| M tests/fixtures/product/economy.csv;
- /workspace/review-b9acb23|HEAD|1| M tests/fixtures/product/economy.csv;
- /workspace/review-ec0f1b3|HEAD|1| M tests/fixtures/product/economy.csv;
- /workspace/review-f09c861|HEAD|1| M tests/fixtures/product/economy.csv;
- /workspace/rv31|HEAD|1| M data/economy.f1.csv;
- /workspace/rv31-base|HEAD|1| M data/economy.f1.csv;
- /workspace/wt-arch-bundle-check|arch/l30plus-bundle-check|2| M scripts/l30plus-trace.ts; M scripts/measure-l30plus.ts;
- /workspace/wt-arch-review108-mfwd|HEAD|30|A  engineering/reviews/telemetry-v062-generalist-slice.md;M  engineering/status.md;M  scripts/check-release-build.mjs;M  src/config/balance.json;
- /workspace/wt-arch-review117|HEAD|2|?? src/telemetry/schema.base-arch.ts;?? tests/zz-arch-probe-117.test.ts;
- /workspace/wt-architect-golden|HEAD|1|?? golden/;
- /workspace/wt-cuta3|rc1/ux-clarity-v3|1| M tests/fixtures/product/economy.csv;
- /workspace/wt-gen-broody-base|HEAD|1|?? tests/zz-flag0-trace.test.ts;
- /workspace/wt-gen-zerogainui|gen/zero-gain-ui|1| M src/config/balance.json;
- /workspace/wt-hidden|fix/hidden-tab-offline-fwd|1|?? .gates/;
- /workspace/wt-l30plus-45|HEAD|2|?? data/staging/economy.l30plus.csv;?? tests/tmp-review/;
- /workspace/wt-l30plus-review|HEAD|1|?? tests/tmp-review/;
- /workspace/wt-m41-11|fix/m41-11-egg-unlock-level|2| M src/ui/app.ts; M src/ui/tracks-ui.ts;
- /workspace/wt-m41-rv4|fix/m41-rv4-strings|5| M src/ui/app.ts; M src/ui/styles.css; M src/ui/tracks-ui.ts; M tests/m4a-tracks-ui.test.ts;
- /workspace/wt-pr46-e43bc00|HEAD|1|?? tests/tmp-review/;
- /workspace/wt-review-106-dc58705|HEAD|1|?? .vitest-eng.lock;
- /workspace/wt-review-110-16d91de|HEAD|1|?? .vitest-eng.lock;
- /workspace/wt-review-112-7a492e5|HEAD|1|?? .vitest-eng.lock;
- /workspace/wt-review-114-98e1af5|HEAD|1|?? .vitest-eng.lock;
- /workspace/wt-review-114-9e043c4|HEAD|1|?? .vitest-eng.lock;
- /workspace/wt-review-115-57c187e|HEAD|1|?? .vitest-eng.lock;
- /workspace/wt-saves|fix/saves-sd5-1|1|?? .gates/;
- /workspace/wt-v3main|rc1/ux-clarity-v3-main|1| M tests/fixtures/product/economy.csv;
- /workspace/wt-v5-105-mergefwd|feat/v5-income-ref|1|?? .vitest-eng.lock;
- /workspace/wt-v5-botm5b-ref|HEAD|4|?? m5l.ts;?? m5lx.ts;?? m5p.ts;?? m5px.ts;
- /workspace/wt-v5-review104|HEAD|1|?? tests/architect104-resize.test.ts;
