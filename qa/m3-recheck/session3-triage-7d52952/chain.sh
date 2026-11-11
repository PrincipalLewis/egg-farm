#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/session3-triage-7d52952; B=/workspace/egg-farm-studio/qa/m3-recheck/b2-pr4-572864a; L=/workspace/egg-farm-studio/.browser-test.lock
n(){ echo "$(date '+%F %T %Z') $*" >> $E/summary.txt; }
while ! grep -qs CHAIN-DONE /workspace/egg-farm-studio/qa/m3-recheck/claude-qa4-triage-7d52952/summary.txt; do sleep 15; done
cd /tmp/qa-rc1v4-7d52952
for e in chromium firefox webkit; do
  HIDE_S=450 flock $L timeout 600 node $E/qa-hidden.mjs $e $E > $E/hidden-$e.log 2>&1; n "hidden $e exit=$?"
  for s in 360x740 375x700 390x844 430x932 1280x720; do SIZES=$s flock $L timeout 600 node $E/qa-s3.mjs $e 4341 $E > $E/s3-$e-$s.log 2>&1; n "s3 $e $s exit=$? $(tail -1 $E/s3-$e-$s.log)"; done
  for s in 360x740 375x700 390x844; do SIZES=$s flock $L timeout 600 node $E/qa-p.mjs $e 4341 $E > $E/p-$e-$s.log 2>&1; n "p $e $s exit=$? $(tail -1 $E/p-$e-$s.log)"; done
done
ss -ltn | grep -E ":434[1-3] " >> $E/summary.txt; echo CHAIN-DONE >> $E/summary.txt
