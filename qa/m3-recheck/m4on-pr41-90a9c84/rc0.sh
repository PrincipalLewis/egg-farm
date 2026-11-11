#!/usr/bin/env bash
# rc0 x3 engines on 90a9c84, lane1, one engine at a time
E=/workspace/egg-farm-studio/qa/m3-recheck/m4on-pr41-90a9c84; cd /tmp/qa-m4on-90a9c84
for ENG in chromium firefox webkit; do mkdir -p $E/rc0-shots-$ENG
 AXE_PATH=/tmp/axe/node_modules/axe-core/axe.min.js PORT=4913 SHOTS=$E/rc0-shots-$ENG flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node scripts/rc0-browser.mjs $ENG > $E/logs/rc0-$ENG.log 2>&1
 echo "$(date '+%F %T %Z') rc0 $ENG exit=$? $(tail -1 $E/logs/rc0-$ENG.log) FAIL=$(grep -c ^FAIL $E/logs/rc0-$ENG.log)" >> $E/summary.txt; done
