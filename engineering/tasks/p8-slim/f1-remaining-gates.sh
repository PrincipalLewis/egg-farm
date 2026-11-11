#!/usr/bin/env bash
set -uo pipefail
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
cd /workspace/wt-v5-p8-slim
OUT=/workspace/egg-farm-studio/artifacts/v5-p8-slim
printf '\n# F1 remaining gates after commit 0e9151b %s\n' "$(date -Iseconds)" >> "$OUT/results.tsv"
run() {
  local name="$1"; shift
  "$@" > "$OUT/$name.log" 2>&1
  local rc=$?
  printf '%s\t%s\t%s\n' "$name" "$rc" "$(date -Iseconds)" >> "$OUT/results.tsv"
  return 0
}
run f1-tsc node_modules/.bin/tsc --noEmit
run f1-sync npm run sync-economy -- --check
# full vitest already passed on identical frozen tree; do not duplicate under lock
run f1-build npm run build
run f1-build-html npm run build:html
run f1-build-qa npm run build:qa
run f1-check-release node scripts/check-release-build.mjs dist
run f1-check-release-html node scripts/check-release-build.mjs dist-html/egg-farm.html
run f1-check-globals flock -w 600 /workspace/egg-farm-studio/.browser-test.lock timeout 600 bash -c '
  load=$(cut -d" " -f2 /proc/loadavg)
  awk -v n="$load" "BEGIN {exit !(n<=11)}" || { echo "NOT RUN: five-minute load $load >11"; exit 99; }
  npm run check-globals
'
git rev-parse HEAD > "$OUT/f1-gates-head.txt"
date -Iseconds > "$OUT/f1-remaining-gates.done"
