#!/usr/bin/env bash
set -euo pipefail
REPO=PrincipalLewis/egg-farm
RUN=42124631940
TIP=9083c9a77ab831962ba7b7055d3abe2b550a9b31
OUT=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-113-result.txt
LOG=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-113-watch.log
{
  echo "START $(date -Iseconds) tip=$TIP run=$RUN"
  gh run watch "$RUN" --repo "$REPO" || true
  CONC=$(gh run view "$RUN" --repo "$REPO" --json conclusion -q .conclusion 2>/dev/null || echo unknown)
  OID=$(gh pr view 113 --repo "$REPO" --json headRefOid -q .headRefOid)
  JOBS=$(gh run view "$RUN" --repo "$REPO" --json jobs -q '[.jobs[]|{name,status,conclusion}]')
  ROLLUP=$(gh pr view 113 --repo "$REPO" --json statusCheckRollup -q '[.statusCheckRollup[]?|{name,status,conclusion}]')
  echo "DONE tip_expected=$TIP tip_now=$OID gate=$CONC $(date -Iseconds)" | tee "$OUT"
  echo "JOBS $JOBS" | tee -a "$OUT"
  echo "ROLLUP $ROLLUP" | tee -a "$OUT"
  if [ "$OID" != "$TIP" ]; then echo "TIP_CHANGED" | tee -a "$OUT"; fi
} 2>&1 | tee -a "$LOG"
