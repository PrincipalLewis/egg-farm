#!/bin/bash
E=/workspace/egg-farm-studio/qa/m5/evidence/acp1b-exp1-deferral; S=/workspace/egg-farm-studio/qa/scratch
for r in 5d9efa61 458f74c a923206; do ( cd $S/wt-acp1b-$r && { echo "HEAD $(git rev-parse HEAD)"; npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose tests/m4a-v3-backup.test.ts tests/csr-loadsafe.test.ts; echo "exit=$?"; echo "status:[$(git status --porcelain)]"; } > $E/21-v3backup-$r.log 2>&1 ); done
echo DONE > $E/99-done2
