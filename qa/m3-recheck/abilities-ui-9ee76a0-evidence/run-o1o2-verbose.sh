#!/bin/bash
set +e
E=/workspace/egg-farm-studio/qa/m3-recheck/abilities-ui-9ee76a0-evidence
W=/workspace/egg-farm-studio/qa/m3-recheck/abilities-ui-9ee76a0-run
cd "$W" || exit 1
node_modules/.bin/vitest run tests/v5-abilities-ui.test.ts -t 'O1:|O2:|sheetCloseComplete hold' --reporter=verbose --minWorkers=1 --maxWorkers=2 > "$E/o1o2-verbose.log" 2>&1
echo "o1o2-verbose $?" | tee -a "$E/exit-codes.txt"
