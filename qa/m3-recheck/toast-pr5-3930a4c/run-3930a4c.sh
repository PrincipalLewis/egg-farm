#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/toast-pr5-3930a4c; L=/workspace/egg-farm-studio/.browser-test.lock; ENG=$1; shift
if [ "$ENG" = chromium ] && awk "{exit !(\$1<12)}" /proc/loadavg; then L=/workspace/egg-farm-studio/.browser-test-2.lock; fi; echo "$ENG lane=$L" >> $E/lanes.log
n(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
for s in "$@"; do case $s in
 guard) flock $L timeout 400 node scripts/qa-guard.mjs dist 4332 3930a4c $ENG > $E/guard-$ENG.log 2>&1; a=$?; flock $L timeout 400 node scripts/qa-guard.mjs dist-qa 4332 3930a4c $ENG > $E/guard-qa-$ENG.log 2>&1; n "guard $ENG release=$a qa=$? $(tail -1 $E/guard-$ENG.log)";;
 globals) PORT=4331 flock $L timeout 600 node scripts/release-globals-browser.mjs $ENG > $E/globals-$ENG.log 2>&1; n "check-globals $ENG exit=$? $(tail -1 $E/globals-$ENG.log)";;
 toast) flock $L timeout 600 node scripts/qa-toast.mjs $ENG 4333 $E pr > $E/toast-$ENG.log 2>&1; n "toast $ENG exit=$? $(tail -1 $E/toast-$ENG.log)";;
 base) (cd /tmp/qa-b2-base-a01faea && flock $L timeout 600 node $E/qa-toast.mjs $ENG 4331 $E base > $E/base-toast-$ENG.log 2>&1); n "base-toast $ENG exit=$? $(tail -1 $E/base-toast-$ENG.log)";;
 layout) PORT=4334 EXPECT=3930a4c flock $L timeout 600 node scripts/qa-layout.mjs $ENG $E > $E/layout-$ENG.log 2>&1; n "layout $ENG exit=$? $(tail -1 $E/layout-$ENG.log)";;
 rc0) PORT=4335 SHOTS=$E/rc0-shots flock $L timeout 600 node scripts/rc0-browser.mjs $ENG > $E/rc0-$ENG.log 2>&1; n "rc0 $ENG exit=$? $(tail -1 $E/rc0-$ENG.log)";;
esac; done
ss -ltn | grep -E ':433[1-5] ' && n "WARN listener left"
