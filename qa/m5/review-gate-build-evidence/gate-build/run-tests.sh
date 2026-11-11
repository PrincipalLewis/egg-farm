#!/bin/bash
# Runs the SYNTHETIC self-test suite only. Usage: run-tests.sh <tag>  -> logs/<tag>.log + logs/<tag>.exit
set -u
D=/workspace/egg-farm-studio/scratch/post-l10/gate-build; cd "$D"
python3 -m unittest discover -s tests -p 'test_*.py' -v > "logs/$1.log" 2>&1; echo $? > "logs/$1.exit"
