#!/usr/bin/env bash
# run.sh <sha40> <url> <outdir> [engines...]   one engine at a time under lane-1 lock (lane 2 for chromium only if 1-min load <12)
set -u; SHA=$1; URL=$2; OUT=$3; shift 3; D=$(dirname "$(readlink -f "$0")"); ENGS=${@:-chromium firefox webkit}
for E in $ENGS; do L=/workspace/egg-farm-studio/.browser-test.lock
 if [ $E = chromium ] && awk '{exit !($1<12)}' /proc/loadavg; then L=/workspace/egg-farm-studio/.browser-test-2.lock; fi
 rm -f "$OUT/entries-$E.jsonl" "$OUT/skipped-$E.txt"; rm -rf "$OUT/$E"
 SHA=$SHA URL=$URL flock $L timeout 600 node $D/shoot.mjs $E "$OUT"; echo "$E exit=$?"; done
# behaviour probes (Chromium only; logs -> <outdir>/probes/*.jsonl). Run after the shots: W2 appends to entries-chromium.jsonl.
if [[ " $ENGS " == *" chromium "* ]]; then rm -rf "$OUT/probes"
 SHA=$SHA URL=$URL flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node $D/probes.mjs "$OUT" all-fast; echo "probes exit=$?"
 if [ "${W2:-1}" = 1 ]; then SHA=$SHA URL=$URL W2_CAP_S=${W2_CAP_S:-540} flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node $D/probes.mjs "$OUT" w2; echo "w2 exit=$?"; fi
fi
