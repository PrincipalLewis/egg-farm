#!/bin/bash
# usage: run.sh <label> [full]   targeted = bot-m5.test.ts + verify.test.ts (maxWorkers=2)
cd /workspace/egg-farm-studio/qa/scratch/wt-pr90-27157b0
L=$1; T="tests/bot-m5.test.ts tests/verify.test.ts"; [ "${2:-}" = full ] && T=""; [ "${2:-}" = bot ] && T="tests/bot-m5.test.ts"
{ echo "== $L @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; git status --porcelain; npx tsc --noEmit; echo "tsc exit=$?"; } > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr90-27157b0/$L-tsc.log 2>&1
{ npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose $T; echo "vitest exit=$?"; } > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr90-27157b0/$L-vitest.log 2>&1
echo DONE >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr90-27157b0/$L-vitest.log
