#!/bin/bash
# E-4 / SS-27: QA recompute. Each clone runs the QA script with ITS OWN vite-node.
S=/workspace/egg-farm-studio/qa/m41/p1-30b29d3/e4
for C in /tmp/qa-p1-30b29d3-off /tmp/qa-p1-30b29d3 /tmp/qa-p1-base-5d9efa6; do
  n=$(basename $C); echo "== $n HEAD $(git -C $C rev-parse HEAD) diff: $(git -C $C diff --stat | tail -1) $(date +%T)"
  (cd $C && s0=$(date +%s) && npx vite-node $S/qa-golden.ts -- $C; echo "rc=$? $(( $(date +%s)-s0 ))s") > $S/qa-golden-$n.out 2>&1; grep -E "m4.enabled|GOLDEN1|AC7SEEDS" $S/qa-golden-$n.out
done
