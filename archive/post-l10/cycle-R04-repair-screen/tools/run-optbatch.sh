#!/bin/bash
# run-optbatch.sh <tag> <seed...> : DIAGNOSTIC surrogate searches for the 3 margin variants, sequential.
cd /workspace/egg-farm-studio/scratch/post-l10/cycle-R04-repair-screen; export PYTHONDONTWRITEBYTECODE=1; tag=$1; shift
for sd in "$@"; do
  BM=0.17 python3 tools/opt.py diag/trace-a8c4 control/a8c4e268.csv diag/opt/$tag-A-$sd.json $sd 25000 172 1.93 0.085 > diag/opt/$tag-A-$sd.log 2>&1
  BM=0.18 python3 tools/opt.py diag/trace-a8c4 control/a8c4e268.csv diag/opt/$tag-B-$sd.json $sd 25000 176 1.95 0.09 > diag/opt/$tag-B-$sd.log 2>&1
  BM=0.19 python3 tools/opt.py diag/trace-a8c4 control/a8c4e268.csv diag/opt/$tag-C-$sd.json $sd 25000 180 2.0 0.095 > diag/opt/$tag-C-$sd.log 2>&1
done; echo done > diag/opt/$tag-DONE-$1
