#!/bin/bash
# QA M41-7 dfdf49c local gates (committed scripts, package.json names). Run from the clean worktree.
set -u
W=/workspace/egg-farm-studio/qa/wt-m41-7-dfdf49c; E=/workspace/egg-farm-studio/qa/m41/m41-7-dfdf49c/gates; cd $W
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/local-gates-summary.txt; }
st(){ git status --porcelain > $E/status-$1.txt; log "porcelain after $1: $(wc -l < $E/status-$1.txt) lines"; }
st start
npx vite-node scripts/sync-economy-cli.ts -- --check > $E/sync-check.log 2>&1; log "sync --check exit=$?"
npx tsc --noEmit > $E/tsc.log 2>&1; log "tsc exit=$?"
npm run build > $E/build.log 2>&1; log "build exit=$?"; st build
npm run build:qa > $E/build-qa.log 2>&1; log "build:qa exit=$?"; st build-qa
npm run build:html > $E/build-html.log 2>&1; log "build:html exit=$?"; st build-html
sha256sum dist-html/egg-farm.html > $E/html-sha256.txt; log "html $(cat $E/html-sha256.txt)"
node scripts/check-release-build.mjs dist-html/egg-farm.html > $E/check-release-html.log 2>&1; log "check-release-build dist-html exit=$?"
node scripts/check-release-build.mjs dist > $E/check-release-dist.log 2>&1; log "check-release-build dist exit=$?"
t0=$(date +%s); npx vitest run --maxWorkers=2 --minWorkers=1 > $E/vitest-full.log 2>&1; log "vitest full exit=$? $(( $(date +%s)-t0 ))s $(rg 'Test Files|Tests ' $E/vitest-full.log | tr -s ' ' | tr '\n' ' ')"; st vitest
npx vitest run --maxWorkers=2 --minWorkers=1 tests/m4a-flag-off.test.ts tests/economy.test.ts tests/cost-segments.test.ts tests/staging-f1-m4cols.test.ts tests/save-fixtures.test.ts > $E/goldens.log 2>&1; log "goldens subset exit=$? $(rg 'Test Files|Tests ' $E/goldens.log | tr -s ' ' | tr '\n' ' ')"
t0=$(date +%s); npm run -s test:slow > $E/test-slow.log 2>&1; log "test:slow exit=$? $(( $(date +%s)-t0 ))s $(rg 'Test Files|Tests ' $E/test-slow.log | tr -s ' ' | tr '\n' ' ')"; st slow
log LOCAL_DONE
