#!/usr/bin/env bash
# PR5 a56b3a2 runner (cwd /tmp/qa-pr5-a56b3a2). run.sh <engine> <steps...>
E=/workspace/egg-farm-studio/qa/m3-recheck/toast-pr5-a56b3a2; ENG=$1; shift
n(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
for s in "$@"; do L=/workspace/egg-farm-studio/.browser-test.lock; [ "$ENG" = chromium ] && awk "{exit !(\$1<12)}" /proc/loadavg && L=/workspace/egg-farm-studio/.browser-test-2.lock; echo "$ENG $s $L" >> $E/lanes.log
 F=""; if [ "$L" = /workspace/egg-farm-studio/.browser-test.lock ]; then now=$(date +%s); c=$(date -d 10:55 +%s); h=$(date -d 11:00 +%s); if [ $now -ge $c ] && [ $now -lt $(date -d 12:00 +%s) ]; then n "SKIP $ENG $s lane1 Saves-QA window (resume after 12:00)"; continue; fi; [ $now -lt $c ] && F="timeout $((h-now))"; fi
 case $s in
 guard) $F flock $L timeout 400 node scripts/qa-guard.mjs dist 4361 a56b3a2 $ENG > $E/guard-$ENG.log 2>&1; a=$?; $F flock $L timeout 400 node scripts/qa-guard.mjs dist-qa 4361 a56b3a2 $ENG > $E/guard-qa-$ENG.log 2>&1; n "guard $ENG release=$a qa=$? $(tail -1 $E/guard-$ENG.log)";;
 globals) PORT=4362 $F flock $L timeout 600 node scripts/release-globals-browser.mjs $ENG > $E/globals-$ENG.log 2>&1; n "globals $ENG exit=$? $(tail -1 $E/globals-$ENG.log)";;
 rc0) mkdir -p $E/rc0-shots-$ENG; PORT=4363 SHOTS=$E/rc0-shots-$ENG SHOTS_ALL=1 $F flock $L timeout 600 node scripts/rc0-browser.mjs $ENG > $E/rc0-$ENG.log 2>&1; n "rc0 $ENG exit=$? $(tail -1 $E/rc0-$ENG.log) toastfirst=$(grep -c '^PASS.*toast-v3' $E/rc0-$ENG.log)pass/$(grep -c 'toast-v3' $E/rc0-$ENG.log)";;
 midfade) $F flock $L timeout 600 node scripts/qa-midfade.mjs $ENG 4364 $E > $E/midfade-$ENG.log 2>&1; n "midfade $ENG exit=$? $(tail -1 $E/midfade-$ENG.log)";;
 old) mkdir -p $E/old-3930a4c-shots; (cd /tmp/qa-pr5-3930a4c && ONLY=toastfirst PORT=4365 SHOTS=$E/old-3930a4c-shots $F flock $L timeout 600 node scripts/qa-rc0-new.mjs $ENG > $E/old-toastfirst-$ENG.log 2>&1); n "OLD 3930a4c toastfirst(a56b3a2 test) $ENG exit=$? $(grep -c '^FAIL' $E/old-toastfirst-$ENG.log) FAIL / $(grep -c '^PASS' $E/old-toastfirst-$ENG.log) PASS";;
 esac; done
ss -ltn | grep -E ':435[1-5] ' && n "WARN listener left"
