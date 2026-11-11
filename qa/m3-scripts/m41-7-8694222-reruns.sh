#!/bin/bash
set -u; R=/workspace/egg-farm-studio; Q=$R/qa; SC=$Q/m3-scripts; L=$R/.browser-test.lock
F=86942226ed792598efa2dbc5b473dc7bc93073ab; S=8694222; W=$Q/wt-m41-7-$S-acs; EV=$Q/m41/m41-7-$S
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $EV/reruns.log; }
log "=== reruns start"
(cd $W && npm run build > $EV/delta/build.log 2>&1); log "dist build exit=$?"
W3=$Q/wt-m41-7-3c86720; E2=$Q/m41/m41-7-3c86720
(cd $W3 && npx vitest run --maxWorkers=2 --minWorkers=1 tests/m41-7-csr8b-race.test.ts -t "D-HOP-2026-10-23-01 AC[34]" --reporter=verbose > $E2/vitest-ac3-ac4.log 2>&1); log "3c86720 AC3/AC4 by name exit=$? $(rg 'Tests ' $E2/vitest-ac3-ac4.log | tail -1)"
flock $L timeout 600 node $SC/csr-m41-7-ui.mjs $W chromium 5961 $EV/csr/browser-ui $S > $EV/csr/browser-ui/run.log 2>&1; log "chromium ui exit=$? PASS=$(rg -c '^PASS' $EV/csr/browser-ui/run.log) FAIL=$(rg -c '^FAIL' $EV/csr/browser-ui/run.log) INFO=$(rg -c '^INFO' $EV/csr/browser-ui/run.log)"
flock $L timeout 600 node $SC/csr-m41-7-resetat.mjs $W 5961 $EV/csr/browser-resetat $S chromium > $EV/csr/browser-resetat/run.log 2>&1; log "chromium resetat exit=$? $(rg '^CSR_RESET_AT' $EV/csr/browser-resetat/run.log)"
flock $L timeout 600 node $SC/csr9c-explainer-queue.mjs $W 5961 $EV/delta/csr9c $S > $EV/delta/csr9c/run.log 2>&1; log "csr9c exit=$? $(rg '^CSR9C_EXPLAINER' $EV/delta/csr9c/run.log)"
bash $SC/m41-7-delta.sh $F "rc0" > $EV/delta-rc0.out 2>&1; log "delta rc0 exit=$?"
flock $L timeout 600 env ONLY=EXPB1 node $SC/csr9c-explainer-queue.mjs $W 5961 $EV/xbrowser/expb1 $S > $EV/xbrowser/expb1/run.log 2>&1; log "EXPB1 exit=$? $(rg '^CSR9C_EXPLAINER' $EV/xbrowser/expb1/run.log)"
flock $L timeout 600 node $SC/csr-m41-7-browser.mjs $W firefox 5961 $EV/xbrowser/firefox-dom $S > $EV/xbrowser/firefox-dom/run.log 2>&1; log "firefox dom exit=$? PASS=$(rg -c '^PASS' $EV/xbrowser/firefox-dom/run.log) FAIL=$(rg -c '^FAIL' $EV/xbrowser/firefox-dom/run.log)"
flock $L timeout 600 node $SC/csr-m41-7-ui.mjs $W firefox 5961 $EV/xbrowser/firefox-ui $S > $EV/xbrowser/firefox-ui/run.log 2>&1; log "firefox ui exit=$? PASS=$(rg -c '^PASS' $EV/xbrowser/firefox-ui/run.log) FAIL=$(rg -c '^FAIL' $EV/xbrowser/firefox-ui/run.log)"
log "RERUNS_DONE"
