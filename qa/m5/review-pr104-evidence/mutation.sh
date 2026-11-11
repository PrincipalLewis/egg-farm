#!/bin/bash
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
cd /workspace/egg-farm-studio/qa/m5/review-pr104-evidence/checkout
E=/workspace/egg-farm-studio/qa/m5/review-pr104-evidence
exec 9>/workspace/egg-farm-studio/.vitest-eng.lock
flock -w 300 9 || exit 75
cp src/ui/app.ts "$E/app.ts.exact.bak"
cp src/ui/overlay.ts "$E/overlay.ts.exact.bak"
trap 'cp "$E/app.ts.exact.bak" src/ui/app.ts; cp "$E/overlay.ts.exact.bak" src/ui/overlay.ts' EXIT
git show HEAD^:src/ui/app.ts > src/ui/app.ts
git show HEAD^:src/ui/overlay.ts > src/ui/overlay.ts
node node_modules/vitest/vitest.mjs run tests/v5-p8-slim.test.ts -t 'mobile Upgrades -> docked|docked -> mobile|closing Upgrades during resize' > "$E/mutation-red.log" 2>&1; echo $? > "$E/mutation-red.exit"
cp "$E/app.ts.exact.bak" src/ui/app.ts; cp "$E/overlay.ts.exact.bak" src/ui/overlay.ts
node node_modules/vitest/vitest.mjs run tests/v5-p8-slim.test.ts -t 'mobile Upgrades -> docked|docked -> mobile|closing Upgrades during resize' > "$E/mutation-green.log" 2>&1; echo $? > "$E/mutation-green.exit"
git status --porcelain > "$E/final-status.txt"
date -Iseconds > "$E/mutation-done.txt"
