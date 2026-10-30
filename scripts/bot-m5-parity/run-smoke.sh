#!/usr/bin/env bash
# bot-m5 B smoke parity at one SHA (QA-D-1030-B94): regenerates the Econ-original references AND the port outputs at the same SHA,
# in two fresh detached worktrees, then compares full files. Never reuses earlier references (OUTROOT must not exist).
# Records results/tree-{ref,port}.txt: balance.json sha256 + m4.enabled/m4.flags + CSV sha256 (QA-D-1030-SHIPFLAGS), in SHA256SUMS.
# Usage: run-smoke.sh <head-sha> <outroot>   env: SEEDS (default 20; pool2/pool2b only at 200), JOBS (all | pool2 = 12 px + pools, SEEDS=200 only), NODE_MODULES (default: this checkout's).
# Start it on the box only via ops/tools/lane-run.sh <lane> -- ... (rule 21). Exit 0 only on PASS.
set -euo pipefail
SHA=$1 R=$2; export SEEDS=${SEEDS:-20} JOBS=${JOBS:-all}
case "$JOBS" in all) ;; pool2) [ "$SEEDS" = 200 ] || { echo "run-smoke: JOBS=pool2 needs SEEDS=200 (got $SEEDS)" >&2; exit 1; } ;; *) echo "run-smoke: unknown JOBS=$JOBS" >&2; exit 1 ;; esac
D=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$D/../.." && pwd); NM=${NODE_MODULES:-$REPO/node_modules}
[ ! -e "$R" ] || { echo "run-smoke: $R exists; references are never reused" >&2; exit 1; }
[ -d "$NM/vite-node" ] || { echo "run-smoke: no vite-node under $NM" >&2; exit 1; }
(cd "$D" && sha256sum --quiet -c MANIFEST.sha256) || { echo "run-smoke: MANIFEST.sha256 check failed" >&2; exit 1; }
FULL=$(git -C "$REPO" rev-parse --verify "$SHA^{commit}"); mkdir -p "$R"; R=$(cd "$R" && pwd)
mkdir -p "$R/harness"; cp -p "$D"/*.sh "$D"/*.py "$D/MANIFEST.sha256" "$R/harness/"
for s in ref port; do git -C "$REPO" worktree add -q --detach "$R/wt-$s" "$FULL"; ln -s "$NM" "$R/wt-$s/node_modules"; done
echo "$(date +%T) run-smoke head=$FULL SEEDS=$SEEDS JOBS=$JOBS" > "$R/run.log"
rr=0 rp=0
bash "$D/ref.sh" "$FULL" "$R/wt-ref" "$R/ref" > "$R/ref.stdout" 2>&1 & a=$!
bash "$D/smoke.sh" "$FULL" "$R/wt-port" "$R/out" > "$R/port.stdout" 2>&1 & b=$!
wait "$a" || rr=$?; wait "$b" || rp=$?
echo "$(date +%T) ref.sh rc=$rr smoke.sh rc=$rp" >> "$R/run.log"
[ "$rr" = 0 ] && [ "$rp" = 0 ] || { echo "run-smoke: FAIL (ref.sh rc=$rr, smoke.sh rc=$rp); see $R/run.log" >&2; exit 1; }
# QA-D-1030-SHIPFLAGS: both sides must have recorded the same balance.json sha256, m4 flags and CSV (same SHA, so must match).
for s in ref port; do [ -s "$R/results/tree-$s.txt" ] || { echo "run-smoke: FAIL no results/tree-$s.txt" >&2; exit 1; }; done
diff <(sed 1d "$R/results/tree-ref.txt") <(sed 1d "$R/results/tree-port.txt") > "$R/results/tree-diff.txt" || { echo "run-smoke: FAIL ref/port trees differ (results/tree-diff.txt)" >&2; exit 1; }
grep -q "^head $FULL\$" "$R/results/tree-port.txt" || { echo "run-smoke: FAIL tree head != $FULL" >&2; exit 1; }
cat "$R/results/tree-port.txt" >> "$R/run.log"
rc=0; python3 "$D/compare-smoke.py" "$R/ref" "$R/out" "$SEEDS" > "$R/compare.txt" || rc=$?
echo "$(date +%T) compare rc=$rc" >> "$R/run.log"; tail -1 "$R/compare.txt"
(cd "$R" && find . -path ./wt-ref -prune -o -path ./wt-port -prune -o -type f ! -name SHA256SUMS -print | LC_ALL=C sort | xargs sha256sum > SHA256SUMS)
exit "$rc"
