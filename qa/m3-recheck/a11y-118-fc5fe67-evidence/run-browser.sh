#!/usr/bin/env bash
set -uo pipefail
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
cd /workspace/egg-farm-studio/qa/scratch/a11y-118-fc5fe67/wt
{ echo "START $(TZ=Europe/Belgrade date -Iseconds) head=$(git rev-parse HEAD) node=$(node -v)"; PORT=47118 OUT=/workspace/egg-farm-studio/qa/m3-recheck/a11y-118-fc5fe67-evidence/shots flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node /workspace/egg-farm-studio/qa/m3-recheck/a11y-118-fc5fe67-evidence/probe-a11y-118.mjs; echo "EXIT=$? END $(TZ=Europe/Belgrade date -Iseconds)"; } > /workspace/egg-farm-studio/qa/scratch/a11y-118-fc5fe67/logs/browser.txt 2>&1
