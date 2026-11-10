#!/bin/bash
# run-round.sh <rounddir> : for each <rounddir>/cNN/spec.json (sorted): gen.py (validate; reject -> skip) -> pl.ts (run-pl.sh) -> metrics.py.
# Serial (1 heavy lane). Writes only under <rounddir>. INFORMAL screen.
cd /workspace/egg-farm-studio/scratch/post-l10/cycle-R04-repair-screen || exit 3; export PYTHONDONTWRITEBYTECODE=1
R=$1
for d in $(ls -d $R/c*/ | sort); do d=${d%/}
  [ -f $d/run/metrics.json ] && continue
  mkdir $d/.claim 2>/dev/null || continue   # atomic claim: two lane instances split the list
  python3 tools/gen.py --spec $d/spec.json --envelope tools/envelope-a.json --out $d/candidate.csv > $d/gen.out 2> $d/gen.err; echo $? > $d/gen.exit
  [ "$(cat $d/gen.exit)" = 0 ] || continue
  tools/run-pl.sh $d/candidate.csv $d/run
  python3 tools/metrics.py $d/run > $d/run/summary.txt 2>&1
done
echo "done $(date -Iseconds)" >> $R/DONE.$$
