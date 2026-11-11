#!/bin/bash
# M4-A c108440 pass 3: FF then WK; own port per step (5741-5743), port must be free before, own leftover vite (cwd m4a-prov) killed after.
set -u
L=/workspace/egg-farm-studio/.browser-test.lock; ev=/workspace/egg-farm-studio/qa/m3-recheck/m4a-c108440-evidence; c=/tmp/qa-y/m4a-prov
reap(){ for pid in $(ss -ltnp | grep -E ":$1 " | grep -o 'pid=[0-9]*' | cut -d= -f2); do [ "$(readlink /proc/$pid/cwd)" = "$c" ] && kill $pid && echo "reaped own vite $pid on :$1" >> $ev/run.log; done; }
echo "pass3 head now: $(git -C /workspace/egg-farm-studio/game ls-remote origin refs/heads/m4/m4a-tracks-v3 | cut -c1-7)" >> $ev/run.log
for eng in firefox webkit; do for k in buildid globals rc0; do
  case $k in buildid) port=5741;; globals) port=5742;; rc0) port=5743;; esac
  reap $port; if ss -ltn | grep -q ":$port "; then echo "$k $eng SKIP port $port busy (not ours)" >> $ev/exits.txt; continue; fi
  echo "[$(date +%H:%M:%S)] START $k $eng :$port" >> $ev/run.log; log=$ev/$k-$eng.log
  ( cd $c; case $k in
    buildid) flock $L timeout 600 node $ev/buildid-probe.mjs $c $eng $port ;;
    globals) flock $L timeout 600 env PORT=$port node scripts/qa-globals-single.mjs $eng ;;
    rc0) mkdir -p $ev/shots-$eng; flock $L timeout 600 env PORT=$port SHOTS=$ev/shots-$eng node scripts/rc0-browser.mjs $eng ;;
  esac ) > $log 2>&1; ec=$?; reap $port
  line="$k $eng exit=$ec fails=$(rg -c '^FAIL' $log || echo 0) summary=\"$(rg -o '[0-9]+/[0-9]+ passed|runtime build ids.*|served build.*' $log | tail -1)\" $(date +%H:%M:%S)"
  echo "$line" >> $ev/exits.txt; echo "$(date '+%F %T %Z') $line" >> $ev/summary.txt
done; done; echo ALL_DONE >> $ev/run.log
P=/workspace/egg-farm-studio/qa/m3-recheck/toast-pr5-3930a4c; cd /tmp/qa-pr5-3930a4c
$P/run.sh chromium toast; $P/run.sh firefox guard toast rc0; $P/run.sh webkit guard toast rc0; echo CHAIN3-DONE >> $P/steps.txt
