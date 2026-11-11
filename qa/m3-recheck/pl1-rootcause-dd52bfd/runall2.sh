#!/usr/bin/env bash
# runall.sh <tag> <url> <sha7> <engines> [cases]
cd "$(dirname "$0")"; for E in $4; do URL=$2 SHA7=$3 CASES=$5 SHOTDIR=$SHOTDIR SIZE=$SIZE flock /workspace/egg-farm-studio/.browser-test-2.lock timeout 600 node pl1rc.mjs $E >> run-$1-$E.log 2>&1; echo "$1 $E exit=$?" >> run-$1-$E.log; done
