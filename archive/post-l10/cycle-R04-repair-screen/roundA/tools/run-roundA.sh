#!/bin/bash
# run-roundA.sh <cdir>... : genA (validate; reject -> skip) -> ../tools/run-pl.sh (pl.ts flags-off CFG none, seeds 1-200, T 4000, 3 profiles serial)
# -> ../tools/metrics.py. One candidate dir at a time. Writes only under roundA/. INFORMAL.
cd /workspace/egg-farm-studio/scratch/post-l10/cycle-R04-repair-screen || exit 3; export PYTHONDONTWRITEBYTECODE=1
for d in "$@"; do d=${d%/}
  [ -f $d/run/metrics.json ] && continue
  mkdir $d/.claim 2>/dev/null || continue
  python3 roundA/tools/genA.py --spec $d/spec.json --envelope tools/envelope-a.json --out $d/candidate.csv > $d/gen.out 2> $d/gen.err; echo $? > $d/gen.exit
  [ "$(cat $d/gen.exit)" = 0 ] || continue
  tools/run-pl.sh $d/candidate.csv $d/run
  python3 tools/metrics.py $d/run > $d/run/summary.txt 2>&1
done
