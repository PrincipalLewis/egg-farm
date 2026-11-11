#!/bin/bash
set +e
E=/workspace/egg-farm-studio/qa/m3-recheck/bbv2-b6705124-evidence
W=/workspace/egg-farm-studio/qa/m3-recheck/bbv2-b6705124-run
cd "$W" || exit 1
node --version > "$E/local-node.txt"
git rev-parse HEAD > "$E/run-head.txt"
: > "$E/exit-codes.txt"
run(){ name="$1"; shift; printf '%q ' "$@" > "$E/$name.command"; printf '\n' >> "$E/$name.command"; "$@" > "$E/$name.log" 2>&1; r=$?; echo "$name $r" | tee -a "$E/exit-codes.txt"; return $r; }
run tsc node_modules/.bin/tsc --noEmit
run full-vitest node_modules/.bin/vitest run --minWorkers=1 --maxWorkers=2
run build npm run build
run release-build node scripts/check-release-build.mjs dist
git status --short > "$E/status-after.txt"
# Capture build id line if present
rg -n 'check-release-build:|m4\.1\+' "$E/build.log" "$E/release-build.log" > "$E/build-id-lines.txt" || true
echo DONE
