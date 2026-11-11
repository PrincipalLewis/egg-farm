#!/bin/bash
# usage: run-engine.sh <engine> "<tap widths>" "<p65 widths>"   (lane 1 lock, one command per flock; own servers on OS-assigned ports)
cd /workspace/egg-farm-studio; ENG=$1; SHA=77790883c2d6b0e6bd0db8e786d04bb87579c68a; B=qa/m41/m41-9-7779088/browser; export QA_WT=/tmp/qa-m41-9-7779088-q
for w in $2; do echo "== tap $ENG $w start $(date +%T)"; flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node $B/p65-tap.mjs $ENG $w $SHA; echo "exit=$? tap $ENG $w $(date +%T)"; done >> $B/run-tap-$ENG.out 2>&1
for w in $3; do echo "== p65 $ENG $w start $(date +%T)"; flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node $B/p65.mjs $ENG $w $SHA; echo "exit=$? p65 $ENG $w $(date +%T)"; done >> $B/run-p65-$ENG.out 2>&1
echo ALLDONE $ENG >> $B/run-p65-$ENG.out
