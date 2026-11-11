#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/b2-pr4-902f924
cd /tmp/qa-b2-902f924
$E/run.sh chromium b2
$E/run.sh firefox guard b2 layout rc0
$E/run.sh webkit guard b2 layout rc0
echo CHAIN-DONE >> $E/steps.txt
