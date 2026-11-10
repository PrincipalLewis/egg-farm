#!/bin/bash
# PR-B browser matrix runner: 3 engines x 390x844 / 1280x800. AUTHOR EVIDENCE ONLY. Only the browser command runs under the
# shared lock. Logs HEAD and `git status --porcelain` up front (Architect m4); the .mjs repeats them in every per-run log.
# Usage: A=/workspace/artifacts/<dir> scripts/breeds-ui-prB-browser-matrix.sh   (ENGINES=..., VPS=... to narrow)
set -u
cd "$(dirname "$0")/.."
A=${A:?set A=artifact dir}; L=${LOCK:-/workspace/egg-farm-studio/.browser-test.lock}
mkdir -p "$A"
{ echo "HEAD $(git rev-parse HEAD)"; s=$(git status --porcelain); echo "git status --porcelain: ${s:-(clean)}"; } > "$A/browser-summary.txt"
for e in ${ENGINES:-chromium firefox webkit}; do for vp in ${VPS:-390x844 1280x800}; do
  d=$A/browser/$e-$vp; mkdir -p "$d"
  SHOTS=$d VW=${vp%x*} VH=${vp#*x} flock "$L" timeout 600 node scripts/breeds-ui-prB-browser.mjs "$e" > "$d/run.log" 2>&1
  echo "$e $vp rc=$? $(tail -1 "$d/run.log")" >> "$A/browser-summary.txt"
done; done
echo BROWSER-DONE >> "$A/browser-summary.txt"
