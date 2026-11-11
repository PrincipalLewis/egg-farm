#!/bin/bash
set -u
LOCK=/workspace/egg-farm-studio/.browser-test.lock
LOCK2=/workspace/egg-farm-studio/.browser-test-2.lock
past_deadline() { local h=$((10#$(date +%H))); (( h >= 6 )); }
load1() { awk '{printf "%d", $1+0}' /proc/loadavg; }
sync_ev() {
  local evdir=$1 label=$2
  mkdir -p /workspace/egg-farm-studio/qa/m3-recheck/${label}-evidence
  cp -f "$evdir/exits.txt" /workspace/egg-farm-studio/qa/m3-recheck/${label}-evidence/exits.txt
  cp -f "$evdir"/*.log /workspace/egg-farm-studio/qa/m3-recheck/${label}-evidence/ 2>/dev/null || true
  {
    echo ""
    echo "=== residual sync $(date '+%H:%M:%S %Z') $label ==="
    tail -5 "$evdir/exits.txt"
  } >> /workspace/egg-farm-studio/qa/m3-recheck/browser-fold-summary.txt
}
pick_lock() {
  local eng=$1
  if [[ "$eng" == "chromium" ]]; then
    if (( $(load1) < 12 )); then echo "$LOCK2"; else echo "$LOCK"; fi
  else
    echo "$LOCK"
  fi
}
run_one() {
  local dir=$1 eng=$2 kind=$3 evdir=$4 label=$5 port=$6
  local sha bid logfile lock lane_tag="" ec
  sha=$(git -C "$dir" rev-parse --short HEAD)
  bid=$(rg -o 'm3-rc1-pre\+[a-f0-9]+' "$dir/dist/assets/"*.js 2>/dev/null | head -1 || echo unknown)
  logfile="$evdir/${kind}-${eng}-${sha}.log"
  if past_deadline; then
    echo "${kind} ${eng} NOT_RUN deadline sha=${sha} bid=${bid}" >> "$evdir/exits.txt"
    echo "[$(date +%H:%M:%S)] NOT_RUN $label $kind $eng"
    sync_ev "$evdir" "$label"; return 0
  fi
  if rg -q "^${kind} ${eng} .*sha=${sha} " "$evdir/exits.txt" 2>/dev/null; then
    echo "[$(date +%H:%M:%S)] SKIP $label $kind $eng sha=$sha"
    return 0
  fi
  if [[ ! -d "$dir/dist" || ! -d "$dir/dist-qa" ]]; then
    echo "${kind} ${eng} NOT_RUN no-dist sha=${sha}" >> "$evdir/exits.txt"
    sync_ev "$evdir" "$label"; return 0
  fi
  lock=$(pick_lock "$eng")
  [[ "$lock" == "$LOCK2" ]] && lane_tag="(lock2) "
  echo "[$(date +%H:%M:%S)] QUEUE $label $kind $eng sha=$sha bid=$bid port=$port lock=$(basename $lock) load=$(load1)"
  (
    cd "$dir"
    if [[ "$kind" == "globals" ]]; then
      flock "$lock" timeout 600 env PORT="$port" node scripts/release-globals-browser.mjs "$eng"
    else
      mkdir -p "$evdir/shots-${eng}-${sha}"
      flock "$lock" timeout 600 env PORT="$port" SHOTS="$evdir/shots-${eng}-${sha}" node scripts/rc0-browser.mjs "$eng"
    fi
  ) > "$logfile" 2>&1
  ec=$?
  cp -f "$logfile" "$evdir/${kind}-${eng}.log"
  echo "${kind} ${eng} ${lane_tag}exit=${ec} sha=${sha} bid=${bid} $(date +%H:%M:%S)" >> "$evdir/exits.txt"
  echo "[$(date +%H:%M:%S)] DONE $label $kind $eng exit=$ec sha=$sha"
  sync_ev "$evdir" "$label"
}

echo "[$(date +%H:%M:%S)] residual queue start; wait rebuild3"
for i in $(seq 1 60); do
  rg -q 'REBUILD3_DONE' /tmp/pr17-pr18-rebuild3.log 2>/dev/null && break
  past_deadline && break
  sleep 15
done
echo "[$(date +%H:%M:%S)] rebuild status: $(tail -3 /tmp/pr17-pr18-rebuild3.log | tr '\n' ' | ')"
echo "[$(date +%H:%M:%S)] heads $(git -C /tmp/pr17-new rev-parse --short HEAD) $(git -C /tmp/pr18-new rev-parse --short HEAD) load=$(load1)"

# PR17 current head — all 6 (skip if sha already recorded)
for eng in chromium firefox webkit; do
  run_one /tmp/pr17-new "$eng" globals /tmp/pr17-ev pr17 $((4800 + RANDOM % 80))
  run_one /tmp/pr17-new "$eng" rc0 /tmp/pr17-ev pr17 $((4900 + RANDOM % 80))
done
# PR18 current head — all 6
for eng in chromium firefox webkit; do
  run_one /tmp/pr18-new "$eng" globals /tmp/pr18-ev pr18 $((5000 + RANDOM % 80))
  run_one /tmp/pr18-new "$eng" rc0 /tmp/pr18-ev pr18 $((5100 + RANDOM % 80))
done
echo "[$(date +%H:%M:%S)] RESIDUAL_QUEUE_DONE"
sync_ev /tmp/pr17-ev pr17
sync_ev /tmp/pr18-ev pr18
echo FINAL_RESIDUAL_SYNC >> /workspace/egg-farm-studio/qa/m3-recheck/browser-fold-summary.txt
