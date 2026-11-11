#!/usr/bin/env bash
# rc1-qa-bugs-v4 recheck harness. Usage: ./run.sh <sha> [engines="chromium firefox webkit"] [steps="setup unit build neg guard layout rc0 extra"]
# Never pushes/merges/tags. Never uses :4173. One engine at a time. Ports 4291-4295 (override BASEPORT).
set -uo pipefail
SHA_IN=${1:?usage: run.sh <sha> [engines] [steps]}; ENGINES=${2:-"chromium firefox webkit"}; STEPS=${3:-"setup unit build neg guard layout rc0 extra"}
STUDIO=/workspace/egg-farm-studio; REPO=$STUDIO/game-rc1-bugs-v3; PREP=$STUDIO/qa/m3-recheck/rc1-qa-bugs-v4-prep
BP=${BASEPORT:-4291}; P_GUARD=$BP; P_LAYOUT=$((BP+1)); P_RC0=$((BP+2)); P_XQA=$((BP+3)); P_XREL=$((BP+4))
for p in $P_GUARD $P_LAYOUT $P_RC0 $P_XQA $P_XREL; do [ "$p" = 4173 ] && { echo "refusing :4173"; exit 3; }; done
git -C "$REPO" fetch -q origin 2>/dev/null || echo "WARN: fetch failed (offline?)"
FULL=$(git -C "$REPO" rev-parse --verify -q "$SHA_IN^{commit}") || { echo "unknown sha $SHA_IN (not fetched? fix/rc1-qa-bugs-v4 is a LOCAL branch, not on origin)"; exit 1; }
S7=${FULL:0:7}; OUT=$STUDIO/qa/m3-recheck/rc1-qa-bugs-v4-$S7; WT=/tmp/qa-rc1v4-$S7; mkdir -p "$OUT/rc0-shots"
SUM=$OUT/summary.txt; note(){ echo "$(date '+%F %T %Z') $*" | tee -a "$SUM"; }
note "sha=$FULL engines=[$ENGINES] steps=[$STEPS] ports=$P_GUARD-$P_XREL wt=$WT"
if git -C "$REPO" merge-base --is-ancestor "$FULL" fix/rc1-qa-bugs-v4 2>/dev/null; then note "on fix/rc1-qa-bugs-v4: yes"; else note "WARN: $S7 not reachable from local fix/rc1-qa-bugs-v4"; fi
git -C "$REPO" merge-base --is-ancestor origin/main "$FULL" && note "contains origin/main ($(git -C "$REPO" rev-parse --short origin/main)): yes" || note "WARN: does NOT contain origin/main"
git -C "$REPO" log --oneline origin/main.."$FULL" > "$OUT/commits.txt"
has(){ [[ " $STEPS " == *" $1 "* ]]; }
if has setup; then
  [ -d "$WT" ] || git -C "$REPO" worktree add --detach "$WT" "$FULL" > "$OUT/worktree.log" 2>&1 || { note "worktree add FAILED"; exit 1; }
  [ "$(git -C "$WT" rev-parse HEAD)" = "$FULL" ] || { note "worktree HEAD mismatch"; exit 1; }
  ( cd "$WT" && npm ci --no-audit --no-fund > "$OUT/npmci.log" 2>&1 ) && note "npm ci ok" || { note "npm ci FAILED"; exit 1; }
fi
cd "$WT" || exit 1
# QA scripts as untracked copies under scripts/ (so playwright-core resolves); git status --porcelain must stay clean for the build id,
# so they go to .git/info/exclude of THIS worktree only.
EXC=$(git rev-parse --git-path info/exclude); mkdir -p "$(dirname "$EXC")"; for f in qa-guard.mjs qa-layout.mjs qa-extra.mjs; do cp "$PREP/$f" scripts/; grep -qx "scripts/$f" "$EXC" 2>/dev/null || echo "scripts/$f" >> "$EXC"; done
[ -z "$(git status --porcelain)" ] || note "WARN: worktree dirty: $(git status --porcelain | tr '\n' ' ')"
has unit && { npm test > "$OUT/unit.log" 2>&1; note "unit exit=$? $(grep -E 'Tests +[0-9]' "$OUT/unit.log" | tail -1)"; }
if has build; then
  npm run build > "$OUT/build.log" 2>&1; note "build+check-release-build exit=$? $(grep -c 'check-release-build' "$OUT/build.log") check lines"
  npm run build:qa > "$OUT/build-qa.log" 2>&1; note "build:qa exit=$?"
fi
if has neg; then  # B-4 negative test on a TEMP copy of dist
  N=$OUT/release-negative.log; : > "$N"; T=$(mktemp -d /tmp/qa-rc1v4-neg-XXXX)
  run_case(){ rm -rf "$T/dist"; cp -r dist "$T/dist"; local js; js=$(ls "$T"/dist/assets/index-*.js | head -1); [ -n "$1" ] && printf '%s' "$1" >> "$js"; echo "== case: ${1:-<pristine copy>}" >> "$N"; node scripts/check-release-build.mjs "$T/dist" >> "$N" 2>&1; echo "exit=$?" >> "$N"; }
  run_case ""; run_case ';(()=>{const w=window;w.eggfarmPerf={done:!1}})();'; run_case ';(()=>{const h=globalThis;h["eggfarm"+"Dbg"]=1})();'; run_case ';(()=>{const s=self;s.eggfarmOrderList=1})();'; run_case ';window.eggfarmExportTelemetry=window.eggfarmExportTelemetry;'
  rm -rf "$T"; note "neg: exits $(grep -o 'exit=[0-9]*' "$N" | tr '\n' ' ') (want 0,!0,info,!0,0; case3 computed key is a known blind spot -> report)"
fi
# M-2 evidence: the whitespace-normalising line in rc0
grep -n "replace(/\[ \\\\t\\\\r\\\\n\]+/g" scripts/rc0-browser.mjs > "$OUT/m2-rc0-line.txt" 2>&1; sed -n 170,174p scripts/rc0-browser.mjs >> "$OUT/m2-rc0-line.txt"
for E in $ENGINES; do
  note "---- $E ----"
  if has guard; then flock /workspace/egg-farm-studio/.browser-test.lock node scripts/qa-guard.mjs dist $P_GUARD $S7 $E > "$OUT/guard-$E.log" 2>&1; r=$?; note "guard release $E exit=$r"; flock /workspace/egg-farm-studio/.browser-test.lock node scripts/qa-guard.mjs dist-qa $P_GUARD $S7 $E > "$OUT/guard-qa-$E.log" 2>&1; r2=$?; note "guard qa $E exit=$r2"; [ $r -ne 0 -o $r2 -ne 0 ] && { note "STOP: build id check failed for $E"; continue; }; fi
  has layout && { PORT=$P_LAYOUT EXPECT=$S7 flock /workspace/egg-farm-studio/.browser-test.lock timeout ${T_LAYOUT:-900} node scripts/qa-layout.mjs $E "$OUT" > "$OUT/layout-$E.log" 2>&1; note "layout $E exit=$? $(tail -1 "$OUT/layout-$E.log")"; }
  has rc0 && { PORT=$P_RC0 SHOTS=$OUT/rc0-shots flock /workspace/egg-farm-studio/.browser-test.lock timeout ${T_RC0:-1500} node scripts/rc0-browser.mjs $E > "$OUT/rc0-$E.log" 2>&1; note "rc0 $E exit=$? $(tail -1 "$OUT/rc0-$E.log") TUT-1: $(grep -c '^PASS.*TUT-1' "$OUT/rc0-$E.log")/3 pass"; }
  has extra && { flock /workspace/egg-farm-studio/.browser-test.lock timeout ${T_EXTRA:-900} node scripts/qa-extra.mjs $E "$OUT" $P_XQA $P_XREL $S7 > "$OUT/extra-$E.log" 2>&1; note "extra $E exit=$? $(tail -1 "$OUT/extra-$E.log")"; }
  ss -ltn 2>/dev/null | grep -E ":(${P_GUARD}|${P_LAYOUT}|${P_RC0}|${P_XQA}|${P_XREL}) " && note "WARN: server left listening"
done
cp "$PREP"/*.mjs "$OUT/" 2>/dev/null; note "done. evidence: $OUT  (write report: qa/m3-recheck/rc1-qa-bugs-v4-$S7.md)"
