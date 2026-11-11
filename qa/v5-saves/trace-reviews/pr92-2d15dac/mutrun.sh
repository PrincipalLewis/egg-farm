#!/bin/bash
E=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr92-2d15dac; WT=/workspace/egg-farm-studio/qa/scratch/wt-pr92-2d15dac; BW=/workspace/egg-farm-studio/qa/scratch/wt-pr92-base-a923206
echo "start $(date '+%T %Z')" > $E/00-timeline.txt
(cd $WT && npm ci > $E/00-npm-ci-head.log 2>&1; echo "EXIT=$?" >> $E/00-npm-ci-head.log)
(cd $BW && npm ci > $E/00-npm-ci-base.log 2>&1; echo "EXIT=$?" >> $E/00-npm-ci-base.log)
# head F-5 test file run on base a923206 (keys absent there): must still pass
cp $WT/tests/v5-m5load-pause-sanitize.test.ts $BW/tests/zz-qa-head-f5.test.ts
(cd $BW && npx vitest run --minWorkers=1 --maxWorkers=1 --reporter=verbose tests/zz-qa-head-f5.test.ts > $E/12-head-file-on-base.log 2>&1; echo "exit=$?" >> $E/12-head-file-on-base.log)
rm -f $BW/tests/zz-qa-head-f5.test.ts
# F-5 probe at head
cp $E/probe-f5.test.ts $WT/tests/zz-qa-probe-f5.test.ts
(cd $WT && QA_PROBE_OUT=$E/13-probe-f5.json npx vitest run --minWorkers=1 --maxWorkers=1 --reporter=verbose tests/zz-qa-probe-f5.test.ts > $E/13-probe-f5.log 2>&1; echo "exit=$?" >> $E/13-probe-f5.log)
rm -f $WT/tests/zz-qa-probe-f5.test.ts
# flags-off save probe (#91 probe) base vs head
for side in base head; do D=$BW; [ $side = head ] && D=$WT
  cp $E/probe-saves.test.ts $D/tests/zz-qa-probe-saves.test.ts
  (cd $D && QA_PROBE_OUT=$E/15-probe-$side.jsonl npx vitest run --minWorkers=1 --maxWorkers=1 tests/zz-qa-probe-saves.test.ts > $E/15-probe-$side.log 2>&1; echo "exit=$?" >> $E/15-probe-$side.log)
  rm -f $D/tests/zz-qa-probe-saves.test.ts
done
diff $E/15-probe-base.jsonl $E/15-probe-head.jsonl > $E/16-probe-diff.txt; echo "diff exit=$?" >> $E/16-probe-diff.txt
echo "probes done $(date '+%T')" >> $E/00-timeline.txt
$E/run.sh 10-target target
$E/run.sh 11-saves saves
echo "saves done $(date '+%T')" >> $E/00-timeline.txt
cd $WT
for m in $(python3 -c "exec(open('$E/mutate.py').read().split('for f, a, b')[0]); print(' '.join(M))"); do
  python3 $E/mutate.py "$m" > $E/30-mut-$m.apply.log 2>&1 || { echo "APPLY FAIL $m" >> $E/30-mutrun.log; git checkout -q -- src tests; continue; }
  $E/run.sh 30-mut-$m mut
  git checkout -q -- src tests; echo "$m reverted; status: [$(git status --porcelain)]" >> $E/30-mutrun.log
done
echo ALLDONE >> $E/30-mutrun.log
echo "mut done $(date '+%T')" >> $E/00-timeline.txt
$E/run.sh 20-full full
echo "full done $(date '+%T')" >> $E/00-timeline.txt
echo ALLDONE >> $E/00-timeline.txt
