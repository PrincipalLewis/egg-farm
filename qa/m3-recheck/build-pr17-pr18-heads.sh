#!/bin/bash
set -e
build_one() {
  local d=$1 label=$2
  cd "$d"
  echo "[$(date +%H:%M:%S)] BUILD start $label $(git rev-parse --short HEAD)" 
  npx tsc --noEmit > /tmp/${label}-tsc.log 2>&1 && echo TSC_OK || { echo TSC_FAIL; tail -20 /tmp/${label}-tsc.log; }
  npm run build > /tmp/${label}-build.log 2>&1 && echo BUILD_OK || { echo BUILD_FAIL; tail -30 /tmp/${label}-build.log; return 1; }
  npm run build:qa > /tmp/${label}-buildqa.log 2>&1 && echo BUILDQA_OK || { echo BUILDQA_FAIL; tail -30 /tmp/${label}-buildqa.log; return 1; }
  local bid
  bid=$(rg -o 'm3-rc1-pre\+[a-f0-9]+' dist/assets/*.js 2>/dev/null | head -1 || true)
  echo "[$(date +%H:%M:%S)] BUILD done $label bid=$bid"
  echo "$bid" > /tmp/${label}-buildid.txt
}
build_one /tmp/pr17-new pr17new
build_one /tmp/pr18-new pr18new
echo ALL_BUILDS_DONE
