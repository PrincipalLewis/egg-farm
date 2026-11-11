#!/bin/bash
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr80-174286e
cd /workspace/egg-farm-studio/qa/scratch/wt-pr80-174286e
npm ci > $W/00-npm-ci.log 2>&1; echo "EXIT=$?" >> $W/00-npm-ci.log
{ echo "== tsc @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; npx tsc --noEmit; echo "tsc exit=$?"; } > $W/10-tsc.log 2>&1
T=$(ls tests/v5-f1*.test.ts tests/v5-f2*.test.ts); echo "$T" > $W/11-targeted-files.txt
{ npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose --reporter=json --outputFile.json=$W/12-vitest.json $T; echo "vitest exit=$?"; } > $W/12-vitest-verbose.log 2>&1
echo DONE >> $W/12-vitest-verbose.log
