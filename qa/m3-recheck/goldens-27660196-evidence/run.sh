#!/bin/bash
set +e
E=/workspace/egg-farm-studio/qa/m3-recheck/goldens-27660196-evidence
W=/workspace/egg-farm-studio/qa/m3-recheck/goldens-27660196-run
cd "$W" || exit 1
node --version > "$E/local-node.txt"
git rev-parse HEAD > "$E/run-head.txt"
git rev-parse HEAD^{tree} > "$E/run-tree.txt"
: > "$E/exit-codes.txt"
run(){ name="$1"; shift; printf '%q ' "$@" > "$E/$name.command"; printf '\n' >> "$E/$name.command"; "$@" > "$E/$name.log" 2>&1; r=$?; echo "$name $r" | tee -a "$E/exit-codes.txt"; return $r; }
run tsc node_modules/.bin/tsc --noEmit
run full-vitest node_modules/.bin/vitest run --minWorkers=1 --maxWorkers=2
run build npm run build
run release-build node scripts/check-release-build.mjs dist
git status --short > "$E/status-after.txt"
rg -n 'GE-AC26|all_sales' tests src > "$E/ge-ac26-runtime-grep.txt" || true
rg -n 'GOLDEN1|Test Files|Tests ' "$E/full-vitest.log" > "$E/vitest-summary-lines.txt" || true
rg -n 'check-release-build|m4\.1\+' "$E/build.log" "$E/release-build.log" > "$E/build-id-lines.txt" || true
echo DONE
