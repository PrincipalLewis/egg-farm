#!/usr/bin/env bash
set -uo pipefail
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
cd /workspace/wt-v5-p8-slim
OUT=/workspace/egg-farm-studio/artifacts/v5-p8-slim
: > "$OUT/results.tsv"
run() {
  local name="$1"; shift
  "$@" > "$OUT/$name.log" 2>&1
  local rc=$?
  printf '%s\t%s\t%s\n' "$name" "$rc" "$(date -Iseconds)" >> "$OUT/results.tsv"
  return 0
}
run tsc node_modules/.bin/tsc --noEmit
run sync npm run sync-economy -- --check
run full-vitest flock /workspace/egg-farm-studio/.vitest-eng.lock nice -n 10 node_modules/.bin/vitest run --minWorkers=1 --maxWorkers=2
run build npm run build
run build-html npm run build:html
run build-qa npm run build:qa
run check-release node scripts/check-release-build.mjs dist
run check-release-html node scripts/check-release-build.mjs dist-html/egg-farm.html
# This is the existing committed release-globals gate, not the deferred full F6 matrix.
run check-globals flock -w 600 /workspace/egg-farm-studio/.browser-test.lock timeout 600 bash -c '
  load=$(cut -d" " -f2 /proc/loadavg)
  awk -v n="$load" "BEGIN {exit !(n<=11)}" || { echo "NOT RUN: five-minute load $load >11"; exit 99; }
  npm run check-globals
'
git status --short > "$OUT/final-git-status.log"
git diff 518de304fbe9f4c8f3dd04b8fffe38ee7698b94f --name-only > "$OUT/final-files.log"
date -Iseconds > "$OUT/full-gates.done"
