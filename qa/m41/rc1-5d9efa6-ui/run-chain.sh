#!/bin/bash
# UI lane RC1 #67 @ 5d9efa6: every browser command under flock .browser-test.lock timeout 600, one engine at a time.
set -u
SHA=5d9efa61c5e6ee31ca9ebdec20ee70167d31d463; EV=/workspace/egg-farm-studio/qa/m41/rc1-5d9efa6-ui; L=/workspace/egg-farm-studio/.browser-test.lock
export QA_WT=/tmp/qa-rc1-5d9efa6 QA_BID=m4.1+5d9efa6
cd $QA_WT; [ "$(git rev-parse HEAD)" = "$SHA" ] || { echo HEAD mismatch; exit 2; }
B=$EV/browser
r(){ n=$1; shift; s=$(date +%s); flock $L timeout 600 "$@" > $n 2>&1; e=$?; echo "$(date +%T) exit=$e $(( $(date +%s)-s ))s $n :: $(tail -1 $n | cut -c1-160)"; }
STEP=${1:-all}
if [[ $STEP == all || $STEP == gates ]]; then echo "== gates browser $(date +%T)"; $EV/gates/run-gates.sh $SHA $EV/gates browser; tail -3 $EV/gates/summary.txt; fi
if [[ $STEP == all || $STEP == tap ]]; then
 for eng in chromium firefox webkit; do for w in 360 375 390; do r $B/run-tap-$eng-$w.log node $B/p65-tap.mjs $eng $w $SHA; done; done; fi
if [[ $STEP == all || $STEP == sweep ]]; then
 for eng in chromium firefox webkit; do r $B/scroll-sweep-$eng.log node $B/scroll-sweep-rc1.mjs $eng 360 375 390; done
 node $B/scroll-sweep-rc1.mjs --summary > $B/scroll-sweep-summary.txt 2>&1; echo "sweep summary exit=$?"; fi
if [[ $STEP == all || $STEP == p64 ]]; then
 for w in 360 375 390; do r $EV/p64/run-chromium-$w.out node $EV/p64/p64.mjs chromium $w head ra,huge,aria,axe; done
 for w in 320 1280; do r $EV/p64/run-chromium-$w.out node $EV/p64/p64.mjs chromium $w head ra,huge; done
 for eng in firefox webkit; do for w in 360 390; do r $EV/p64/run-$eng-$w.out node $EV/p64/p64.mjs $eng $w head ra,huge; done; done; fi
if [[ $STEP == all || $STEP == p62 ]]; then
 node $EV/serve.mjs 4981 > $EV/serve-4981.log 2>&1 & SP=$!; echo "server pid $SP"; sleep 1
 export BASE=http://127.0.0.1:4981/
 for w in 360 390 430; do r $EV/p62/run-chromium-$w.out node $EV/p62/p62.mjs chromium $w; done
 for eng in firefox webkit; do for w in 360 390; do r $EV/p62/run-$eng-$w.out node $EV/p62/p62.mjs $eng $w; done; done
 r $EV/axe/axe-run.out node $EV/axe/axe62.mjs 360,390,430
 for w in 360 390 430; do r $EV/lin/lin-5d9efa6-$w.out env BID=5d9efa6 node $EV/lin/lin-sweep.mjs $w; cp $EV/lin/lin-5d9efa6.jsonl $EV/lin/lin-5d9efa6-$w.jsonl; done
 kill $SP; echo "server $SP stopped"; fi
if [[ $STEP == all || $STEP == p65 ]]; then
 for eng in chromium firefox webkit; do for w in 360 375 390 430 1280; do r $B/run-p65-$eng-$w.log node $B/p65.mjs $eng $w $SHA; done; done; fi
if [[ $STEP == all || $STEP == csr ]]; then
 for eng in firefox webkit; do for w in 360 390; do r $EV/csr/run-$eng-$w.log node $EV/csr/csr-spot.mjs $eng $w; done; done; fi
echo "== CHAIN DONE $(date +%T) porcelain=$(git status --porcelain | wc -l)"
