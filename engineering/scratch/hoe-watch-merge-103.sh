#!/usr/bin/env bash
set -euo pipefail
REPO=PrincipalLewis/egg-farm
RUN=42111018380
TIP=daee4c1aa5bc2d179f2edf70da761f0b4585c812
OUT=/workspace/egg-farm-studio/engineering/scratch/hoe-merge-103-result.txt
LOG=/workspace/egg-farm-studio/engineering/scratch/hoe-merge-103-watch.log
{
  echo "START $(date -Iseconds) tip=$TIP run=$RUN"
  if ! gh run watch "$RUN" --repo "$REPO" --exit-status; then
    CONC=$(gh run view "$RUN" --repo "$REPO" --json conclusion -q .conclusion 2>/dev/null || echo unknown)
    echo "GATE_FAIL conclusion=$CONC" | tee "$OUT"
    exit 1
  fi
  OID=$(gh pr view 103 --repo "$REPO" --json headRefOid -q .headRefOid)
  if [ "$OID" != "$TIP" ]; then
    echo "TIP_CHANGED got=$OID expected=$TIP" | tee "$OUT"
    exit 1
  fi
  CONC=$(gh run view "$RUN" --repo "$REPO" --json conclusion -q .conclusion)
  if [ "$CONC" != "success" ]; then
    echo "GATE_$CONC tip=$OID" | tee "$OUT"
    exit 1
  fi
  # required gate green + tip match → MERGE-WITH-NOTES (HoQA 2026-11-05)
  gh pr merge 103 --repo "$REPO" --merge --match-head-commit "$TIP"
  MERGED=$(gh pr view 103 --repo "$REPO" --json state,mergedAt,mergeCommit -q '"\(.state) \(.mergedAt) \(.mergeCommit.oid)"')
  echo "MERGED $MERGED tip=$TIP $(date -Iseconds)" | tee "$OUT"
} 2>&1 | tee -a "$LOG"
