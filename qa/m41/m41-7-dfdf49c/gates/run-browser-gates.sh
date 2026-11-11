#!/bin/bash
# QA M41-7 dfdf49c browser gates (Chromium), each under its own flock hold (timeout 600). Ports 5963 only.
set -u
W=/workspace/egg-farm-studio/qa/wt-m41-7-dfdf49c; E=/workspace/egg-farm-studio/qa/m41/m41-7-dfdf49c/gates/browser; L=/workspace/egg-farm-studio/.browser-test.lock; SC=/workspace/egg-farm-studio/qa/m3-scripts
FULL=dfdf49cd904398c7e302eec16161f8fb63b10a8d; cd $W
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
lk(){ local name=$1; shift; local w0=$(date +%s); flock $L bash -c 'echo "$(date "+%F %T %Z") lock acquired" >&2; exec timeout 600 "$@"' _ "$@"; local ec=$?; log "$name exit=$ec wall=$(( $(date +%s)-w0 ))s"; return $ec; }
lk buildid-dist env BUILD_SHA=$FULL node /workspace/egg-farm-studio/qa/scratch/m4a-31-delta/buildid-probe.mjs $W chromium 5963 > $E/buildid-dist-chromium.log 2>&1
log "  $(rg -o '(PASS|FAIL) runtime build-id.*' $E/buildid-dist-chromium.log)"
lk check-globals env PORT=5963 npm run -s check-globals -- chromium > $E/check-globals-chromium.log 2>&1
log "  $(rg -o '(PASS|FAIL).*' $E/check-globals-chromium.log | tail -1 | cut -c1-300)"
mkdir -p $E/shots-rc0; lk rc0 env PORT=5963 SHOTS=$E/shots-rc0 node scripts/rc0-browser.mjs chromium > $E/rc0-chromium.log 2>&1
log "  $(rg -o '[0-9]+/[0-9]+ passed' $E/rc0-chromium.log | tail -1)"
lk html-file-open node $SC/rc-html-open.mjs $W chromium $E/shots-html $FULL > $E/html-open-chromium.log 2>&1
log "  $(rg -o '(PASS|FAIL).*' $E/html-open-chromium.log | tail -1 | cut -c1-300)"
git status --porcelain > $E/status-after-browser.txt; log "porcelain after browser: $(wc -l < $E/status-after-browser.txt)"
for p in 5962 5963; do ss -ltn | grep -q ":$p " && log "WARN port $p still listening" ; done
log BROWSER_DONE
