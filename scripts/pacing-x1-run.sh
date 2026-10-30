#!/usr/bin/env bash
# pacing-x1-stack: full local run on ONE commit, recorded for the RC gate (HoE 10:52 ruling; HoQA QA-D-1030-X1-TREE).
# Usage: scripts/pacing-x1-run.sh <target-ref-or-sha> <results-dir> [--seeds 1-200]
#   e.g. scripts/pacing-x1-run.sh ci/v5-pacing-x1-stack /workspace/egg-farm-studio/artifacts/pacing-x1-stack/results
# Long-running (~35 min at 3 parallel shards): start it with ops/tools/lane-run.sh <lane> -- (studio rule 21).
# What it enforces and records (results-dir, then SHA256SUMS over every file, rule 19):
#  (1) trees.txt: tested SHA + `git rev-parse <sha>^{tree}`, time, and empty RC slots; scripts/pacing-x1-trees-check.sh
#      fills the RC SHA/tree after the squash and prints MATCH / MISMATCH.
#  (2) a FRESH dedicated worktree at the SHA (never an existing checkout); `git status --porcelain --untracked-files=all`
#      must be empty before and after the run (porcelain-*.txt); otherwise it refuses / marks the run not-RC.
#  (3) shipped CSV = <tree>/data/economy.csv, sha256 recorded; the X1 data source must be that same CSV for an RC run;
#      AC7 runs as `npm run ac7 -- --csv data/economy.csv` from the tree. No fallback: if the tree has no AC7 `--csv`
#      entry point (Econ's PR), the AC7 step FAILS loudly and the run is not-RC.
#  (4) harness/sim/config are the tree's (worktree at the SHA); everything from outside the tree is hashed in
#      outside-tree.txt (this script if it differs from the tree's copy, node binary, npm, node_modules lock).
#  (5) SHA256SUMS over results-dir; `sha256sum -c SHA256SUMS` is run and must pass.
# Any failed condition writes rc-gate.txt = "not RC gate, re-run on RC SHA". The trees check can only downgrade it.
set -uo pipefail
REF=${1:?usage: pacing-x1-run.sh <ref|sha> <results-dir> [--seeds a-b]}; OUT=${2:?results-dir required}; shift 2
SEEDS=1-200; [ "${1:-}" = "--seeds" ] && SEEDS=${2:?}
SELF=$(readlink -f "$0"); REPO=$(git -C "$(dirname "$SELF")" rev-parse --show-toplevel) || exit 2
SHA=$(git -C "$REPO" rev-parse --verify --quiet "$REF^{commit}") || { echo "REFUSED: unknown ref $REF" >&2; exit 2; }
TREE=$(git -C "$REPO" rev-parse "$SHA^{tree}")
if [ -e "$OUT" ] && [ -n "$(ls -A "$OUT" 2>/dev/null)" ]; then echo "REFUSED: $OUT exists and is not empty (never mix runs)" >&2; exit 2; fi
mkdir -p "$OUT" && OUT=$(readlink -f "$OUT")
WT=$(mktemp -d "${TMPDIR:-/tmp}/x1-wt-${SHA:0:12}-XXXX")/wt
cleanup() { git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1; rmdir "$(dirname "$WT")" 2>/dev/null; }
trap cleanup EXIT
FAILS=()
fail() { FAILS+=("$1"); echo "CONDITION FAIL: $1" | tee -a "$OUT/run.log" >&2; }
log() { echo "[$(date -Is)] $*" | tee -a "$OUT/run.log"; }
log "pacing-x1-stack run: ref $REF sha $SHA tree $TREE seeds $SEEDS results $OUT"
{ echo "tested_ref=$REF"; echo "tested_sha=$SHA"; echo "tested_tree=$TREE"; echo "tested_at=$(date -Is)";
  echo "rc_sha="; echo "rc_tree="; echo "rc_checked_at="; } > "$OUT/trees.txt"   # (1) RC slots filled by pacing-x1-trees-check.sh
# (2) fresh, dedicated worktree at the SHA
git -C "$REPO" worktree add --detach "$WT" "$SHA" >> "$OUT/run.log" 2>&1 || { echo "REFUSED: worktree add failed" >&2; exit 2; }
cd "$WT" || exit 2
[ "$(git rev-parse HEAD)" = "$SHA" ] || { echo "REFUSED: worktree HEAD != $SHA" >&2; exit 2; }
git status --porcelain --untracked-files=all > "$OUT/porcelain-before.txt"
if [ -s "$OUT/porcelain-before.txt" ]; then echo "REFUSED: fresh checkout is dirty (porcelain-before.txt)" >&2; exit 2; fi
log "npm ci (from the tree's package-lock.json)"
npm ci --no-audit --no-fund >> "$OUT/run.log" 2>&1 || { fail "npm ci failed"; }
git status --porcelain --untracked-files=all > "$OUT/porcelain-after-install.txt"; [ -s "$OUT/porcelain-after-install.txt" ] && fail "tree dirty after npm ci (porcelain-after-install.txt)"
# (4) inputs from outside the tree, hashed
{ echo "# sha256 of every run input that does not come from the tested tree $TREE"
  if [ "$(git show "$SHA:scripts/pacing-x1-run.sh" 2>/dev/null | sha256sum | cut -d' ' -f1)" = "$(sha256sum < "$SELF" | cut -d' ' -f1)" ]; then echo "run-script equals tree copy scripts/pacing-x1-run.sh"; else echo "$(sha256sum < "$SELF" | cut -d' ' -f1)  run-script (NOT the tree copy) $SELF"; fi
  echo "$(sha256sum < "$(command -v node)" | cut -d' ' -f1)  node $(node -v) $(command -v node)"
  echo "$(sha256sum < "$(readlink -f "$(command -v npm)")" | cut -d' ' -f1)  npm $(npm -v) $(readlink -f "$(command -v npm)")"
  echo "$(sha256sum < node_modules/.package-lock.json | cut -d' ' -f1)  node_modules/.package-lock.json (installed set; from the tree's package-lock.json $(sha256sum < package-lock.json | cut -c1-16))"
} > "$OUT/outside-tree.txt"
# (3) shipped CSV from the tree
SHIP=data/economy.csv
[ -f "$SHIP" ] || fail "shipped CSV $SHIP missing from the tree"
SHIP_SHA=$(sha256sum < "$SHIP" | cut -d' ' -f1); echo "$SHIP_SHA  $SHIP (tree $TREE, blob $(git rev-parse "$SHA:$SHIP"))" > "$OUT/shipped-csv.txt"
X1_KEY=$(sed -n "s/^export const X1_DATA: X1SourceKey = '\(.*\)';/\1/p" tests/pacing-x1/source.ts)
log "X1_DATA=$X1_KEY shipped CSV $SHIP_SHA"
# (3) AC7 with --csv from the tree; no fallback to any hard-coded CSV
if node -e "process.exit(require('./package.json').scripts?.ac7 ? 0 : 1)"; then
  log "AC7: npm run ac7 -- --csv $SHIP"
  if npm run ac7 -- --csv "$SHIP" > "$OUT/ac7.log" 2>&1; then log "AC7 PASS"; else fail "AC7 (--csv $SHIP) failed: ac7.log"; fi
  grep -q -- "$SHIP_SHA" "$OUT/ac7.log" || fail "AC7 log does not show the shipped CSV sha256 $SHIP_SHA (did it read --csv?)"
else
  echo "DEPENDENCY MISSING: the tree has no 'ac7' npm script taking --csv (Econ's AC7 --csv PR). No fallback to a hard-coded CSV." > "$OUT/ac7.log"
  fail "AC7 --csv entry point missing on the tip (Econ PR dependency)"
fi
# the X1 job itself, exactly as CI runs it
log "X1 shards (optimal / seller15 / casual in parallel), seeds $SEEDS"
pids=(); for p in optimal seller15 casual; do npx vite-node scripts/pacing-x1-stack.ts -- shard --profile "$p" --seeds "$SEEDS" --out "$OUT" > "$OUT/shard-$p.log" 2>&1 & pids+=($!); done
for pid in "${pids[@]}"; do wait "$pid" || fail "a shard exited non-zero (see shard-*.log)"; done
npx vite-node scripts/pacing-x1-stack.ts -- verdict --in "$OUT" --out "$OUT" > "$OUT/verdict.log" 2>&1; VRC=$?
log "X1 verdict exit $VRC: $(head -1 "$OUT/summary.md" 2>/dev/null)"
[ "$VRC" = 0 ] || fail "X1 verdict FAIL (summary.md)"
MEAS=$(node -e "const fs=require('fs');const s=new Set(fs.readdirSync(process.argv[1]).filter(f=>/^shard-.*\.json$/.test(f)).map(f=>JSON.parse(fs.readFileSync(process.argv[1]+'/'+f)).csvSha256));console.log([...s].join(','))" "$OUT")
[ "$MEAS" = "$SHIP_SHA" ] || fail "X1 measured CSV $MEAS != shipped CSV $SHIP_SHA (X1_DATA=$X1_KEY)"
node -e "const fs=require('fs');for(const f of fs.readdirSync(process.argv[1]).filter(f=>/^shard-.*\.json$/.test(f))){const s=JSON.parse(fs.readFileSync(process.argv[1]+'/'+f));if(s.head!==process.argv[2]||s.dirty)process.exit(1)}" "$OUT" "$SHA" || fail "a shard ran on a different or dirty HEAD"
git status --porcelain --untracked-files=all > "$OUT/porcelain-after.txt"; [ -s "$OUT/porcelain-after.txt" ] && fail "tree dirty after the run (porcelain-after.txt)"
{ echo "tested_sha=$SHA"; echo "conditions_failed=${#FAILS[@]}"; for f in "${FAILS[@]}"; do echo "fail: $f"; done; } > "$OUT/conditions.txt"
if [ ${#FAILS[@]} -eq 0 ]; then echo "pending trees check: run scripts/pacing-x1-trees-check.sh $OUT <rc-sha> after the squash" > "$OUT/rc-gate.txt"
else echo "not RC gate, re-run on RC SHA (${#FAILS[@]} condition(s) failed: conditions.txt)" > "$OUT/rc-gate.txt"; fi
log "rc-gate: $(cat "$OUT/rc-gate.txt")"
# (5) rule 19 manifest
( cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -printf '%f\n' | sort | xargs sha256sum > SHA256SUMS && sha256sum -c --quiet SHA256SUMS ) || { echo "SHA256SUMS failed" >&2; exit 1; }
[ ${#FAILS[@]} -eq 0 ]
