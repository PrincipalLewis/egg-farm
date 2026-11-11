#!/bin/bash
# M41-10 browser proofs (Chromium only, one run at a time, each under flock .browser-test.lock with timeout <=300 s). Own ports 5961/5962 only.
set -u
Q=/workspace/egg-farm-studio/qa; EV=$Q/m3-recheck/m41-10-buildid; SC=$Q/m3-scripts; L=/workspace/egg-farm-studio/.browser-test.lock
W=$Q/wt-pr53-4e1252d; PWC=$W/node_modules/playwright-core; A=$Q/scratch/relchk/egg-farm.html
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $EV/browser-summary.txt; }
lk(){ flock $L timeout 300 "$@"; }
log "=== start; asset sha256 $(sha256sum $A | cut -d' ' -f1); PR53 wt HEAD $(git -C $W rev-parse HEAD) porcelain=$(git -C $W status --porcelain | wc -l)"
mkdir -p $EV/proof2-served $EV/proof2-served-neg $EV/proof2-file $EV/proof3-probe $EV/proof3-probe-neg $EV/proof3-html $EV/proof3-html-neg
python3 -m http.server 5961 --bind 127.0.0.1 --directory $Q/scratch/relchk > $EV/proof2-served/http.log 2>&1 & SRV=$!; log "own http server pid $SRV :5961"; sleep 1
lk env BUILD_SHA=246de09 ONLY=buildid node $SC/smoke-release.mjs $PWC chromium http://127.0.0.1:5961/egg-farm.html $EV/proof2-served > $EV/proof2-served/run.log 2>&1; log "P2a served asset vs 246de09 exit=$? (want 0) $(rg -o '^(PASS|FAIL) build-id.*' $EV/proof2-served/run.log | cut -c1-400)"
lk env BUILD_SHA=4e1252d ONLY=buildid node $SC/smoke-release.mjs $PWC chromium http://127.0.0.1:5961/egg-farm.html $EV/proof2-served-neg > $EV/proof2-served-neg/run.log 2>&1; log "P2b NEG served asset vs 4e1252d exit=$? (want 1) $(rg -o '^(PASS|FAIL) build-id.*' $EV/proof2-served-neg/run.log | cut -c1-400)"
kill $SRV && log "stopped own http server $SRV"
lk env BUILD_SHA=246de09 node $SC/smoke-release.mjs $PWC chromium $A $EV/proof2-file > $EV/proof2-file/run.log 2>&1; log "P2c full smoke file:// asset vs 246de09 exit=$? (want 0) $(rg -o '^(PASS|FAIL) build-id.*' $EV/proof2-file/run.log | cut -c1-400)"
lk node $Q/scratch/m4a-31-delta/buildid-probe.mjs $W chromium 5962 > $EV/proof3-probe/run.log 2>&1; log "P3a PR53 dist served :5962 (BUILD_SHA default=HEAD 4e1252d) exit=$? (want 0) $(rg -o '^(PASS|FAIL) runtime.*' $EV/proof3-probe/run.log | cut -c1-300)"
lk env BUILD_SHA=246de09 node $Q/scratch/m4a-31-delta/buildid-probe.mjs $W chromium 5962 > $EV/proof3-probe-neg/run.log 2>&1; log "P3b NEG PR53 dist vs 246de09 exit=$? (want 1) $(rg -o '^(PASS|FAIL) runtime.*' $EV/proof3-probe-neg/run.log | cut -c1-300)"
lk node $SC/rc-html-open.mjs $W chromium $EV/proof3-html 4e1252d6bfe81f94912e899281049bff9ca96f75 > $EV/proof3-html/run.log 2>&1; log "P3c PR53 dist-html file:// vs 4e1252d exit=$? (want 0) $(cut -c1-400 $EV/proof3-html/run.log)"
lk node $SC/rc-html-open.mjs $W chromium $EV/proof3-html-neg 246de09 > $EV/proof3-html-neg/run.log 2>&1; log "P3d NEG PR53 dist-html vs 246de09 exit=$? (want 1) $(cut -c1-400 $EV/proof3-html-neg/run.log)"
ss -ltn | rg -q ':(5961|5962) ' && log "WARN port still listening" || log "ports 5961/5962 free"
log "=== done"
