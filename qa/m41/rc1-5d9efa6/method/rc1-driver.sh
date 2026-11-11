#!/bin/bash
# Saves lane RC gate #67 @ 5d9efa6. Sequential. Each browser step = its own flock hold (timeout 600). Ports 5961 only. Never pushes/merges/tags.
set -u; R=/workspace/egg-farm-studio; Q=$R/qa; SC=$Q/m3-scripts; F=5d9efa61c5e6ee31ca9ebdec20ee70167d31d463; S=5d9efa6
W=$Q/wt-rc1-5d9efa6; E=$Q/m41/rc1-5d9efa6; L=$R/.browser-test.lock; ST=$E/status.md
ck(){ echo "$(date '+%F %T %Z') CHECKPOINT $*" | tee -a $ST; }
ck "driver start pid $$"
bash $SC/m41-7-local-gates.sh $F > $E/gates/driver.out 2>&1; ck "local-gates done exit=$? (gates/local-gates-summary.txt)"
bash $SC/m41-7-qel.sh $F > /dev/null 2>&1; ck "qel unit done exit=$?"
cd $W; mkdir -p $E/expl
timeout 600 npx vitest run --maxWorkers=2 --minWorkers=1 tests/m4-exp1-explainer.test.ts tests/m41-7-explainer-recovery.test.ts > $E/expl/unit.log 2>&1; ck "explainer unit exit=$? $(rg 'Tests ' $E/expl/unit.log | tail -1)"
N=$E/save-noreg; mkdir -p $N; cp $SC/m41-7-save-noreg.qa.test.ts tests/
NOREG_OUT=$N/noreg-$S.json timeout 900 npx vitest run --maxWorkers=2 --minWorkers=1 tests/m41-7-save-noreg.qa.test.ts > $N/noreg-$S.log 2>&1; ec=$?; rm -f tests/m41-7-save-noreg.qa.test.ts
node $SC/m41-7-save-noreg-compare.mjs $N/noreg-$S.json $Q/m41/m41-7-dfdf49c/gates/save-noreg/noreg-dd223f5.json > $N/compare.txt 2>&1; ck "save-noreg vitest exit=$ec $(rg 'Tests ' $N/noreg-$S.log | tail -1); compare exit=$? $(tail -2 $N/compare.txt | tr '\n' ' '); porcelain $(git status --porcelain | wc -l)"
bash $SC/m41-7-delta.sh $F "prep csr9c qel rc0" > /dev/null 2>&1; ck "delta prep csr9c qel rc0 done exit=$? (delta/summary.txt)"
mkdir -p $E/delta/csr9c-expb1; cd $W; ONLY=EXPB1 flock $L timeout 600 node $SC/csr9c-explainer-queue.mjs $W 5961 $E/delta/csr9c-expb1 $S 12 > $E/delta/csr9c-expb1/run.log 2>&1; ck "csr9c ONLY=EXPB1 exit=$? $(rg '^CSR9C_EXPLAINER' $E/delta/csr9c-expb1/run.log)"
CSR_EV=$E/csr bash $SC/csr-m41-7-acs.sh $F 1 > /dev/null 2>&1; ck "csr acs done exit=$? (csr/summary.txt)"
cd $W; for e in firefox webkit; do mkdir -p $E/xb/$e-dom $E/xb/$e-ui
  flock $L timeout 600 node $SC/csr-m41-7-browser.mjs $W $e 5961 $E/xb/$e-dom $S > $E/xb/$e-dom/run.log 2>&1; ck "$e DOM exit=$? PASS=$(rg -c '^PASS' $E/xb/$e-dom/run.log) FAIL=$(rg -c '^FAIL' $E/xb/$e-dom/run.log)"
  flock $L timeout 600 node $SC/csr-m41-7-ui.mjs $W $e 5961 $E/xb/$e-ui $S > $E/xb/$e-ui/run.log 2>&1; ck "$e UI exit=$? PASS=$(rg -c '^PASS' $E/xb/$e-ui/run.log) FAIL=$(rg -c '^FAIL' $E/xb/$e-ui/run.log)"
done
ck "porcelain end $(git -C $W status --porcelain | wc -l); :5961 $(ss -ltn | rg -q ':5961 ' && echo LISTENING || echo free)"; ck DRIVER_DONE
