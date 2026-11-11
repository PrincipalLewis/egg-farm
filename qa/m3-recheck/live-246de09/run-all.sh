#!/usr/bin/env bash
# live-246de09: published asset (file://) cardreload -> artux -> ext g5 groups; then rc0 on build:qa. One engine at a time.
set -u; Q=/workspace/egg-farm-studio/qa/m3-recheck; P=$Q/live-246de09-prep; H=$Q/gate5-final-prep; O=$Q/live-246de09; R=/workspace/egg-farm-studio
SHA=246de09c8b329360754cc0d77a6cd6b6788b6ad4; BASE=file://$O/asset/egg-farm.html; export WT=/tmp/qa-live-246de09 EXPECT_BUILD_ID=m3-rc1-pre+246de09
echo "STAGE check $(date +%T)"; bash $P/run-live.sh check "$BASE" $SHA $O || exit 4
echo "STAGE cardreload $(date +%T)"; SIZES=390,1280 bash $P/run-live.sh cardreload "$BASE" $SHA $O
python3 $P/mk-manifest.py $O/cardreload $SHA "$BASE" $EXPECT_BUILD_ID
echo "STAGE artux $(date +%T)"; SIZES=360x800,375x800,390x844,1280x800 bash $P/run-live.sh artux "$BASE" $SHA $O
echo "STAGE ext $(date +%T)"; export PW=$WT/node_modules/playwright-core/index.mjs; EXT_GROUPS="max coins goal f2 f3 h6 expgate expui" PROFILE=B bash $H/run-ext.sh $SHA "$BASE" $O chromium firefox webkit
echo "STAGE rc0 $(date +%T)"; for E in chromium firefox webkit; do L=$R/.browser-test.lock; LD=$(cut -d' ' -f1 /proc/loadavg); [ $E = chromium ] && awk "BEGIN{exit !($LD<12)}" && L=$R/.browser-test-2.lock
  (cd /tmp/qa-rc0-246de09 && PORT=4827 SHOTS=$O/rc0-shots-$E flock -w 600 $L timeout 600 node scripts/rc0-browser.mjs $E > $O/rc0-$E.log 2>&1); echo "$E rc0 exit=$? $(tail -1 $O/rc0-$E.log) $(date +%T)"; done
echo ALLDONE $(date +%T)
