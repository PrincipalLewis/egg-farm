#!/usr/bin/env bash
cd /workspace/wt-arch-review108-mfwd
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH ARCH_OUT=/workspace/egg-farm-studio/engineering/reviews/evidence-golden-108-mfwd-811c7da
{ echo "tree=$(git write-tree) node=$(node -v)"; flock /workspace/egg-farm-studio/.vitest-eng.lock nice -n 10 npx vitest run --maxWorkers=1 --minWorkers=1 tests/zz-arch-probe-108.test.ts; echo "EXIT:$?"; } > $ARCH_OUT/probe-run2.log 2>&1
