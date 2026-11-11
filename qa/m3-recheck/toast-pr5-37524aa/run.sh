#!/usr/bin/env bash
# PR5 37524aa runner (cwd /tmp/qa-pr5-37524aa). run.sh <engine> <steps...>
E=/workspace/egg-farm-studio/qa/m3-recheck/toast-pr5-37524aa; ENG=$1; shift
n(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
for s in "$@"; do L=/workspace/egg-farm-studio/.browser-test.lock; [ "$ENG" = chromium ] && awk "{exit !(\$1<12)}" /proc/loadavg && L=/workspace/egg-farm-studio/.browser-test-2.lock; echo "$ENG $s $L" >> $E/lanes.log
 case $s in
 guard) flock $L timeout 400 node scripts/qa-guard.mjs dist 4351 37524aa $ENG > $E/guard-$ENG.log 2>&1; a=$?; flock $L timeout 400 node scripts/qa-guard.mjs dist-qa 4351 37524aa $ENG > $E/guard-qa-$ENG.log 2>&1; n "guard $ENG release=$a qa=$? $(tail -1 $E/guard-$ENG.log)";;
 globals) PORT=4352 flock $L timeout 600 node scripts/release-globals-browser.mjs $ENG > $E/globals-$ENG.log 2>&1; n "globals $ENG exit=$? $(tail -1 $E/globals-$ENG.log)";;
 rc0) mkdir -p $E/rc0-shots-$ENG; PORT=4353 SHOTS=$E/rc0-shots-$ENG SHOTS_ALL=1 flock $L timeout 600 node scripts/rc0-browser.mjs $ENG > $E/rc0-$ENG.log 2>&1; n "rc0 $ENG exit=$? $(tail -1 $E/rc0-$ENG.log) toastfirst=$(grep -c '^PASS.*toast-v3' $E/rc0-$ENG.log)pass/$(grep -c 'toast-v3' $E/rc0-$ENG.log)";;
 midfade) flock $L timeout 600 node scripts/qa-midfade.mjs $ENG 4354 $E > $E/midfade-$ENG.log 2>&1; n "midfade $ENG exit=$? $(tail -1 $E/midfade-$ENG.log)";;
 old) mkdir -p $E/old-3930a4c-shots; (cd /tmp/qa-pr5-3930a4c && ONLY=toastfirst PORT=4355 SHOTS=$E/old-3930a4c-shots flock $L timeout 600 node scripts/qa-rc0-new.mjs $ENG > $E/old-toastfirst-$ENG.log 2>&1); n "OLD 3930a4c toastfirst(37524aa test) $ENG exit=$? $(grep -c '^FAIL' $E/old-toastfirst-$ENG.log) FAIL / $(grep -c '^PASS' $E/old-toastfirst-$ENG.log) PASS";;
 esac; done
ss -ltn | grep -E ':435[1-5] ' && n "WARN listener left"
