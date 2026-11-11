#!/bin/bash
L=/workspace/egg-farm-studio/qa/m3-recheck/save-5d636d8; cd $L
st(){ while [ "$(cut -d. -f1 /proc/loadavg)" -gt 50 ]; do sleep 30; done; echo "STEP $* queued $(date +%T)"; flock /workspace/egg-farm-studio/.browser-test.lock timeout 590 ./step.sh "$@"; echo "STEP $1 rc=$? $(date +%T)"; ss -ltnp | rg ":45[0-9][0-9] " ; }
st chromium 4500 guard
st firefox 4530 guard quota2 v6 v6lw offline relglob qaglob
st webkit 4560 guard quota2 v6 v6lw offline relglob qaglob
st firefox 4530 probe3 probe3rel
st webkit 4560 probe3 probe3rel
st firefox 4530 probe claude wage tabguard d2
st webkit 4560 probe claude wage tabguard d2
st firefox 4530 rc0 recov
st webkit 4560 rc0 recov
echo ALLDONE
