#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/toast-pr5-3930a4c
while kill -0 80328 2>/dev/null; do sleep 15; done; /workspace/egg-farm-studio/qa/m3-recheck/m4a-c108440-evidence/m4a-run2.sh > /workspace/egg-farm-studio/qa/m3-recheck/m4a-c108440-evidence/driver3.out 2>&1
cd /tmp/qa-pr5-3930a4c
$E/run.sh chromium toast; $E/run.sh firefox guard toast rc0; $E/run.sh webkit guard toast rc0; echo CHAIN2-DONE >> $E/steps.txt
