#!/bin/bash
# usage: run.sh <label> [full]  (tsc --noEmit + targeted vitest as the author ran it, maxWorkers=2; "full" = whole suite)
cd /workspace/egg-farm-studio/qa/scratch/wt-pr87-504d279
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-504d279
L=$1
{ echo "== $L @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; git diff --stat; npx tsc --noEmit; echo "tsc exit=$?"; } > $W/$L-tsc.log 2>&1
if [ "$2" = full ]; then T=""; else T="tests/v5-streak-sim.test.ts tests/v5-f2-m5-fields.test.ts tests/v5-f1a-fields.test.ts tests/v5-f2-game-settle.test.ts tests/v5-f2-roundtrip.test.ts tests/v5-f2-downgrade.test.ts"; fi
{ npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose $T; echo "vitest exit=$?"; } > $W/$L-vitest.log 2>&1
echo DONE >> $W/$L-vitest.log
