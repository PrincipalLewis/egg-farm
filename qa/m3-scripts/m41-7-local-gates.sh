#!/bin/bash
# QA M41-7 local gates, parameterised from qa/m41/m41-7-dfdf49c/gates/run-local-gates.sh (same steps, committed scripts, package.json names).
# usage: bash qa/m3-scripts/m41-7-local-gates.sh <full-sha>   Clean detached worktree qa/wt-m41-7-<sha7> (own npm ci). vitest max 2 workers. Evidence qa/m41/m41-7-<sha7>/gates/.
#   Browser gates (runtime build-id, check-globals, rc0 Chromium) are the m41-7-delta.sh "rc0" step on :5961. DRY=1 = preflight only. Never pushes/merges/tags.
set -u
SHA=${1:?full sha}; DRY=${DRY:-0}; R=/workspace/egg-farm-studio; G=$R/game
git -C $G fetch -q origin || exit 1; FULL=$(git -C $G rev-parse --verify "$SHA^{commit}") || exit 1; S7=${FULL:0:7}
W=$R/qa/wt-m41-7-$S7; E=$R/qa/m41/m41-7-$S7/gates; mkdir -p $E
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/local-gates-summary.txt; }
log "=== local gates on $FULL; head-ancestry: $(for a in dd223f5 1682a0c 66680eb 9cce82d 4c94704 c61ed2b dfdf49c b986cd3; do printf '%s %s, ' $a $(git -C $G merge-base --is-ancestor $a $FULL 2>/dev/null && echo Y || echo N); done) pushed on: $(git -C $G branch -r --contains $FULL | tr -d ' ' | tr '\n' ' ')"
if [ "$DRY" = 1 ]; then log "DRY plan: worktree $W; npm ci; sync --check; tsc; build; build:qa; build:html (+build-id grep, sha256, check-release-build html+dist); vitest full; goldens subset; test:slow"; exit 0; fi
[ -d $W ] || git -C $G worktree add --detach $W $FULL >/dev/null 2>&1 || exit 1
cd $W; [ "$(git rev-parse HEAD)" = "$FULL" ] || { log "HEAD mismatch"; exit 1; }
st(){ git status --porcelain > $E/status-$1.txt; log "porcelain after $1: $(wc -l < $E/status-$1.txt) lines"; }
st start; [ -d node_modules ] || { npm ci --no-audit --no-fund > $E/npm-ci.log 2>&1; log "npm ci exit=$?"; }
npx vite-node scripts/sync-economy-cli.ts -- --check > $E/sync-check.log 2>&1; log "sync --check exit=$?"
npx tsc --noEmit > $E/tsc.log 2>&1; log "tsc exit=$?"
npm run build > $E/build.log 2>&1; log "build exit=$?"; st build
npm run build:qa > $E/build-qa.log 2>&1; log "build:qa exit=$?"; st build-qa
npm run build:html > $E/build-html.log 2>&1; log "build:html exit=$?"; st build-html
log "static build-id dist-html: $(rg -o 'm4\.1\+[0-9a-f]{7}(\+dirty)?|m3-rc1-pre\+[0-9a-f]{7}(\+dirty)?' dist-html/egg-farm.html | sort | uniq -c | tr -s ' ' | tr '\n' ' ')(want +$S7 only, 0 +dirty); dist-qa: $(rg -o '(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}(\+dirty)?' dist-qa/index.html | sort -u | tr '\n' ' ')"
sha256sum dist-html/egg-farm.html > $E/html-sha256.txt; log "html $(cat $E/html-sha256.txt)"
node scripts/check-release-build.mjs dist-html/egg-farm.html > $E/check-release-html.log 2>&1; log "check-release-build dist-html exit=$?"
node scripts/check-release-build.mjs dist > $E/check-release-dist.log 2>&1; log "check-release-build dist exit=$?"
t0=$(date +%s); npx vitest run --maxWorkers=2 --minWorkers=1 > $E/vitest-full.log 2>&1; log "vitest full exit=$? $(( $(date +%s)-t0 ))s $(rg 'Test Files|Tests ' $E/vitest-full.log | tr -s ' ' | tr '\n' ' ')"; st vitest
npx vitest run --maxWorkers=2 --minWorkers=1 tests/m4a-flag-off.test.ts tests/economy.test.ts tests/cost-segments.test.ts tests/staging-f1-m4cols.test.ts tests/save-fixtures.test.ts > $E/goldens.log 2>&1; log "goldens subset exit=$? $(rg 'Test Files|Tests ' $E/goldens.log | tr -s ' ' | tr '\n' ' ')"
t0=$(date +%s); npm run -s test:slow > $E/test-slow.log 2>&1; log "test:slow exit=$? $(( $(date +%s)-t0 ))s $(rg 'Test Files|Tests ' $E/test-slow.log | tr -s ' ' | tr '\n' ' ')"; st slow
log LOCAL_DONE
