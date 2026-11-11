#!/bin/bash
# v2 after 04:43 reset: clones under qa/scratch/pr17-18-y/clones. Results appended to report per step.
set -u
R=/workspace/egg-farm-studio; L=$R/.browser-test.lock; M=$R/qa/m3-recheck; W=$R/qa/scratch/pr17-18-y/clones; PR=$R/qa/scratch/pr17-18-y/buildid-probe.mjs
head_ok() { local ref=$1 want=$2 rep=$3 h; h=$(git -C $R/game ls-remote origin $ref | cut -c1-7); [ "$h" = "$want" ] && return 0; echo "- $(date +%H:%M) HEAD MOVED: $ref is $h, not $want. Remaining steps stopped, reported, not switched." >> $rep; return 1; }
step() { # clone evdir report kind eng port
  local c=$1 ev=$2 rep=$3 k=$4 eng=$5 port=$6 log="$2/$4-$5.log" ec s
  rg -q "^$k $eng exit=" $ev/exits.txt 2>/dev/null && return 0
  echo "[$(date +%H:%M:%S)] START $k $eng" >> $ev/run.log
  ( cd $c; case $k in
    buildid) flock $L timeout 600 node $PR $c $eng $port ;;
    globals) flock $L timeout 600 env PORT=$port node scripts/release-globals-browser.mjs $eng ;;
    rc0) mkdir -p $ev/shots-$eng; flock $L timeout 600 env PORT=$port SHOTS=$ev/shots-$eng node scripts/rc0-browser.mjs $eng ;;
  esac ) > $log 2>&1; ec=$?
  s=$(rg -o '[0-9]+/[0-9]+ passed|runtime build ids.*|PASS.*|FAIL.*' $log | tail -1)
  echo "$k $eng exit=$ec fails=$(rg -c '^FAIL' $log || echo 0) summary=\"$s\" $(date +%H:%M:%S)" >> $ev/exits.txt
  echo "- $(date +%H:%M) $k $eng: exit=$ec, fails=$(rg -c '^FAIL' $log || echo 0), $s (log: $(basename $ev)/$k-$eng.log)" >> $rep
}
for eng in chromium firefox webkit; do for k in buildid globals rc0; do
  head_ok refs/pull/17/head cf50663 $M/pr17-cf50663.md && step $W/pr17 $M/pr17-cf50663-evidence $M/pr17-cf50663.md $k $eng 5721
  head_ok refs/pull/18/head d8d680e $M/pr18-d8d680e.md && step $W/pr18 $M/pr18-d8d680e-evidence $M/pr18-d8d680e.md $k $eng 5722
done; done
for eng in firefox webkit; do for k in buildid globals rc0; do
  head_ok refs/heads/m4/m4a-tracks-v3 c108440 $M/m4a-c108440.md && step $W/m4a-prov $M/m4a-c108440-evidence $M/m4a-c108440.md $k $eng 5723
done; done
echo ALL_DONE >> $M/m4a-c108440-evidence/run.log
