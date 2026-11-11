#!/usr/bin/env bash
set -uo pipefail
S=/workspace/egg-farm-studio/qa/scratch/goldens-111-cf55d44; WT=$S/wt; LG=$S/logs
cd "$WT"
{ echo "START $(TZ=Europe/Belgrade date -Iseconds)"; npm ci --no-audit --no-fund; echo "EXIT=$?"; } > $LG/npm-ci.txt 2>&1; en=$(tail -1 $LG/npm-ci.txt)
{ echo "START $(TZ=Europe/Belgrade date -Iseconds) head=$(git rev-parse HEAD)"; ./node_modules/.bin/tsc --noEmit; echo "EXIT=$?"; } > $LG/tsc.txt 2>&1; e0=$(tail -1 $LG/tsc.txt)
bash $S/run-vitest.sh vitest-final-a tests/v5-golden-game.test.ts --reporter=verbose; e1=$?
bash $S/run-vitest.sh vitest-flagoff-golden engineering/golden/flagoff-golden.a01faea.test.ts engineering/golden/m4on-golden.90a9c84.test.ts tests/m4a-flag-off.test.ts tests/zg-flagoff-dom.test.ts --reporter=verbose; e2=$?
bash $S/run-vitest.sh vitest-full; e3=$?
{ echo "START $(TZ=Europe/Belgrade date -Iseconds)"; npm run build; echo "EXIT=$?"; } > $LG/build.txt 2>&1; e4=$(tail -1 $LG/build.txt)
echo "ALL_DONE npmci=$en tsc=$e0 finalA=$e1 golden=$e2 full=$e3 build=$e4 $(TZ=Europe/Belgrade date -Iseconds)" > $S/all.done
