#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/claude-qa4-triage-7d52952; B=/workspace/egg-farm-studio/qa/m3-recheck/b2-pr4-572864a; L=/workspace/egg-farm-studio/.browser-test.lock
n(){ echo "$(date '+%F %T %Z') $*" >> $E/summary.txt; }
while ! grep -qs CHAIN-DONE $B/steps.txt; do sleep 15; done
cd /tmp/qa-rc1v4-7d52952
for e in chromium firefox webkit; do for part in cards seed tut; do flock $L timeout 600 node $E/qa4r.mjs $e $E $part > $E/qa4-$e-$part.log 2>&1; n "qa4 $e $part exit=$? $(tail -1 $E/qa4-$e-$part.log)"; done; done
ss -ltn | grep -E ":435[12] " >> $E/summary.txt; echo CHAIN-DONE >> $E/summary.txt
