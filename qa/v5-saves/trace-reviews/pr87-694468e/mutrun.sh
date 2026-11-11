#!/bin/bash
E=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-694468e
cd /workspace/egg-farm-studio/qa/scratch/wt-pr87-694468e
npm ci > $E/00-npm-ci.log 2>&1; echo "EXIT=$?" >> $E/00-npm-ci.log
{ npm run sync-economy -- --check; echo "sync-economy --check exit=$?"; } > $E/05-sync-economy-check.log 2>&1
$E/run.sh 10-baseline
for m in $(python3 -c "exec(open('$E/mutate.py').read().split('for f, a, b')[0]); print(' '.join(M))"); do
  f=$(echo "$m" | tr -d '()')
  python3 $E/mutate.py "$m" > $E/30-mut-$f.apply.log 2>&1 || { echo "APPLY FAIL $m" >> $E/30-mutrun.log; git checkout -q -- src tests scripts; continue; }
  $E/run.sh 30-mut-$f
  git checkout -q -- src tests scripts; echo "$m reverted; status: [$(git status --porcelain)]" >> $E/30-mutrun.log
done
echo ALLDONE >> $E/30-mutrun.log
$E/run.sh 20-full full
