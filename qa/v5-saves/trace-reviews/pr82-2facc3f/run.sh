#!/bin/bash
# usage: run.sh <label> [full]  (tsc + 13 body-cited files + m41-p1-live-income; maxWorkers=2)
cd /workspace/egg-farm-studio/qa/scratch/wt-pr82-2facc3f
L=$1; T="tests/v5-f3-config.test.ts tests/v5-f3-is-paused.test.ts tests/v5-f3-qa-seam.test.ts tests/v5-f1a-fields.test.ts tests/v5-f1b-clock-rng.test.ts tests/v5-f1b-focus-wiring.test.ts tests/v5-f1c-effects.test.ts tests/v5-f2-downgrade.test.ts tests/v5-f2-game-settle.test.ts tests/v5-f2-m5-fields.test.ts tests/v5-f2-roundtrip.test.ts tests/verify.test.ts tests/bot-m5.test.ts tests/m41-p1-live-income.test.ts"
[ "${2:-}" = full ] && T=""
[ "${2:-}" = f3 ] && T="tests/v5-f3-config.test.ts tests/v5-f3-is-paused.test.ts tests/v5-f3-qa-seam.test.ts tests/m41-p1-live-income.test.ts"
{ echo "== $L @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; git status --porcelain; npx tsc --noEmit; echo "tsc exit=$?"; } > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/$L-tsc.log 2>&1
{ npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose $T; echo "vitest exit=$?"; } > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/$L-vitest.log 2>&1
echo DONE >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr82-2facc3f/$L-vitest.log
