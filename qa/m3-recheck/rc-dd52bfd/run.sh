#!/usr/bin/env bash
# RC dd52bfd runner (cwd /tmp/rc-dd52bfd). run.sh <engine> <steps...>
E=/workspace/egg-farm-studio/qa/m3-recheck/rc-dd52bfd; ENG=$1; shift; cd /tmp/rc-dd52bfd
n(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
for s in "$@"; do
 if [ "$ENG" = chromium ]; then until awk '{exit !($1<12)}' /proc/loadavg; do sleep 15; done; L=/workspace/egg-farm-studio/.browser-test-2.lock; else L=/workspace/egg-farm-studio/.browser-test.lock; fi
 echo "$(date +%T) $ENG $s $L" >> $E/logs/lanes.log
 case $s in
 guard) flock $L timeout 400 node scripts/qa-guard.mjs dist 4811 dd52bfd $ENG > $E/logs/guard-$ENG.log 2>&1; a=$?; flock $L timeout 400 node scripts/qa-guard.mjs dist-qa 4811 dd52bfd $ENG > $E/logs/guard-qa-$ENG.log 2>&1; n "guard $ENG release=$a qa=$? $(tail -1 $E/logs/guard-$ENG.log) | $(tail -1 $E/logs/guard-qa-$ENG.log)";;
 globals) PORT=4812 flock $L timeout 600 node scripts/release-globals-browser.mjs $ENG > $E/logs/globals-$ENG.log 2>&1; n "globals $ENG exit=$? $(grep -c ^PASS $E/logs/globals-$ENG.log)PASS $(grep -c ^FAIL $E/logs/globals-$ENG.log)FAIL";;
 rc0) rm -rf $E/rc0-shots-$ENG; mkdir -p $E/rc0-shots-$ENG; AXE_PATH=/tmp/axe/node_modules/axe-core/axe.min.js PORT=4813 SHOTS=$E/rc0-shots-$ENG SHOTS_ALL=1 flock $L timeout 600 node scripts/rc0-browser.mjs $ENG > $E/logs/rc0-$ENG.log 2>&1; n "rc0 $ENG exit=$? $(tail -1 $E/logs/rc0-$ENG.log) FAIL=$(grep -c ^FAIL $E/logs/rc0-$ENG.log)";;
 p3|layout|shots) [ $s = shots ] && rm -f $E/shots/entries-$ENG.jsonl; cp $E/rcprobe.mjs scripts/rcprobe.mjs; flock $L timeout 600 node scripts/rcprobe.mjs /tmp/rc-dd52bfd dd52bfd 4814 $ENG $E/$s $s > $E/logs/$s-$ENG.log 2>&1; n "$s $ENG exit=$? $(tail -1 $E/logs/$s-$ENG.log) $(grep CONSOLE_ERRORS $E/logs/$s-$ENG.log)";;
 esac; done
for pp in 4811 4812 4813 4814; do pkill -f "port $pp --strictPort" && n "killed own leftover listener :$pp"; done
