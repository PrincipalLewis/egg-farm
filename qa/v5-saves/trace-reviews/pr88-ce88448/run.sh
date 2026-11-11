#!/bin/bash
# npm ci, then: baseline, live-CSV, bb3f633-CSV, bb3f633 CSV+balance.json, one-byte fixture mutation; restore after each
set -u
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr88-ce88448
cd /workspace/egg-farm-studio/qa/scratch/wt-pr88-ce88448
npm ci > $W/00-npm-ci.log 2>&1; echo "EXIT=$?" >> $W/00-npm-ci.log
{ echo "== tsc @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; npx tsc --noEmit; echo "tsc exit=$?"; } > $W/10-tsc.log 2>&1
t() { L=$1; { echo "== $L @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; git status --porcelain; sha256sum data/economy.csv tests/fixtures/economy-b48be8a4.csv src/config/balance.json; npx vitest run --minWorkers=1 --maxWorkers=2 --reporter=verbose tests/bot-m5.test.ts; echo "vitest exit=$?"; } > $W/$L.log 2>&1; git checkout -q -- data tests src; echo "$L restored: [$(git status --porcelain)]" >> $W/30-runs.log; }
t 20-baseline-fixture
git -C /workspace/egg-farm-studio/game show refs/qa/rcv5:data/economy.csv > data/economy.csv; t 21-live-csv-rcv5-2fa7318
git -C /workspace/egg-farm-studio/game show bb3f633:data/economy.csv > data/economy.csv; t 22-csv-bb3f633
git -C /workspace/egg-farm-studio/game show bb3f633:data/economy.csv > data/economy.csv; git -C /workspace/egg-farm-studio/game show bb3f633:src/config/balance.json > src/config/balance.json; t 23-csv-and-balance-bb3f633
python3 - <<'PY' > $W/31-mut-onebyte.apply.log
p='tests/fixtures/economy-b48be8a4.csv'; b=bytearray(open(p,'rb').read()); i=b.index(b'0', 200); old=b[i]; b[i]=ord('1'); open(p,'wb').write(b); print(f'flipped byte {i}: {chr(old)} -> 1')
PY
t 31-mut-fixture-onebyte
echo ALLDONE >> $W/30-runs.log
