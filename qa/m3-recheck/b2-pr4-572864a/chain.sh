#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/b2-pr4-572864a
cd /tmp/qa-b2-572864a
$E/run.sh chromium smoke guard b2 base layout rc0
$E/run.sh firefox guard b2 base layout rc0
$E/run.sh webkit guard b2 base layout rc0 base0
echo CHAIN-DONE >> $E/steps.txt
