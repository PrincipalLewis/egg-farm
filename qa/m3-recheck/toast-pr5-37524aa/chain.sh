#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/toast-pr5-37524aa
while pgrep -f m4a-run3.sh >/dev/null; do sleep 15; done
cd /tmp/qa-pr5-37524aa
$E/run.sh chromium guard globals rc0 midfade old; echo "$(date '+%F %T %Z') CHECKPOINT chromium done" >> $E/summary.txt
$E/run.sh firefox guard globals rc0 midfade; echo "$(date '+%F %T %Z') CHECKPOINT firefox done" >> $E/summary.txt
$E/run.sh webkit guard globals rc0 midfade; echo "$(date '+%F %T %Z') CHECKPOINT webkit done" >> $E/summary.txt
echo CHAIN-DONE >> $E/steps.txt
