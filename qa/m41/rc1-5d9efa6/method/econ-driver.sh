#!/bin/bash
# Saves QA item (4) economy no-regression: dd223f5 vs 5d9efa6. vitest max 2 workers. Read-only on both worktrees.
set -u; R=/workspace/egg-farm-studio; Q=$R/qa; E=$Q/m41/rc1-5d9efa6/econ; X=$Q/scratch/rc1-econ; mkdir -p $E
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
log "=== econ driver start"
for p in "dd223f5:$Q/wt-csr-base-dd223f5" "5d9efa6:$Q/wt-rc1-5d9efa6"; do s=${p%%:*}; W=${p#*:}; cd $W
  log "$s HEAD $(git rev-parse --short HEAD) porcelain $(git status --porcelain | wc -l)"
  t0=$(date +%s); npx vitest run --maxWorkers=2 --minWorkers=1 tests/pacing.test.ts tests/pacing-acw1.test.ts tests/m4a-pacing.test.ts > $E/pacing-$s.log 2>&1; log "$s pacing trio exit=$? $(( $(date +%s)-t0 ))s $(rg 'Tests ' $E/pacing-$s.log | tail -1)"
  t0=$(date +%s); npx vite-node $X/econ-perseed.ts $W $E/perseed-$s.json > $E/perseed-$s.log 2>&1; log "$s per-seed dump exit=$? $(( $(date +%s)-t0 ))s"
  t0=$(date +%s); SEEDS=100 npx vite-node $Q/m3-scripts/ac7-l18-25-gate-workers.ts $W > $E/ac7-ts-workers-$s.log 2>&1; log "$s AC7 TS workers exit=$? $(( $(date +%s)-t0 ))s $(rg '^RESULT' $E/ac7-ts-workers-$s.log)"
done
cd $Q; node $X/econ-compare.mjs $E/perseed-dd223f5.json $E/perseed-5d9efa6.json > $E/compare.txt 2>&1; log "compare exit=$? $(rg '^ECON_COMPARE' $E/compare.txt)"
for s in dd223f5 5d9efa6; do rg -o "AC-W1 build.*|AC7 seller15.*|M4A-PACING.{0,200}" $E/pacing-$s.log > $E/pacing-report-$s.txt; done
diff $E/pacing-report-dd223f5.txt $E/pacing-report-5d9efa6.txt > $E/pacing-report.diff; log "printed pacing reports diff lines: $(wc -l < $E/pacing-report.diff)"
log ECON_DONE
cd $Q/wt-csr-base-dd223f5 && { t0=$(date +%s); npm run -s test:slow > $E/test-slow-dd223f5.log 2>&1; log "dd223f5 test:slow exit=$? $(( $(date +%s)-t0 ))s $(rg "Tests " $E/test-slow-dd223f5.log | tail -1)"; }; log ECON_SLOW_DONE
