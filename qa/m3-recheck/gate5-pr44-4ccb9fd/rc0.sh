#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/gate5-pr44-4ccb9fd; cd /tmp/qa-g5-4ccb9fd
flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 npm run check-globals > $E/logs/check-globals.log 2>&1; echo "check-globals exit=$?" >> $E/summary.txt
for ENG in chromium firefox webkit; do mkdir -p $E/rc0-shots-$ENG
 AXE_PATH=/tmp/axe/node_modules/axe-core/axe.min.js PORT=4919 SHOTS=$E/rc0-shots-$ENG flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node scripts/rc0-browser.mjs $ENG > $E/logs/rc0-$ENG.log 2>&1
 echo "rc0 $ENG exit=$? $(tail -1 $E/logs/rc0-$ENG.log) FAIL=$(grep -c ^FAIL $E/logs/rc0-$ENG.log)" >> $E/summary.txt; done
echo RC0DONE >> $E/summary.txt
