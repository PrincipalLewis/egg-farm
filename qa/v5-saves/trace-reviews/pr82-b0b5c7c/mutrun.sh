#!/bin/bash
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-b0b5c7c
cd /workspace/egg-farm-studio/qa/scratch/wt-pr82-b0b5c7c
$W/run.sh 10-baseline tests/verify.test.ts
for m in K1-validate-accepts-any-flag-value K2-sync-absent-flag-becomes-1 K3-mapped-cols-drop-rest_recovery_mult K4-drop-rest-mult-gt0-guard K5-rest-mult-bound-0.4 P1-ccr-isPaused-no-flag-gate P2-ccr-income-raw-paused-read; do
  python3 $W/mutate.py $m > $W/30-mut-$m.apply.log 2>&1 || { echo "APPLY FAIL $m" >> $W/30-mutrun.log; git checkout -q -- src scripts; continue; }
  $W/run.sh 30-mut-$m
  git checkout -q -- src scripts; echo "$m reverted; status: [$(git status --porcelain)]" >> $W/30-mutrun.log
done
echo ALLDONE >> $W/30-mutrun.log
