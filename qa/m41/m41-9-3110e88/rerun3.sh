#!/bin/bash
cd /workspace/egg-farm-studio/qa/m41/m41-9-3110e88
L=/workspace/egg-farm-studio/.browser-test.lock
for a in "chromium 360 head" "chromium 390 head" "chromium 360 base"; do
  set -- $a; flock $L timeout 600 node browser/p64.mjs $1 $2 $3 ra,huge,aria,axe > browser/run3-$1-$2-$3.out 2>&1; echo "$a exit $?"
done
flock $L timeout 600 node browser/p64.mjs firefox 360 base ra,huge > browser/run3-firefox-360-base.out 2>&1; echo "ff base exit $?"
python3 make-manifest.py; echo "manifest exit $?"
