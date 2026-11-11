#!/usr/bin/env bash
# Chromium fallback: same verified asset served over http on :4828 (file:// lost sessionStorage-based harness state across reloads in Chromium).
set -u; Q=/workspace/egg-farm-studio/qa/m3-recheck; P=$Q/live-246de09-prep; H=$Q/gate5-final-prep; O=$Q/live-246de09/chromium-http; A=$Q/live-246de09/asset
SHA=246de09c8b329360754cc0d77a6cd6b6788b6ad4; export WT=/tmp/qa-live-246de09 EXPECT_BUILD_ID=m3-rc1-pre+246de09 PW=/tmp/qa-live-246de09/node_modules/playwright-core/index.mjs
while pgrep -f "bash run-all.sh" >/dev/null; do sleep 10; done
mkdir -p $O; sha256sum $A/egg-farm.html | tee $O/asset-sha256.txt
python3 -m http.server 4828 --bind 127.0.0.1 -d $A >/dev/null 2>&1 & SRV=$!; trap "kill $SRV" EXIT; sleep 1; BASE=http://127.0.0.1:4828/egg-farm.html
bash $P/run-live.sh check "$BASE" $SHA $O || exit 4
SIZES=390,1280 bash $P/run-live.sh cardreload "$BASE" $SHA $O chromium; python3 $P/mk-manifest.py $O/cardreload $SHA "$BASE" $EXPECT_BUILD_ID
SIZES=360x800,375x800,390x844,1280x800 bash $P/run-live.sh artux "$BASE" $SHA $O chromium
EXT_GROUPS="max coins goal f2 f3 h6 expgate expui" PROFILE=B bash $H/run-ext.sh $SHA "$BASE" $O chromium
echo HTTPDONE $(date +%T)
