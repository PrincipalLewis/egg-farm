#!/bin/bash
set -u; D=/workspace/egg-farm-studio/scratch/post-l10/gate-build; cd "$D"
python3 mutate.py > "logs/$1.log" 2>&1; echo $? > "logs/$1.exit"
