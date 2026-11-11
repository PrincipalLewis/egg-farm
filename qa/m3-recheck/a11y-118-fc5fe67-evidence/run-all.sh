#!/usr/bin/env bash
set -uo pipefail
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
S=/workspace/egg-farm-studio/qa/scratch/a11y-118-fc5fe67; WT=$S/wt; LG=$S/logs
cd "$WT"
{ echo "START $(TZ=Europe/Belgrade date -Iseconds) node=$(node -v)"; npm ci --no-audit --no-fund; echo "EXIT=$?"; } > $LG/npm-ci.txt 2>&1; en=$(tail -1 $LG/npm-ci.txt)
{ echo "START $(TZ=Europe/Belgrade date -Iseconds) head=$(git rev-parse HEAD) node=$(node -v)"; ./node_modules/.bin/tsc --noEmit; echo "EXIT=$?"; } > $LG/tsc.txt 2>&1; e0=$(tail -1 $LG/tsc.txt)
bash $S/run-vitest.sh vitest-a11y tests/order-chip-a11y.test.ts --reporter=verbose; e1=$?
bash $S/run-vitest.sh vitest-flagoff-golden engineering/golden/flagoff-golden.a01faea.test.ts engineering/golden/m4on-golden.90a9c84.test.ts tests/m4a-flag-off.test.ts tests/zg-flagoff-dom.test.ts --reporter=verbose; e2=$?
bash $S/run-vitest.sh vitest-full; e3=$?
{ echo "START $(TZ=Europe/Belgrade date -Iseconds)"; npm run build; echo "EXIT=$?"; } > $LG/build.txt 2>&1; e4=$(tail -1 $LG/build.txt)
{ echo "START $(TZ=Europe/Belgrade date -Iseconds)"; npm run build:html; echo "EXIT=$?"; } > $LG/build-html.txt 2>&1; e5=$(tail -1 $LG/build-html.txt)
{ echo "START $(TZ=Europe/Belgrade date -Iseconds)"; npm run build:qa; echo "EXIT=$?"; } > $LG/build-qa.txt 2>&1; e6=$(tail -1 $LG/build-qa.txt)
echo "ALL_DONE npmci=$en tsc=$e0 a11y=$e1 golden=$e2 full=$e3 build=$e4 buildhtml=$e5 buildqa=$e6 $(TZ=Europe/Belgrade date -Iseconds)" > $S/all.done
