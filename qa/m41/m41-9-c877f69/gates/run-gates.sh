#!/bin/bash
# Re-runnable QA gates for PR #65 @ c877f69: run-gates.sh <full-sha> [evidence-dir] [phase: nonbrowser|browser|all]
set -u; SHA=${1:?sha}; S7=${SHA:0:7}; G=${2:-/workspace/egg-farm-studio/qa/m41/m41-9-$S7/gates}; PHASE=${3:-all}; WT=${QA_WT:-/tmp/qa-m41-9-$S7}; L=/workspace/egg-farm-studio/.browser-test.lock
mkdir -p $G; cd /workspace/egg-farm-studio/game; git fetch -q origin; [ -d $WT ] || git worktree add --detach $WT $SHA >/dev/null
cd $WT; [ "$(git rev-parse HEAD)" = "$SHA" ] || { echo "HEAD mismatch"; exit 2; }
run(){ n=$1; shift; s=$(date +%s); "$@" > $G/$n.log 2>&1; e=$?; echo "$n exit=$e $(( $(date +%s)-s ))s" >> $G/summary.txt; }
if [ "$PHASE" = "nonbrowser" ] || [ "$PHASE" = "all" ]; then
  echo "HEAD $(git rev-parse HEAD) porcelain=$(git status --porcelain | wc -l) $(date '+%F %T %Z')" > $G/summary.txt
  [ -d node_modules ] || run npm-ci npm ci --no-audit --no-fund
  run sync-check npx vite-node scripts/sync-economy-cli.ts -- --check
  run tsc npx tsc --noEmit
  run vitest npx vitest run --minWorkers=1 --maxWorkers=2
  run build npm run build
  run build-html npm run build:html
  run build-qa npm run build:qa
  run check-release-dist node scripts/check-release-build.mjs dist
  run check-release-html node scripts/check-release-build.mjs dist-html/egg-farm.html
  for d in dist dist-html dist-qa; do f=$(ls $d/*.html | head -1); echo "$d $(grep -o 'name="build-id" content="[^"]*"' $f) $(sha256sum $f)" >> $G/summary.txt; done
  echo "porcelain-after-nonbrowser=$(git status --porcelain | tr '\n' ' ')" >> $G/summary.txt
fi
if [ "$PHASE" = "browser" ] || [ "$PHASE" = "all" ]; then
  mkdir -p $G/rc0-shots
  run rc0-chromium env PORT=4965 SHOTS=$G/rc0-shots flock $L timeout 600 node scripts/rc0-browser.mjs chromium
  run check-globals env PORT=4966 flock $L timeout 600 npm run check-globals
  echo "porcelain-after-browser=$(git status --porcelain | tr '\n' ' ')" >> $G/summary.txt
fi
