#!/usr/bin/env bash
set -euo pipefail
REPO=PrincipalLewis/egg-farm
RUN=42115540195
TIP=c43d2db5dd56f90096a6ba5c509d33ccef69117d
OUT=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-112-result.txt
LOG=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-112-watch.log
{
  echo "START $(date -Iseconds) tip=$TIP run=$RUN"
  # Watch until completed (do not --exit-status: we record conclusion either way)
  gh run watch "$RUN" --repo "$REPO" || true
  CONC=$(gh run view "$RUN" --repo "$REPO" --json conclusion -q .conclusion 2>/dev/null || echo unknown)
  OID=$(gh pr view 112 --repo "$REPO" --json headRefOid -q .headRefOid)
  JOBS=$(gh run view "$RUN" --repo "$REPO" --json jobs -q '[.jobs[]|{name,status,conclusion}]')
  # Also capture sibling checks rollup for pacing / release-globals
  ROLLUP=$(gh pr view 112 --repo "$REPO" --json statusCheckRollup -q '[.statusCheckRollup[]?|{name,status,conclusion}]')
  echo "DONE tip_expected=$TIP tip_now=$OID gate=$CONC $(date -Iseconds)" | tee "$OUT"
  echo "JOBS $JOBS" | tee -a "$OUT"
  echo "ROLLUP $ROLLUP" | tee -a "$OUT"
  if [ "$OID" != "$TIP" ]; then
    echo "TIP_CHANGED" | tee -a "$OUT"
  fi
} 2>&1 | tee -a "$LOG"
