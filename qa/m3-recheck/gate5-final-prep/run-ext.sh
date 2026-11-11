#!/usr/bin/env bash
# PROFILE=A|B run-ext.sh <sha40> <url> <outdir> [engines...]  — run AFTER gate5 run.sh shots for the same outdir (it appends to entries-<engine>.jsonl).
# Lane: lane 2 (.browser-test-2.lock) for CHROMIUM ONLY if 1-min load < 12, else lane 1 (.browser-test.lock). One engine x group per hold, timeout 540. EXT_GROUPS is space-separated here.
set -u; SHA=$1; URL=$2; OUT=$3; shift 3; D=$(dirname "$(readlink -f "$0")"); ENGS=${@:-chromium firefox webkit}
PROFILE=${PROFILE:-A}; case $PROFILE in A|B) ;; *) echo 'PROFILE must be A or B'; exit 2;; esac; echo "profile=$PROFILE"
for E in $ENGS; do rm -f "$OUT/na-by-ruling-$E.txt"; rm -f "$OUT/ext-probes-$E.jsonl" "$OUT"/$E/ext-*.png; sed -i '/"group":"final-prep:/d' "$OUT/entries-$E.jsonl" 2>/dev/null
 for G in ${EXT_GROUPS:-max l5x coins goal cap c4 exp1 f2 f3 h6 expgate expui expoff}; do   # one short hold per group (goal ~6 min/engine under load)
  LOAD=$(cut -d' ' -f1 /proc/loadavg); L=/workspace/egg-farm-studio/.browser-test.lock; [ "$E" = chromium ] && awk "BEGIN{exit !($LOAD<12)}" && L=/workspace/egg-farm-studio/.browser-test-2.lock
  PROFILE=$PROFILE SHA=$SHA URL=$URL EXT_GROUPS=$G flock -w 1800 $L timeout 540 node $D/shoot-ext.mjs $E "$OUT"; echo "$E $G exit=$? lane=$L"; done; done
# profile B: N/A-by-ruling cells -> feed to the unchanged gate5 manifest.mjs as NOT_RUN (recorded in manifest.not_run, not as skips)
if [ "$PROFILE" = B ]; then cat "$OUT"/na-by-ruling-*.txt 2>/dev/null | sort -u | paste -sd';' > "$OUT/NOT_RUN-profileB.txt"; echo "NOT_RUN for manifest: $(cat $OUT/NOT_RUN-profileB.txt)"; fi
