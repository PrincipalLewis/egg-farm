#!/bin/bash
# Saves QA full gate driver, #63 8694222 (+3c86720 test-only vitest). Sequential; each browser step its own flock hold (<10 min). Never pushes/merges/tags.
set -u; R=/workspace/egg-farm-studio; Q=$R/qa; SC=$Q/m3-scripts; G=$R/game; L=$R/.browser-test.lock
F=86942226ed792598efa2dbc5b473dc7bc93073ab; S=8694222; F2=3c867204c94aabf7f65c41e3ebfd0b9544a792aa
EV=$Q/m41/m41-7-$S; mkdir -p $EV; log(){ echo "$(date '+%F %T %Z') $*" | tee -a $EV/driver.log; }
log "=== driver start"
DRY=1 CSR_EV=$EV/csr bash $SC/csr-m41-7-acs.sh $F 1 > $EV/dry-acs.log 2>&1; log "dry acs exit=$? || exit 1"
CSR_EV=$EV/csr bash $SC/csr-m41-7-acs.sh $F 1 > $EV/acs.out 2>&1; log "acs exit=$?"
bash $SC/m41-7-delta.sh $F "prep testdiff csr9c qel rc0" > $EV/delta.out 2>&1; log "delta exit=$?"
W=$Q/wt-m41-7-$S-acs; X=$EV/xbrowser; mkdir -p $X/expb1 $X/csr12
flock $L timeout 600 env ONLY=EXPB1 node $SC/csr9c-explainer-queue.mjs $W 5961 $X/expb1 $S > $X/expb1/run.log 2>&1; log "EXPB1 exit=$?"
flock $L timeout 600 node $SC/csr12-ls-throw-probe.mjs $W 5961 $X/csr12 preview $S > $X/csr12/run.log 2>&1; log "csr12 INFO exit=$?"
for e in firefox webkit; do mkdir -p $X/$e-dom $X/$e-ui $X/$e-resetat
  flock $L timeout 600 node $SC/csr-m41-7-browser.mjs $W $e 5961 $X/$e-dom $S > $X/$e-dom/run.log 2>&1; log "$e dom exit=$?"
  flock $L timeout 600 node $SC/csr-m41-7-ui.mjs $W $e 5961 $X/$e-ui $S > $X/$e-ui/run.log 2>&1; log "$e ui exit=$?"
  flock $L timeout 600 node $SC/csr-m41-7-resetat.mjs $W 5961 $X/$e-resetat $S $e > $X/$e-resetat/run.log 2>&1; log "$e resetat exit=$?"
done
bash $SC/m41-7-qel.sh $F > $EV/qel.out 2>&1; log "qel exit=$?"
W2=$Q/wt-m41-7-$S; N=$EV/gates/save-noreg; mkdir -p $N; cp $SC/m41-7-save-noreg.qa.test.ts $W2/tests/
(cd $W2 && NOREG_OUT=$N/noreg-$S.json timeout 600 npx vitest run --maxWorkers=2 --minWorkers=1 tests/m41-7-save-noreg.qa.test.ts > $N/noreg-$S.log 2>&1; echo "exit=$?" >> $N/noreg-$S.log; rm -f tests/m41-7-save-noreg.qa.test.ts)
node $SC/m41-7-save-noreg-compare.mjs $N/noreg-$S.json $Q/m41/m41-7-dfdf49c/gates/save-noreg/noreg-dd223f5.json > $N/compare.txt 2>&1; log "noreg compare exit=$?"
E2=$Q/m41/m41-7-3c86720; W3=$Q/wt-m41-7-3c86720; mkdir -p $E2
[ -d $W3 ] || git -C $G worktree add --detach $W3 $F2 >/dev/null 2>&1; cd $W3 || exit 1; log "3c86720 HEAD $(git rev-parse HEAD)"
[ -d node_modules ] || { npm ci --no-audit --no-fund > $E2/npm-ci.log 2>&1; log "3c86720 npm ci exit=$?"; }
t0=$(date +%s); npx vitest run --maxWorkers=2 --minWorkers=1 > $E2/vitest-full.log 2>&1; log "3c86720 vitest full exit=$? $(( $(date +%s)-t0 ))s"
npx vitest run --maxWorkers=2 --minWorkers=1 tests/m41-7-csr8b-race.test.ts --reporter=verbose > $E2/vitest-csr8b-race-verbose.log 2>&1; log "3c86720 csr8b verbose exit=$?"
log "3c86720 porcelain $(git status --porcelain | wc -l)"; log DRIVER_DONE
