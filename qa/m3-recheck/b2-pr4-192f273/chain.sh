#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/b2-pr4-192f273
while kill -0 1610561 2>/dev/null; do sleep 15; done
cd /tmp/qa-b2-192f273
$E/run.sh chromium guard geo state smoke rc0
$E/run.sh firefox guard geo state rc0
$E/run.sh webkit guard geo state rc0
echo CHAIN-DONE >> $E/steps.txt
# then PR #5
P=/workspace/egg-farm-studio/qa/m3-recheck/toast-pr5-3930a4c; cd /tmp/qa-pr5-3930a4c
$P/run.sh chromium guard toast rc0; $P/run.sh firefox guard toast rc0; $P/run.sh webkit guard toast rc0; echo CHAIN-DONE >> $P/steps.txt
