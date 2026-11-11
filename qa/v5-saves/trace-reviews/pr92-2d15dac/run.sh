#!/bin/bash
# usage: run.sh <label> [target|saves|mut|full]   (maxWorkers=2)
cd /workspace/egg-farm-studio/qa/scratch/wt-pr92-2d15dac
E=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr92-2d15dac; L=$1
F="tests/v5-m5load-pause-sanitize.test.ts"
S="tests/v5-m5load-pause-sanitize.test.ts tests/v5-f3-is-paused.test.ts tests/v5-streak-sim.test.ts tests/v5-f2-m5-fields.test.ts tests/v5-f2-roundtrip.test.ts tests/v5-f2-downgrade.test.ts tests/v5-f2-game-settle.test.ts tests/v5-f3-config.test.ts tests/save.test.ts tests/save-fixtures.test.ts tests/save-hardening.test.ts tests/csr-loadsafe.test.ts tests/m41-6-roundtrip-migrate.test.ts tests/m4a-save-migrate.test.ts tests/m4a-migrate-v7.test.ts tests/save-recovery-v21.test.ts tests/newer-save.test.ts tests/hidden-save-paths.test.ts tests/save-durability-v4.test.ts engineering/golden/flagoff-golden.a01faea.test.ts engineering/golden/m4on-golden.90a9c84.test.ts"
case "${2:-target}" in full) T="";; saves) T="$S";; mut) T="$F tests/v5-f3-config.test.ts";; *) T="$F";; esac
{ echo "== $L @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; git status --porcelain; npx tsc --noEmit; echo "tsc exit=$?"; } > $E/$L-tsc.log 2>&1
{ npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose $T; echo "vitest exit=$?"; } > $E/$L-vitest.log 2>&1
echo DONE >> $E/$L-vitest.log
