#!/bin/bash
set -u; R=/workspace/egg-farm-studio; Q=$R/qa; SC=$Q/m3-scripts; L=$R/.browser-test.lock
F=8c568b0788ffd1371930c6db202b9e96e2655919; S=8c568b0
W=$Q/wt-pr66-$S; E=$Q/m3-recheck/pr66-$S; mkdir -p $E/shots
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
cd $W || exit 1
log "=== PR #66 gate start on $(git rev-parse HEAD) porcelain=$(git status --porcelain | wc -l)"
t0=$(date +%s); flock $L timeout 600 node $SC/pr66-8c568b0-checks.mjs $W $E > $E/checks.log 2>&1; log "checks exit=$? $(( $(date +%s)-t0 ))s $(rg '^PR66_CHECKS' $E/checks.log)"
log "porcelain after checks: $(git status --porcelain | wc -l)"
t0=$(date +%s); flock $L timeout 600 env BUILD_SHA=$F node $R/qa/scratch/m4a-31-delta/buildid-probe.mjs $W chromium 5961 > $E/buildid.log 2>&1; log "buildid-probe exit=$? $(( $(date +%s)-t0 ))s $(rg '^(PASS|FAIL) runtime build-id' $E/buildid.log)"
t0=$(date +%s); flock $L timeout 600 env -u PORT SHOTS=$E/shots node scripts/rc0-browser.mjs chromium > $E/rc0.log 2>&1; log "rc0-chromium (unset PORT) exit=$? $(( $(date +%s)-t0 ))s $(tail -2 $E/rc0.log | tr '\n' ' ')"
t0=$(date +%s); npx vitest run --maxWorkers=2 --minWorkers=1 > $E/vitest-full.log 2>&1; log "vitest full exit=$? $(( $(date +%s)-t0 ))s $(rg 'Test Files|Tests ' $E/vitest-full.log | tr -s ' ' | tr '\n' ' ')"
log "porcelain end: $(git status --porcelain | wc -l); ports: $(ss -ltn | rg -o ':(596[1-4]|4173) ' | tr '\n' ' ')"
log "PR66_GATE_DONE"
