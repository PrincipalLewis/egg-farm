#!/bin/bash
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-504d279
cd /workspace/egg-farm-studio/qa/scratch/wt-pr87-504d279
$W/run.sh 10-baseline
for m in S1a-flag-absent-means-on S1b-flag-ignored S2-decay-on-unfocused-ticks S3-no-credit-window S4-no-K18-clamp S5-MH-focus-sale-no-streak S6-offline-keeps-streak S7-unlock-off-by-one S8-tap-does-not-restart-hold S9-extra-coins-full-value; do
  python3 $W/mutate.py $m > $W/30-mut-$m.apply.log 2>&1 || { echo "APPLY FAIL $m" >> $W/30-mutrun.log; git checkout -q -- src; continue; }
  $W/run.sh 30-mut-$m
  git checkout -q -- src; echo "$m reverted; status: [$(git status --porcelain)]" >> $W/30-mutrun.log
done
echo ALLDONE >> $W/30-mutrun.log
