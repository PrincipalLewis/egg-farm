#!/bin/bash
set +e
E=/workspace/egg-farm-studio/qa/m3-recheck/abilities-c43d2db-evidence/mergefwd-7a492e5
W=/workspace/egg-farm-studio/qa/m3-recheck/abilities-7a492e5-run
cp -a --reflink=auto /workspace/egg-farm-studio/qa/m3-recheck/abilities-c43d2db-run/node_modules "$W/node_modules" > "$E/dependencies.log" 2>&1
r=$?; echo "dependencies $r" >> "$E/exit-codes.txt"; [ "$r" = 0 ] || exit "$r"
cd "$W" || exit 1
node --version > "$E/local-node.txt"
git rev-parse HEAD > "$E/run-head.txt"
node_modules/.bin/tsc --noEmit > "$E/tsc.log" 2>&1; echo "tsc $?" >> "$E/exit-codes.txt"
node_modules/.bin/vitest run --minWorkers=1 --maxWorkers=2 > "$E/full-vitest.log" 2>&1; echo "full-vitest $?" >> "$E/exit-codes.txt"
git status --short > "$E/status-after.txt"
echo DONE
