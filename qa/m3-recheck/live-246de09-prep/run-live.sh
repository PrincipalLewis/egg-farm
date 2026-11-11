#!/usr/bin/env bash
# run-live.sh <stage> <base-url> <sha40> <outdir> [engines...]
# stages: setup | check | cardreload | g5 | artux | rc0 | manifest
#   setup      own worktree $WT (default /tmp/qa-live-<sha7>) at <sha40> with hard-linked node_modules (playwright + rc0 fixtures). No build, no network to BASE.
#   check      curl BASE, read meta[name=build-id], assert == $EXPECT_BUILD_ID (default m3-rc1-pre+<sha7>). Every browser stage also asserts it at runtime.
#   cardreload exp-cardreload.mjs (Got it -> reload: no card, flag persisted), SIZES (default 390,1280)
#   g5         gate5-pr44/run.sh (shots + chromium probes, lane 1) then gate5-final-prep/run-ext.sh PROFILE=B
#   artux      gate5-final-prep/exp-final.mjs (EXP1 v1.15 A&UX set: focus, fit, refund, once, gating) per engine
#   rc0        <worktree>/scripts/rc0-live.mjs (rc0-browser.mjs pointed at BASE, no local server)
#   manifest   gate5 manifest.mjs over <outdir> (+ cardreload manifest in <outdir>/cardreload)
# Lanes: lane 2 (.browser-test-2.lock) ONLY for chromium and only if 1-min load < 12; everything else lane 1. One engine at a time (serial loop).
set -u; STAGE=$1; BASE=$2; SHA=$3; OUT=$4; shift 4; ENGS=${@:-chromium firefox webkit}
[[ $SHA =~ ^[0-9a-f]{40}$ ]] || { echo "need full 40-char SHA"; exit 2; }
case $BASE in *:4173*) echo "port 4173 is forbidden"; exit 2;; esac
S7=${SHA:0:7}; R=/workspace/egg-farm-studio; Q=$R/qa/m3-recheck; H=$Q/gate5-final-prep; G=$Q/gate5-pr44; P=$Q/live-246de09-prep
WT=${WT:-/tmp/qa-live-$S7}; export EXPECT_BUILD_ID=${EXPECT_BUILD_ID:-m3-rc1-pre+$S7}; export PW=$WT/node_modules/playwright-core/index.mjs
[[ $EXPECT_BUILD_ID == *$S7* ]] || { echo "EXPECT_BUILD_ID must contain $S7"; exit 2; }
case $OUT in $Q/*) ;; *) echo "outdir must be under $Q"; exit 2;; esac; mkdir -p "$OUT"
lane(){ local L1=$R/.browser-test.lock L2=$R/.browser-test-2.lock LD; LD=$(cut -d' ' -f1 /proc/loadavg); if [ "$1" = chromium ] && awk "BEGIN{exit !($LD<12)}"; then echo $L2; else echo $L1; fi; }
log(){ echo "[$(date +%T)] $*" | tee -a "$OUT/run-live.log"; }
case $STAGE in
setup)
  cd /tmp/qa-final-c11e3a0 && git fetch -q gh && git cat-file -e $SHA^{commit} || { echo "SHA not fetchable"; exit 2; }
  git branch -r --contains $SHA | tee "$OUT/pushed-branches.txt"; [ -s "$OUT/pushed-branches.txt" ] || log "WARNING: SHA not on any remote branch"
  [ -d $WT ] || git worktree add -q --detach $WT $SHA; [ -d $WT/node_modules ] || cp -al /tmp/qa-final-c11e3a0/node_modules $WT/
  node $P/make-rc0-live.mjs $WT && log "setup ok $WT";;
check)
  B=$(curl -fsSL --max-time 20 "$BASE" | grep -o 'name="build-id" content="[^"]*"\|content="[^"]*" name="build-id"' | grep -o 'm3-[^"]*' | head -1)
  echo "$B" > "$OUT/build-id-runtime-curl.txt"; log "check base=$BASE build-id=$B expect=$EXPECT_BUILD_ID"; [ "$B" = "$EXPECT_BUILD_ID" ] || { log "ABORT build-id mismatch"; exit 4; };;
cardreload)
  mkdir -p "$OUT/cardreload"; for E in $ENGS; do L=$(lane $E)
    flock -w 600 $L timeout 600 node $H/exp-cardreload.mjs $E "$OUT/cardreload" "$BASE" $SHA "${SIZES:-390,1280}" > "$OUT/cardreload/exp-cardreload-$E.log" 2>&1; log "$E cardreload exit=$? lane=$(basename $L)"; done;;
g5)
  SHA=$SHA URL=$BASE bash $G/run.sh $SHA "$BASE" "$OUT" $ENGS 2>&1 | tee -a "$OUT/run-live.log"
  PROFILE=B bash $H/run-ext.sh $SHA "$BASE" "$OUT" $ENGS 2>&1 | tee -a "$OUT/run-live.log";;
artux)
  for E in $ENGS; do L=$(lane $E)
    SHA=$SHA URL=$BASE flock -w 600 $L timeout 600 node $H/exp-final.mjs $E "$OUT" > "$OUT/exp-final-$E.log" 2>&1; log "$E artux exit=$? lane=$(basename $L)"; done;;
rc0)
  [ -f $WT/scripts/rc0-live.mjs ] || { echo "run setup first"; exit 2; }
  for E in $ENGS; do L=$(lane $E)
    (cd $WT && BASE_URL=$BASE SHOTS="$OUT/rc0-shots-$E" flock -w 600 $L timeout 600 node scripts/rc0-live.mjs $E > "$OUT/rc0-$E.log" 2>&1); log "$E rc0 exit=$? lane=$(basename $L) $(grep -o '[0-9]*/[0-9]* passed\|[0-9]* passed' "$OUT/rc0-$E.log" | tail -1)"; done;;
manifest)
  SHA=$SHA PUSHED=${PUSHED:-1} BRANCH=${BRANCH:-} LABEL_EYEBALLED=${LABEL_EYEBALLED:-0} NOT_RUN="$(cat "$OUT/NOT_RUN-profileB.txt" 2>/dev/null)" node $G/manifest.mjs "$OUT" && log "g5 manifest written"
  [ -d "$OUT/cardreload" ] && python3 $P/mk-manifest.py "$OUT/cardreload" $SHA "$BASE" "$EXPECT_BUILD_ID";;
*) echo "unknown stage $STAGE"; exit 2;;
esac
