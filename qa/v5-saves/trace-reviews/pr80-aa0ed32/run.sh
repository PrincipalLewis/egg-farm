#!/bin/bash
# usage: run.sh <label>  (tsc --noEmit + vitest on the #80 trace-relevant files, maxWorkers=2)
cd /workspace/egg-farm-studio/qa/scratch/wt-pr80-aa0ed32
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr80-aa0ed32
L=$1
{ echo "== $L @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; git diff --stat; npx tsc --noEmit; echo "tsc exit=$?"; } > $W/$L-tsc.log 2>&1
{ npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose tests/v5-f1c-effects.test.ts tests/v5-f1b-clock-rng.test.ts tests/v5-f1b-focus-wiring.test.ts tests/v5-f1a-fields.test.ts tests/v5-f2-m5-fields.test.ts; echo "vitest exit=$?"; } > $W/$L-vitest.log 2>&1
echo DONE >> $W/$L-vitest.log
