#!/bin/bash
# run-opt2.sh <tracedir> <basecsv> <out> <seed> <iters> <m95> <m2> <totm> [fixfarm.json] : DIAGNOSTIC surrogate search (env RLO RHI JMP BM pass through)
cd /workspace/egg-farm-studio/scratch/post-l10/cycle-R04-repair-screen; export PYTHONDONTWRITEBYTECODE=1
python3 tools/opt.py "$@" > "$3.log" 2>&1
