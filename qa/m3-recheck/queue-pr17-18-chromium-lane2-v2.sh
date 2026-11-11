#!/bin/bash
set -u
LOCK2=/workspace/egg-farm-studio/.browser-test-2.lock
past_deadline() { local h=$((10#$(date +%H))); (( h >= 6 )); }
load1() { awk '{printf "%d", $1+0}' /proc/loadavg; }
sync_ev() {
  local evdir=$1 label=$2
  mkdir -p /workspace/egg-farm-studio/qa/m3-recheck/${label}-evidence
  cp -f "$evdir/exits.txt" /workspace/egg-farm-studio/qa/m3-recheck/${label}-evidence/exits.txt
  cp -f "$evdir"/*.log /workspace/egg-farm-studio/qa/m3-recheck/${label}-evidence/ 2>/dev/null || true
}
run_chr() {
  local dir=$1 kind=$2 evdir=$3 label=$4 port=$5
  local sha bid logfile ec
  sha=$(git -C "$dir" rev-parse --short HEAD)
  bid=$(rg -o 'm3-rc1-pre\+[a-f0-9]+' "$dir/dist/assets/"*.js 2>/dev/null | head -1 || echo unknown)
  logfile="$evdir/${kind}-chromium-${sha}.log"
  if past_deadline; then
    echo "${kind} chromium NOT_RUN deadline sha=${sha} bid=${bid}" >> "$evdir/exits.txt"
    sync_ev "$evdir" "$label"; return 0
  fi
  if rg -q "^${kind} chromium .*sha=${sha}" "$evdir/exits.txt" 2>/dev/null; then
    echo "[$(date +%H:%M:%S)] SKIP $label $kind chromium sha=$sha"
    return 0
  fi
  while (( $(load1) >= 12 )); do
    if past_deadline; then
      echo "${kind} chromium NOT_RUN load>=12-at-deadline sha=${sha}" >> "$evdir/exits.txt"
      sync_ev "$evdir" "$label"; return 0
    fi
    sleep 30
  done
  echo "[$(date +%H:%M:%S)] LANE2 $label $kind chromium sha=$sha bid=$bid port=$port load=$(load1)"
  (
    cd "$dir"
    if [[ "$kind" == "globals" ]]; then
      flock "$LOCK2" timeout 600 env PORT="$port" node scripts/release-globals-browser.mjs chromium
    else
      mkdir -p "$evdir/shots-chromium-${sha}"
      flock "$LOCK2" timeout 600 env PORT="$port" SHOTS="$evdir/shots-chromium-${sha}" node scripts/rc0-browser.mjs chromium
    fi
  ) > "$logfile" 2>&1
  ec=$?
  # also keep unversioned copy for convenience
  cp -f "$logfile" "$evdir/${kind}-chromium.log"
  echo "${kind} chromium (lock2) exit=${ec} sha=${sha} bid=${bid} $(date +%H:%M:%S)" >> "$evdir/exits.txt"
  echo "[$(date +%H:%M:%S)] DONE LANE2 $label $kind chromium exit=$ec sha=$sha"
  sync_ev "$evdir" "$label"
}
run_chr /tmp/pr17-new globals /tmp/pr17-ev pr17 4491
run_chr /tmp/pr17-new rc0 /tmp/pr17-ev pr17 4492
run_chr /tmp/pr18-new globals /tmp/pr18-ev pr18 4493
run_chr /tmp/pr18-new rc0 /tmp/pr18-ev pr18 4494
echo "[$(date +%H:%M:%S)] LANE2_V2_DONE"
