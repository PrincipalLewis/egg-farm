#!/bin/bash
set -u
LOCK=/workspace/egg-farm-studio/.browser-test.lock
LOCK2=/workspace/egg-farm-studio/.browser-test-2.lock
SUM=/workspace/egg-farm-studio/qa/m3-recheck/browser-fold-summary.txt
load1() { awk '{printf "%d", $1+0}' /proc/loadavg; }
pick_lock() {
  local eng=$1
  if [[ "$eng" == "chromium" ]] && (( $(load1) < 12 )); then echo "$LOCK2"; else echo "$LOCK"; fi
}
run_one() {
  local dir=$1 label=$2 sha=$3 eng=$4 kind=$5 ev=$6 port=$7
  local lock logfile ec lane=""
  logfile="$ev/${kind}-${eng}.log"
  if rg -q "^${kind} ${eng} exit=.*sha=${sha}" "$ev/exits.txt" 2>/dev/null; then
    echo "[$(date +%H:%M:%S)] SKIP $label $kind $eng sha=$sha" | tee -a "$SUM"
    return 0
  fi
  lock=$(pick_lock "$eng")
  [[ "$lock" == "$LOCK2" ]] && lane="(lock2) "
  echo "[$(date +%H:%M:%S)] START $label $kind $eng sha=$sha port=$port lock=$(basename $lock) load=$(load1)" | tee -a "$SUM"
  (
    cd "$dir"
    if [[ "$kind" == "globals" ]]; then
      flock "$lock" timeout 600 env PORT="$port" node scripts/release-globals-browser.mjs "$eng"
    else
      mkdir -p "$ev/shots-$eng"
      flock "$lock" timeout 600 env PORT="$port" SHOTS="$ev/shots-$eng" node scripts/rc0-browser.mjs "$eng"
    fi
  ) > "$logfile" 2>&1
  ec=$?
  local fails pass
  fails=$(rg -c '^FAIL' "$logfile" 2>/dev/null || echo 0)
  pass=$(rg -c '^PASS' "$logfile" 2>/dev/null || echo 0)
  echo "${kind} ${eng} ${lane}exit=${ec} sha=${sha} bid=m3-rc1-pre+${sha} PASS=${pass} FAIL=${fails} $(date +%H:%M:%S)" >> "$ev/exits.txt"
  echo "[$(date +%H:%M:%S)] DONE $label $kind $eng exit=$ec PASS=$pass FAIL=$fails" | tee -a "$SUM"
  cp -f "$logfile" "$ev/exits.txt" "$ev/"
}

EV17=/workspace/egg-farm-studio/qa/m3-recheck/pr17-cf50663-evidence
EV18=/workspace/egg-farm-studio/qa/m3-recheck/pr18-d8d680e-evidence
mkdir -p "$EV17" "$EV18"
touch "$EV17/exits.txt" "$EV18/exits.txt"

# Resume: skip completed via sha tags in exits
for eng in chromium firefox webkit; do
  run_one /tmp/qa-final/pr17 pr17-cf50663 cf50663 "$eng" globals "$EV17" $((5721 + ${#eng}))
  run_one /tmp/qa-final/pr17 pr17-cf50663 cf50663 "$eng" rc0 "$EV17" $((5731 + ${#eng}))
  run_one /tmp/qa-final/pr18 pr18-d8d680e d8d680e "$eng" globals "$EV18" $((5741 + ${#eng}))
  run_one /tmp/qa-final/pr18 pr18-d8d680e d8d680e "$eng" rc0 "$EV18" $((5751 + ${#eng}))
done
echo "[$(date +%H:%M:%S)] BROWSER_QUEUE_ALL_DONE" | tee -a "$SUM"
