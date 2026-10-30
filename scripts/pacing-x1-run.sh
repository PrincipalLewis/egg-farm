#!/usr/bin/env bash
# pacing-x1-stack: full local run on ONE commit, recorded for the RC gate (HoE 10:52 ruling; HoQA QA-D-1030-X1-TREE).
# Usage: scripts/pacing-x1-run.sh <target-ref-or-sha> <results-dir> [--seeds 1-200] [--sequential] [--ac7-from <commit>:<path>]   (X1_STUDIO=studio root)
#   e.g. scripts/pacing-x1-run.sh ci/v5-pacing-x1-stack /workspace/egg-farm-studio/artifacts/pacing-x1-stack/results
# Long-running (~35 min at 3 parallel shards): start it with ops/tools/lane-run.sh <lane> -- (studio rule 21).
# What it enforces and records (results-dir, then SHA256SUMS over every file, rule 19):
#  (1) trees.txt: tested SHA + `git rev-parse <sha>^{tree}`, time, and empty RC slots; scripts/pacing-x1-trees-check.sh
#      fills the RC SHA/tree after the squash and prints MATCH / MISMATCH.
#  (2) a FRESH dedicated worktree at the SHA (never an existing checkout); `git status --porcelain --untracked-files=all`
#      must be empty before and after the run (porcelain-*.txt); otherwise it refuses / marks the run not-RC.
#  (3) shipped CSV = <tree>/data/economy.csv, sha256 recorded; every X1 shard must have measured exactly that CSV;
#      row 904 = AC7's 2x active/idle gate PASSES on <tree>/data/economy.csv via --csv, CSV-RECORD captured (HoE 11:51);
#      --csv is checked statically and by the gate's header + CSV-RECORD; otherwise row 904 FAILS loudly (see the AC7 block).
#  (4) harness/sim/config are the tree's (worktree at the SHA); everything from outside the tree is hashed in
#      outside-tree.txt (this script if it differs from the tree's copy, node, npm, node_modules lock, python3, the AC7
#      script and product/sim/m4/m4_active.py).
#  (5) SHA256SUMS over results-dir; `sha256sum -c SHA256SUMS` is run and must pass.
# Any failed condition writes rc-gate.txt = "not RC gate, re-run on RC SHA". The trees check can only downgrade it.
set -uo pipefail
REF=${1:?usage: pacing-x1-run.sh <ref|sha> <results-dir> [--seeds a-b]}; OUT=${2:?results-dir required}; shift 2
SEEDS=1-200; SEQ=0; AC7_FROM=
while [ $# -gt 0 ]; do case "$1" in --seeds) SEEDS=${2:?}; shift 2;; --sequential) SEQ=1; shift;; --ac7-from) AC7_FROM=${2:?}; shift 2;; *) echo "unknown arg $1" >&2; exit 2;; esac; done
STUDIO=${X1_STUDIO:-/workspace/egg-farm-studio}
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
# (3) + row 904 (HoE 11:51): AC7's 2x active/idle gate PASSES on the tree's data/economy.csv, with its CSV-RECORD line
# captured in results/ (ac7-csv-record.txt). Not a byte-identity check against c7bb783f.
# Source (job input): default = the tree's qa/m3-scripts/ac7-active-idle-gate.py if the tree has one, else the studio's
# ($STUDIO/qa/m3-scripts/...). Fallback = --ac7-from <commit>:<path> (an Econ PR head in this repo; fetch it first): the script
# is taken with `git show` and recorded with its commit. The gate imports m4_active.py from the studio path; with --ac7-from,
# the commit's product/sim/m4/m4_active.py (if it has one) is fetched too and compared: a differing copy is a MISMATCH and
# row 904 FAILS (the gate ran the studio copy, not the PR's). Without one it is recorded as studio-sourced.
# --csv support is checked, never assumed: (a) static, the script must parse --csv (argparse / '--csv' in argv list / .index);
# (b) for real, the gate's header must name the CSV passed in AND its CSV-RECORD line must carry that realpath and the shipped
# sha256. A script that only reads argv[1] fails (a) and is NOT run; row 904 FAILS loudly. Results: ac7.json (read by the
# verdict, --require-ac7), ac7.log (stdout+stderr), ac7-csv-record.txt.
AC7_COMMIT=""; AC7_PATH=""; SIM_COMMIT_SHA=""; SIM_MATCH="n/a"; AC7_SIM=$STUDIO/product/sim/m4/m4_active.py; SIM_SRC=studio
if [ -n "$AC7_FROM" ]; then
  AC7_COMMIT=${AC7_FROM%%:*}; AC7_PATH=${AC7_FROM#*:}; AC7_SRC="econ-pr"; mkdir -p "$OUT/ac7-src"
  AC7_COMMIT=$(git -C "$REPO" rev-parse --verify --quiet "$AC7_COMMIT^{commit}") || fail "--ac7-from commit ${AC7_FROM%%:*} not in this repo (fetch the Econ PR head first)"
  AC7="$OUT/ac7-src/$(basename "$AC7_PATH")"; git -C "$REPO" show "$AC7_COMMIT:$AC7_PATH" > "$AC7" 2>/dev/null || fail "--ac7-from: $AC7_PATH not in $AC7_COMMIT"
  if [ -n "$AC7_COMMIT" ] && git -C "$REPO" cat-file -e "$AC7_COMMIT:product/sim/m4/m4_active.py" 2>/dev/null; then
    git -C "$REPO" show "$AC7_COMMIT:product/sim/m4/m4_active.py" > "$OUT/ac7-src/m4_active.py"
    SIM_COMMIT_SHA=$(sha256sum < "$OUT/ac7-src/m4_active.py" | cut -d' ' -f1)
    echo "$SIM_COMMIT_SHA  $OUT/ac7-src/m4_active.py (AC7 sim module, commit $AC7_COMMIT path product/sim/m4/m4_active.py)" >> "$OUT/outside-tree.txt"
    if [ -s "$AC7_SIM" ] && [ "$(sha256sum < "$AC7_SIM" | cut -d' ' -f1)" = "$SIM_COMMIT_SHA" ]; then SIM_MATCH=MATCH; else SIM_MATCH=MISMATCH; fi
  else SIM_MATCH="not-in-commit"; fi
elif [ -f "qa/m3-scripts/ac7-active-idle-gate.py" ]; then AC7="$WT/qa/m3-scripts/ac7-active-idle-gate.py"; AC7_SRC="tree"
else AC7="$STUDIO/qa/m3-scripts/ac7-active-idle-gate.py"; AC7_SRC="studio"; fi
if [ -s "$AC7" ]; then echo "$(sha256sum < "$AC7" | cut -d' ' -f1)  $AC7 (AC7 script, row 904, source $AC7_SRC${AC7_COMMIT:+ commit $AC7_COMMIT path $AC7_PATH})" >> "$OUT/outside-tree.txt"; else fail "AC7 script missing: $AC7"; fi
SIM_SHA=$( [ -s "$AC7_SIM" ] && sha256sum < "$AC7_SIM" | cut -d' ' -f1)
if [ -n "$SIM_SHA" ]; then echo "$SIM_SHA  $AC7_SIM (AC7 sim module as imported, studio-sourced${AC7_COMMIT:+; vs commit $AC7_COMMIT copy: $SIM_MATCH})" >> "$OUT/outside-tree.txt"; else fail "AC7 input missing: $AC7_SIM"; fi
[ "$SIM_MATCH" = MISMATCH ] && fail "row 904 AC7: m4_active.py MISMATCH: studio $SIM_SHA != commit $AC7_COMMIT copy $SIM_COMMIT_SHA (the gate imports the studio copy)"
echo "$(sha256sum < "$(readlink -f "$(command -v python3)")" | cut -d' ' -f1)  python3 $(python3 -V 2>&1 | cut -d' ' -f2) $(readlink -f "$(command -v python3)")" >> "$OUT/outside-tree.txt"
CSVABS=$(readlink -f "$WT/$SHIP"); AC7_RC=null; AC7_ST=FAIL; AC7_WHY=""; AC7_NAMED=false; AC7_REC=""; AC7_REC_OK=false; AC7_RES=""
if [ ! -s "$AC7" ]; then AC7_WHY="AC7 script missing ($AC7_SRC)"; echo "$AC7_WHY" > "$OUT/ac7.log"
elif ! grep -Eq "add_argument\(\s*['\"]--csv['\"]|['\"]--csv['\"]\s+in\s+[A-Za-z_.]+|\.index\(\s*['\"]--csv['\"]" "$AC7"; then
  AC7_WHY="--csv NOT SUPPORTED by $AC7 ($AC7_SRC): it does not parse --csv (argv[1]-only would silently use its built-in CSV). Not run. Dependency: Econ's --csv PR, or pass --ac7-from <commit>:<path>"
  echo "DEPENDENCY MISSING: $AC7_WHY" > "$OUT/ac7.log"
else
  log "AC7 (row 904): python3 $AC7 30 --csv $CSVABS"
  python3 "$AC7" 30 --csv "$CSVABS" > "$OUT/ac7.log" 2>&1; AC7_RC=$?
  AC7_RES=$(grep -m1 '^RESULT:' "$OUT/ac7.log" || true); AC7_REC=$(grep -m1 '^CSV-RECORD ' "$OUT/ac7.log" || true)
  printf '%s\n' "${AC7_REC:-NO CSV-RECORD LINE in ac7.log}" > "$OUT/ac7-csv-record.txt"
  grep -qF "CSV $CSVABS |" "$OUT/ac7.log" && AC7_NAMED=true
  [ "$AC7_REC" = "CSV-RECORD path=$CSVABS sha256=$SHIP_SHA" ] && AC7_REC_OK=true
  if [ "$AC7_NAMED" != true ]; then AC7_WHY="AC7 header does not name the CSV passed in ($CSVABS): --csv not honoured"
  elif [ "$AC7_REC_OK" != true ]; then AC7_WHY="CSV-RECORD missing or wrong: got '${AC7_REC:-none}', want 'CSV-RECORD path=$CSVABS sha256=$SHIP_SHA'"
  elif [ "$AC7_RC" != 0 ]; then AC7_WHY="AC7 exit $AC7_RC: ${AC7_RES:-no RESULT line}"
  elif [ "$SIM_MATCH" = MISMATCH ]; then AC7_WHY="m4_active.py MISMATCH vs commit $AC7_COMMIT"
  else AC7_ST=PASS; fi
fi
[ "$AC7_ST" = PASS ] && log "AC7 PASS ($AC7_RES; $AC7_REC)" || fail "row 904 AC7: $AC7_WHY"
AC7J_STATUS=$AC7_ST AC7J_WHY=$AC7_WHY AC7J_SOURCE=$AC7_SRC AC7J_SCRIPT=$AC7 AC7J_SCRIPTSHA=$( [ -s "$AC7" ] && sha256sum < "$AC7" | cut -d' ' -f1) AC7J_COMMIT=$AC7_COMMIT \
AC7J_CSV=$SHIP AC7J_CSVSHA=$SHIP_SHA AC7J_NAMED=$AC7_NAMED AC7J_REC=$AC7_REC AC7J_RECOK=$AC7_REC_OK AC7J_RC=$AC7_RC AC7J_RES=$AC7_RES \
AC7J_SIM=$AC7_SIM AC7J_SIMSHA=$SIM_SHA AC7J_SIMSRC=$SIM_SRC AC7J_SIMMATCH=$SIM_MATCH AC7J_SIMCSHA=$SIM_COMMIT_SHA node -e '
const e=process.env, u=v=>v||undefined; const j={status:e.AC7J_STATUS, why:e.AC7J_WHY, source:e.AC7J_SOURCE, script:e.AC7J_SCRIPT, scriptSha256:e.AC7J_SCRIPTSHA,
 commit:u(e.AC7J_COMMIT), csv:e.AC7J_CSV, csvSha256:e.AC7J_CSVSHA, csvNamed:e.AC7J_NAMED==="true", csvRecord:u(e.AC7J_REC), csvRecordOk:e.AC7J_RECOK==="true",
 exitCode:e.AC7J_RC==="null"?null:+e.AC7J_RC, result:u(e.AC7J_RES),
 sim:{path:e.AC7J_SIM, sha256:e.AC7J_SIMSHA, source:e.AC7J_SIMSRC, commit:u(e.AC7J_COMMIT), commitSha256:u(e.AC7J_SIMCSHA), match:e.AC7J_SIMMATCH}};
require("fs").writeFileSync(process.argv[1]+"/ac7.json", JSON.stringify(j,null,1)+"\n")' "$OUT"
# the X1 job itself, exactly as CI runs it
log "X1 shards (optimal / seller15 / casual in parallel), seeds $SEEDS"
if [ "$SEQ" = 1 ]; then for p in optimal seller15 casual; do log "shard $p (sequential)"; npx vite-node scripts/pacing-x1-stack.ts -- shard --profile "$p" --seeds "$SEEDS" --out "$OUT" > "$OUT/shard-$p.log" 2>&1 || fail "shard $p exited non-zero"; done
else pids=(); for p in optimal seller15 casual; do npx vite-node scripts/pacing-x1-stack.ts -- shard --profile "$p" --seeds "$SEEDS" --out "$OUT" > "$OUT/shard-$p.log" 2>&1 & pids+=($!); done
  for pid in "${pids[@]}"; do wait "$pid" || fail "a shard exited non-zero (see shard-*.log)"; done; fi
npx vite-node scripts/pacing-x1-stack.ts -- verdict --in "$OUT" --out "$OUT" --require-ac7 > "$OUT/verdict.log" 2>&1; VRC=$?
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
( cd "$OUT" && find . -type f ! -path ./SHA256SUMS -printf '%P\n' | sort | xargs sha256sum > SHA256SUMS && sha256sum -c --quiet SHA256SUMS ) || { echo "SHA256SUMS failed" >&2; exit 1; }
[ ${#FAILS[@]} -eq 0 ]
