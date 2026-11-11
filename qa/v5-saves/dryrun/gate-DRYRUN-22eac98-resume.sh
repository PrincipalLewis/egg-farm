#!/bin/bash
# DRYRUN resume: the 3-engine driver run (started 21:17 CET) was killed by the tool host during B-resetat-AC1-3 (log empty, no child left).
# Runs the two remaining driver steps with the driver's exact commands, then the driver's cleanup + manifest. Same results dir.
set -u; R=/workspace/egg-farm-studio/qa/v5-saves/dryrun/gate-DRYRUN-22eac98/results; M3=/workspace/egg-farm-studio/qa/m3-scripts; LOCK=/workspace/egg-farm-studio/.browser-test.lock
WT=/workspace/egg-farm-studio/qa/wt-v5saves-22eac98; WB=/workspace/egg-farm-studio/qa/wt-v5saves-base-30b29d3; GIT=/workspace/egg-farm-studio/game; ST=$R/status.log; SUM=$R/summary.txt
say(){ echo "$(date '+%F %T %Z') $*" | tee -a "$ST"; }
say "RESUME (driver process was killed by the tool host during B-resetat-AC1-3; re-running the remaining steps unchanged)"
for spec in "B-resetat-AC1-3|BRS-AC1,BRS-AC2,BRS-AC3|resetat-a" "B-resetat-AC4-CLK|BRS-AC4,BRS-CLK|resetat-b"; do IFS='|' read id only out <<< "$spec"
  say "START $id"; env ONLY=$only flock -w 1200 "$LOCK" timeout 600 node "$M3/csr-m41-7-resetat.mjs" "$WT" 5961 "$R/$out" 22eac98 chromium > "$R/$id.log" 2>&1; rc=$?
  res=$([ $rc = 0 ] && echo PASS || echo FAIL); echo "$id | $res | HARD | exit $rc" | tee -a "$SUM"; say "END $id $res"; done
for w in "$WT" "$WB"; do [ -d "$w" ] && { rm -f "$w"/tests/*.qa.test.ts; git -C "$w" status --porcelain | grep -q . && say "KEEP dirty $w" || git -C "$GIT" worktree remove --force "$w"; }; done
HF=$(grep -c '| FAIL | HARD' "$SUM"); echo "VERDICT: $([ $HF = 0 ] && echo PASS || echo FAIL) (hard_fail=$HF) DRYRUN" | tee -a "$SUM"; say "DONE"
(cd "$R" && find . -type f ! -name SHA256SUMS ! -name SHA256SUMS.check.txt ! -path '*/.serve/*' | sort | xargs sha256sum > SHA256SUMS); (cd "$R" && sha256sum -c SHA256SUMS > SHA256SUMS.check.txt 2>&1) && say "SHA256SUMS -c OK $(sha256sum $R/SHA256SUMS | cut -c1-64)" || say "SHA256SUMS -c FAILED"
