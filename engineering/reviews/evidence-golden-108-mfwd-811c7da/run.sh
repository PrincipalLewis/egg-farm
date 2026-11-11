#!/usr/bin/env bash
cd /workspace/wt-arch-review108-mfwd
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH ARCH_OUT=/workspace/egg-farm-studio/engineering/reviews/evidence-golden-108-mfwd-811c7da
A=$ARCH_OUT
[ -d node_modules ] || ln -s /workspace/wt-arch-review100-b670512/node_modules node_modules
{ nice -n 10 npx tsc --noEmit; echo "EXIT:$?"; } > $A/tsc.log 2>&1
{ echo "base HEAD=$(git rev-parse HEAD) MERGE_HEAD=$(git rev-parse MERGE_HEAD) node=$(node -v)"; flock /workspace/egg-farm-studio/.vitest-eng.lock nice -n 10 npx vitest run --maxWorkers=1 --minWorkers=1 tests/zz-arch-probe-108.test.ts tests/v5-golden-spawn.test.ts tests/v5-golden-rewards.test.ts tests/v5-golden-m5persist.test.ts tests/v5-abilities-sim.test.ts tests/v5-f1a-fields.test.ts tests/v5-f1b-clock-rng.test.ts tests/v5-f1b-focus-wiring.test.ts tests/v5-f1c-effects.test.ts tests/v5-f2-m5-fields.test.ts tests/v5-f2-roundtrip.test.ts tests/v5-f2-downgrade.test.ts tests/v5-f2-game-settle.test.ts tests/v5-m5load-pause-sanitize.test.ts tests/v5-income-ref.test.ts tests/bot-m5.test.ts engineering/golden/flagoff-golden.a01faea.test.ts engineering/golden/m4on-golden.90a9c84.test.ts; echo "EXIT:$?"; } > $A/focused.log 2>&1
