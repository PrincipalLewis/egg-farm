#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/gate5-pr44-4ccb9fd
while pgrep -f "rc0b.sh" >/dev/null; do sleep 5; done
cd /tmp/qa-g5-4ccb9fd; AXE_PATH=/tmp/axe/node_modules/axe-core/axe.min.js PORT=4919 SHOTS=$E/rc0-shots-webkit flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node scripts/rc0-browser.mjs webkit > $E/logs/rc0-webkit.log 2>&1
echo "rc0 webkit rerun2 exit=$? $(tail -1 $E/logs/rc0-webkit.log) FAIL=$(grep -c ^FAIL $E/logs/rc0-webkit.log)" >> $E/summary.txt
cd /workspace/egg-farm-studio/qa/m3-recheck/gate5-pr44; rm -rf $E/shots/webkit $E/shots/entries-webkit.jsonl $E/shots/skipped-webkit.txt
SHA=4ccb9fde8251b371c6ee6444b735990e488e2aae URL=http://127.0.0.1:4419/ STATES=fresh,L10,migrated-acdbedc flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node shoot.mjs webkit $E/shots >> $E/logs/gate5-webkit.log 2>&1; echo "webkit shots exit=$?" >> $E/summary.txt
echo WKDONE >> $E/summary.txt
