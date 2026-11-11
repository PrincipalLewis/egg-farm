#!/bin/bash
# Follow-up chain: mid-level Buy targets (label-in-name) + the +$1.2Qa coin pop. Waits for run-chain.sh to finish.
Q=/workspace/egg-farm-studio/qa/m41/m41-9-3110e88; cd $Q; L=/workspace/egg-farm-studio/.browser-test.lock
while pgrep -f "run-chain.sh" >/dev/null; do sleep 15; done
r(){ echo "== $* $(date +%T)"; flock $L timeout 600 node browser/p64.mjs "$@" > browser/run2-$1-$2-$3.out 2>&1; echo "exit=$? $(tail -1 browser/run2-$1-$2-$3.out)"; }
r chromium 360 head buy,pop
r chromium 390 head buy
r chromium 360 base buy
echo "chain2 done $(date +%T)"
