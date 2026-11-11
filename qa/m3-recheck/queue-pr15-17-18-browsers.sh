#!/bin/bash
# Queue globals+rc0 for PR15/17/18. Records exits. Deadline 06:00 CEST.
# Chromium for #17/#18: lane 2 (.browser-test-2.lock) when 1-min load < 12; else main lock.
# Firefox/WebKit: always main lock. Never kill jobs we didn't start.
set -u
LOCK=/workspace/egg-farm-studio/.browser-test.lock
LOCK2=/workspace/egg-farm-studio/.browser-test-2.lock
DEADLINE_H=6
DEADLINE_M=0
EV15=/tmp/pr15-ev
EV17=/tmp/pr17-ev
EV18=/tmp/pr18-ev
QAEV=/workspace/egg-farm-studio/qa/m3-recheck

past_deadline() {
  local h m
  h=$((10#$(date +%H))); m=$((10#$(date +%M)))
  if (( h > DEADLINE_H )) || (( h == DEADLINE_H && m >= DEADLINE_M )); then return 0; fi
  return 1
}

load1() { awk '{printf "%d", $1+0}' /proc/loadavg; }

pick_lock_chromium() {
  # Lane 2 only when load < 12
  local L
  L=$(load1)
  if (( L < 12 )); then
    echo "$LOCK2"
  else
    echo "$LOCK"
  fi
}

sync_ev() {
  local evdir=$1 label=$2
  mkdir -p "$QAEV/${label}-evidence"
  cp -f "$evdir/exits.txt" "$QAEV/${label}-evidence/exits.txt" 2>/dev/null || true
  cp -f "$evdir"/*.log "$QAEV/${label}-evidence/" 2>/dev/null || true
}

run_one() {
  local dir=$1 eng=$2 kind=$3 evdir=$4 label=$5 port=$6
  local logfile exitf sha bid lock use_lane2=0
  sha=$(git -C "$dir" rev-parse --short HEAD 2>/dev/null || echo unknown)
  bid=$(rg -o 'm3-rc1-pre\+[a-f0-9]+' "$dir/dist/assets/"*.js 2>/dev/null | head -1 || echo unknown)
  logfile="$evdir/${kind}-${eng}.log"
  exitf="$evdir/exits.txt"
  if past_deadline; then
    echo "${kind} ${eng} NOT_RUN deadline sha=${sha} bid=${bid}" >> "$exitf"
    echo "[$(date +%H:%M:%S)] NOT_RUN $label $kind $eng (deadline)"
    sync_ev "$evdir" "$label"
    return 0
  fi
  # Skip if already recorded for this sha+kind+eng
  if rg -q "^${kind} ${eng} exit=.*sha=${sha}" "$exitf" 2>/dev/null; then
    echo "[$(date +%H:%M:%S)] SKIP already have $label $kind $eng sha=$sha"
    return 0
  fi
  # Pick lock: chromium for pr17/pr18 -> lane2 when load<12; else main. PR15 chromium already done.
  if [[ "$eng" == "chromium" && ( "$label" == "pr17" || "$label" == "pr18" ) ]]; then
    lock=$(pick_lock_chromium)
    if [[ "$lock" == "$LOCK2" ]]; then use_lane2=1; else use_lane2=0; fi
  else
    lock="$LOCK"
  fi
  echo "[$(date +%H:%M:%S)] QUEUE $label $kind $eng sha=$sha bid=$bid port=$port lock=$(basename $lock) load=$(load1)"
  (
    cd "$dir"
    if [[ "$kind" == "globals" ]]; then
      flock "$lock" timeout 600 env PORT="$port" node scripts/release-globals-browser.mjs "$eng"
    else
      mkdir -p "$evdir/shots-${eng}"
      flock "$lock" timeout 600 env PORT="$port" SHOTS="$evdir/shots-${eng}" node scripts/rc0-browser.mjs "$eng"
    fi
  ) > "$logfile" 2>&1
  ec=$?
  local lane_tag=""
  (( use_lane2 )) && lane_tag="(lock2) "
  echo "${kind} ${eng} ${lane_tag}exit=${ec} sha=${sha} bid=${bid} $(date +%H:%M:%S)" >> "$exitf"
  echo "[$(date +%H:%M:%S)] DONE $label $kind $eng exit=$ec"
  sync_ev "$evdir" "$label"
  return 0
}

infer_exit_from_log() {
  local log=$1 kind=$2
  local ec=1
  [ -s "$log" ] || { echo 99; return; }
  if [[ "$kind" == "globals" ]]; then
    if rg -q 'PASS \[' "$log" && ! rg -q 'FAIL \[' "$log"; then ec=0; fi
  else
    # rc0: look for failure markers; also "N/N" style
    if rg -q 'FAIL|AssertionError|Error:' "$log"; then
      if rg -q 'FAIL \[' "$log" || rg -q ' failed' "$log"; then ec=1
      elif rg -q 'PASS \[' "$log" || rg -qE '[0-9]+/[0-9]+' "$log"; then
        # mixed — if process.exitCode set, hard to know; prefer fail if FAIL present
        ec=1
      fi
    else
      if rg -qE 'passed|/ [0-9]+ checks|PASS' "$log"; then ec=0; fi
    fi
    # Heuristic: last line often has summary; if no FAIL and has results, treat 0 when "ok" majority
    if rg -q 'FAIL' "$log"; then ec=1
    elif rg -q 'PASS' "$log"; then ec=0
    fi
  fi
  echo "$ec"
}

wait_existing() {
  local pid=$1 name=$2 evdir=$3 eng=$4 kind=$5 sha_label=$6 label=$7
  if [ ! -d /proc/$pid ]; then
    echo "[$(date +%H:%M:%S)] existing $name already gone"
    if ! rg -q "^${kind} ${eng} " "$evdir/exits.txt" 2>/dev/null; then
      local log="$evdir/${kind}-${eng}.log"
      local ec
      ec=$(infer_exit_from_log "$log" "$kind")
      echo "${kind} ${eng} exit=${ec} sha=${sha_label} (prequeued-done) $(date +%H:%M:%S)" >> "$evdir/exits.txt"
      sync_ev "$evdir" "$label"
    fi
    return 0
  fi
  echo "[$(date +%H:%M:%S)] waiting existing PID $pid ($name) — will not kill"
  while [ -d /proc/$pid ]; do
    if past_deadline; then
      echo "${kind} ${eng} NOT_RUN still-queued-at-deadline sha=${sha_label}" >> "$evdir/exits.txt"
      sync_ev "$evdir" "$label"
      return 0
    fi
    sleep 20
  done
  local log="$evdir/${kind}-${eng}.log"
  local ec
  ec=$(infer_exit_from_log "$log" "$kind")
  echo "${kind} ${eng} exit=${ec} sha=${sha_label} (prequeued) $(date +%H:%M:%S)" >> "$evdir/exits.txt"
  echo "[$(date +%H:%M:%S)] recorded existing $name exit=$ec"
  sync_ev "$evdir" "$label"
}

mkdir -p "$EV15" "$EV17" "$EV18"
touch "$EV15/exits.txt" "$EV17/exits.txt" "$EV18/exits.txt"

# --- PR15: wait for prequeued firefox globals (PID 1324568), do not kill ---
wait_existing 1324568 "pr15-ff-globals" "$EV15" firefox globals f67a425 pr15

# PR15 remaining on f67a425 (ff/wk on main lock)
run_one /tmp/pr15wt firefox rc0 "$EV15" pr15 4351
run_one /tmp/pr15wt webkit globals "$EV15" pr15 4352
run_one /tmp/pr15wt webkit rc0 "$EV15" pr15 4353

# --- PR18 OLD SHA prequeued chromium globals (PID 1374050) — do not kill; label OLD ---
wait_existing 1374050 "pr18-old-chr-globals" "$EV18" chromium globals 79edfa1-OLD pr18

# Wait for builds of new heads
echo "[$(date +%H:%M:%S)] waiting for pr17/pr18 new builds"
for i in $(seq 1 90); do
  if rg -q 'ALL_BUILDS_DONE' /tmp/pr17-pr18-builds.log 2>/dev/null; then break; fi
  if past_deadline; then break; fi
  sleep 20
done
# If builds not done, try to proceed if dist exists
H17=$(git -C /tmp/pr17-new rev-parse --short HEAD 2>/dev/null || echo missing)
H18=$(git -C /tmp/pr18-new rev-parse --short HEAD 2>/dev/null || echo missing)
R17=$(gh pr view 17 --json headRefOid --jq .headRefOid 2>/dev/null | cut -c1-7 || echo '?')
R18=$(gh pr view 18 --json headRefOid --jq .headRefOid 2>/dev/null | cut -c1-7 || echo '?')
echo "[$(date +%H:%M:%S)] local #17=$H17 #18=$H18 remote #17=$R17 #18=$R18 load=$(load1)"

# If remote moved and we can update without disrupting, note it (builds may be stale)
if [[ -n "$R17" && "$R17" != "?" && "$R17" != "$H17" ]]; then
  echo "[$(date +%H:%M:%S)] NOTE remote #17 moved to $R17 (local build is $H17) — labeling results with local sha"
fi
if [[ -n "$R18" && "$R18" != "?" && "$R18" != "$H18" ]]; then
  echo "[$(date +%H:%M:%S)] NOTE remote #18 moved to $R18 (local build is $H18) — labeling results with local sha"
fi

# PR17: chromium on lane2 when load<12; ff/wk on main
if [[ -d /tmp/pr17-new/dist && -d /tmp/pr17-new/dist-qa ]]; then
  for eng in chromium firefox webkit; do
    run_one /tmp/pr17-new "$eng" globals "$EV17" pr17 $((4400 + ${#eng} + RANDOM % 50))
    run_one /tmp/pr17-new "$eng" rc0 "$EV17" pr17 $((4500 + ${#eng} + RANDOM % 50))
  done
else
  echo "globals ALL NOT_RUN no-dist sha=$H17" >> "$EV17/exits.txt"
  echo "rc0 ALL NOT_RUN no-dist sha=$H17" >> "$EV17/exits.txt"
  sync_ev "$EV17" pr17
fi

# PR18 on new head: chromium lane2 when load<12; also re-run chromium on new sha (old was 79edfa1)
if [[ -d /tmp/pr18-new/dist && -d /tmp/pr18-new/dist-qa ]]; then
  for eng in chromium firefox webkit; do
    run_one /tmp/pr18-new "$eng" globals "$EV18" pr18 $((4600 + ${#eng} + RANDOM % 50))
    run_one /tmp/pr18-new "$eng" rc0 "$EV18" pr18 $((4700 + ${#eng} + RANDOM % 50))
  done
else
  echo "globals ALL NOT_RUN no-dist sha=$H18" >> "$EV18/exits.txt"
  echo "rc0 ALL NOT_RUN no-dist sha=$H18" >> "$EV18/exits.txt"
  sync_ev "$EV18" pr18
fi

echo "[$(date +%H:%M:%S)] QUEUE_ALL_DONE"
sync_ev "$EV15" pr15
sync_ev "$EV17" pr17
sync_ev "$EV18" pr18
echo FINAL_SYNC_DONE
