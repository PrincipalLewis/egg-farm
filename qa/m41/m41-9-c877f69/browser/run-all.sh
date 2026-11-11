#!/bin/bash
set -u
SHA=c877f69a407ec844a4d10612030584be42e34bdf
B=/workspace/egg-farm-studio/qa/m41/m41-9-c877f69/browser
L=/workspace/egg-farm-studio/.browser-test.lock
export QA_WT=/tmp/qa-m41-9-c877f69
cd /tmp/qa-m41-9-c877f69

echo "=== 1. Re-run chromium 360 with fixed none-contract & M1 fallback ==="
flock $L timeout 600 node $B/p65-tap.mjs chromium 360 $SHA > $B/run-tap-chromium-360.log 2>&1
echo "tap chromium 360 exit=$? $(date +%T)"
flock $L timeout 600 node $B/p65.mjs chromium 360 $SHA > $B/run-p65-chromium-360.log 2>&1
echo "p65 chromium 360 exit=$? $(date +%T)"

echo "=== 2. Committed scripts/m41-9-scroll-sweep.mjs across chromium, firefox, webkit ==="
for eng in chromium firefox webkit; do
  flock $L timeout 600 node scripts/m41-9-scroll-sweep.mjs $eng 360 375 390 > $B/scroll-sweep-$eng.log 2>&1
  echo "scroll-sweep $eng exit=$? $(date +%T)"
done
node scripts/m41-9-scroll-sweep.mjs --summary > $B/scroll-sweep-summary.txt 2>&1
echo "scroll-sweep --summary exit=$?"

echo "=== 3. QA p65-tap.mjs across remaining widths & engines ==="
for w in 375 390 412 430; do
  flock $L timeout 600 node $B/p65-tap.mjs chromium $w $SHA > $B/run-tap-chromium-$w.log 2>&1
  echo "tap chromium $w exit=$? $(date +%T)"
done
for eng in firefox webkit; do
  for w in 360 375 390; do
    flock $L timeout 600 node $B/p65-tap.mjs $eng $w $SHA > $B/run-tap-$eng-$w.log 2>&1
    echo "tap $eng $w exit=$? $(date +%T)"
  done
done

echo "=== 4. QA p65.mjs across remaining widths & engines ==="
for w in 375 390 430 1280; do
  flock $L timeout 600 node $B/p65.mjs chromium $w $SHA > $B/run-p65-chromium-$w.log 2>&1
  echo "p65 chromium $w exit=$? $(date +%T)"
done
for eng in firefox webkit; do
  for w in 360 375 390 430 1280; do
    flock $L timeout 600 node $B/p65.mjs $eng $w $SHA > $B/run-p65-$eng-$w.log 2>&1
    echo "p65 $eng $w exit=$? $(date +%T)"
  done
done

echo "=== ALL BROWSER RUNS COMPLETE $(date +%T) ==="
