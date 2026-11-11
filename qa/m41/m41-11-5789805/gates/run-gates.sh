#!/bin/bash
# Local gates on committed scripts at 5789805 (D-CEO-15). Clean worktree /tmp/qa-m41-11-5789805.
cd /tmp/qa-m41-11-5789805; G=/workspace/egg-farm-studio/qa/m41/m41-11-5789805/gates
echo "HEAD $(git rev-parse HEAD) porcelain=$(git status --porcelain | wc -l)" > $G/summary.txt
run(){ n=$1; shift; s=$(date +%s); "$@" > $G/$n.log 2>&1; e=$?; echo "$n exit=$e $(( $(date +%s)-s ))s" >> $G/summary.txt; }
run sync-check npx vite-node scripts/sync-economy-cli.ts -- --check
run tsc npx tsc --noEmit
run vitest npx vitest run --minWorkers=1 --maxWorkers=2
run build npm run build
run build-html npm run build:html
run build-qa npm run build:qa
run check-globals flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 npm run check-globals
echo "porcelain-after=$(git status --porcelain | tr '\n' ' ')" >> $G/summary.txt
