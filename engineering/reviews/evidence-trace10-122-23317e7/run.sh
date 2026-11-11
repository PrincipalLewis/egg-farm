#!/usr/bin/env bash
set -uo pipefail
EV=/workspace/egg-farm-studio/engineering/reviews/evidence-trace10-122-23317e7
W=/workspace/egg-farm-studio/worktrees/rev-122-m1
M=/workspace/egg-farm-studio/worktrees/rev-122-m1-mut
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
cd $W
echo "WAIT_LOCK $(date -Iseconds)"
exec 9>/workspace/egg-farm-studio/.vitest-eng.lock; flock 9
echo "LOCK_ACQUIRED $(date -Iseconds) node=$(node -v) head=$(git rev-parse HEAD) tree=$(git rev-parse HEAD^{tree})"
st() { echo "== $1 exit=$2 $(date -Iseconds)"; }
node node_modules/typescript/bin/tsc --noEmit > $EV/tsc.log 2>&1; st tsc $?
npx vitest run tests/trace10 tests/bot-m5.test.ts tests/v5-golden-m5persist.test.ts tests/v5-golden-rewards.test.ts tests/v5-golden-spawn.test.ts > $EV/focused.log 2>&1; st focused $?
npm test > $EV/full.log 2>&1; st npm-test $?
npx vitest run --config vitest.slow.config.ts tests/bot-m5-trace.slow.test.ts > $EV/slow-botm5-trace.log 2>&1; st slow-bot-m5-trace $?
npm run build > $EV/build.log 2>&1; st build $?
npm run check-globals > $EV/check-globals.log 2>&1; st check-globals $?
cp $EV/reasons.ts scripts/zz-reasons.ts; sed -i "s#'../tests/#'../tests/#" scripts/zz-reasons.ts
node node_modules/vite-node/vite-node.mjs scripts/zz-reasons.ts > $EV/reasons.log 2>&1; st reasons $?; rm -f scripts/zz-reasons.ts
# ---- base comparison: same focused existing tests on base f20b918 ----
git -C /workspace/egg-farm-studio/game worktree add -q --detach $M f20b91839fdf09ba0ed45a890281ccbf7bf2909d && ln -s $W/node_modules $M/node_modules
cd $M && npx vitest run tests/bot-m5.test.ts tests/v5-golden-m5persist.test.ts tests/v5-golden-rewards.test.ts tests/v5-golden-spawn.test.ts > $EV/base-existing.log 2>&1; st base-existing $?
npx vitest run --config vitest.slow.config.ts tests/bot-m5-trace.slow.test.ts > $EV/base-slow-botm5-trace.log 2>&1; st base-slow-bot-m5-trace $?
git checkout -q --detach 23317e7ab0eb8f6b08078398ec39d2638a583c24
mut() { local name=$1 file=$2 expr=$3 test=$4; sed -i "$expr" $file; echo "--- $name diff:" >> $EV/mutations.log; git diff -- $file >> $EV/mutations.log
  npx vitest run $test > $EV/mut-$name.log 2>&1; local rc=$?; git checkout -q -- $file; echo "MUT $name exit=$rc (nonzero = test went red)" | tee -a $EV/mutations.log; }
: > $EV/mutations.log
mut clone-step tests/bot-m5.ts "149s/structuredClone(s))/s)/" tests/trace10/hooks.test.ts
mut clone-end tests/bot-m5.ts "144s/structuredClone(s))/s)/;241s/structuredClone(s))/s)/" tests/trace10/hooks.test.ts
mut r0-twice tests/bot-m5.ts "87s/const u = R0();/const u = R0(); R0();/" tests/trace10/hooks.test.ts
mut variance-late tests/bot-m5.ts "88s/opt.onVariance?.(V);/V.checkInterval(15); opt.onVariance?.(V);/" tests/trace10/hooks.test.ts
mut pyrandom-rename tests/py-random.ts "s/\bmt\b/mtx/g" tests/trace10/rngcursor.test.ts
mut footer-count tests/trace10/compare.ts "27s/^/\/\/ /" tests/trace10/invalid.test.ts
mut tie-order tests/trace10/compare.ts "110s/tick < (best.tick ?? Infinity)/tick <= (best.tick ?? Infinity)/" tests/trace10/selftest.test.ts
git status --short >> $EV/mutations.log; echo "clean-after-mutations: $(git status --porcelain | grep -v node_modules | wc -l) changed files" >> $EV/mutations.log
cd $W; echo "DONE $(date -Iseconds)"
