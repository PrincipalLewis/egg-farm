#!/bin/bash
# PR #64 prep: one command per SHA.  ./run-prep.sh <full-sha> [engine-list default "webkit"]
# 1) clean detached worktree /tmp/qa-m41-9p-<sha7> (node_modules symlinked when package-lock matches the #65 tree, else npm ci)
# 2) formatter property harness (vitest, --minWorkers=1 --maxWorkers=2) vs clean main dd223f5 formatter
# 3) build:qa + Playwright order-card probe (eggs present/unclipped at 360 with huge counts, R-a, R-b) under the browser flock
set -u; SHA=${1:?sha}; S7=${SHA:0:7}; ENGS=${2:-webkit}; P=/workspace/egg-farm-studio/qa/m41/m41-9-prep; WT=/tmp/qa-m41-9p-$S7; O=$P/run-$S7; mkdir -p $O
cd /workspace/egg-farm-studio/game; git fetch -q origin; [ -d $WT ] || git worktree add --detach $WT $SHA >/dev/null
cd $WT; [ "$(git rev-parse HEAD)" = "$SHA" ] || { echo HEAD mismatch; exit 2; }
if [ ! -e node_modules ]; then if cmp -s package-lock.json /tmp/qa-m41-9-base-dd223f5/package-lock.json; then ln -s /tmp/qa-m41-9-base-dd223f5/node_modules node_modules; else npm ci --no-audit --no-fund > $O/npm-ci.log 2>&1; fi; fi
echo "HEAD $SHA porcelain=$(git status --porcelain | grep -v '^?? node_modules' | wc -l) $(date '+%F %T %Z')" > $O/summary.txt
cp $P/harness/m41-9-fmt.qa.test.ts tests/m41-9-fmt.qa.test.ts
QA_SHA=$SHA QA_OUT=$O/fmt-results.json QA_OLD_FMT=/tmp/qa-m41-9-base-dd223f5/src/ui/format.ts npx vitest run tests/m41-9-fmt.qa.test.ts --minWorkers=1 --maxWorkers=2 > $O/fmt-vitest.log 2>&1; echo "fmt-harness exit=$?" >> $O/summary.txt
rm -f tests/m41-9-fmt.qa.test.ts
npm run build:qa > $O/build-qa.log 2>&1; echo "build-qa exit=$? $(grep -o 'name="build-id" content="[^"]*"' dist-qa/index.html)" >> $O/summary.txt
for e in $ENGS; do flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node $P/probe/p64-order.mjs $e 360 $SHA > $O/probe-$e-360.out 2>&1; echo "probe $e 360 exit=$? $(tail -1 $O/probe-$e-360.out)" >> $O/summary.txt; done
echo "porcelain-after=$(git status --porcelain | grep -v node_modules | tr '\n' ' ')" >> $O/summary.txt; cat $O/summary.txt
