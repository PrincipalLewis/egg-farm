#!/bin/bash
# M4-A #31 delta QA: bash qa/m3-scripts/m4a-31-delta.sh <sha> [engines="chromium firefox webkit"]
# worktree build -> unit (2 workers) -> per engine (one at a time, each under flock, timeout 600): buildid, globals, rc0, file-open sanity
# Ports 5761-5764 (never 4173). Kills only its own vite (cwd = worktree). No push/merge/tag.
set -u
SHA=${1:?sha}; ENGS=${2:-chromium firefox webkit}
R=/workspace/egg-farm-studio; L=$R/.browser-test.lock; Q=$R/qa/m3-recheck
S7=$(git -C $R/game rev-parse --short=7 $SHA) || exit 1; FULL=$(git -C $R/game rev-parse --verify "$SHA^{commit}") || exit 1
BX="node $R/qa/m3-scripts/build-id-expect.mjs"  # M41-10: BUILD_PREFIX at $FULL (fallback regex); hash==sha7; no suffix
EV=$Q/m4a-31-delta-$S7-evidence; W=/tmp/qa-m4a31/$S7; mkdir -p $EV
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $EV/summary.txt; }
reap(){ for pid in $(ss -ltnp | grep -E ":$1 " | grep -o 'pid=[0-9]*' | cut -d= -f2); do [ "$(readlink /proc/$pid/cwd)" = "$W" ] && kill $pid && log "reaped own server $pid :$1"; done; }
git -C $R/game fetch -q origin
log "PR31 head: $(git -C $R/game ls-remote origin refs/pull/31/head | cut -c1-7); target $S7; merge-base check: $(git -C $R/game merge-base --is-ancestor 1a44b19 $SHA && echo 'contains 1a44b19' || echo 'NOT descendant of 1a44b19')"
git -C $R/game log --oneline 1a44b19..$SHA > $EV/commits-since-1a44b19.txt
git -C $R/game diff --stat 1a44b19 $SHA > $EV/diffstat-since-1a44b19.txt
[ -d $W ] || { git -C $R/game worktree add --detach $W $SHA >/dev/null 2>&1 || git clone -q $R/game $W && git -C $W checkout -q $SHA; }
cd $W
( npm ci --no-audit --no-fund && npm run build && npm run build:qa ) > $EV/build.log 2>&1; log "build exit=$?"
log "static build-id: $($BX scan $R/game $FULL dist/index.html | tr '\n' ' ')"
npx vitest run --maxWorkers=2 --minWorkers=1 > $EV/unit.log 2>&1; log "unit exit=$? $(rg 'Tests ' $EV/unit.log | tail -1)"
cp $R/qa/scratch/m4a-31-delta/buildid-probe.mjs $EV/
for e in $ENGS; do
  for k in buildid globals rc0 fileopen; do
    case $k in buildid) p=5761;; globals) p=5762;; rc0) p=5763;; fileopen) p=5764;; esac
    reap $p; ss -ltn | grep -q ":$p " && { log "$k $e SKIP port $p busy"; continue; }
    lg=$EV/$k-$e.log; t0=$(date +%s)
    case $k in
      buildid) flock $L timeout 600 env BUILD_SHA=$FULL node $EV/buildid-probe.mjs $W $e $p ;;
      globals) flock $L timeout 600 env PORT=$p node scripts/release-globals-browser.mjs $e ;;
      rc0) mkdir -p $EV/shots-$e; flock $L timeout 600 env PORT=$p SHOTS=$EV/shots-$e node scripts/rc0-browser.mjs $e ;;
      fileopen) flock $L timeout 600 node $R/qa/m3-scripts/m4a-31-fileopen.mjs $W $e $p $EV/shots-$e ;;
    esac > $lg 2>&1; ec=$?; reap $p
    log "$k $e exit=$ec $(( $(date +%s)-t0 ))s $(rg -o '[0-9]+/[0-9]+ passed|runtime build ids.*|PASS runtime.*|FAIL.*|OK.*' $lg | tail -1)"
  done
done
log "ALL_DONE (expect build-id $($BX expect $R/game $FULL), globals only eggfarmExportTelemetry, rc0 209/209 unless merge adds tests)"
