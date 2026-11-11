#!/usr/bin/env bash
set -euo pipefail
REPO=PrincipalLewis/egg-farm
RUN=42127280016
TIP=ae12da452fa00443a1d12078cd8f9468d34c3591
OUT=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-100-ae12-result.txt
LOG=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-100-ae12-watch.log
{
  echo "START $(date -Iseconds) tip=$TIP run=$RUN"
  gh run watch "$RUN" --repo "$REPO" || true
  CONC=$(gh run view "$RUN" --repo "$REPO" --json conclusion -q .conclusion 2>/dev/null || echo unknown)
  OID=$(gh pr view 100 --repo "$REPO" --json headRefOid -q .headRefOid)
  JOBS=$(gh run view "$RUN" --repo "$REPO" --json jobs -q '[.jobs[]|{name,status,conclusion}]')
  echo "DONE tip_expected=$TIP tip_now=$OID gate=$CONC $(date -Iseconds)" | tee "$OUT"
  echo "JOBS $JOBS" | tee -a "$OUT"
} 2>&1 | tee -a "$LOG"
