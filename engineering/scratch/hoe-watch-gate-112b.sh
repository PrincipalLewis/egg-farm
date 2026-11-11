#!/usr/bin/env bash
set -euo pipefail
REPO=PrincipalLewis/egg-farm
RUN=42124942241
TIP=7a492e5fea47f9bb92ae2d07e82820c64471ec5a
OUT=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-112-result.txt
LOG=/workspace/egg-farm-studio/engineering/scratch/hoe-gate-112-watch.log
{
  echo "START $(date -Iseconds) tip=$TIP run=$RUN"
  gh run watch "$RUN" --repo "$REPO" || true
  CONC=$(gh run view "$RUN" --repo "$REPO" --json conclusion -q .conclusion 2>/dev/null || echo unknown)
  OID=$(gh pr view 112 --repo "$REPO" --json headRefOid -q .headRefOid)
  JOBS=$(gh run view "$RUN" --repo "$REPO" --json jobs -q '[.jobs[]|{name,status,conclusion}]')
  ROLLUP=$(gh pr view 112 --repo "$REPO" --json statusCheckRollup -q '[.statusCheckRollup[]?|{name,status,conclusion}]')
  echo "DONE tip_expected=$TIP tip_now=$OID gate=$CONC $(date -Iseconds)" | tee "$OUT"
  echo "JOBS $JOBS" | tee -a "$OUT"
  echo "ROLLUP $ROLLUP" | tee -a "$OUT"
} 2>&1 | tee -a "$LOG"
