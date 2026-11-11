#!/bin/bash
# usage: run.sh <label> [full|fast]  targeted = author's 15 files + save suites + goldens (maxWorkers=2)
cd /workspace/egg-farm-studio/qa/scratch/wt-pr91-7d59dda
L=$1
T="tests/m41-p1-live-income.test.ts tests/v5-f1a-fields.test.ts tests/v5-f1b-clock-rng.test.ts tests/v5-f1b-focus-wiring.test.ts tests/v5-f1c-effects.test.ts tests/v5-f2-downgrade.test.ts tests/v5-f2-game-settle.test.ts tests/v5-f2-m5-fields.test.ts tests/v5-f2-roundtrip.test.ts tests/v5-f3-config.test.ts tests/v5-f3-is-paused.test.ts tests/v5-f3-qa-seam.test.ts tests/v5-m5load-pause-sanitize.test.ts tests/v5-streak-sim.test.ts tests/verify.test.ts"
S="tests/save.test.ts tests/save-fixtures.test.ts tests/save-hardening.test.ts tests/csr-loadsafe.test.ts tests/m41-6-roundtrip-migrate.test.ts tests/m4a-save-migrate.test.ts tests/m4a-migrate-v7.test.ts tests/save-recovery-v21.test.ts tests/newer-save.test.ts tests/hidden-save-paths.test.ts tests/save-durability-v4.test.ts"
G="engineering/golden/flagoff-golden.a01faea.test.ts engineering/golden/m4on-golden.90a9c84.test.ts"
case "${2:-}" in full) T="";; fast) T="tests/v5-m5load-pause-sanitize.test.ts tests/v5-f3-is-paused.test.ts tests/v5-streak-sim.test.ts tests/v5-f2-m5-fields.test.ts tests/v5-f2-roundtrip.test.ts tests/v5-f3-config.test.ts";; golden) T="$G";; *) T="$T $S";; esac
{ echo "== $L @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; git status --porcelain; npx tsc --noEmit; echo "tsc exit=$?"; } > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr91-7d59dda/$L-tsc.log 2>&1
{ npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose $T; echo "vitest exit=$?"; } > /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr91-7d59dda/$L-vitest.log 2>&1
echo DONE >> /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr91-7d59dda/$L-vitest.log
