#!/bin/bash
# run-opt.sh <outbase> <seed> <iters> [m95 m2 totm]: DIAGNOSTIC surrogate search, log to <outbase>.log
cd /workspace/egg-farm-studio/scratch/post-l10/cycle-R04-repair-screen && BM=${BM:-0.18} python3 tools/opt.py diag/trace-a8c4 control/a8c4e268.csv "$1.json" "$2" "$3" ${4:-172} ${5:-1.93} ${6:-0.085} > "$1.log" 2>&1
