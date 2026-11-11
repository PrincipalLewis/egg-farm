#!/bin/bash
E=/workspace/egg-farm-studio/qa/m5/evidence/acp1-a923206; WT=/workspace/egg-farm-studio/qa/scratch/wt-acp1-a923206
cd $WT && { npm ci > $E/00-npm-ci.log 2>&1; echo "EXIT=$?" >> $E/00-npm-ci.log; }
mkdir -p $E/dump; cp $E/probe-acp1.test.ts tests/zz-qa-acp1.test.ts
{ echo "HEAD $(git rev-parse HEAD)"; QA_PROBE_OUT=$E/10-acp1.jsonl QA_DUMP_DIR=$E/dump npx vitest run --minWorkers=1 --maxWorkers=1 tests/zz-qa-acp1.test.ts; echo "exit=$?"; } > $E/10-acp1.log 2>&1
rm -f tests/zz-qa-acp1.test.ts; echo "status:[$(git status --porcelain)]" >> $E/10-acp1.log; echo DONE >> $E/10-acp1.log
