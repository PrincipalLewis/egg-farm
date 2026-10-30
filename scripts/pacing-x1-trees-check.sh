#!/usr/bin/env bash
# pacing-x1-stack RC check (HoQA QA-D-1030-X1-TREE condition 1): does the tree X1 ran on equal the squashed RC tree?
# Usage: scripts/pacing-x1-trees-check.sh <results-dir> <rc-sha>   (run after the squash into rc/v5)
# Fills the rc_sha / rc_tree slots in trees.txt, prints MATCH or MISMATCH, rewrites rc-gate.txt, re-hashes SHA256SUMS.
# rc-gate.txt says "RC gate: yes" only when the trees MATCH and the run recorded zero failed conditions; otherwise
# "not RC gate, re-run on RC SHA". Exit 0 only for an RC gate.
set -uo pipefail
OUT=${1:?usage: pacing-x1-trees-check.sh <results-dir> <rc-sha>}; RC=${2:?rc sha required}
REPO=$(git -C "$(dirname "$(readlink -f "$0")")" rev-parse --show-toplevel) || exit 2; cd "$OUT" || exit 2
sha256sum -c --quiet SHA256SUMS || { echo "SHA256SUMS does not verify: results changed since the run" >&2; exit 2; }
T_TREE=$(sed -n 's/^tested_tree=//p' trees.txt); T_SHA=$(sed -n 's/^tested_sha=//p' trees.txt)
RC_SHA=$(git -C "$REPO" rev-parse --verify --quiet "$RC^{commit}") || { echo "unknown rc ref $RC" >&2; exit 2; }
RC_TREE=$(git -C "$REPO" rev-parse "$RC_SHA^{tree}")
sed -i -e "s/^rc_sha=.*/rc_sha=$RC_SHA/" -e "s/^rc_tree=.*/rc_tree=$RC_TREE/" -e "s/^rc_checked_at=.*/rc_checked_at=$(date -Is)/" trees.txt
NF=$(sed -n 's/^conditions_failed=//p' conditions.txt 2>/dev/null); NF=${NF:-missing}
if [ -n "$T_TREE" ] && [ "$T_TREE" = "$RC_TREE" ]; then M=MATCH; else M=MISMATCH; fi
echo "$M tested $T_SHA tree $T_TREE | rc $RC_SHA tree $RC_TREE"
if [ "$M" = MATCH ] && [ "$NF" = 0 ]; then echo "RC gate: yes (tested $T_SHA tree == rc $RC_SHA tree $RC_TREE)" > rc-gate.txt; R=0
else echo "not RC gate, re-run on RC SHA $RC_SHA ($M; conditions failed: $NF): scripts/pacing-x1-run.sh $RC_SHA <fresh results-dir>" > rc-gate.txt; R=1; fi
cat rc-gate.txt
find . -type f ! -path ./SHA256SUMS -printf '%P\n' | sort | xargs sha256sum > SHA256SUMS && sha256sum -c --quiet SHA256SUMS || exit 2
exit $R
