# gates.sh <sha> <evidence-dir> <worktree>
set -u; SHA=$1; E=$2; W=$3; R=/workspace/egg-farm-studio/game; mkdir -p $E
cd $R; C=$(git commit-tree $(git merge-tree --write-tree $SHA origin/main) -p $SHA -p origin/main -m "qa local merge"); echo "pr=$SHA main=$(git rev-parse --short origin/main) localmerge=$C" > $E/head.txt
git worktree add -q --detach $W $C; ln -s $R/node_modules $W/node_modules; cd $W
git diff --name-only origin/main...$SHA > $E/files.txt
(npx tsc --noEmit; echo tsc-exit=$?) > $E/tsc.log 2>&1
(npx vite-node scripts/sync-economy-cli.ts -- --check; echo sync-exit=$?) > $E/sync.log 2>&1
(npm test -- --maxWorkers=2 --minWorkers=1; echo exit=$?) > $E/unit.log 2>&1
(npm run build; echo build-exit=$?) > $E/build.log 2>&1
