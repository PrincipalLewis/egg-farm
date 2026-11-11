#!/bin/bash
# Browser chain @ 3110e88, one engine at a time, every browser command under the shared lock (never broken).
Q=/workspace/egg-farm-studio/qa/m41/m41-9-3110e88; cd $Q; L=/workspace/egg-farm-studio/.browser-test.lock
r(){ echo "== $* $(date +%T)"; flock $L timeout 600 node browser/p64.mjs "$@" > browser/run-$1-$2-$3.out 2>&1; echo "exit=$? $(tail -1 browser/run-$1-$2-$3.out)"; }
r chromium 360 head ra,huge,aria,axe,pop
for w in ${WIDTHS:-320 375 390 430 1280}; do r chromium $w head ra,huge,aria,axe; done
r chromium 360 base ra,huge,aria,axe
r chromium 1280 base ra,aria,axe
for w in 320 360 390; do r firefox $w head ra,huge,aria; done
for w in 320 360 390; do r webkit $w head ra,huge,aria; done
r webkit 360 base ra,huge
echo "chain done $(date +%T)"
