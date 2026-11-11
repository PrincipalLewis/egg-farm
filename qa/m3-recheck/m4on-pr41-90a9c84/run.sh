#!/usr/bin/env bash
# M4-on probe runner. run.sh <engine> <parts...>   (lane1 lock, timeout 600, own ports 4914/4915)
E=/workspace/egg-farm-studio/qa/m3-recheck/m4on-pr41-90a9c84; ENG=$1; shift; L=/workspace/egg-farm-studio/.browser-test.lock
for s in "$@"; do
 if [ $s = gen ]; then D=/tmp/qa-m4on-acdbedc; S=acdbedc; P=4915; else D=/tmp/qa-m4on-90a9c84; S=90a9c84; P=4914; fi
 [ $s = shots ] && rm -f $E/shots/entries-$ENG.jsonl
 cp $E/m4probe.mjs $D/scripts/m4probe.mjs; flock $L timeout 600 node $D/scripts/m4probe.mjs $D $S $P $ENG $E/$s $s > $E/logs/$s-$ENG.log 2>&1
 echo "$(date '+%F %T %Z') $s $ENG exit=$? $(grep -E '^(CONSOLE_ERRORS|BAD)' $E/logs/$s-$ENG.log | tr '\n' ' ')" >> $E/summary.txt; done
