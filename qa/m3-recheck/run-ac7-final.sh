#!/bin/bash
set -u
SUM=/workspace/egg-farm-studio/qa/m3-recheck/browser-fold-summary.txt
EV=/workspace/egg-farm-studio/qa/m3-recheck/pr17-cf50663-evidence
mkdir -p "$EV" /workspace/egg-farm-studio/qa/m3-recheck/ac7-f1-cf50663-evidence
echo "[$(date +%H:%M:%S)] AC7 workers gate start on /tmp/qa-final/pr17" | tee -a "$SUM"
cd /workspace/egg-farm-studio
npx vite-node qa/m3-scripts/ac7-l18-25-gate-workers.ts /tmp/qa-final/pr17 > "$EV/ac7-workers-cf50663.log" 2>&1
ec=$?
cp -f "$EV/ac7-workers-cf50663.log" /workspace/egg-farm-studio/qa/m3-recheck/ac7-f1-cf50663-evidence/
echo "ac7-workers exit=$ec $(date +%H:%M:%S)" >> "$EV/exits.txt"
echo "[$(date +%H:%M:%S)] AC7 workers exit=$ec" | tee -a "$SUM"
tail -20 "$EV/ac7-workers-cf50663.log" | tee -a "$SUM"
# INFO no-workers (must exit 0)
echo "[$(date +%H:%M:%S)] AC7 no-workers INFO run" | tee -a "$SUM"
NO_WORKERS=1 LO=18 HI=22 npx vite-node qa/m3-scripts/ac7-l18-25-gate-workers.ts /tmp/qa-final/pr17 > "$EV/ac7-noworkers-cf50663.log" 2>&1
ec2=$?
cp -f "$EV/ac7-noworkers-cf50663.log" /workspace/egg-farm-studio/qa/m3-recheck/ac7-f1-cf50663-evidence/
echo "ac7-noworkers exit=$ec2 $(date +%H:%M:%S)" >> "$EV/exits.txt"
echo "[$(date +%H:%M:%S)] AC7 no-workers exit=$ec2 (expect 0 INFO)" | tee -a "$SUM"
tail -15 "$EV/ac7-noworkers-cf50663.log" | tee -a "$SUM"
echo AC7_DONE
