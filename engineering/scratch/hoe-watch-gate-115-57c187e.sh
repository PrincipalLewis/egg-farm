#!/usr/bin/env bash
set -euo pipefail
REPO=PrincipalLewis/egg-farm
RUN=42127874273
TIP=57c187e5e2c2b031206497091bff6a89a87e286e
OUT=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-115-57c187e-result.txt
LOG=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-115-57c187e-watch.log
{
  echo "START $(date -Iseconds) tip=$TIP run=$RUN"
  gh run watch "$RUN" --repo "$REPO" || true
  CONC=$(gh run view "$RUN" --repo "$REPO" --json conclusion -q .conclusion 2>/dev/null || echo unknown)
  OID=$(gh pr view 115 --repo "$REPO" --json headRefOid -q .headRefOid)
  JOBS=$(gh run view "$RUN" --repo "$REPO" --json jobs -q '[.jobs[]|{name,status,conclusion}]')
  echo "DONE tip_expected=$TIP tip_now=$OID gate=$CONC $(date -Iseconds)" | tee "$OUT"
  echo "JOBS $JOBS" | tee -a "$OUT"
} 2>&1 | tee -a "$LOG"
