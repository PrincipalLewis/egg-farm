#!/bin/bash
# run-trace.sh <csv> <outdir> [seeds]: DIAGNOSTIC trace (tools/trace.ts) for 3 profiles, serial. Writes only <outdir>.
CSV=$(realpath "$1"); O=$(realpath -m "$2"); N=${3:-200}; mkdir -p "$O"; cd /workspace/egg-farm-studio/scratch/post-l10/cycle-R04-repair-screen/h || exit 3
sha256sum "$CSV" > "$O/csv.sha256"
for p in optimal seller15 casual; do CSV="$CSV" SEEDS=$N S0=1 PROFS=$p node node_modules/.bin/vite-node ../tools/trace.ts > "$O/trace-$p.json" 2> "$O/trace-$p.log"; echo $? > "$O/trace-$p.exit"; done
echo done > "$O/DONE"
