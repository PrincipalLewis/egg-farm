#!/usr/bin/env bash
# 45eb5e3: storage-blocked (exp-blocked) + C5b + exp-blkreload, 3 engines, port 4822. waits for run-fix 8396ed1 to finish.
set -u; RFPID=$1; SHA=45eb5e3755aef9bc300f8b94a39653f837c49d80; R=/workspace/egg-farm-studio; H=$R/qa/m3-recheck/gate5-final-prep; O=$R/qa/m3-recheck/exp1-fix-45eb5e3; W=/tmp/qa-fix-45eb5e3; PORT=4822
while kill -0 $RFPID 2>/dev/null; do sleep 5; done; echo "run-fix done $(date +%T)"
python3 -m http.server $PORT --bind 127.0.0.1 -d $W/dist >/dev/null 2>&1 & SRV=$!; trap "kill $SRV" EXIT; sleep 1
curl -s http://127.0.0.1:$PORT/ | grep -o 'm3-rc1-pre+[0-9a-f]*' | tee $O/build-id-runtime.txt
export URL=http://127.0.0.1:$PORT/ SHA PW=$W/node_modules/playwright-core/index.mjs
cd $H; for E in chromium firefox webkit; do L=$R/.browser-test.lock
  flock -w 300 $L env SIZES=390x844,360x800 timeout 420 node exp-blocked.mjs $E $O > $O/exp-blocked-$E.log 2>&1; echo "$E blocked exit=$? $(date +%T)"
  flock -w 300 $L timeout 150 node exp-ro.mjs $E $O > $O/exp-ro-$E.log 2>&1; echo "$E C5b exit=$? $(date +%T)"
  flock -w 300 $L env SIZES=390x844,360x800 timeout 420 node exp-blkreload.mjs $E $O > $O/exp-blkreload-$E.log 2>&1; echo "$E blkreload exit=$? $(date +%T)"
done; echo ALLDONE
