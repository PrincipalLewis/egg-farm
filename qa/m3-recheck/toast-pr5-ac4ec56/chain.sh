#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/toast-pr5-ac4ec56; B=/workspace/egg-farm-studio/qa/m3-recheck/b2-pr4-572864a
while ! grep -qs buildqa= $E/steps.txt; do sleep 10; done
while ! grep -qs CHAIN-DONE /workspace/egg-farm-studio/qa/m3-recheck/session3-triage-7d52952/summary.txt; do sleep 15; done
cd /tmp/qa-pr5-ac4ec56; P=/workspace/egg-farm-studio/qa/m3-recheck/rc1-qa-bugs-v4-prep; EXC=$(git rev-parse --git-path info/exclude); mkdir -p $(dirname $EXC)
for f in $P/qa-guard.mjs $P/qa-layout.mjs $E/qa-toast.mjs; do cp $f scripts/; echo scripts/$(basename $f) >> $EXC; done; git status --porcelain >> $E/steps.txt
for e in chromium firefox webkit; do $E/run.sh $e guard globals toast base layout rc0; done
echo CHAIN-DONE >> $E/steps.txt
