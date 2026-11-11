#!/bin/bash
# usage: run-engine.sh <engine>  — rc0 + probe, own ports 4382/4383, server killed by process group
en=$1; cd /tmp/qa-pr28; E=/workspace/egg-farm-studio/qa/m3-recheck/pr28-sellall-grader-f7642c9; L=/workspace/egg-farm-studio/.browser-test.lock
[ -s $E/globals-$en.log ] || PORT=4381 flock $L timeout 600 node scripts/release-globals-browser.mjs $en > $E/globals-$en.log 2>&1
SHOTS=$E/shots PORT=4382 flock $L timeout 600 node scripts/rc0-browser.mjs $en > $E/rc0-$en.log 2>&1; echo "rc0 $en=$? pass=$(grep -c ^PASS $E/rc0-$en.log) fail=$(grep -c ^FAIL $E/rc0-$en.log)" >> $E/summary.txt
flock $L bash -c "setsid npx vite preview --outDir dist-qa --port 4383 --strictPort --host 127.0.0.1 >/dev/null 2>&1 & P=\$!; sleep 3; timeout 600 node $E/probe.mjs $en 4383 $E > $E/probe-$en.log 2>&1; r=\$?; kill -- -\$P; echo probe $en=\$r pass=\$(grep -c ^PASS $E/probe-$en.log) fail=\$(grep -c ^FAIL $E/probe-$en.log) >> $E/summary.txt"
