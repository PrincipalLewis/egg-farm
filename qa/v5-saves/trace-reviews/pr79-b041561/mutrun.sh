#!/bin/bash
# runs every mutation in sequence: apply, tsc+vitest via run.sh, revert, confirm clean tree
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr79-b041561
cd /workspace/egg-farm-studio/qa/scratch/wt-pr79-b041561
for m in Q1-every-tick-focus Q2-drop-readOnly Q3-hidden-frame-focus Q4-settle-focus Q5-debugAdvance-focus Q6-focusTicks-plus1 M79-6-probe-flags-off M79-7-wallReady-1s; do
  python3 $W/mutate.py $m > $W/30-mut-$m.apply.log 2>&1 || { echo "APPLY FAIL $m" >> $W/30-mutrun.log; continue; }
  $W/run.sh 30-mut-$m
  git checkout -q -- src; echo "$m reverted; status: [$(git status --porcelain)]" >> $W/30-mutrun.log
done
echo ALLDONE >> $W/30-mutrun.log
