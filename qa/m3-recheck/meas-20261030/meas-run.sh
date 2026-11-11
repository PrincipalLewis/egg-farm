#!/usr/bin/env bash
# HoQ 14:29 measurement orchestration (started ONLY via ops/tools/lane-run.sh uiqa-meas -- bash meas-run.sh <evdir>). One engine at a time.
set -u; EV=${1:?evdir}; mkdir -p "$EV"; exec >> "$EV/run.log" 2>&1; ROOT=/workspace/egg-farm-studio; D=$(cd "$(dirname "$0")" && pwd); T0=${MEAS_T0:-$(date +%s)}; B=/tmp/uiqa-meas-65a7443
log(){ echo "$(date +%T) $*"; }; left(){ echo $(( 29*60 - ($(date +%s) - T0) )); }
log "start pid $$ loadavg $(cat /proc/loadavg)"
if [ ! -f $B/dist-qa/index.html ]; then rm -rf $B; git clone -q --shared --no-checkout $ROOT/game $B && git -C $B checkout -q --detach 65a7443 && log "private clone (--shared, source repo untouched) at $(git -C $B rev-parse --short HEAD)"
  ( cd $B && t=$(date +%s); npm ci --no-audit --no-fund --prefer-offline > $EV/npm-ci.log 2>&1; echo "npm-ci rc=$? $(( $(date +%s)-t ))s"; t=$(date +%s); npm run build:qa > $EV/build-qa.log 2>&1; echo "build:qa rc=$? $(( $(date +%s)-t ))s" ) | while read l; do log "$l"; done; fi
log "build-id $(grep -o 'name="build-id" content="[^"]*"' $B/dist-qa/index.html)"
for eng in ${MEAS_ENGS:-chromium webkit firefox}; do
  [ $eng = firefox ] && [ $(left) -lt 480 ] && { log "firefox SKIPPED: $(left) s left < 480"; continue; }
  case $eng in chromium) P=5251; L1=$(cut -d' ' -f1 /proc/loadavg); if awk -v l="$L1" 'BEGIN{exit !(l<12)}' </dev/null; then LOCK=$ROOT/.browser-test-2.lock; else LOCK=$ROOT/.browser-test.lock; fi;; webkit) P=5252; LOCK=$ROOT/.browser-test.lock;; firefox) P=5253; LOCK=$ROOT/.browser-test.lock;; esac
  log "$eng lock $LOCK load $(cut -d' ' -f1 /proc/loadavg) port $P"; t=$(date +%s)
  flock -w 600 "$LOCK" timeout 600 node "$D/meas.mjs" $eng $P "$EV" > "$EV/meas-$eng.log" 2>&1; log "$eng rc=$? $(( $(date +%s)-t ))s"
done
log "end $(( $(date +%s)-T0 ))s"
