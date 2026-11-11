#!/bin/bash
# Local gates on committed scripts at 3110e88 (D-CEO-15). Clean worktree /tmp/qa-m41-9-3110e88. Own ports 4961 (rc0), 4962 (check-globals).
SHA=3110e88226a5ee7e01c46f7bab4bd9f0d96208d3; cd /tmp/qa-m41-9-3110e88; G=/workspace/egg-farm-studio/qa/m41/m41-9-3110e88/gates; L=/workspace/egg-farm-studio/.browser-test.lock
[ "$(git rev-parse HEAD)" = "$SHA" ] || { echo HEAD mismatch; exit 2; }
echo "HEAD $(git rev-parse HEAD) porcelain=$(git status --porcelain | wc -l) $(date '+%F %T %Z')" > $G/summary.txt
run(){ n=$1; shift; s=$(date +%s); "$@" > $G/$n.log 2>&1; e=$?; echo "$n exit=$e $(( $(date +%s)-s ))s" >> $G/summary.txt; }
run npm-ci npm ci --no-audit --no-fund
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
for d in dist/index.html dist-html/egg-farm.html dist-qa/index.html; do echo "$d $(grep -o 'name="build-id" content="[^"]*"' $d) $(sha256sum $d | cut -c1-16)" >> $G/summary.txt; done
mkdir -p $G/rc0-shots
run rc0-chromium env PORT=4961 SHOTS=$G/rc0-shots flock $L timeout 600 node scripts/rc0-browser.mjs chromium
run check-globals env PORT=4962 flock $L timeout 600 npm run check-globals
echo "porcelain-after-all=$(git status --porcelain | tr '\n' ' ')" >> $G/summary.txt
