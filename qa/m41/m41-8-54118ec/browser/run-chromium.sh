#!/bin/bash
# Chromium (blocking) 360/375/390: full updated p62 suite. Lane 2 (Chromium only) when 1-min load < 12, else lane 1. One width per lock hold.
cd /workspace/egg-farm-studio/qa/m41/m41-8-54118ec/browser
for w in 360 375 390; do
  l=$(cut -d' ' -f1 /proc/loadavg); lock=/workspace/egg-farm-studio/.browser-test-2.lock; awk "BEGIN{exit !($l>=12)}" && lock=/workspace/egg-farm-studio/.browser-test.lock
  echo "== $w load=$l lock=$lock $(date +%T)"; BASE=http://127.0.0.1:4927/ flock $lock timeout 600 node p62.mjs chromium $w; echo "exit=$?"
done
