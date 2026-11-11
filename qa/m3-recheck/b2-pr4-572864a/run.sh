#!/usr/bin/env bash
# B-2 recheck runner. cd worktree first. Usage: run.sh <engine> <steps...>
E=/workspace/egg-farm-studio/qa/m3-recheck/b2-pr4-572864a; L=/workspace/egg-farm-studio/.browser-test.lock; ENG=$1; shift
if [ "$ENG" = chromium ] && awk "{exit !(\$1<12)}" /proc/loadavg; then L=/workspace/egg-farm-studio/.browser-test-2.lock; fi; echo "lane=$L" >> $E/lanes.log
n(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
for s in "$@"; do case $s in
 smoke) PORT=4321 flock $L timeout 600 node scripts/qa-smoke.mjs > $E/smoke-chromium.log 2>&1; n "smoke chromium exit=$? $(tail -1 $E/smoke-chromium.log)";;
 guard) flock $L timeout 400 node scripts/qa-guard.mjs dist 4322 572864a $ENG > $E/guard-$ENG.log 2>&1; a=$?; flock $L timeout 400 node scripts/qa-guard.mjs dist-qa 4322 572864a $ENG > $E/guard-qa-$ENG.log 2>&1; n "guard $ENG release=$a qa=$? $(tail -1 $E/guard-$ENG.log)";;
 b2) flock $L timeout 600 node scripts/qa-b2tip.mjs $ENG 4323 $E pr > $E/b2-$ENG.log 2>&1; n "b2 $ENG exit=$? $(tail -1 $E/b2-$ENG.log)";;
 layout) PORT=4324 EXPECT=572864a flock $L timeout 600 node scripts/qa-layout.mjs $ENG $E > $E/layout-$ENG.log 2>&1; n "layout $ENG exit=$? $(tail -1 $E/layout-$ENG.log)";;
 rc0) PORT=4325 SHOTS=$E/rc0-shots flock $L timeout 600 node scripts/rc0-browser.mjs $ENG > $E/rc0-$ENG.log 2>&1; n "rc0 $ENG exit=$? $(tail -1 $E/rc0-$ENG.log)";;
 base) (cd /tmp/qa-b2-base-a01faea && flock $L timeout 600 node $E/qa-b2tip.mjs $ENG 4321 $E base > $E/base-b2-$ENG.log 2>&1); n "base-b2 $ENG exit=$? $(tail -1 $E/base-b2-$ENG.log)";;
 base0) (cd /tmp/qa-b2-base-a01faea && PORT=4325 SHOTS=$E/rc0-shots-base flock $L timeout 600 node scripts/rc0-browser.mjs $ENG > $E/base-rc0-$ENG.log 2>&1); n "base-rc0 $ENG exit=$? $(tail -1 $E/base-rc0-$ENG.log)";;
esac; done
ss -ltn | grep -E ':432[1-5] ' && n "WARN listener left"
