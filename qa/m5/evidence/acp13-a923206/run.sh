#!/bin/bash
cd /workspace/egg-farm-studio/qa/scratch/wt-pause-a923206
[ -d node_modules ] || { npm ci > /workspace/egg-farm-studio/qa/m5/evidence/acp13-a923206/00-npm-ci.log 2>&1; echo "EXIT=$?" >> /workspace/egg-farm-studio/qa/m5/evidence/acp13-a923206/00-npm-ci.log; }
cp /workspace/egg-farm-studio/qa/m5/evidence/acp13-a923206/probe-acp13-boot.test.ts tests/zz-qa-acp13.test.ts
{ echo "HEAD $(git rev-parse HEAD)"; QA_PROBE_OUT=/workspace/egg-farm-studio/qa/m5/evidence/acp13-a923206/10-boot-probe.jsonl npx vitest run --minWorkers=1 --maxWorkers=1 tests/zz-qa-acp13.test.ts; echo "exit=$?"; } > /workspace/egg-farm-studio/qa/m5/evidence/acp13-a923206/10-boot-probe.log 2>&1
rm -f tests/zz-qa-acp13.test.ts; git status --porcelain >> /workspace/egg-farm-studio/qa/m5/evidence/acp13-a923206/10-boot-probe.log; echo DONE >> /workspace/egg-farm-studio/qa/m5/evidence/acp13-a923206/10-boot-probe.log
