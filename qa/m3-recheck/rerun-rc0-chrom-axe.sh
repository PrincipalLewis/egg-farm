#!/bin/bash
set -u
LOCK2=/workspace/egg-farm-studio/.browser-test-2.lock
SUM=/workspace/egg-farm-studio/qa/m3-recheck/browser-fold-summary.txt
test -f /tmp/axe/node_modules/axe-core/axe.min.js || { echo "axe missing"; exit 2; }
run() {
  local dir=$1 sha=$2 ev=$3 port=$4
  local log="$ev/rc0-chromium-rerun-axe.log"
  echo "[$(date +%H:%M:%S)] RERUN rc0 chromium $sha port=$port (axe restored)" | tee -a "$SUM"
  (
    cd "$dir"
    mkdir -p "$ev/shots-chromium-rerun"
    flock "$LOCK2" timeout 600 env PORT="$port" SHOTS="$ev/shots-chromium-rerun" AXE_PATH=/tmp/axe/node_modules/axe-core/axe.min.js node scripts/rc0-browser.mjs chromium
  ) > "$log" 2>&1
  local ec=$? pass fails
  pass=$(rg -c '^PASS' "$log" || echo 0)
  fails=$(rg -c '^FAIL' "$log" || echo 0)
  echo "rc0 chromium (lock2) RERUN-axe exit=${ec} sha=${sha} PASS=${pass} FAIL=${fails} $(date +%H:%M:%S)" >> "$ev/exits.txt"
  echo "[$(date +%H:%M:%S)] RERUN DONE $sha exit=$ec PASS=$pass FAIL=$fails" | tee -a "$SUM"
  echo "--- FAIL lines $sha ---" | tee -a "$SUM"
  rg '^FAIL' "$log" | tee -a "$SUM"
}
run /tmp/qa-final/pr17 cf50663 /workspace/egg-farm-studio/qa/m3-recheck/pr17-cf50663-evidence 5761
run /tmp/qa-final/pr18 d8d680e /workspace/egg-farm-studio/qa/m3-recheck/pr18-d8d680e-evidence 5762
echo RERUN_AXE_DONE
