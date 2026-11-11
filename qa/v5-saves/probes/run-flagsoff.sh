#!/bin/bash
# usage (via lane-run saves-qa): run-flagsoff.sh <candidate-sha> <outdir> <flag,list>   baseline is 458f74c. Own worktrees under qa/scratch, removed after.
set -u; C=$1; O=$2; FL=$3; P=/workspace/egg-farm-studio/qa/v5-saves/probes; S=/workspace/egg-farm-studio/qa/scratch; G=/workspace/egg-farm-studio/game
mkdir -p $O; for r in 458f74c $C; do W=$S/wt-flagsoff-${r:0:7}; [ -e $W ] || git -C $G worktree add --detach -q $W $r
  ( cd $W && { [ -d node_modules ] || nice -n 19 npm ci --no-audit --no-fund > $O/npm-ci-${r:0:7}.log 2>&1; } && cp $P/flagsoff-probe.test.ts tests/zz-qa-flagsoff.test.ts &&
    { echo "HEAD $(git rev-parse HEAD) flags=$FL"; QA_FLAGS=$FL QA_PROBE_OUT=$O/probe-${r:0:7}.jsonl nice -n 10 npx vitest run --minWorkers=1 --maxWorkers=1 tests/zz-qa-flagsoff.test.ts; echo "exit=$?"; } > $O/probe-${r:0:7}.log 2>&1
    rm -f tests/zz-qa-flagsoff.test.ts; echo "status:[$(git status --porcelain)]" >> $O/probe-${r:0:7}.log ); done
node $P/flagsoff-compare.mjs $O/probe-${C:0:7}.jsonl $O/probe-458f74c.jsonl > $O/compare.txt 2>&1; echo "compare exit=$?" >> $O/compare.txt
for r in 458f74c $C; do git -C $G worktree remove --force $S/wt-flagsoff-${r:0:7}; done; git -C $G worktree prune
echo DONE >> $O/compare.txt; (cd $O && find . -type f ! -name SHA256SUMS | sort | xargs sha256sum > SHA256SUMS)
