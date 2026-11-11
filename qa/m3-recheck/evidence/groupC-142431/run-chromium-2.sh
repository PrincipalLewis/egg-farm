#!/usr/bin/env bash
# group C rerun after SS-36j scroll fix + SS-38f fixture-calibrated base (self-test ctx only). Fixture-only.
cd /workspace/egg-farm-studio/artifacts/v5-ui/harness-rc-next
FC_OUT=/workspace/egg-farm-studio/qa/m3-recheck/evidence/groupC-142431/st2/ FC_PORT=5282 node tests/fatigue-cue.selftest.mjs chromium; echo "selftest rc=$?"
QA_WT=/workspace/egg-farm-studio/qa/m3-recheck/evidence/groupC-142431/fakewt QA_BID=fixture-m5c+0000000 QA_SHA7=0000000 QA_EV=/workspace/egg-farm-studio/qa/m3-recheck/evidence/groupC-142431/entry2/ QA_FC_CONFIRMED=all,build:schema.ts node m5/fatigue-cue.mjs chromium 360x640 SS-36j,SS-48t,SS-40d; echo "entry2 rc=$?"
