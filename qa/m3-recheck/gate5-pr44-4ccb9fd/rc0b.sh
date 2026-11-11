#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/gate5-pr44-4ccb9fd; cd /tmp/qa-g5-4ccb9fd
for ENG in firefox webkit; do AXE_PATH=/tmp/axe/node_modules/axe-core/axe.min.js PORT=4919 SHOTS=$E/rc0-shots-$ENG flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node scripts/rc0-browser.mjs $ENG > $E/logs/rc0-$ENG.log 2>&1
 echo "rc0 $ENG rerun exit=$? $(tail -1 $E/logs/rc0-$ENG.log) FAIL=$(grep -c ^FAIL $E/logs/rc0-$ENG.log)" >> $E/summary.txt; done
cd /workspace/egg-farm-studio/qa/m3-recheck/gate5-pr44 && STATES=fresh,L10,migrated-acdbedc ./run.sh 4ccb9fde8251b371c6ee6444b735990e488e2aae http://127.0.0.1:4419/ $E/shots chromium firefox webkit > $E/logs/gate5-run.log 2>&1
echo ALLDONE >> $E/summary.txt
