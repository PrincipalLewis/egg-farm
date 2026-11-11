#!/usr/bin/env bash
# Usage: run-sha.sh <sha> <outdir> [seedTo=400] [procs=4]
# Creates /tmp/qa-mk59-<sha> worktree (node_modules symlinked), runs our harness + Features' method on seeds 1..N, removes worktree.
set -euo pipefail
SHA=$1; OUT=$2; N=${3:-400}; P=${4:-4}; H=$(cd "$(dirname "$0")" && pwd); BASE=/tmp/qa-mk59a/egg-farm
WT=/tmp/qa-mk59-$SHA; mkdir -p "$OUT"
git -C $BASE worktree add -f --detach "$WT" "$SHA" >/dev/null; ln -s $BASE/node_modules "$WT/node_modules"
trap 'git -C $BASE worktree remove --force "$WT"' EXIT
step=$(( (N + P - 1) / P )); pids=()
for ((k=0;k<P;k++)); do a=$((k*step+1)); z=$(( (k+1)*step<N ? (k+1)*step : N )); [ $a -gt $N ] && break
  (cd $BASE && REPO=$WT timeout 3000 ./node_modules/.bin/vite-node $H/harness.ts -- $a $z $OUT/ours-$SHA-$k.json) & pids+=($!)
  (cd $BASE && REPO=$WT timeout 3000 ./node_modules/.bin/vite-node $H/features-method.ts -- $a $z $OUT/feat-$SHA-$k.json) & pids+=($!)
done
for p in "${pids[@]}"; do wait $p; done
git -C $WT rev-parse HEAD > $OUT/sha-$SHA.txt
