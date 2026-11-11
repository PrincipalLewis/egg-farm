#!/bin/bash
# M4-A c108440: FF then WK, buildid+globals+rc0 on provided html (/tmp/qa-y/m4a-prov). Waits for the #17/#18 driver.
set -u
while kill -0 2022851 2>/dev/null; do sleep 20; done
L=/workspace/egg-farm-studio/.browser-test.lock; ev=/workspace/egg-farm-studio/qa/m3-recheck/m4a-c108440-evidence; c=/tmp/qa-y/m4a-prov; port=5723
echo "head now: $(git -C /workspace/egg-farm-studio/game ls-remote origin refs/heads/m4/m4a-tracks-v3 | cut -c1-7)" >> $ev/run.log
for eng in firefox webkit; do for k in buildid globals rc0; do
  rg -q "^$k $eng exit=" $ev/exits.txt 2>/dev/null && continue
  echo "[$(date +%H:%M:%S)] START $k $eng" >> $ev/run.log; log=$ev/$k-$eng.log
  ( cd $c; case $k in
    buildid) flock $L timeout 600 node /workspace/egg-farm-studio/qa/scratch/pr17-18-y/buildid-probe.mjs $c $eng $port ;;
    globals) flock $L timeout 600 env PORT=$port node scripts/release-globals-browser.mjs $eng ;;
    rc0) mkdir -p $ev/shots-$eng; flock $L timeout 600 env PORT=$port SHOTS=$ev/shots-$eng node scripts/rc0-browser.mjs $eng ;;
  esac ) > $log 2>&1; ec=$?
  echo "$k $eng exit=$ec fails=$(rg -c '^FAIL' $log || echo 0) summary=\"$(rg -o '[0-9]+/[0-9]+ passed|runtime build ids.*' $log | tail -1)\" $(date +%H:%M:%S)" >> $ev/exits.txt
done; done; echo ALL_DONE >> $ev/run.log
