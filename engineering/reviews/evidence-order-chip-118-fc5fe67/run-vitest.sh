#!/usr/bin/env bash
set -euo pipefail
cd /tmp/rev118
export PATH="/workspace/tools/node-v20.19.2-linux-x64/bin:$PWD/node_modules/.bin:$PATH"
LOCK=/workspace/egg-farm-studio/.vitest-eng.lock
EV=/workspace/egg-farm-studio/engineering/reviews/evidence-order-chip-118-fc5fe67
(
  flock -n 9 || { echo LOCK_HELD; exit 99; }
  echo "=== vitest-focused tinypool-omit-maxWorkers $(TZ=Europe/Belgrade date -Iseconds) ==="
  echo "NOTE: --maxWorkers=1 rejected by tinypool RangeError (minThreads/maxThreads conflict); flock serializes lane (established architect exception)."
  nice -n 10 node ./node_modules/vitest/vitest.mjs run \
    tests/order-chip-a11y.test.ts \
    tests/m41-8-best-chip.test.ts \
    tests/orders.test.ts \
    tests/m41-p2-ui-dom.test.ts \
    tests/m41-7-ui-fixes.test.ts \
    tests/m41-p2-ui-minors.test.ts \
    tests/ui-logic.test.ts \
    tests/zg-ui.test.ts \
    tests/zg-ui-onestrip.test.ts \
    tests/m4a-tracks-ui.test.ts \
    --reporter=verbose
  echo vitest_exit:$?
) 9>"$LOCK" 2>&1 | tee "$EV/vitest-focused.log"
