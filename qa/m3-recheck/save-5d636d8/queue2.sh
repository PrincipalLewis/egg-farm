#!/bin/bash
L=/workspace/egg-farm-studio/qa/m3-recheck/save-5d636d8; cd $L
ONLYG=1 ./run-engine.sh chromium 4500
./run-engine.sh firefox 4530
./run-engine.sh webkit 4560
ss -ltnp | rg ":45[0-9][0-9] "; echo ALLDONE
