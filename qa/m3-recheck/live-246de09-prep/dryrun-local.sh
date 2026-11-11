#!/usr/bin/env bash
# smoke: edited scripts vs LOCAL 246de09 release build on :4825, chromium only, reduced filters.
set -u; P=/workspace/egg-farm-studio/qa/m3-recheck/live-246de09-prep; SHA=246de09c8b329360754cc0d77a6cd6b6788b6ad4; O=$P/dryrun-local; export WT=/tmp/qa-live-dry-246de09; B=http://127.0.0.1:4825/
rm -rf $O; mkdir -p $O; python3 -m http.server 4825 --bind 127.0.0.1 -d $WT/dist >/dev/null 2>&1 & SRV=$!; echo "server pid $SRV"; trap "kill $SRV" EXIT; sleep 1
echo "== negative: wrong expected id must abort"; EXPECT_BUILD_ID=m3-rc1-pre+246de09-x bash $P/run-live.sh check $B $SHA $O/neg; echo "neg check exit=$? (want 4)"
EXPECT_BUILD_ID=m3-rc1-pre+246de09X timeout 120 node $P/../gate5-final-prep/exp-cardreload.mjs chromium $O/neg $B $SHA 390 >/dev/null 2>&1; echo "neg cardreload exit=$? (want 4)"
bash $P/run-live.sh check $B $SHA $O; echo "check exit=$?"
bash $P/run-live.sh cardreload $B $SHA $O chromium; echo "cardreload done"
STATES=L10 SIZES=360x800 W2=0 EXT_GROUPS=exp1 bash $P/run-live.sh g5 $B $SHA $O chromium; echo "g5 done"
SIZES=1280x800 bash $P/run-live.sh artux $B $SHA $O chromium; echo "artux done"
ONLY=tabs,bug9 bash $P/run-live.sh rc0 $B $SHA $O chromium; echo "rc0 done"
PUSHED=1 bash $P/run-live.sh manifest $B $SHA $O; echo DRYDONE
