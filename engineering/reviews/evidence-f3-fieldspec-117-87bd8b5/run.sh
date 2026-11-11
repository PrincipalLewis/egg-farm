#!/usr/bin/env bash
cd /workspace/wt-arch-review117
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH ARCH_OUT=/workspace/egg-farm-studio/engineering/reviews/evidence-f3-fieldspec-117-87bd8b5
A=$ARCH_OUT
{ echo "HEAD=$(git rev-parse HEAD) node=$(node -v) untracked=[$(git status --porcelain | tr '\n' ' ')]"; nice -n 10 npx tsc --noEmit; echo "EXIT:$?"; } > $A/tsc.log 2>&1
{ nice -n 10 npx vite-node scripts/sync-economy-cli.ts -- --check; echo "EXIT:$?"; } > $A/sync-economy-check.log 2>&1
{ flock /workspace/egg-farm-studio/.vitest-eng.lock nice -n 10 npx vitest run --maxWorkers=1 --minWorkers=1 tests/zz-arch-probe-117.test.ts tests/telemetry-schema.test.ts tests/telemetry.test.ts tests/telemetry-m3.test.ts tests/telemetry-ring-export.test.ts tests/export-global.test.ts tests/zg-telemetry-annotate.test.ts; echo "EXIT:$?"; } > $A/focused.log 2>&1
