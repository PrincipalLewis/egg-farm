#!/bin/bash
# usage: run.sh <label> [extra test files]  (tsc --noEmit + vitest on the #82 trace files, maxWorkers=2)
cd /workspace/egg-farm-studio/qa/scratch/wt-pr82-b0b5c7c
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-b0b5c7c
L=$1; shift
{ echo "== $L @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; git diff --stat; npx tsc --noEmit; echo "tsc exit=$?"; } > $W/$L-tsc.log 2>&1
{ npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose tests/v5-f3-config.test.ts tests/v5-f3-is-paused.test.ts tests/v5-f3-qa-seam.test.ts tests/m41-p1-live-income.test.ts tests/v5-f2-m5-fields.test.ts "$@"; echo "vitest exit=$?"; } > $W/$L-vitest.log 2>&1
echo DONE >> $W/$L-vitest.log
