#!/bin/bash
# run-pl.sh <csv> <outdir> : pl.ts flags-off CFG none, SEEDS=200 S0=1 T=4000, profiles serial (1 heavy process at a time).
# Harness = h/ (byte copy of scratch/post-l10/baseline/h, see h-source.sha256); node_modules -> /workspace/wt-v5-golden-game/node_modules
# (vite-node 2.1.9; baseline/h's own node_modules symlink is dangling after the 9 Nov box replacement). Writes only <outdir>. INFORMAL.
set -u
CSV=$(realpath "$1"); O=$(realpath -m "$2"); mkdir -p "$O"
H=/workspace/egg-farm-studio/scratch/post-l10/cycle-R04-repair-screen/h
sha256sum "$CSV" > "$O/csv.sha256"; { node --version; node "$H/node_modules/.bin/vite-node" --version; sha256sum "$H/pl.ts" "$H/m5.ts" "$H/m5pl.ts"; } > "$O/env.txt" 2>&1
echo "start $(date -Iseconds)" > "$O/timing.txt"
cd "$H" || exit 3
for p in optimal seller15 casual; do
  CSV="$CSV" SEEDS=200 S0=1 T=4000 PROFS=$p node node_modules/.bin/vite-node pl.ts > "$O/raw-$p.json" 2> "$O/raw-$p.log"; echo $? > "$O/raw-$p.exit"
  echo "$p done $(date -Iseconds)" >> "$O/timing.txt"
done
echo "end $(date -Iseconds)" >> "$O/timing.txt"
