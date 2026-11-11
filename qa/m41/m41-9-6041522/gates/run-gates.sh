#!/bin/bash
# Re-runnable QA gates for PR #65 (or any SHA): run-gates.sh <full-sha> [evidence-dir]
# Creates a clean detached worktree /tmp/qa-m41-9-<sha7> (if absent), npm ci, then the committed gates (D-CEO-15).
set -u; SHA=${1:?sha}; S7=${SHA:0:7}; G=${2:-/workspace/egg-farm-studio/qa/m41/m41-9-$S7/gates}; WT=/tmp/qa-m41-9-$S7
mkdir -p $G; cd /workspace/egg-farm-studio/game; git fetch -q origin; [ -d $WT ] || git worktree add --detach $WT $SHA >/dev/null
cd $WT; [ "$(git rev-parse HEAD)" = "$SHA" ] || { echo "HEAD mismatch"; exit 2; }
echo "HEAD $(git rev-parse HEAD) porcelain=$(git status --porcelain | wc -l) $(date '+%F %T %Z')" > $G/summary.txt
run(){ n=$1; shift; s=$(date +%s); "$@" > $G/$n.log 2>&1; e=$?; echo "$n exit=$e $(( $(date +%s)-s ))s" >> $G/summary.txt; }
[ -d node_modules ] || run npm-ci npm ci --no-audit --no-fund
run sync-check npx vite-node scripts/sync-economy-cli.ts -- --check
run tsc npx tsc --noEmit
run vitest npx vitest run --minWorkers=1 --maxWorkers=2
run build npm run build
run build-html npm run build:html
run build-qa npm run build:qa
run check-globals flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 npm run check-globals
for d in dist dist-html dist-qa; do f=$(ls $d/*.html | head -1); echo "$d $(grep -o 'name="build-id" content="[^"]*"' $f) $(sha256sum $f)" >> $G/summary.txt; done
echo "porcelain-after=$(git status --porcelain | tr '\n' ' ')" >> $G/summary.txt
