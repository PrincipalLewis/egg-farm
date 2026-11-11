#!/bin/bash
cd /workspace/egg-farm-studio/qa/scratch/wt-pr82-2facc3f
npm ci > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/00-npm-ci.log 2>&1; echo "EXIT=$?" >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/00-npm-ci.log
/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/run.sh 10-baseline
cp /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/probe.test.ts tests/zz-qa-probe.test.ts; npx vitest run --maxWorkers=1 tests/zz-qa-probe.test.ts > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/15-probe.log 2>&1; echo "exit=$?" >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/15-probe.log; rm -f tests/zz-qa-probe.test.ts
for m in K1-validate-accepts-any-flag-value K2-sync-absent-flag-becomes-1 K3-mapped-cols-drop-rest_recovery_mult K4-drop-rest-mult-lower-guard K5-rest-mult-bound-0.4 P1-ccr-isPaused-no-flag-gate P2-ccr-income-raw-paused-read R1-ge0-becomes-gt0 R2-drop-isFinite R3-upper-bound-0.36 R4-upper-bound-0.3500001 R5-upper-bound-strict-lt A1-new-named-literal-in-m5-fields A2-allowlisted-name-in-other-M5-file A3-expression-on-allowlisted-line A4-bare-literal-elsewhere-in-m5-fields; do
  python3 /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/mutate.py "$m" > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/30-mut-$m.apply.log 2>&1 || { echo "APPLY FAIL $m" >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/30-mutrun.log; git checkout -q -- src scripts; continue; }
  /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/run.sh 30-mut-$m f3
  git checkout -q -- src scripts; echo "$m reverted; status: [$(git status --porcelain)]" >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/30-mutrun.log
done
echo ALLDONE >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/30-mutrun.log
/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/run.sh 20-full full
