#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/toast-pr5-3930a4c
while kill -0 1623902 2>/dev/null; do sleep 15; done
cd /tmp/qa-pr5-3930a4c
$E/run.sh chromium guard toast rc0
$E/run.sh firefox guard toast rc0
$E/run.sh webkit guard toast rc0
echo CHAIN-DONE >> $E/steps.txt
