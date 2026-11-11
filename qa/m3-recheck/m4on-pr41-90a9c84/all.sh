#!/usr/bin/env bash
E=/workspace/egg-farm-studio/qa/m3-recheck/m4on-pr41-90a9c84
for ENG in chromium firefox webkit; do $E/run.sh $ENG loop hl p3 layout shots; done
echo ALLDONE >> $E/summary.txt
