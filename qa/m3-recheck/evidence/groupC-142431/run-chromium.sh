#!/usr/bin/env bash
# group C 14:2x: Chromium fixture self-test (checks) then the P8 entry probe against the fixture-as-dist (fake worktree). No game build, no PR head.
cd /workspace/egg-farm-studio/artifacts/v5-ui/harness-rc-next
FC_OUT=/workspace/egg-farm-studio/qa/m3-recheck/evidence/groupC-142431/st/ FC_PORT=5281 node tests/fatigue-cue.selftest.mjs chromium; echo "selftest rc=$?"
for vp in 360x640 959x600; do QA_WT=/workspace/egg-farm-studio/qa/m3-recheck/evidence/groupC-142431/fakewt QA_BID=fixture-m5c+0000000 QA_SHA7=0000000 QA_EV=/workspace/egg-farm-studio/qa/m3-recheck/evidence/groupC-142431/entry/ QA_FC_CONFIRMED=all,build:schema.ts node m5/fatigue-cue.mjs chromium $vp; echo "entry $vp rc=$?"; done
QA_WT=/workspace/egg-farm-studio/qa/m3-recheck/evidence/groupC-142431/fakewt QA_BID=fixture-m5c+0000000 QA_SHA7=0000000 QA_EV=/workspace/egg-farm-studio/qa/m3-recheck/evidence/groupC-142431/entry-todo/ node m5/fatigue-cue.mjs chromium 360x640 SS-38a,SS-38e,SS-36j,SS-47; echo "entry-todo rc=$?"
