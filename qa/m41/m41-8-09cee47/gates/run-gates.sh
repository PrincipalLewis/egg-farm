#!/bin/bash
# Local gates on committed scripts at 09cee47 (D-CEO-15). Clean worktree /tmp/qa-m41-8-09cee47.
cd /tmp/qa-m41-8-09cee47; G=/workspace/egg-farm-studio/qa/m41/m41-8-09cee47/gates
echo "HEAD $(git rev-parse HEAD) porcelain=$(git status --porcelain | wc -l)" > $G/summary.txt
run(){ n=$1; shift; s=$(date +%s); "$@" > $G/$n.log 2>&1; e=$?; echo "$n exit=$e $(( $(date +%s)-s ))s" >> $G/summary.txt; }
run npm-ci npm ci
run sync-check npx vite-node scripts/sync-economy-cli.ts -- --check
run tsc npx tsc --noEmit
run vitest npx vitest run --minWorkers=1 --maxWorkers=2
run build npm run build
run build-html npm run build:html
run build-qa npm run build:qa
echo "porcelain-after-nonbrowser=$(git status --porcelain | tr '\n' ' ')" >> $G/summary.txt
run check-release-qa node scripts/check-release-build.mjs dist-qa
run check-release-dist node scripts/check-release-build.mjs dist
run check-release-html node scripts/check-release-build.mjs dist-html/egg-farm.html
echo "porcelain-after-checks=$(git status --porcelain | tr '\n' ' ')" >> $G/summary.txt
