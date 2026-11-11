#!/bin/bash
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
cd /workspace/egg-farm-studio/qa/m5/review-pr104-evidence/checkout
E=/workspace/egg-farm-studio/qa/m5/review-pr104-evidence
node --version > "$E/node.txt"
node node_modules/typescript/bin/tsc --noEmit > "$E/tsc.log" 2>&1; echo $? > "$E/tsc.exit"
flock -w 900 /workspace/egg-farm-studio/.vitest-eng.lock bash -c '
E=/workspace/egg-farm-studio/qa/m5/review-pr104-evidence
node node_modules/vitest/vitest.mjs run tests/v5-p8-slim.test.ts tests/v5-f1b-focus-wiring.test.ts tests/v5-f1c-effects.test.ts > "$E/targeted.log" 2>&1; echo $? > "$E/targeted.exit"
node node_modules/vitest/vitest.mjs run > "$E/full.log" 2>&1; echo $? > "$E/full.exit"
' > "$E/lock.log" 2>&1; echo $? > "$E/lock.exit"
date -Iseconds > "$E/done.txt"
