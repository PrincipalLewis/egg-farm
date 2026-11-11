#!/bin/bash
E=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr91-7d59dda; WT=/workspace/egg-farm-studio/qa/scratch/wt-pr91-7d59dda; BW=/workspace/egg-farm-studio/qa/scratch/wt-pr91-base-458f74c
(cd $WT && npm ci > $E/00-npm-ci-head.log 2>&1; echo "EXIT=$?" >> $E/00-npm-ci-head.log)
(cd $BW && npm ci > $E/00-npm-ci-base.log 2>&1; echo "EXIT=$?" >> $E/00-npm-ci-base.log)
# (1)/(4) save-fixture probe at base and head (untracked copy, removed after)
for side in base head; do D=$BW; [ $side = head ] && D=$WT
  cp $E/probe-saves.test.ts $D/tests/zz-qa-probe-saves.test.ts
  (cd $D && QA_PROBE_OUT=$E/15-probe-$side.jsonl npx vitest run --minWorkers=1 --maxWorkers=1 tests/zz-qa-probe-saves.test.ts > $E/15-probe-$side.log 2>&1; echo "exit=$?" >> $E/15-probe-$side.log)
  rm -f $D/tests/zz-qa-probe-saves.test.ts
done
diff $E/15-probe-base.jsonl $E/15-probe-head.jsonl > $E/16-probe-diff.txt; echo "diff exit=$?" >> $E/16-probe-diff.txt
(cd $WT && { npx vite-node scripts/sync-economy-cli.ts -- --check; echo "sync exit=$?"; } > $E/05-sync-check.log 2>&1)
$E/run.sh 10-baseline
$E/run.sh 11-goldens golden
cd $WT
for m in $(python3 -c "exec(open('$E/mutate.py').read().split('for f, a, b')[0]); print(' '.join(M))"); do
  f=$(echo "$m" | tr -d '()')
  python3 $E/mutate.py "$m" > $E/30-mut-$f.apply.log 2>&1 || { echo "APPLY FAIL $m" >> $E/30-mutrun.log; git checkout -q -- src tests; continue; }
  $E/run.sh 30-mut-$f fast
  git checkout -q -- src tests; echo "$m reverted; status: [$(git status --porcelain)]" >> $E/30-mutrun.log
done
echo ALLDONE >> $E/30-mutrun.log
$E/run.sh 20-full full
