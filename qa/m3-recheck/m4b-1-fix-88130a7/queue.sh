#!/bin/bash
# one engine x size x build per lane-1 hold
cd /workspace/egg-farm-studio; D=qa/m3-recheck/m4b-1-fix-88130a7; LK=.browser-test.lock; S=http://127.0.0.1:4868
for E in chromium firefox webkit; do for W in 360 1280; do
  flock -w 2400 $LK timeout 600 node $D/dump.mjs $E $W fix $S/fix-qa/ m3-rc1-pre+88130a7; echo "dump fix $E $W exit=$?"
  flock -w 2400 $LK timeout 600 node $D/dump.mjs $E $W main $S/main-qa/ m3-rc1-pre+dd223f5; echo "dump main $E $W exit=$?"
  URL=$S/fix-html/ BID=m3-rc1-pre+88130a7 ASSET_SHA=c90c565a77d5989be274d06a8416377a9ca6b29792aa18b682ffd1f9f3579df6 OUTDIR=/workspace/egg-farm-studio/$D/fixui/ flock -w 2400 $LK timeout 600 node qa/m3-recheck/m4b-1-repro/repro.mjs $E $W; echo "saves fix $E $W exit=$?"
done; done
(cd /tmp/qa-m4b1fix-88130a7 && flock -w 2400 /workspace/egg-farm-studio/$LK timeout 600 npm run check-globals > /workspace/egg-farm-studio/$D/gates/check-globals.log 2>&1; echo "check-globals exit=$?")
