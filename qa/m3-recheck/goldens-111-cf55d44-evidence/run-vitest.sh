#!/usr/bin/env bash
set -uo pipefail
WT=/workspace/egg-farm-studio/qa/scratch/goldens-111-cf55d44/wt
LG=/workspace/egg-farm-studio/qa/scratch/goldens-111-cf55d44/logs
name=$1; shift
cd "$WT"
flock -w 3600 /workspace/egg-farm-studio/.vitest-eng.lock bash -c '
  echo "LOCK+START $(TZ=Europe/Belgrade date -Iseconds) loadavg=$(cat /proc/loadavg) node=$(node -v) head=$(git rev-parse HEAD)"
  nice -n 10 ./node_modules/.bin/vitest run "$@" --minWorkers=1 --maxWorkers=2
  ec=$?; echo "EXIT=$ec END $(TZ=Europe/Belgrade date -Iseconds)"; exit $ec
' _ "$@" > "$LG/$name.txt" 2>&1
echo "vitest $name exit=$?"
