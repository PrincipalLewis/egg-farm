#!/usr/bin/env bash
cd /tmp/rev118
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
A=/workspace/egg-farm-studio/engineering/reviews/evidence-order-chip-118-fc5fe67
{ echo "HEAD=$(git rev-parse HEAD) node=$(node -v)"; nice -n 10 npx tsc --noEmit; echo "EXIT:$?"; } > $A/tsc.log 2>&1
{ nice -n 10 npx vite-node scripts/sync-economy-cli.ts -- --check; echo "EXIT:$?"; } > $A/sync.log 2>&1
{ flock /workspace/egg-farm-studio/.vitest-eng.lock nice -n 10 npx vitest run --maxWorkers=1 --minWorkers=1 tests/order-chip-a11y.test.ts $(ls tests | rg -i 'app|ui|chip|queue' | sed 's#^#tests/#' | tr '\n' ' '); echo "EXIT:$?"; } > $A/focused.log 2>&1
echo DONE > $A/state.txt
