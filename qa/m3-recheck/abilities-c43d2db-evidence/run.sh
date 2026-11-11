#!/bin/bash
set +e
E=/workspace/egg-farm-studio/qa/m3-recheck/abilities-c43d2db-evidence
W=/workspace/egg-farm-studio/qa/m3-recheck/abilities-c43d2db-run
cp -a --reflink=auto /workspace/wt-arch-recheck112-c43d2db/node_modules "$W/node_modules" > "$E/dependencies.log" 2>&1
r=$?; echo "dependencies $r" >> "$E/exit-codes.txt"
[ "$r" = 0 ] || exit "$r"
cd "$W" || exit 1
run() { name="$1"; shift; printf '%q ' "$@" > "$E/$name.command"; printf '\n' >> "$E/$name.command"; "$@" > "$E/$name.log" 2>&1; r=$?; echo "$name $r" | tee -a "$E/exit-codes.txt"; }
git rev-parse HEAD > "$E/run-head.txt"
run focused node_modules/.bin/vitest run tests/v5-abilities-sim.test.ts tests/v5-f1a-fields.test.ts --minWorkers=1 --maxWorkers=2
run tsc node_modules/.bin/tsc --noEmit
run full-vitest node_modules/.bin/vitest run --minWorkers=1 --maxWorkers=2
run build npm run build
run release-build node scripts/check-release-build.mjs dist
git status --short > "$E/run-status-after.txt"
echo DONE
