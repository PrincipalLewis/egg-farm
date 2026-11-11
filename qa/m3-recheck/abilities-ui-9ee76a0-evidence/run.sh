#!/bin/bash
set +e
E=/workspace/egg-farm-studio/qa/m3-recheck/abilities-ui-9ee76a0-evidence
W=/workspace/egg-farm-studio/qa/m3-recheck/abilities-ui-9ee76a0-run
cd "$W" || exit 1
node --version > "$E/local-node.txt"
git rev-parse HEAD > "$E/run-head.txt"
git rev-parse HEAD^{tree} > "$E/run-tree.txt"
: > "$E/exit-codes.txt"
run(){ name="$1"; shift; printf '%q ' "$@" > "$E/$name.command"; printf '\n' >> "$E/$name.command"; "$@" > "$E/$name.log" 2>&1; r=$?; echo "$name $r" | tee -a "$E/exit-codes.txt"; return $r; }
# Focused O1/O2 + AB-14 behavioral suite first for dedicated evidence
run o1o2-vitest node_modules/.bin/vitest run tests/v5-abilities-ui.test.ts --minWorkers=1 --maxWorkers=2
run tsc node_modules/.bin/tsc --noEmit
run full-vitest node_modules/.bin/vitest run --minWorkers=1 --maxWorkers=2
run build npm run build
run release-build node scripts/check-release-build.mjs dist
git status --short > "$E/status-after.txt"
rg -n 'GOLDEN1|Test Files|Tests |O1:|O2:|sheetCloseComplete|FAIL' "$E/o1o2-vitest.log" "$E/full-vitest.log" > "$E/vitest-key-lines.txt" || true
rg -n 'check-release-build|m4\.1\+' "$E/build.log" "$E/release-build.log" > "$E/build-id-lines.txt" || true
echo DONE
