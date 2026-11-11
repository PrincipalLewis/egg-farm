#!/bin/bash
cd "$(dirname "$0")"; echo "lock acquired $(date '+%F %T %Z') load=$(cut -d' ' -f1-3 /proc/loadavg)"
for e in chromium firefox webkit; do
  timeout 300 node gen-a01faea-save.mjs $e 4491 2>&1 | tee -a gen-a01faea.log
  timeout 600 node confirm.mjs $e assets/egg-farm-m3-rc1-qa-v4-7d52952.html 7d52952 4490 > run-qa-v4-$e.log 2>&1; echo "confirm $e exit=$?"; cat run-qa-v4-$e.log
done; echo "lock release $(date '+%F %T %Z')"
