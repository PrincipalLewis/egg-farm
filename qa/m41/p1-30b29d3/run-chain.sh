#!/bin/bash
# UI QA PR #70 @ 30b29d3: every browser command under flock .browser-test.lock timeout 600, one engine at a time. Console/pageerror/build-id hook on every node probe.
set -u
SHA=30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134; EV=/workspace/egg-farm-studio/qa/m41/p1-30b29d3; L=/workspace/egg-farm-studio.lock; L=/workspace/egg-farm-studio/.browser-test.lock
export QA_WT=/tmp/qa-p1-30b29d3 QA_BID=m4.1+30b29d3
cd $QA_WT; [ "$(git rev-parse HEAD)" = "$SHA" ] || { echo HEAD mismatch; exit 2; }
r(){ n=$1; tag=$2; shift 2; s=$(date +%s); CONSOLE_LOG=$EV/console/$tag.jsonl RUN_TAG=$tag flock $L timeout 600 "$@" > $n 2>&1; e=$?; echo "$(date +%T) exit=$e $(( $(date +%s)-s ))s $(basename $n) :: $(tail -1 $n | cut -c1-200)"; }
H="node --import $EV/console-hook.mjs"
STEP=${1:-all}; ENGS=${ENGS:-chromium firefox webkit}
if [[ $STEP == all || $STEP == gates ]]; then echo "== gates browser $(date +%T)"; $EV/gates/run-gates.sh $SHA $EV/gates browser; tail -3 $EV/gates/summary.txt
  for eng in firefox webkit; do r $EV/gates/rc0-mrc1-$eng.log rc0-mrc1-$eng env ONLY=mrc1,sceneGuard,bannerFit,s28rate SHOTS=$EV/gates/rc0-shots $H scripts/rc0-browser.mjs $eng; done; fi
if [[ $STEP == all || $STEP == p1 ]]; then
 for eng in $ENGS; do for w in 360 375 390; do r $EV/p1/run-$eng-$w.log p1-$eng-$w env QA_TAG=full $H $EV/p1/p1.mjs $eng $w hens,asleep,axe,taps; done
  for w in 430; do r $EV/p1/run-$eng-$w.log p1-$eng-$w env QA_TAG=full $H $EV/p1/p1.mjs $eng $w asleep,axe; done
  r $EV/p1/run-$eng-1280.log p1-$eng-1280 env QA_TAG=full $H $EV/p1/p1.mjs $eng 1280 hens,asleep,axe,taps; done; fi
if [[ $STEP == all || $STEP == flagoff ]]; then
 for eng in $ENGS; do for w in 360 375 390; do r $EV/p1/run-flagoff-$eng-$w.log flagoff-$eng-$w env QA_WT=/tmp/qa-p1-30b29d3-off QA_BID=m4.1+30b29d3+dirty QA_TAG=flagoff $H $EV/p1/p1.mjs $eng $w flagoff; done; done; fi
if [[ $STEP == all || $STEP == mrc1 ]]; then
 for eng in $ENGS; do r $EV/mrc1/run-p1-$eng.log mrc1-$eng $H $EV/mrc1/mrc1.mjs $eng rc; done; fi
if [[ $STEP == all || $STEP == tap ]]; then
 for eng in $ENGS; do for w in 360 375 390; do r $EV/browser/run-tap-$eng-$w.log tap-$eng-$w $H $EV/browser/p65-tap.mjs $eng $w $SHA; done; done; fi
if [[ $STEP == all || $STEP == sweep ]]; then
 for eng in $ENGS; do r $EV/browser/scroll-sweep-$eng.log sweep-$eng $H $EV/browser/scroll-sweep-p1.mjs $eng 360 375 390; done
 node $EV/browser/scroll-sweep-p1.mjs --summary > $EV/browser/scroll-sweep-summary.txt 2>&1; echo "sweep summary exit=$?"; fi
if [[ $STEP == all || $STEP == p64 ]]; then
 for eng in $ENGS; do for w in 360 375 390; do r $EV/p64/run-$eng-$w.out p64-$eng-$w env QA_PORT=4993 $H $EV/p64/p64.mjs $eng $w head ra,huge; done; done; fi
if [[ $STEP == all || $STEP == p62 ]]; then
 node $EV/serve.mjs 4991 > $EV/serve-4991.log 2>&1 & SP=$!; echo "server pid $SP"; sleep 1
 export BASE=http://127.0.0.1:4991/
 for eng in $ENGS; do for w in 360 375 390; do r $EV/p62/run-$eng-$w.out p62-$eng-$w env ONLY=${P62ONLY:-} $H $EV/p62/p62.mjs $eng $w; done; done
 r $EV/axe/axe-run.out axe62 $H $EV/axe/axe62.mjs 360,375,390
 kill $SP; echo "server $SP stopped"; fi
echo "== CHAIN $STEP DONE $(date +%T) porcelain=$(git status --porcelain | wc -l)"
