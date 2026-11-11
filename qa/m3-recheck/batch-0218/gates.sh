#!/bin/bash
# gates.sh <sha> <name>: local merge with origin/main in /tmp worktree, run unit/tsc/sync/build/build:qa
set -u; SHA=$1; N=$2; R=/workspace/egg-farm-studio/game; E=/workspace/egg-farm-studio/qa/m3-recheck/$N-evidence; mkdir -p $E; W=/tmp/qa-$N
cd $R; T=$(git merge-tree --write-tree $SHA origin/main) || { echo CONFLICT; exit 2; }
C=$(git commit-tree $T -p $SHA -p origin/main -m "qa local merge $N"); echo "pr=$SHA main=$(git rev-parse --short origin/main) localmerge=$C" > $E/head.txt
git worktree add -q --detach $W $C; ln -s $R/node_modules $W/node_modules; cd $W
(npx tsc --noEmit; echo tsc-exit=$?) > $E/tsc.log 2>&1
(npx vite-node scripts/sync-economy-cli.ts -- --check; echo sync-exit=$?) > $E/sync.log 2>&1
(npm test -- --maxWorkers=2 --minWorkers=1; echo exit=$?) > $E/unit.log 2>&1
(npx vite build && node scripts/check-release-build.mjs dist; echo build-exit=$?) > $E/build.log 2>&1
(npx vite build --mode qa --outDir dist-qa; echo exit=$?) > $E/build-qa.log 2>&1
echo GATES-DONE $N
