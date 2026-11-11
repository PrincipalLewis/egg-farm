#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/gate5-pr44-4ccb9fd
while pgrep -f "wk.sh" >/dev/null; do sleep 5; done
cd /workspace/egg-farm-studio/qa/m3-recheck/gate5-pr44
for ENG in chromium firefox; do [ $ENG = chromium ] && cp $E/shots/chromium/w2-asleep-*.png /tmp/ 2>/dev/null; rm -rf $E/shots/$ENG $E/shots/skipped-$ENG.txt; [ $ENG = chromium ] && grep '"w2-asleep"' $E/shots/entries-chromium.jsonl > /tmp/qa-g5-w2entry.jsonl; rm -f $E/shots/entries-$ENG.jsonl
 SHA=4ccb9fde8251b371c6ee6444b735990e488e2aae URL=http://127.0.0.1:4419/ STATES=fresh,L10,migrated-acdbedc flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node shoot.mjs $ENG $E/shots >> $E/logs/gate5-$ENG-rerun.log 2>&1; echo "$ENG shots rerun exit=$?" >> $E/summary.txt
 [ $ENG = chromium ] && cp /tmp/w2-asleep-*.png $E/shots/chromium/ 2>/dev/null && cat /tmp/qa-g5-w2entry.jsonl >> $E/shots/entries-chromium.jsonl; done
echo CFDONE >> $E/summary.txt
