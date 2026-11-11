#!/bin/bash
# usage: run.sh <label> [full|f1c-shuffle]  (tsc + author's 12 targeted files, maxWorkers=2)
cd /workspace/egg-farm-studio/qa/scratch/wt-pr87-22b6db4
L=$1; X=""
T="tests/market.test.ts tests/payout-parity.test.ts tests/sellall-label-grader.test.ts tests/v5-f1a-fields.test.ts tests/v5-f1b-clock-rng.test.ts tests/v5-f1b-focus-wiring.test.ts tests/v5-f1c-effects.test.ts tests/v5-f2-downgrade.test.ts tests/v5-f2-game-settle.test.ts tests/v5-f2-m5-fields.test.ts tests/v5-f2-roundtrip.test.ts tests/v5-streak-sim.test.ts"
[ "${2:-}" = full ] && T=""
[ "${2:-}" = f1c ] && T="tests/v5-f1c-effects.test.ts"
[ "${2:-}" = f1c-shuffle ] && { T="tests/v5-f1c-effects.test.ts"; X="--sequence.shuffle --sequence.seed=${3:-1}"; }
{ echo "== $L @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; git status --porcelain; npx tsc --noEmit; echo "tsc exit=$?"; } > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/$L-tsc.log 2>&1
{ npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose $X $T; echo "vitest exit=$?"; } > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/$L-vitest.log 2>&1
echo DONE >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr87-22b6db4/$L-vitest.log
