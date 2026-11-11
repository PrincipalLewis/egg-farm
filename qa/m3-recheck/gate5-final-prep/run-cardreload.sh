#!/usr/bin/env bash
# 246de09 A&UX reload-after-Got-it, canonical, 360, chromium(lane2 if load<12)->firefox->webkit(lane1). waits for webkit runner.
set -u; R=/workspace/egg-farm-studio; H=$R/qa/m3-recheck/gate5-final-prep; O=$R/qa/m3-recheck/exp1-fix-246de09; W=/tmp/qa-fix-246de09; PORT=4824; SHA=246de09c8b329360754cc0d77a6cd6b6788b6ad4
while pgrep -f "bash run-246d-webkit.sh" >/dev/null; do sleep 5; done; echo "webkit runner done $(date +%T)"
python3 -m http.server $PORT --bind 127.0.0.1 -d $W/dist >/dev/null 2>&1 & SRV=$!; trap "kill $SRV" EXIT; sleep 1
curl -s http://127.0.0.1:$PORT/ | grep -o 'm3-rc1-pre+[0-9a-f]*' | head -1 | tee $O/build-id-runtime-cardreload.txt
export URL=http://127.0.0.1:$PORT/ SHA PW=$W/node_modules/playwright-core/index.mjs
cd $H; for E in chromium firefox webkit; do L=$R/.browser-test.lock
  if [ $E = chromium ]; then LD=$(cut -d' ' -f1 /proc/loadavg); awk "BEGIN{exit !($LD<12)}" && L=$R/.browser-test-2.lock; fi
  flock -w 300 $L env SIZES=360x800 timeout 420 node exp-cardreload.mjs $E $O > $O/exp-cardreload-$E.log 2>&1; echo "$E cardreload exit=$? lock=$(basename $L) $(date +%T)"
done; echo ALLDONE
