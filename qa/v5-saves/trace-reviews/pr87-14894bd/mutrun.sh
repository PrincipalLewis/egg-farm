#!/bin/bash
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-14894bd
cd /workspace/egg-farm-studio/qa/scratch/wt-pr87-14894bd
npm ci > $W/00-npm-ci.log 2>&1; echo "EXIT=$?" >> $W/00-npm-ci.log
$W/run.sh 10-baseline
for m in S1a-flag-absent-means-on S1b-flag-ignored 'S2-decay-on-unfocused-ticks(timers.ts)' S3-no-credit-window S4-no-K18-clamp S5-MH-focus-sale-no-streak S6-offline-keeps-streak S7-unlock-off-by-one S8-tap-does-not-restart-hold S9-extra-coins-full-value S11-MH-unfocused-not-suspended S12-no-reload-peak-on-pagehide; do
  f=$(echo "$m" | tr -d '()' | tr '.' '_')
  python3 $W/mutate.py "$m" > $W/30-mut-$f.apply.log 2>&1 || { echo "APPLY FAIL $m" >> $W/30-mutrun.log; git checkout -q -- src; continue; }
  $W/run.sh 30-mut-$f
  git checkout -q -- src; echo "$m reverted; status: [$(git status --porcelain)]" >> $W/30-mutrun.log
done
echo ALLDONE >> $W/30-mutrun.log
$W/run.sh 20-full full
