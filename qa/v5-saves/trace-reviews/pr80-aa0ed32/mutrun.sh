#!/bin/bash
# baseline, then every mutation in sequence: apply, tsc+vitest via run.sh, revert, confirm clean tree
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr80-aa0ed32
cd /workspace/egg-farm-studio/qa/scratch/wt-pr80-aa0ed32
$W/run.sh 10-baseline
for m in Q1-every-tick-focus Q2a-offline-legacy-live-ctx Q2b-offline-m4-live-layfactor Q3-incomePerSec-live-ctx C1-playerSaleCtx-always-attended C2-Game.playerSaleCtx-ignores-attended C3-sellAllPreview-drops-ctx E1-ccr-suspended-ignored E2-ccr-tick-never-suspended S1-ccr-sellAll-ignores-attended; do
  python3 $W/mutate.py $m > $W/30-mut-$m.apply.log 2>&1 || { echo "APPLY FAIL $m" >> $W/30-mutrun.log; git checkout -q -- src; continue; }
  $W/run.sh 30-mut-$m
  git checkout -q -- src; echo "$m reverted; status: [$(git status --porcelain)]" >> $W/30-mutrun.log
done
echo ALLDONE >> $W/30-mutrun.log
