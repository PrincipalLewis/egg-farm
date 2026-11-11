#!/bin/bash
# usage: modes.sh <outdir>; worktree at /tmp/pr21env/game, ../../product resolves to /tmp/pr21env/product
set -u; OUT=$1; mkdir -p $OUT; W=/tmp/pr21env/game; S=/workspace/egg-farm-studio/scratch/qa-pr21
cd $W; echo "head=$(git rev-parse HEAD)" > $OUT/head.txt
run() { # name
  (node scripts/check-economy-copy.mjs; echo "copy-exit=$?") > $OUT/$1-copycheck.log 2>&1
  (npx vite-node scripts/sync-economy-cli.ts -- --check; echo "sync-exit=$?") > $OUT/$1-sync.log 2>&1
  npx vitest run --maxWorkers=2 --minWorkers=1 --reporter=json --outputFile=$OUT/$1-vitest.json > $OUT/$1-vitest.log 2>&1; echo "vitest-exit=$?" >> $OUT/$1-vitest.log
  node -e 'const r=require(process.argv[1]);const m={};for(const f of r.testResults)for(const a of f.assertionResults)m[f.name.replace(/.*\/tests\//,"")+" :: "+a.fullName]=a.status;require("fs").writeFileSync(process.argv[2],Object.keys(m).sort().map(k=>m[k]+"\t"+k).join("\n")+"\n");console.log(r.numPassedTests,r.numFailedTests,r.numPendingTests)' $OUT/$1-vitest.json $OUT/$1-results.tsv >> $OUT/$1-vitest.log
}
rm -rf /tmp/pr21env/product; mkdir /tmp/pr21env/product; cp -a $S/* /tmp/pr21env/product/; run A-unchanged
# B: harmless + behavioural edit in the TEMP copy only
printf '\n# QA PR21 harmless edit\n' >> /tmp/pr21env/product/sim/economy_sim.py
sed -i 's/^COLL_SHARE = 0.5; SELL_EVERY = 15/COLL_SHARE = 0.9; SELL_EVERY = 3/' /tmp/pr21env/product/sim/economy_sim.py
sed -i '1s/$/,qa_extra/' /tmp/pr21env/product/economy.f1-m4cols.csv
grep -c 'COLL_SHARE = 0.9' /tmp/pr21env/product/sim/economy_sim.py > $OUT/B-edit-applied.txt
run B-sim-edited
# B2: economy.csv edited (exposes check-economy-copy / economy-copy.test.ts)
sed -i '2s/,[0-9]*,/,99999,/' /tmp/pr21env/product/economy.csv; run B2-csv-edited
rm -rf /tmp/pr21env/product; run C-hidden
for m in B-sim-edited B2-csv-edited C-hidden; do diff $OUT/A-unchanged-results.tsv $OUT/$m-results.tsv > $OUT/diff-A-vs-$m.txt; echo "$m diff-exit=$?"; done
