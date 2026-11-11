#!/bin/bash
# DRYRUN finish (22:1x CET): (1) the 2 resetat steps of the 3-engine run, on a fresh 22eac98 worktree; (2) the updated telemetry checker (D-HOP-04 closed schemas, TS7 stall.force) on Chromium; (3) offline-seed proof on Chromium.
set -u; export PATH=/usr/local/bin:/usr/bin:/bin; V=/workspace/egg-farm-studio/qa/v5-saves; R=$V/dryrun/gate-DRYRUN-22eac98/results; M3=/workspace/egg-farm-studio/qa/m3-scripts; LOCK=/workspace/egg-farm-studio/.browser-test.lock
WT=/workspace/egg-farm-studio/qa/wt-v5saves-22eac98; GIT=/workspace/egg-farm-studio/game; ST=$R/status.log; SUM=$R/summary.txt
say(){ echo "$(date '+%F %T %Z') $*" | tee -a "$ST"; }
say "RESUME2 on a fresh 22eac98 worktree (npm ci + build:qa; porcelain 0): the 2 remaining resetat steps, driver commands unchanged"
for spec in "B-resetat-AC1-3|BRS-AC1,BRS-AC2,BRS-AC3|resetat-a" "B-resetat-AC4-CLK|BRS-AC4,BRS-CLK|resetat-b"; do IFS='|' read id only out <<< "$spec"
  say "START $id"; env ONLY=$only flock -w 1500 "$LOCK" timeout 600 node "$M3/csr-m41-7-resetat.mjs" "$WT" 5961 "$R/$out" 22eac98 chromium > "$R/$id.log" 2>&1; rc=$?
  res=$([ $rc = 0 ] && echo PASS || echo FAIL); echo "$id | $res | HARD | exit $rc" | tee -a "$SUM"; say "END $id $res"; done
HF=$(grep -c '| FAIL | HARD' "$SUM"); echo "VERDICT: $([ $HF = 0 ] && echo PASS || echo FAIL) (hard_fail=$HF) DRYRUN" | tee -a "$SUM"; say "DONE"
(cd "$R" && find . -type f ! -name SHA256SUMS ! -name SHA256SUMS.check.txt ! -path '*/.serve/*' | sort | xargs sha256sum > SHA256SUMS); (cd "$R" && sha256sum -c SHA256SUMS > SHA256SUMS.check.txt 2>&1) && say "SHA256SUMS -c OK $(sha256sum $R/SHA256SUMS | cut -c1-64)" || say "SHA256SUMS -c FAILED"
T=$V/dryrun/telemetry-DRYRUN-v2-22eac98; rm -rf $T; MIDS=$(cd "$WT" && node -e "const M=require('./src/config/balance.json').m4.milestones;console.log([...M.hens.map(m=>'hens:'+m.level),...M.grades.map(g=>'grade:'+g.level),...M.balanced.map((_,i)=>'balanced:'+(i+1))].join(','))")
echo "telemetry v2 start $(date '+%T %Z') mids=$MIDS"; flock -w 1500 "$LOCK" timeout 600 node $V/scripts/telemetry-check.mjs --html "$WT/dist-html/egg-farm.html" --engine chromium --port 5961 --out $T --expect-build m4.1+22eac98 --milestone-ids "$MIDS" --qa-dir "$WT/dist-qa" > $T.log 2>&1; echo "telemetry v2 exit $? $(date '+%T')"
P=$V/dryrun/offline-seed-proof-DRYRUN; rm -rf $P; flock -w 1500 "$LOCK" timeout 300 node $V/scripts/offline-seed-proof.mjs --html "$WT/dist-html/egg-farm.html" --port 5962 --out $P --engine chromium > $P.log 2>&1; echo "proof exit $? $(date '+%T')"
rm -f "$WT"/tests/*.qa.test.ts; git -C "$WT" status --porcelain | grep -q . && echo "KEEP dirty $WT" || git -C "$GIT" worktree remove --force "$WT"; echo "ALL DONE $(date '+%T')"
