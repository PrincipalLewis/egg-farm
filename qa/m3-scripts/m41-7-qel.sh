#!/bin/bash
# QA M41-7 QE-LATE-e §7 unit part (method = qa/m41/qe-late-e-1682a0c.md, as run on dfdf49c in qa/m41/m41-7-dfdf49c/gates/qel/):
#   gate4-explainer.qa.test.ts (must match 1682a0c: 17/17), qel7-save-bytes.qa.test.ts, oq2-offline-grant-once.qa.test.ts (OQ-2 credited once), QEL-8 rg.
#   The QEL-12/13 Chromium gate = `m41-7-delta.sh <sha> qel` (qe-late-browser.mjs on :5961). Run AFTER m41-7-local-gates.sh (same worktree; QA files removed after).
# usage: bash qa/m3-scripts/m41-7-qel.sh <full-sha>    DRY=1 = preflight only. vitest max 2 workers. Never pushes/merges/tags.
set -u
SHA=${1:?full sha}; DRY=${DRY:-0}; R=/workspace/egg-farm-studio; G=$R/game; SC=$R/qa/m3-scripts
FULL=$(git -C $G rev-parse --verify "$SHA^{commit}") || exit 1; S7=${FULL:0:7}; W=$R/qa/wt-m41-7-$S7; E=$R/qa/m41/m41-7-$S7/gates/qel; mkdir -p $E
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $E/summary.txt; }
QT="gate4-explainer.qa.test.ts qel7-save-bytes.qa.test.ts oq2-offline-grant-once.qa.test.ts"
log "=== QE-LATE-e §7 unit on $FULL"; for f in $QT; do [ -f $SC/$f ] && log "have $f $(sha256sum $SC/$f | cut -c1-16)" || log "MISSING $f"; done
[ "$DRY" = 1 ] && { log "DRY plan: worktree $W (needs node_modules from m41-7-local-gates.sh); copy $QT into tests/; vitest; rg QEL-8; remove; porcelain 0"; exit 0; }
cd $W || { log "no worktree $W: run m41-7-local-gates.sh first"; exit 1; }; [ "$(git rev-parse HEAD)" = "$FULL" ] || { log "HEAD mismatch"; exit 1; }
for f in $QT; do cp $SC/$f tests/; done; sha256sum $(for f in $QT; do echo tests/$f; done) > $E/qa-tests-sha256.txt; git status --porcelain > $E/porcelain-with-qa-files.txt
timeout 600 npx vitest run --maxWorkers=2 --minWorkers=1 tests/gate4-explainer.qa.test.ts > $E/gate4-explainer.log 2>&1; log "gate4-explainer exit=$? $(rg 'Tests ' $E/gate4-explainer.log | tail -1) (want 17/17 as 1682a0c)"
timeout 600 npx vitest run --maxWorkers=2 --minWorkers=1 tests/qel7-save-bytes.qa.test.ts > $E/qel7.log 2>&1; log "qel7-save-bytes exit=$? $(rg 'Tests ' $E/qel7.log | tail -1)"
timeout 600 npx vitest run --maxWorkers=2 --minWorkers=1 tests/oq2-offline-grant-once.qa.test.ts > $E/oq2-offline-grant.log 2>&1; log "oq2-offline-grant-once exit=$? $(rg 'Tests ' $E/oq2-offline-grant.log | tail -1) (OQ-2 credited once)"
rg -n 'seenTracksExplainer: true|mirrorOnFail' src/ui/tracks-explainer.ts src/game.ts > $E/qel8-rg.txt; log "QEL-8 rg: $(wc -l < $E/qel8-rg.txt) lines (see qel8-rg.txt; compare with m41-7-dfdf49c/gates/qel/qel8-rg.txt)"
for f in $QT; do rm -f tests/$f; done; log "porcelain after: $(git status --porcelain | wc -l) (want 0)"; log QEL_UNIT_DONE
