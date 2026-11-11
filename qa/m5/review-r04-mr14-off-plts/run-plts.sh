#!/usr/bin/env bash
set -euo pipefail
ROOT=/workspace/egg-farm-studio
H="$ROOT/scratch/post-l10/baseline/h"
CSV="$ROOT/scratch/post-l10/cycle-2320/R04/candidate.csv"
OUT="$ROOT/qa/m5/review-r04-mr14-off-plts"
cd "$H"
echo "start $(date -Iseconds)" | tee "$OUT/run.log"
for pf in optimal seller15 casual; do
  echo "prof=$pf $(date -Iseconds)" | tee -a "$OUT/run.log"
  CSV="$CSV" SEEDS=200 S0=1 T=4000 PROFS="$pf" \
    node node_modules/.bin/vite-node pl.ts \
    > "$OUT/raw-$pf.json" 2> "$OUT/raw-$pf.log"
  echo "done $pf $(date -Iseconds) bytes=$(wc -c < "$OUT/raw-$pf.json")" | tee -a "$OUT/run.log"
done
echo "end $(date -Iseconds)" | tee -a "$OUT/run.log"
