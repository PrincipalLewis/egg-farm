#!/usr/bin/env bash
# B-2 192f273 runner (cwd = /tmp/qa-b2-192f273). run.sh <engine> <steps...>
E=/workspace/egg-farm-studio/qa/m3-recheck/b2-pr4-192f273; ENG=$1; shift
n(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
for s in "$@"; do L=/workspace/egg-farm-studio/.browser-test.lock; if [ "$ENG" = chromium ] && awk "{exit !(\$1<12)}" /proc/loadavg; then L=/workspace/egg-farm-studio/.browser-test-2.lock; fi; echo "$ENG $s lane=$L" >> $E/lanes.log
 case $s in
 guard) flock $L timeout 400 node scripts/qa-guard.mjs dist 4342 192f273 $ENG > $E/guard-$ENG.log 2>&1; a=$?; flock $L timeout 400 node scripts/qa-guard.mjs dist-qa 4342 192f273 $ENG > $E/guard-qa-$ENG.log 2>&1; n "guard $ENG release=$a qa=$? $(tail -1 $E/guard-$ENG.log)";;
 geo|state) flock $L timeout 600 node scripts/qa-b2d.mjs $ENG 4341 $E $s > $E/$s-$ENG.log 2>&1; n "$s $ENG exit=$? $(tail -1 $E/$s-$ENG.log)";;
 smoke) PORT=4343 flock $L timeout 600 node scripts/qa-smoke.mjs > $E/smoke-chromium.log 2>&1; n "smoke chromium exit=$? $(grep -c 'SMOKE FAIL' $E/smoke-chromium.log) fails; $(grep -m1 TypeError $E/smoke-chromium.log)";;
 rc0) PORT=4345 SHOTS=$E/rc0-shots flock $L timeout 600 node scripts/rc0-browser.mjs $ENG > $E/rc0-$ENG.log 2>&1; n "rc0 $ENG exit=$? $(tail -1 $E/rc0-$ENG.log)";;
 esac; done
ss -ltn | grep -E ':434[1-5] ' && n "WARN listener left"
