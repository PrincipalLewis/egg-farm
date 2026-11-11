#!/bin/bash
# M41-7 -07 test-integrity check (HoQA 22:1x, D-HOP-2026-10-22-07): tests/m4-exp1-explainer.test.ts must be BYTE-IDENTICAL to dfdf49c
# (`git diff dfdf49c..<sha> -- tests/m4-exp1-explainer.test.ts` empty) unless HoE explicitly justifies each changed line. HARD.
# Review (not gating by itself): tests/m41-6*, tests/m41-7-hop-rulings.test.ts, scripts/rc0-browser.mjs vs dfdf49c (and vs b986cd3 for context).
# usage: bash qa/m3-scripts/m41-7-testdiff.sh <full-sha> [outdir=qa/m41/m41-7-<sha7>/testdiff]   Read-only git; never checks out, pushes or writes the repo.
set -u
SHA=${1:?full sha}; R=/workspace/egg-farm-studio; G=$R/game; BASE=dfdf49cd904398c7e302eec16161f8fb63b10a8d; PREV=b986cd3b9c58c8278437d7e130de0e085348501c
FULL=$(git -C $G rev-parse --verify "$SHA^{commit}") || exit 2; S7=${FULL:0:7}; OUT=${2:-$R/qa/m41/m41-7-$S7/testdiff}; mkdir -p $OUT
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $OUT/summary.txt; }
F=tests/m4-exp1-explainer.test.ts
log "=== testdiff $FULL vs dfdf49c ($BASE)"
log "blob dfdf49c:$F $(git -C $G rev-parse $BASE:$F)  $S7:$F $(git -C $G rev-parse $FULL:$F 2>/dev/null || echo MISSING)"
git -C $G diff $BASE..$FULL -- $F > $OUT/m4-exp1.diff
# changed lines with line numbers (- = dfdf49c line, + = new line), for HoE to justify one by one
git -C $G diff -U0 $BASE..$FULL -- $F | awk '/^@@/{split($2,a,",");split($3,b,",");o=substr(a[1],2);n=substr(b[1],2);next} /^-/&&!/^---/{print "-" o++ ": " substr($0,2);next} /^\+/&&!/^\+\+\+/{print "+" n++ ": " substr($0,2)}' > $OUT/m4-exp1.changed-lines.txt
NCH=$(wc -l < $OUT/m4-exp1.changed-lines.txt)
if [ ! -s $OUT/m4-exp1.diff ]; then log "PASS -07 m4-exp1 byte-identical to dfdf49c (git diff empty)"; M4=0
else log "FAIL -07 m4-exp1 differs from dfdf49c: $(git -C $G diff --numstat $BASE..$FULL -- $F | awk '{print "+"$1" -"$2}') ($NCH changed lines, listed in m4-exp1.changed-lines.txt) -> needs HoE justification per line"; M4=1; fi
for f in 'tests/m41-6*' tests/m41-7-hop-rulings.test.ts scripts/rc0-browser.mjs; do n=$(echo "$f" | tr '/*' '__'); git -C $G diff $BASE..$FULL -- "$f" > $OUT/review-$n.vs-dfdf49c.diff; git -C $G diff $PREV..$FULL -- "$f" > $OUT/review-$n.vs-b986cd3.diff 2>/dev/null
  log "REVIEW $f vs dfdf49c: $(git -C $G diff --numstat $BASE..$FULL -- "$f" | awk '{printf "%s +%s -%s; ", $3, $1, $2}')(empty = unchanged) | vs b986cd3: $(git -C $G diff --numstat $PREV..$FULL -- "$f" 2>/dev/null | awk '{printf "%s +%s -%s; ", $3, $1, $2}')"; done
log "all tests/ + scripts/ files changed vs dfdf49c: $(git -C $G diff --name-only $BASE..$FULL -- tests scripts | tr '\n' ' ')"
log "TESTDIFF m4-exp1 $([ $M4 = 0 ] && echo IDENTICAL || echo "CHANGED $NCH lines")"; exit $M4
