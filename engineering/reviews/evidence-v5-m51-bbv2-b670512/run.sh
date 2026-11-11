#!/usr/bin/env bash
cd /workspace/wt-arch-review100-b670512
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
A=/workspace/egg-farm-studio/engineering/reviews/evidence-v5-m51-bbv2-b670512
{ nice -n 10 npx tsc --noEmit; echo "EXIT:$?"; } > $A/tsc.log 2>&1
{ nice -n 10 npx vite-node scripts/sync-economy-cli.ts -- --check; echo "EXIT:$?"; } > $A/sync-economy-check.log 2>&1
{ nice -n 10 ./node_modules/.bin/vite-node $A/ring-probe.ts; echo "EXIT:$?"; } > $A/ring-probe.log 2>&1
{ echo "HEAD=$(git rev-parse HEAD) porcelain=[$(git status --porcelain)] node=$(node -v)"; flock /workspace/egg-farm-studio/.vitest-eng.lock nice -n 10 npx vitest run --maxWorkers=1 --minWorkers=1 tests/telemetry-ring-export.test.ts tests/telemetry.test.ts tests/telemetry-m3.test.ts tests/telemetry-schema.test.ts tests/export-global.test.ts tests/zg-telemetry-annotate.test.ts tests/bbv2-telemetry.test.ts tests/bbv2-m1-hatch-qe2.test.ts tests/bbv2-m2-ship-nopick.test.ts tests/bbv2-parta.test.ts tests/bbv2-qapicker.test.ts tests/bbv2-qe2.test.ts tests/bbv2-sim.test.ts tests/v5-tap-coins.test.ts tests/v5-income-ref.test.ts tests/v5-f3-config.test.ts tests/v5-f3-is-paused.test.ts tests/v5-f2-game-settle.test.ts tests/v5-f3-qa-seam.test.ts tests/m4a-flag-off.test.ts tests/zg-ui.test.ts engineering/golden/flagoff-golden.a01faea.test.ts engineering/golden/m4on-golden.90a9c84.test.ts; echo "EXIT:$?"; } > $A/focused.log 2>&1
{ nice -n 10 npm run build; echo "EXIT:$?"; } > $A/build.log 2>&1
{ nice -n 10 npm run build:html; echo "EXIT:$?"; echo "porcelain-after=[$(git status --porcelain)]"; } > $A/build-html.log 2>&1
