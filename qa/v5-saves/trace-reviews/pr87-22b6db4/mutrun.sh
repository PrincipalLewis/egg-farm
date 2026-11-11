#!/bin/bash
cd /workspace/egg-farm-studio/qa/scratch/wt-pr87-22b6db4
npm ci > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/00-npm-ci.log 2>&1; echo "EXIT=$?" >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/00-npm-ci.log
/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/run.sh 10-baseline
for s in 1 2 3; do /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/run.sh 15-f1c-shuffle-seed$s f1c-shuffle $s; done
for m in S1a-flag-absent-means-on S1b-flag-ignored S2-decay-on-unfocused-ticks S3-no-credit-window S4-no-K18-clamp 'S5-MH-focus-sale-no-streak(effects)' S6-offline-keeps-streak S7-unlock-off-by-one S8-tap-does-not-restart-hold 'S9-extra-coins-full-value(actions)' 'S11-MH-unfocused-not-suspended(tick)' S12-no-reload-peak-on-pagehide S13-streak-entry-removed S14-streak-entry-wrong-flag S15-player-unattended-sale-gets-streak S16-streak-applied-twice T1-f1c-no-beforeEach-reset; do
  f=$(echo "$m" | tr -d '()')
  python3 /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/mutate.py "$m" > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/30-mut-$f.apply.log 2>&1 || { echo "APPLY FAIL $m" >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/30-mutrun.log; git checkout -q -- src tests; continue; }
  /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/run.sh 30-mut-$f
  git checkout -q -- src tests; echo "$m reverted; status: [$(git status --porcelain)]" >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/30-mutrun.log
done
echo ALLDONE >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/30-mutrun.log
/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/run.sh 20-full full
