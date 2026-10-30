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
#      row 904 = AC7's 2x active/idle gate (QA-D-1030-X1-TREE) PASSES on <tree>/data/economy.csv via --csv with its CSV-RECORD
#      sha256 == the shipped CSV (behavioural, scripts/pacing-x1-ac7.py); otherwise row 904 FAILS loudly (see the AC7 block).
#  (4) harness/sim/config are the tree's (worktree at the SHA); everything from outside the tree is hashed in
#      outside-tree.txt (this script if it differs from the tree's copy, node, npm, node_modules lock, python3, the AC7
#      script and product/sim/m4/m4_active.py).
#  (3b) QA-D-1030-SHIPFLAGS (HoE): the tree's src/config/balance.json: sha256, m4.enabled and every m4.flags value in balance.txt
#      (+ balance.json.record.json), a byte copy in inputs/src/config/balance.json (so SHA256SUMS has its own sha256 line), and every
#      shard's balanceSha256 must equal it. A bot-modelled src M5 flag ON (bot-m5 O-3 guard) fails a condition.
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
# R3 (QA-D-1030-PR93-1): --ac7-from must be <commit>:<path>, the commit must resolve in this repo and hold <path>. Anything else
# is a HARD STOP before any result is written; there is never a fallback to an index/staged/studio copy.
AC7_COMMIT=""; AC7_PATH=""
if [ -n "$AC7_FROM" ]; then
  [[ "$AC7_FROM" =~ ^([^:]+):(.+)$ ]] || { echo "REFUSED: --ac7-from '$AC7_FROM' is not <commit>:<path>" >&2; exit 2; }
  AC7_PATH=${BASH_REMATCH[2]}
  AC7_COMMIT=$(git -C "$REPO" rev-parse --verify --quiet "${BASH_REMATCH[1]}^{commit}") || { echo "REFUSED: --ac7-from commit ${BASH_REMATCH[1]} does not resolve in $REPO (hard stop; fetch the Econ PR head or run from a checkout that has it)" >&2; exit 2; }
  git -C "$REPO" cat-file -e "$AC7_COMMIT:$AC7_PATH" 2>/dev/null || { echo "REFUSED: --ac7-from: $AC7_PATH not in $AC7_COMMIT (hard stop)" >&2; exit 2; }
fi
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
# (3b) QA-D-1030-SHIPFLAGS: balance.json sha256 + m4 flags recorded (balance.txt, inputs/ copy covered by SHA256SUMS)
BAL=src/config/balance.json; BAL_SHA=$(sha256sum < "$BAL" | cut -d' ' -f1)
npx vite-node scripts/pacing-x1-stack.ts -- inputs --out "$OUT" > "$OUT/balance.log" 2>&1 || fail "balance.json record: bot-modelled src M5 flag ON or record failed (balance.log)"
[ "$(head -c 64 "$OUT/balance.txt" 2>/dev/null)" = "$BAL_SHA" ] || fail "balance.txt sha256 != tree $BAL $BAL_SHA"
[ "$(sha256sum < "$OUT/inputs/$BAL" 2>/dev/null | cut -d' ' -f1)" = "$BAL_SHA" ] || fail "inputs/$BAL copy != tree $BAL"
log "balance.json $BAL_SHA (blob $(git rev-parse "$SHA:$BAL")): $(sed -n 's/^summary: //p' "$OUT/balance.txt")"
X1_KEY=$(sed -n "s/^export const X1_DATA: X1SourceKey = '\(.*\)';/\1/p" tests/pacing-x1/source.ts)
log "X1_DATA=$X1_KEY shipped CSV $SHIP_SHA"
# (3) + row 904: AC7's 2x active/idle gate per QA-D-1030-X1-TREE (R6 of QA-D-1030-PR93-1; HoE 11:51) PASSES on the tree's
# data/economy.csv, with its CSV-RECORD line captured (ac7-csv-record.txt). Not a byte-identity check against c7bb783f.
# Source (job input): default = the tree's qa/m3-scripts/ac7-active-idle-gate.py if the tree has one, else the studio's.
# Fallback = --ac7-from <commit>:<path>, validated above (R3): the script is taken from that commit with `git show`.
# Judged by scripts/pacing-x1-ac7.py (R2): behavioural only, CSV-RECORD path+sha256 must equal the shipped CSV, the header must
# name it and the gate must exit 0; no static source check. Its studio imports are hashed (R4), and m4_active.py as imported
# is compared with the --ac7-from commit's copy (HoE (b); MISMATCH fails 904). Results: ac7.json, ac7.log, ac7-csv-record.txt.
H="$WT/scripts/pacing-x1-ac7.py"; [ -f "$H" ] || H="$(dirname "$SELF")/pacing-x1-ac7.py"
if [ -n "$AC7_FROM" ]; then AC7_SRC="econ-pr"; mkdir -p "$OUT/ac7-src"; AC7="$OUT/ac7-src/$(basename "$AC7_PATH")"
  git -C "$REPO" show "$AC7_COMMIT:$AC7_PATH" > "$AC7" || { fail "--ac7-from: git show $AC7_COMMIT:$AC7_PATH failed"; : > "$AC7"; }
elif [ -f "qa/m3-scripts/ac7-active-idle-gate.py" ]; then AC7="$WT/qa/m3-scripts/ac7-active-idle-gate.py"; AC7_SRC="tree"
else AC7="$STUDIO/qa/m3-scripts/ac7-active-idle-gate.py"; AC7_SRC="studio"; fi
if [ -s "$AC7" ]; then echo "$(sha256sum < "$AC7" | cut -d' ' -f1)  $AC7 (AC7 script, row 904, source $AC7_SRC${AC7_COMMIT:+ commit $AC7_COMMIT path $AC7_PATH})" >> "$OUT/outside-tree.txt"; else fail "AC7 script missing: $AC7"; fi
python3 "$H" inputs "$STUDIO" > "$OUT/ac7-inputs.json" || fail "AC7 studio inputs missing (ac7-inputs.json)"
node -e 'for (const i of JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).inputs) console.log(`${i.sha256}  ${i.path} (AC7 import, studio-sourced)`)' "$OUT/ac7-inputs.json" >> "$OUT/outside-tree.txt"
python3 "$H" sim "$REPO" "$AC7_COMMIT" "$STUDIO" "$OUT/ac7-src" > "$OUT/ac7-sim.json"; SIMRC=$?
node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if (j.commit) console.log(`${j.commitSha256 ?? "-"}  m4_active.py at --ac7-from commit ${j.commit} (product/sim/m4/m4_active.py): ${j.match} vs the studio copy imported (${j.sha256})`)' "$OUT/ac7-sim.json" >> "$OUT/outside-tree.txt"
[ "$SIMRC" = 0 ] || fail "row 904 AC7: m4_active.py $(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).match' "$OUT/ac7-sim.json") (ac7-sim.json)"
echo "$(sha256sum < "$(readlink -f "$(command -v python3)")" | cut -d' ' -f1)  python3 $(python3 -V 2>&1 | cut -d' ' -f2) $(readlink -f "$(command -v python3)")" >> "$OUT/outside-tree.txt"
log "AC7 (row 904): python3 $AC7 30 --csv $(readlink -f "$WT/$SHIP")"
python3 "$H" run "$AC7" "$WT/$SHIP" "$SHIP_SHA" "$OUT/ac7.log" > "$OUT/ac7-run.json"
node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log(j.csvRecord ?? "NO CSV-RECORD LINE in ac7.log")' "$OUT/ac7-run.json" > "$OUT/ac7-csv-record.txt"
AC7J_SOURCE=$AC7_SRC AC7J_SCRIPT=$AC7 AC7J_SCRIPTSHA=$( [ -s "$AC7" ] && sha256sum < "$AC7" | cut -d' ' -f1) AC7J_COMMIT=$AC7_COMMIT AC7J_CSV=$SHIP AC7J_CSVSHA=$SHIP_SHA AC7J_SIMRC=$SIMRC node -e '
const fs=require("fs"), e=process.env, o=process.argv[1], r=JSON.parse(fs.readFileSync(o+"/ac7-run.json","utf8")), sim=JSON.parse(fs.readFileSync(o+"/ac7-sim.json","utf8")), inp=JSON.parse(fs.readFileSync(o+"/ac7-inputs.json","utf8"));
const bad = sim.match==="MISMATCH" ? "m4_active.py MISMATCH vs commit "+e.AC7J_COMMIT : inp.missing.length ? "studio inputs missing: "+inp.missing.join(", ") : "";
const j={...r, status: r.status==="PASS" && !bad ? "PASS" : "FAIL", why: r.why || bad, source:e.AC7J_SOURCE, script:e.AC7J_SCRIPT, scriptSha256:e.AC7J_SCRIPTSHA,
 commit:e.AC7J_COMMIT||undefined, csv:e.AC7J_CSV, csvSha256:e.AC7J_CSVSHA, sim, inputs: inp.inputs, ruling: "QA-D-1030-X1-TREE (R6 of QA-D-1030-PR93-1): AC7 2x active/idle gate; not byte-identity vs c7bb783f"};
fs.writeFileSync(o+"/ac7.json", JSON.stringify(j,null,1)+"\n"); console.log(j.status+" "+(j.why||j.result||""))' "$OUT" > "$OUT/ac7-status.txt"
grep -q '^PASS' "$OUT/ac7-status.txt" && log "AC7 PASS ($(cat "$OUT/ac7-csv-record.txt"))" || fail "row 904 AC7: $(cat "$OUT/ac7-status.txt")"
# R5: the recorded RC run is seeds 1-200 at T 4000 (the verdict checks every shard too)
[ "$SEEDS" = 1-200 ] || fail "seeds $SEEDS != 1-200: not an RC run (R5)"
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
MBAL=$(node -e "const fs=require('fs');const s=new Set(fs.readdirSync(process.argv[1]).filter(f=>/^shard-.*\.json$/.test(f)).map(f=>JSON.parse(fs.readFileSync(process.argv[1]+'/'+f)).balanceSha256));console.log([...s].join(','))" "$OUT")
[ "$MBAL" = "$BAL_SHA" ] || fail "X1 measured balance.json $MBAL != tree $BAL $BAL_SHA (QA-D-1030-SHIPFLAGS)"
node -e "const fs=require('fs');for(const f of fs.readdirSync(process.argv[1]).filter(f=>/^shard-.*\.json$/.test(f))){const s=JSON.parse(fs.readFileSync(process.argv[1]+'/'+f));if(s.head!==process.argv[2]||s.dirty)process.exit(1)}" "$OUT" "$SHA" || fail "a shard ran on a different or dirty HEAD"
git status --porcelain --untracked-files=all > "$OUT/porcelain-after.txt"; [ -s "$OUT/porcelain-after.txt" ] && fail "tree dirty after the run (porcelain-after.txt)"
{ echo "tested_sha=$SHA"; echo "conditions_failed=${#FAILS[@]}"; for f in "${FAILS[@]}"; do echo "fail: $f"; done; } > "$OUT/conditions.txt"
if [ ${#FAILS[@]} -eq 0 ]; then echo "pending trees check: run scripts/pacing-x1-trees-check.sh $OUT <rc-sha> after the squash" > "$OUT/rc-gate.txt"
else echo "not RC gate, re-run on RC SHA (${#FAILS[@]} condition(s) failed: conditions.txt)" > "$OUT/rc-gate.txt"; fi
log "rc-gate: $(cat "$OUT/rc-gate.txt")"
# (5) rule 19 manifest
( cd "$OUT" && find . -type f ! -path ./SHA256SUMS -printf '%P\n' | sort | xargs sha256sum > SHA256SUMS && sha256sum -c --quiet SHA256SUMS ) || { echo "SHA256SUMS failed" >&2; exit 1; }
[ ${#FAILS[@]} -eq 0 ]
