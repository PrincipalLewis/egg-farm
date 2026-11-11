#!/bin/bash
# Local gates on committed scripts at fcf9823 (D-CEO-15). Clean worktree /tmp/qa-m41-8-fcf9823.
cd /tmp/qa-m41-8-fcf9823; G=/workspace/egg-farm-studio/qa/m41/m41-8-fcf9823/gates
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
