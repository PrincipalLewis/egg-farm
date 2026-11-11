#!/usr/bin/env bash
# RETIRED 2026-10-30, rule 21, calls retired rc1-d2-qa.mjs (/proc walk + SIGKILL) (QA-D-1030-KILLS addendum). Do not run. Pre-move sha256 07e9bd7c868db37ca8366d63175608de8ac21432e191d62b1040e53a2ec53eef
# QA combined rc1 suite. Usage: run-combined.sh <SHA> [--suite=save|ui|money|f1|market|release|all] [--tag=<git tag>] [--engines=chromium,firefox,webkit]
# Clean clone -> unit tests (clean + workspace-linked) -> build dist + dist-qa -> suites in C/F/W -> logs in qa/m3-recheck/combined-<sha>/
# Never pushes, never changes branches of /workspace/egg-farm-studio/game, never uses port 4927, only stops servers it started.
set -uo pipefail
STUDIO=/workspace/egg-farm-studio; SRC=$STUDIO/game; Q=$STUDIO/qa/m3-scripts; C=$Q/combined
SHA_IN=${1:?usage: run-combined.sh <SHA> [--suite=...]}; shift
SUITE=all; TAG=; ENGINES=chromium,firefox,webkit; SKIP_UNIT=0
for a in "$@"; do case $a in --suite=*) SUITE=${a#*=};; --tag=*) TAG=${a#*=};; --engines=*) ENGINES=${a#*=};; --skip-unit) SKIP_UNIT=1;; *) echo "unknown arg $a"; exit 64;; esac; done
SHA=$(git -C "$SRC" rev-parse --verify --quiet "$SHA_IN^{commit}") || { echo "unknown commit $SHA_IN"; exit 65; }
S7=${SHA:0:7}; CL=/tmp/qa-x/clean/$S7; WS=/tmp/qa-x/ws/$S7; LOG=$STUDIO/qa/m3-recheck/combined-$S7; mkdir -p "$LOG"
SUM=$LOG/summary-$SUITE.md; T0=$(date +%s); IFS=, read -ra ENG <<< "$ENGINES"
log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG/run.log"; }
res(){ echo "| $1 | $2 | $3 | $4 |" >> "$SUM"; log "RESULT $1 [$2] $3 $4"; }   # suite check engine result
echo -e "# combined QA $S7 suite=$SUITE ($(date '+%F %H:%M %Z'))\n\n| suite | check | engine | result |\n|---|---|---|---|" > "$SUM"
# ---------- 1. clones ----------
prep_clone(){ local d=$1; if [ ! -d "$d/.git" ]; then mkdir -p "$(dirname "$d")"; git clone -q --no-hardlinks "$SRC" "$d" || return 1; fi
  git -C "$d" fetch -q "$SRC" "$SHA" 2>/dev/null; git -C "$d" -c advice.detachedHead=false checkout -q --detach "$SHA" || return 1
  git -C "$d" remote remove origin 2>/dev/null   # no link back to the workspace repo
  if [ ! -d "$d/node_modules" ] || ! cmp -s "$d/package-lock.json" "$d/.git/qa-lock"; then rm -rf "$d/node_modules"
    if cmp -s "$d/package-lock.json" "$SRC/package-lock.json" && [ -d "$SRC/node_modules" ]; then cp -a "$SRC/node_modules" "$d/"; else (cd "$d" && npm ci --prefer-offline --no-audit --no-fund >/dev/null 2>&1) || return 1; fi
    cp "$d/package-lock.json" "$d/.git/qa-lock"; fi; }
log "SHA $SHA -> clean $CL, ws $WS"
prep_clone "$CL" || { log "clean clone failed"; exit 1; }
[ "$(git -C "$CL" rev-parse HEAD)" = "$SHA" ] || { log "clone HEAD mismatch"; exit 1; }
# no outside links: nothing in the clone (outside node_modules) may be a symlink leaving the tree; ../../product must not exist
OUTL=$(find "$CL" -path "$CL/node_modules" -prune -o -type l -print | while read -r l; do r=$(readlink -f "$l"); case $r in "$CL"/*) ;; *) echo "$l -> $r";; esac; done)
[ -e "$CL/../../product" ] || [ -e "$CL/../product" ] && OUTL="$OUTL ../product or ../../product exists"
[ -z "$OUTL" ] && res setup "clean clone, no outside links" - PASS || res setup "clean clone, no outside links" - "FAIL $OUTL"
# feature detection (N/A instead of FAIL when a feature is not in this SHA)
FEAT=$(node "$C/features.mjs" "$CL"); echo "$FEAT" > "$LOG/features.json"; log "features $FEAT"
has(){ node -e "process.exit(JSON.parse(process.argv[1])[process.argv[2]]?0:1)" "$FEAT" "$1"; }
# ---------- 2. unit tests ----------
if [ $SKIP_UNIT = 0 ]; then
  (cd "$CL" && npx vitest run > "$LOG/unit-clean.log" 2>&1); r=$?; res unit "vitest clean clone" - "$([ $r = 0 ] && echo PASS || echo FAIL) $(grep -E '^ +Tests ' "$LOG/unit-clean.log" | tail -1 | tr -s ' ')"
  prep_clone "$WS" && { [ -e /tmp/qa-x/ws/product ] || ln -s "$STUDIO/product" /tmp/qa-x/ws/product; } && (cd "$WS" && npx vitest run > "$LOG/unit-ws.log" 2>&1); r=$?
  res unit "vitest workspace-linked (/tmp/qa-x/ws/product -> product/)" - "$([ $r = 0 ] && echo PASS || echo FAIL) $(grep -E '^ +Tests ' "$LOG/unit-ws.log" | tail -1 | tr -s ' ')"
fi
# ---------- 3. builds ----------
(cd "$CL" && npm run build > "$LOG/build-release.log" 2>&1); rb=$?; (cd "$CL" && npm run build:qa > "$LOG/build-qa.log" 2>&1); rq=$?
[ -n "$(git -C "$CL" status --porcelain)" ] && log "WARN clone dirty after build: $(git -C "$CL" status --porcelain | head -3 | tr '\n' ' ')"
res build "npm run build (release + check-release-build)" - "$([ $rb = 0 ] && echo PASS || echo FAIL) $(grep -o 'index-[A-Za-z0-9_-]*\.js' "$CL/dist/index.html" 2>/dev/null)"
res build "npm run build:qa (dist-qa)" - "$([ $rq = 0 ] && echo PASS || echo FAIL) $(grep -o 'index-[A-Za-z0-9_-]*\.js' "$CL/dist-qa/index.html" 2>/dev/null)"
[ $rb = 0 ] && [ $rq = 0 ] || { log "build failed, stopping"; exit 1; }
# ---------- runners ----------
# ports: 7000 + suiteBase + engine*20 + n  (7000-7799; 4927 never used; refuse busy ports)
pfree(){ ! (exec 3<>/dev/tcp/127.0.0.1/$1) 2>/dev/null; }
port(){ local p=$((${PORT_BASE:-7000} + $1)); [ $p = 4927 ] && p=$((p+1)); while ! pfree $p; do p=$((p+1)); done; echo $p; }
# br <suite> <name> <engine> <port-offset> <script> [ENV=..]  : runs one browser script, scores SUMMARY line; script errors = FAIL; bundle mismatch = ABORT
br(){ local s=$1 n=$2 e=$3 po=$4 sc=$5; shift 5; local p; p=$(port $po); local L="$LOG/$s-$n-$e.log"; mkdir -p "$LOG/out-$s"
  ( cd "$CL" && env ENGINE=$e PORT=$p OUT="$LOG/out-$s" "$@" timeout 1500 node "$sc" "$CL" ) > "$L" 2>&1; local r=$?
  if crashed "$L" "$r"; then mv "$L" "${L%.log}.crash1.log"; log "retry once after script crash: $s/$n/$e"; p=$(port $po)
    ( cd "$CL" && env ENGINE=$e PORT=$p OUT="$LOG/out-$s" "$@" timeout 1500 node "$sc" "$CL" ) > "$L" 2>&1; r=$?; fi
  local bun; bun=$(grep -m1 -E '^(BUNDLE|bundle ok)' "$L" | cut -c1-90)
  score "$s" "$n" "$e" "$L" "$r"; }
crashed(){ grep -q -E 'triggerUncaughtException|^Node\.js v[0-9]' "$1" || { [ "$2" != 0 ] && ! grep -q '^SUMMARY' "$1"; }; }
# score: SUMMARY line if present, else count ^PASS / ^FAIL|LOSS lines; FAILs matching combined/known-failures.txt count as KNOWN
score(){ local s=$1 n=$2 e=$3 L=$4 r=$5
  if grep -q -E 'ABORT|served bundle mismatch|served bundle !=|refusing' "$L" && ! grep -q -E '^(PASS|FAIL)' "$L"; then res "$s" "$n" "$e" "ABORT bundle/port (exit $r) $(grep -m1 -E 'ABORT|mismatch|refusing|!=' "$L" | cut -c1-100)"; return; fi
  local np nf nk; np=$(grep -c -E '^(PASS|OK )' "$L"); nf=0; nk=0; local kl=""
  while IFS= read -r line; do if [ -s "$C/known-failures.txt" ] && echo "$line" | grep -q -E -f <(grep -v '^#' "$C/known-failures.txt" | grep . ); then nk=$((nk+1)); kl="$kl$(echo "$line" | cut -c1-70);"; else nf=$((nf+1)); fi; done < <(grep -E '^(FAIL|LOSS)' "$L")
  local bad; bad=$(grep -E '^(FAIL|LOSS)' "$L" | while IFS= read -r line; do echo "$line" | grep -q -E -f <(grep -v '^#' "$C/known-failures.txt" | grep .) || echo "$line"; done | cut -c1-140 | sed 's/|/\//g' | head -3 | tr '\n' ';')
  if crashed "$L" "$r"; then res "$s" "$n" "$e" "FAIL script crash (exit $r) after $np pass: $(grep -m1 -E '^[a-zA-Z.]+(Error|: )' "$L" | cut -c1-110 | sed 's/|/\//g') [harness, see log]"; return; fi
  local nna; nna=$(grep -c '^N/A' "$L"); local nas=""; [ "$nna" -gt 0 ] && nas=", $nna N/A"
  if [ $((np+nf+nk)) = 0 ] && [ "$nna" -gt 0 ]; then res "$s" "$n" "$e" "N/A $(grep -m1 '^N/A' "$L" | cut -c1-120 | sed 's/|/\//g')"
  elif [ $((np+nf+nk)) = 0 ]; then res "$s" "$n" "$e" "FAIL no results (exit $r) $(tail -2 "$L" | tr '\n' ' ' | cut -c1-160 | sed 's/|/\//g')"
  elif [ $nf = 0 ]; then res "$s" "$n" "$e" "PASS $np pass$nas$([ $nk -gt 0 ] && echo ", $nk known: ${kl//|//}")"
  else res "$s" "$n" "$e" "FAIL $np pass / $nf fail$([ $nk -gt 0 ] && echo " / $nk known")$nas $bad"; fi; }
vn(){ local s=$1 n=$2; shift 2; local L="$LOG/$s-$n.log"; ( cd "$CL" && "$@" ) > "$L" 2>&1; local r=$?
  local sm; sm=$(grep -E '^SUMMARY' "$L" | tail -1 | sed 's/^SUMMARY //'); local na; na=$(grep -m1 '^N/A' "$L")
  if [ -n "$na" ]; then res "$s" "$n" - "$na"; elif [ $r = 0 ] && [ -n "$sm" ]; then res "$s" "$n" - "PASS $sm"; else res "$s" "$n" - "FAIL ${sm:-exit $r} $(grep -E '^FAIL' "$L" | head -3 | cut -c1-140 | sed 's/|/\//g' | tr '\n' ';')"; fi; }
na(){ res "$1" "$2" "${3:--}" "N/A ($4)"; }
par(){ local pids=(); for e in "${ENG[@]}"; do "$@" "$e" & pids+=($!); done; wait "${pids[@]}"; }
VN="$CL/node_modules/.bin/vite-node"
# ---------- suites ----------
eidx(){ case $1 in chromium) echo 0;; firefox) echo 1;; *) echo 2;; esac; }
suite_globals(){ br globals release-globals-only-eggfarmExportTelemetry "$1" $((0+$(eidx $1)*20)) "$Q/s2-43eb112-save-globals.mjs" DIST=dist MODE=globals; }
suite_save_e(){ local e=$1 o=$((100+$(eidx $1)*30))
  if has wageFrac; then br save v6-migrations-wageFrac-0gate "$e" $o "$Q/s2-43eb112-save-globals.mjs" DIST=dist-qa MODE=save; else na save v6-migrations-wageFrac "$e" "no wageFracCents/save v6 in $S7"; fi
  if has saveDurability; then
  br save durability-guard-R1-R6 "$e" $((o+2)) "$Q/rc1-guard-save-qa.mjs" DIST=dist-qa OUT="$LOG/out-save/r-$e.json"
  br save durability-D2-kill "$e" $((o+4)) "$Q/rc1-d2-qa.mjs" DIST=dist-qa OUT="$LOG/out-save/d2-$e.json"
  br save durability-780-save_restore "$e" $((o+6)) "$Q/rc1-780-qa.mjs" DIST=dist-qa OUT="$LOG/out-save/780-$e.json"
  else na save "durability (guard R1-R6, D2 kill, 780 save_restore)" "$e" "IndexedDB mirror / save-durability not in $S7"; fi
  br save offline-clock "$e" $((o+8)) "$C/offline-clock.mjs" DIST=dist-qa
  has saveDurability || return 0
  if [ -f "$CL/scripts/release-globals-browser.mjs" ]; then eng save eng-release-globals "$e" $((o+10)) scripts/release-globals-browser.mjs; fi
  if [ -f "$CL/scripts/tab-guard-browser.mjs" ]; then eng save eng-tab-guard "$e" $((o+12)) scripts/tab-guard-browser.mjs FREEZE_S=30; fi
  if [ -f "$CL/scripts/d2-kill-browser.mjs" ]; then eng save eng-d2-kill "$e" $((o+14)) scripts/d2-kill-browser.mjs; fi
}
eng(){ local s=$1 n=$2 e=$3 p; p=$(port $4); local sc=$5; shift 5; local L="$LOG/$s-$n-$e.log"
  # Eng scripts that ignore $PORT (fixed port, e.g. rc0-browser 4181) run one engine at a time under a box-wide lock
  local lk=""; grep -q 'process.env.PORT' "$CL/$sc" || lk="flock /tmp/qa-x/eng-fixed-port.lock"
  ( cd "$CL" && env PORT=$p "$@" $lk timeout 1500 node "$sc" "$e" ) > "$L" 2>&1; local r=$?
  res "$s" "$n" "$e" "$([ $r = 0 ] && echo PASS || echo FAIL) exit $r $(grep -E -i 'pass(ed)?[ :]+[0-9]+|[0-9]+/[0-9]+' "$L" | tail -1 | cut -c1-80 | sed 's/|/\//g')"; }
suite_save(){ local f=$LOG/save-migrations-fixtures.log; "$VN" "$C/save-migrations.ts" "$CL" > "$f" 2>&1; local sm; sm=$(grep '^SUMMARY' "$f")
  res save "fixture migrations v4/v5 -> current (+wageFracCents if v6), corrupt rejected" - "$(grep -q '^FAIL' "$f" && echo FAIL || echo PASS) ${sm#SUMMARY }"
  vn save offline-clock-code "$VN" "$C/offline-code.ts" "$CL"
  par suite_save_e
  for d in dist dist-qa; do local p; p=$(port $((190+${#d}))); local L="$LOG/save-pt1-telemetry-$d.log"
    ( cd "$CL" && DIST=$d PORT=$p OUT="$LOG/out-save/pt1-$d/" timeout 600 node "$Q/qa-pt1-browser.mjs" "$CL" ) > "$L" 2>&1; local r=$?
    node -e 'const j=require(process.argv[1]);const bad=Object.entries(j).filter(([k,v])=>v.error||(v.errors&&v.errors.length));console.log(bad.length?"FAIL "+JSON.stringify(bad).slice(0,150):"PASS "+Object.keys(j).length+" engines")' "$LOG/out-save/pt1-$d/browser-results.json" > "$L.score" 2>&1 || echo "FAIL exit $r" > "$L.score"
    res save "qa-pt1-browser telemetry/install_id ($d, C/F/W/iOS-WebKit)" - "$(cat "$L.score")"; done; }
suite_ui_e(){ local e=$1 o=$((300+$(eidx $1)*20))
  if has wageLabel; then br ui rc1-ui-plan "$e" $o "$Q/rc1-ui-qa.mjs" DIST=dist-qa; else na ui rc1-ui-plan "$e" "rc1-ui (S2-5/S2-6/S2-8 label) not in $S7"; fi
  br ui fasttap "$e" $((o+2)) "$Q/rc1-fasttap.mjs" DIST=dist-qa
  if has wageLabel; then br ui s2-8-wage-label-browser-360 "$e" $((o+4)) "$Q/s2-8-wage-browser-aa66bdb.mjs" DIST=dist-qa; else na ui s2-8-wage-label-browser "$e" "fmtExactRate/wage label not in $S7"; fi
  if [ -f "$CL/scripts/rc0-browser.mjs" ]; then eng ui eng-rc0-browser "$e" $((o+8)) scripts/rc0-browser.mjs; fi; }
suite_ui(){ if has wageLabel; then vn ui s2-8-wage-label-boundaries-code "$VN" "$C/wage-label-code.ts" "$CL"; else na ui s2-8-wage-label-boundaries-code - "s2-economy-ui fmtExactRate not in $S7"; fi
  [ -f "$CL/tests/fixtures/saves/m2-rc1-v5-40min.json" ] && par suite_ui_e; }
suite_money_e(){ local e=$1 o=$((400+$(eidx $1)*10))
  if has exactWage; then br money s2-8-exact-wage-60s-10min "$e" $o "$STUDIO/qa/m3-recheck/s2-8-wage-rate.mjs" DIST=dist-qa FARM=3 REAL_S=60; else na money s2-8-exact-wage "$e" "exact-rate wages (wageFracCents) not in $S7"; fi
  if has wageFrac; then br money zero-gate-carried-frac "$e" $((o+2)) "$Q/s2-43eb112-save-globals.mjs" DIST=dist-qa MODE=save; else na money zero-gate "$e" "\$0 gate with wageFracCents not in $S7"; fi; }
suite_money(){ par suite_money_e; }
suite_f1(){ if has mhMinWait; then vn f1 market-hand-min-wait-2s "$VN" "$C/mh-min-wait.ts" "$CL"; else na f1 market-hand-min-wait-2s - "market_hand_min_wait_s not in $S7"; fi
  if has mhMinWait; then par f1_mh_browser; fi
  vn f1 pacing-bands-f1-proposal "$VN" "$C/f1-pacing.ts" "$CL" $(has f1Economy && echo gate || echo info)
  if has checkEconomyCopy; then (cd "$CL" && npm run check-economy-copy > "$LOG/f1-check-economy-copy.log" 2>&1); r=$?; res f1 "npm run check-economy-copy (clean clone)" - "$([ $r = 0 ] && echo PASS || echo FAIL) $(tail -1 "$LOG/f1-check-economy-copy.log" | cut -c1-100)"
    if [ -d "$WS" ]; then (cd "$WS" && npm run check-economy-copy > "$LOG/f1-check-economy-copy-ws.log" 2>&1); r=$?; res f1 "npm run check-economy-copy (workspace-linked, live product/economy.csv)" - "$([ $r = 0 ] && echo PASS || echo FAIL) $(tail -1 "$LOG/f1-check-economy-copy-ws.log" | cut -c1-100)"; fi; else na f1 "npm run check-economy-copy" - "script not in package.json at $S7"; fi; }
f1_mh_browser(){ br f1 market-hand-min-wait-browser "$1" $((500+$(eidx $1)*5)) "$C/mh-min-wait-browser.mjs" DIST=dist-qa; }
suite_market_e(){ local e=$1 o=$((600+$(eidx $1)*10))
  if has servedDwell; then br market MK-16-22-served-dwell "$e" $o "$Q/s2-3a-mk.mjs" DIST=dist-qa; else na market MK-16-22 "$e" "served_dwell_ms not in $S7"; fi
  br market MK-23-25-orders-copy-pay "$e" $((o+2)) "$C/mk-23-25.mjs" DIST=dist-qa; }
suite_market(){ if has servedDwell; then vn market MK-20-sim-hash "$VN" "$C/mk20.ts" "$CL"; else na market MK-20-sim-hash - "served_dwell_ms not in $S7"; fi; par suite_market_e; }
suite_release(){ local t=${TAG:-}; par rel_e; }
rel_e(){ br release tag-latest-hash-playthrough "$1" $((700+$(eidx $1)*5)) "$C/release-check.mjs" DIST=dist TAG="$TAG" SHA="$SHA"; }
# core: economy copy cell compare (data/ vs live product/, line endings ignored), F1-GAP on product/economy.f1.csv, TR-5 bot
suite_core(){ local P=$STUDIO/product
  if [ -f "$CL/data/economy.csv" ]; then vn core "economy-copy-cell-by-cell-data-vs-product" python3 "$C/econ-compare.py" "$CL/data/economy.csv" "$P/economy.csv"; else res core "economy-copy cell-by-cell" - "FAIL data/economy.csv missing at $S7"; fi
  if [ -f "$CL/data/economy.f1.csv" ]; then vn core "economy.f1-copy-cell-by-cell" python3 "$C/econ-compare.py" "$CL/data/economy.f1.csv" "$P/economy.f1.csv"; fi
  vn core "F1-GAP-economy.f1-F18-11076-F19-18201-w4-5538-9100" python3 "$C/f1-gap.py" "$P/economy.f1.csv"
  local L="$LOG/core-tr5.log"; (cd "$STUDIO" && P=product/farm-upgrades/m4/tr5_run.py; [ -e "$P" ] || P=product/farm/m4/tr5_run.py; python3 "$P" --seeds 30 --scenario standard) > "$L" 2>&1; local r=$?
  res core "TR-5 tr5_run.py --seeds 30 --scenario standard" - "$([ $r = 0 ] && echo PASS || echo "FAIL exit $r") $(grep -E 'PASS|FAIL' "$L" | tail -1 | cut -c1-110 | sed 's/|/\//g')"; }
run_suite(){ local t=$(date +%s); log "== suite $1"; "suite_$1"; local d=$(( $(date +%s)-t )); echo "$1 $d" >> "$LOG/runtimes.txt"; res "$1" "suite runtime" - "$((d/60))m$((d%60))s"; }
log "== globals (once per SHA)"; par suite_globals
case $SUITE in all) for s in core save ui money f1 market release; do run_suite $s; done;; core|save|ui|money|f1|market|release) run_suite $SUITE;; *) echo "bad suite $SUITE"; exit 64;; esac
TT=$(( $(date +%s)-T0 )); echo -e "\nTotal wall time $((TT/60))m$((TT%60))s. PASS $(grep -c '| PASS' "$SUM") FAIL $(grep -c -E '\| (FAIL|ABORT)' "$SUM") N/A $(grep -c '| N/A' "$SUM")" >> "$SUM"
log "done in ${TT}s -> $SUM"; grep -c -E '\| (FAIL|ABORT)' "$SUM" >/dev/null && exit 1 || exit 0
