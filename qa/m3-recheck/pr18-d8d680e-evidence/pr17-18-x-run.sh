#!/bin/bash
# PR17 c08cff5 / PR18 abe0991: runtime build-id + check-globals + rc0, one engine at a time, each step under main lock.
set -u
L=/workspace/egg-farm-studio/.browser-test.lock; E=/workspace/egg-farm-studio/qa/m3-recheck
step() { # label clone ev kind engine port
  local lab=$1 c=$2 ev=$3 k=$4 eng=$5 port=$6 log="$3/$4-$5.log"
  rg -q "^$k $eng exit=" "$ev/exits.txt" 2>/dev/null && return 0
  echo "[$(date +%H:%M:%S)] START $lab $k $eng port=$port" >> "$ev/run.log"
  ( cd "$c"; case $k in
     buildid) flock $L timeout 600 node "$ev/buildid-probe.mjs" "$c" "$eng" "$port" ;;
     globals) flock $L timeout 600 env PORT=$port node scripts/release-globals-browser.mjs "$eng" ;;
     rc0) mkdir -p "$ev/shots-$eng"; flock $L timeout 600 env PORT=$port SHOTS="$ev/shots-$eng" node scripts/rc0-browser.mjs "$eng" ;;
  esac ) > "$log" 2>&1
  local ec=$? sum
  sum=$(rg -o '[0-9]+/[0-9]+ passed|runtime build ids.*' "$log" | tail -1); fails=$(rg -c '^FAIL' "$log")
  echo "$k $eng exit=$ec fails=${fails:-0} summary=\"$sum\" $(date +%H:%M:%S)" >> "$ev/exits.txt"
}
for eng in chromium firefox webkit; do
  for k in buildid globals rc0; do
    step pr17 /tmp/qa-x/pr17 $E/pr17-c08cff5-evidence $k $eng 56$((10 + RANDOM % 40))
    step pr18 /tmp/qa-x/pr18 $E/pr18-abe0991-evidence $k $eng 56$((50 + RANDOM % 40))
  done
done
echo ALL_DONE >> $E/pr17-c08cff5-evidence/run.log; echo ALL_DONE >> $E/pr18-abe0991-evidence/run.log
