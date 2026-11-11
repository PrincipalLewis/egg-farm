#!/bin/bash
E=/workspace/egg-farm-studio/qa/m5/evidence/acp1b-exp1-deferral; S=/workspace/egg-farm-studio/qa/scratch
for r in 5d9efa61 458f74c a923206; do
  WT=$S/wt-acp1b-$r
  ( cd $WT && npm ci > $E/00-npm-ci-$r.log 2>&1; echo "EXIT=$?" >> $E/00-npm-ci-$r.log
    mkdir -p $E/dump-$r; cp $E/probe-deferral.test.ts tests/zz-qa-deferral.test.ts
    { echo "HEAD $(git rev-parse HEAD)"; QA_PROBE_OUT=$E/10-probe-$r.jsonl QA_DUMP_DIR=$E/dump-$r npx vitest run --minWorkers=1 --maxWorkers=1 tests/zz-qa-deferral.test.ts; echo "exit=$?"; } > $E/10-probe-$r.log 2>&1
    rm -f tests/zz-qa-deferral.test.ts
    # existing EXP1 / migration tests (unchanged repo tests)
    T=$(ls tests | grep -E 'm4-exp1-explainer|v7-marker-run-once|m4a-save-migrate|m4a-migrate-v7|m41-6-roundtrip-migrate|m4a-flag-off|m4a-tracks-migration|m4a-backup|m4a-.*abort|m4a-.*defer' | sed 's#^#tests/#' | tr '\n' ' ')
    { echo "files: $T"; npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose $T; echo "exit=$?"; } > $E/20-tests-$r.log 2>&1
    echo "status:[$(git status --porcelain)]" >> $E/20-tests-$r.log )
done
echo DONE > $E/99-done
