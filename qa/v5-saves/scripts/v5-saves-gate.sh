#!/bin/bash
# v5 RC Saves gate driver (queue row V5-S). Runs ONCE on HoE's RC SHA. Prep only until then.
# usage: v5-saves-gate.sh <rc-full-sha> [--gate-id v5-rc-saves] [--engines chromium,firefox,webkit] [--flags breeds,zeroGainUi,pause,abilities] [--ship-set product/v5-ship-set.md] [--expected-balance-sha HEX|env EXPECTED_BALANCE_SHA|$V/expected-balance.sha256] [--economy-csv data/X.csv|env ECONOMY_CSV] [--tel-schema v062(default)|shipped(diagnostic)]
#                         [--base 30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134] [--dry-run]
# Results (rule 19, engineering/v5-rc-manifest.md): artifacts/<gate-id>/results/ + SHA256SUMS (sha256sum -c must pass). --dry-run writes to
# qa/v5-saves/dryrun/gate-DRYRUN-<sha7>/results instead (labelled DRYRUN, never in artifacts/). Refuses scratch/, out/, /tmp.
# Read-only on GitHub (git fetch only). Ports 5961-5964. Every browser step: flock .browser-test.lock timeout 600, one engine per hold.
# RC LOCK WINDOW (QA-D-1029-V5E-SCOPE): Saves gets the FIRST exclusive window on .browser-test.lock, up to 2 h across all 3 engines;
# UI QA goes next. If the run overruns 2 h, Saves QA tells HoQ and UI QA AT ONCE (do not just keep going silently). The driver
# prints a WARNING at 1h45 and an OVERRUN line at 2h (status.log + summary.txt + stderr); GATE_WINDOW_S / GATE_WARN_S override (dry runs).
# vitest: --maxWorkers=2. Kills only its own PIDs (each child script stops its own server). Exit 0 = every HARD step PASS.
set -u -o pipefail; set +x
say(){ echo "$(date '+%F %T %Z') $*" | tee -a "$ST"; }
# Results signing (fix 2026-10-30, HoQ OK): status.log keeps getting lines AFTER the manifest is built (the -c result + du), so it is
# EXCLUDED from SHA256SUMS and signed LAST, in its own STATUS.sha256, once nothing else writes to it. Called by the gate and by
# --selftest-sign (scripts/selftest-gate-sums.sh), so both use this exact code path. Verify: sha256sum -c SHA256SUMS && sha256sum -c STATUS.sha256
sign_results(){ (cd "$R" && find . -type f ! -name SHA256SUMS ! -name SHA256SUMS.check.txt ! -name STATUS.sha256 ! -path ./status.log ! -path '*/.serve/*' | sort | xargs sha256sum > SHA256SUMS); (cd "$R" && sha256sum -c SHA256SUMS > "$R/SHA256SUMS.check.txt" 2>&1) && say "SHA256SUMS -c OK $(sha256sum $R/SHA256SUMS | cut -c1-64) (status.log excluded; signed last in STATUS.sha256)" || say "SHA256SUMS -c FAILED (see SHA256SUMS.check.txt)"; du -sh "$R" | tee -a "$ST"
  (cd "$R" && sha256sum status.log $(for f in rc-balance.json ship-set.md ship-set.derived.json; do [ -f $f ] && echo $f; done) > STATUS.sha256 && sha256sum -c STATUS.sha256 >> "$R/SHA256SUMS.check.txt" 2>&1) && echo "STATUS.sha256 $(cut -c1-64 "$R/STATUS.sha256") (status.log final, signed last)" || echo "STATUS.sha256 -c FAILED (see SHA256SUMS.check.txt)"; }   # stdout only: status.log is closed
# RC lock-window timer (rule 21 fix 2026-10-30, HoQ OK): ONE bash process (this script in --win-timer mode; printf builtin for the
# timestamp, only `sleep` as a short-lived child in its own group). Started ONLY via ops/tools/lane-run.sh on lane saves-qa (own
# session/process group, PID recorded in .pids/saves-qa.pids); stopped ONLY via ops/tools/lane-kill.sh on that recorded PID.
# No pkill/killall/pattern kill, ever. If the timer's group survives the stop (lane-kill GONE with members, REFUSED, or members
# still present), the gate STOPS (exit 3) and says to ask HoO. It appends to status.log, so it is stopped before sign_results().
LT=/workspace/egg-farm-studio/ops/tools; LANE=saves-qa; SELF=$(realpath "$0"); WINPID=; WINDONE=0
if [ "${1:-}" = --win-timer ]; then ST=$2; SUM=$3; W=$4; T=$5; G=$6   # same lines/targets as the old winwarn: status.log + summary.txt + gate stderr
  out(){ printf '%s\n' "$1" >> "$ST"; printf '%s\n' "$1" >> "$SUM"; [ -w "/proc/$G/fd/2" ] && printf '%s\n' "$1" 2>/dev/null >> "/proc/$G/fd/2"; return 0; }
  sleep "$W"; printf -v ts '%(%F %T %Z)T' -1; out "$ts WARNING lock window: $((W/60)) min elapsed of $((T/60)) (QA-D-1029-V5E-SCOPE). If it will overrun, tell HoQ and UI QA NOW."
  sleep $((T-W)); printf -v ts '%(%F %T %Z)T' -1; out "$ts OVERRUN lock window: $((T/60)) min exceeded. Tell HoQ and UI QA at once."; exit 0; fi
grpmembers(){ cat /proc/[0-9]*/stat 2>/dev/null | sed 's/^\([0-9]*\) (.*) /\1 /' | awk -v g="$1" '$4==g {print $1}'; }   # read-only one-pass /proc scan (pid state ppid pgrp), no signals
winfail(){ local m="$(date '+%F %T %Z') ERROR lock-window timer $WINPID: $1. Timer process(es) may survive: STOP and ask HoO (rule 21). Do NOT pkill/killall or kill by name/pattern."; echo "$m" >&2; [ -n "${ST:-}" ] && [ ! -e "$(dirname "$ST")/STATUS.sha256" ] && echo "$m" >> "$ST"; exit 3; }
startwin(){ WINPID=$("$LT/lane-run.sh" "$LANE" -- bash "$SELF" --win-timer "$ST" "$SUM" "$GATE_WARN_S" "$GATE_WINDOW_S" "$$") && [[ "$WINPID" =~ ^[0-9]+$ ]] || { WINPID=; WINDONE=1; winfail "did not start via lane-run.sh $LANE"; }; }
stopwin(){ [ -n "$WINPID" ] && [ "$WINDONE" = 0 ] || return 0; WINDONE=1; local o i
  o=$("$LT/lane-kill.sh" "$LANE" "$WINPID" 2>&1); case "$o" in "TERM $WINPID (group)"|"TERM $WINPID"|"GONE $WINPID") ;; *) winfail "lane-kill: $o";; esac
  for i in $(seq 1 50); do [ -z "$(grpmembers "$WINPID")" ] && break; sleep 0.1; done
  o=$("$LT/lane-kill.sh" "$LANE" "$WINPID" 2>&1); [ "$o" = "GONE $WINPID" ] || winfail "still present after TERM: $o"; }
if [ "${1:-}" = --selftest-timer ]; then R=${2:?usage: --selftest-timer <dir> <hold_s>}; ST=$R/status.log; SUM=$R/summary.txt; GATE_WINDOW_S=${GATE_WINDOW_S:-7200}; GATE_WARN_S=${GATE_WARN_S:-6300}
  startwin; echo "WINPID $WINPID"; sleep "${3:?}"; stopwin; echo "STOPPED $WINPID"; sign_results; exit 0; fi
if [ "${1:-}" = --selftest-stopwin ]; then R=${2:?usage: --selftest-stopwin <dir> <pid>}; ST=$R/status.log; WINPID=${3:?}; stopwin; echo "STOPPED $WINPID"; exit 0; fi
if [ "${1:-}" = --selftest-sign ]; then R=${2:?usage: --selftest-sign <mock-results-dir>}; ST=$R/status.log; [ -f "$ST" ] || { echo "no $ST"; exit 2; }; sign_results; exit 0; fi
STUDIO=/workspace/egg-farm-studio; GIT=$STUDIO/game; Q=$STUDIO/qa; V=$Q/v5-saves; SC=$V/scripts; FX=$V/fixtures; M3=$Q/m3-scripts; LOCK=$STUDIO/.browser-test.lock; PORT=5961
RC=${1:-}; shift || true; GID=v5-rc-saves; ENGINES=chromium,firefox,webkit; FLAGS=; BASE=30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134; HH=; DRY=0; SHIPSET=${SHIP_SET:-$STUDIO/product/v5-ship-set.md}; EBS=${EXPECTED_BALANCE_SHA:-}; ECSV=${ECONOMY_CSV:-}; TSCHEMA=v062   # T steps: telemetry v0.6.2 is v5 always-on (D-CEO-20261030-09, HoQ Q-TEL-1 ruling); --tel-schema shipped = diagnostic only
# G1 ship-set of record pin (D-HOP-2026-10-30-30 rev 2 + -36 'Not in v5' + -40 L23 telemetry reworded + -41 L23 TELEMETRY_SCHEMA_VERSION "0.6.2", HoQ verified 13:4x Oct 30). A changed file needs a new HoP decision + re-pin. Re-pin 14:5x: d71ed8cf (D-HOP-2026-10-30-51, D-CEO-20261030-10: L19 m4.flags.bestBuyV2 0 -> 1 REQUIRED; only diff vs 56090a61).
SHIPSET_SHA=d71ed8cf7a5d2e7132ccf1eda30e3b6eb472c21d3e9d3f41101dec2c1a30fcaa   # re-pinned 2026-10-30 14:5x (TASK saves-qa/g1-d71ed8cf, D-HOP-51: bestBuyV2=1 required; was 56090a61)
while [ $# -gt 0 ]; do case $1 in --gate-id) GID=$2; shift;; --engines) ENGINES=$2; shift;; --flags) FLAGS=$2; shift;; --base) BASE=$2; shift;; --ship-set) SHIPSET=$2; shift;; --expected-balance-sha) EBS=$2; shift;; --economy-csv) ECSV=$2; shift;; --tel-schema) TSCHEMA=$2; shift;; --dry-run) DRY=1;; *) echo "unknown $1"; exit 2;; esac; shift; done
[ -n "$RC" ] || { sed -n 2,9p "$0"; exit 2; }
git -C "$GIT" fetch origin --tags --prune >/dev/null 2>&1; FULL=$(git -C "$GIT" rev-parse --verify "$RC^{commit}" 2>/dev/null) || { echo "cannot resolve $RC"; exit 2; }; S7=${FULL:0:7}
if [ $DRY = 1 ]; then R=$V/dryrun/gate-DRYRUN-$S7/results; else R=$STUDIO/artifacts/$GID/results; fi
case "$R" in */scratch/*|*/out/*|/tmp/*|*/tmp/*) echo "refusing results dir $R (rule 19)"; exit 2;; esac
[ $DRY = 0 ] && [ -e "$R/SHA256SUMS" ] && { echo "$R already has a MANIFEST (gate runs once); move it aside with HoQ's OK first"; exit 2; }
# ---- Preflight (QA-D-1030-SAVES-RC-1 (2)(3), 2026-10-30): refuse to START (exit 2) before anything is written, locked or timed, so a
# refusal never burns the once-only RC results dir. Same rules in --dry-run (RC semantics). Narrowed engines are NOT RUN (hard fail), never silently skipped.
NAF=$SC/gate-na.txt   # pinned in SCRIPTS.sha256: "<step-id> | <citation>" = explicit, cited NOT APPLICABLE (never an unset env)
na_cite(){ [ "${GATE_NO_NA:-0}" = 1 ] && return 1; [ -f "$NAF" ] || return 1; local c; c=$(awk -F' [|] ' -v id="$1" '$0 !~ /^#/ && $1==id {print $2; exit}' "$NAF"); [ -n "$c" ] && echo "$c"; }   # GATE_NO_NA=1 can only make the gate stricter
pf(){ echo "$(date '+%F %T %Z') PREFLIGHT REFUSED: $*" >&2; exit 2; }
ss -ltn | grep -q ":$PORT " && pf "port $PORT is busy (G0-port-free would FAIL and a stale server could serve the wrong files): $(ss -ltnp 2>/dev/null | grep ":$PORT " | head -1 | tr -s ' ')"
if [ -z "${SS15_MODULE:-}" ] && ! na_cite U-ss15-share-guard >/dev/null; then pf "U-ss15-share-guard is required: set SS15_MODULE/SS15_EXPORT or add a cited N/A line to $NAF (an uncited NOT RUN hard-fails)"; fi
mkdir -p "$R"; ST=$R/status.log; SUM=$R/summary.txt; : > "$SUM"; HF=0
notrun(){ echo "$1 | NOT RUN | $2 | $3" | tee -a "$SUM"; [ "$2" = HARD ] && HF=$((HF+1)); return 0; }   # a required step that did not run is a hard fail (both modes)
na(){ echo "$1 | N/A | $2 | $3" | tee -a "$SUM"; say "N/A $1: $3"; return 0; }   # explicit, cited, from $NAF only; not counted
# Lock logging (QA-D-1030-SAVES-RC-1 (4)): read-only. Holder from /proc/locks (FLOCK on the lock file's inode) -> /proc/<pid>/stat
# (pgid, sid) -> lane = the .pids/<lane>.pids file whose recorded leader PID is that sid or pgid -> cmdline. Never signals anything.
lockwho(){ local id=$1 ino h p g s lane cmd; ino=$(stat -c %i "$LOCK" 2>/dev/null) || return 0
  h=$(awk -v i="$ino" '$2=="FLOCK" {n=split($6,a,":"); if (a[n]==i) print $5}' /proc/locks 2>/dev/null | sort -u)
  [ -z "$h" ] && { say "LOCK $id: free"; return 0; }
  for p in $h; do read -r g s < <(sed 's/^.*) //' /proc/$p/stat 2>/dev/null | awk '{print $3, $4}'); cmd=$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null | cut -c1-200)
    lane=$(for f in $STUDIO/.pids/*.pids; do awk -v s="$s" -v g="$g" '$1==s || $1==g {found=1} END {exit !found}' "$f" 2>/dev/null && basename "$f" .pids; done | paste -sd, )
    say "LOCK $id: busy, holder pid ${p} pgid ${g:-?} sid ${s:-?} lane ${lane:-unknown} cmd: ${cmd:-?} (read-only /proc; not signalled)"; done; }
LK(){ local id=$1; shift; lockwho "$id"; local t0 rc i; t0=$(date +%s)   # flock -w 1200 as before, in 40 x 30 s slices so every holder change is logged
  for i in $(seq 1 40); do flock -E 75 -w 30 "$LOCK" bash -c 'a=$(date +%s); printf "%s LOCK %s: acquired after %ss wait\n" "$(date "+%F %T %Z")" "$1" "$(( a - $2 ))" >> "$3"; st=$3; id=$1; shift 3; "$@"; rc=$?; printf "%s LOCK %s: released after %ss hold (exit %s)\n" "$(date "+%F %T %Z")" "$id" "$(( $(date +%s) - a ))" "$rc" >> "$st"; exit $rc' _ "$id" "$t0" "$ST" "$@"; rc=$?
    [ $rc = 75 ] || return $rc; lockwho "$id (still waiting $(( $(date +%s) - t0 ))s)"; done; say "LOCK $id: gave up after $(( $(date +%s) - t0 ))s"; return 75; }
step(){ local id=$1 hard=$2; shift 2; if [ -n "${NEEDBUILD:-}" ] && [ "$id" != G1-build ] && ! grep -q "^G1-build | PASS" "$SUM"; then notrun "$id" $hard "build failed"; return 0; fi; say "START $id"; "$@" > "$R/$id.log" 2>&1; local rc=$?; local res=$([ $rc = 0 ] && echo PASS || echo FAIL)
  [ $res = FAIL ] && [ $hard = HARD ] && HF=$((HF+1)); echo "$id | $res | $hard | exit $rc" | tee -a "$SUM"; say "END $id $res"; return 0; }
T0=$(date +%s); GATE_WINDOW_S=${GATE_WINDOW_S:-7200}; GATE_WARN_S=${GATE_WARN_S:-6300}
startwin; trap stopwin EXIT   # lane-run timer on lane saves-qa; stopwin = lane-kill on its recorded PID only (rule 21)
say "lock window: Saves first, exclusive, ${GATE_WINDOW_S}s across all engines; warning at ${GATE_WARN_S}s"
say "gate=$GID rc=$FULL dry=$DRY engines=$ENGINES flags='$FLAGS' base=$BASE results=$R $([ $DRY = 1 ] && echo '*** DRYRUN: not gate evidence ***')"
# 0 pins: fixtures + frozen specs + scripts
step G0-port-free HARD bash -c "! ss -ltn | grep -q ':$PORT '"   # a stale listener on the port would serve the wrong files
step G0-tools HARD bash -c "cd $V/tools && { [ -f node_modules/playwright-core/package.json ] || npm ci --no-audit --no-fund; } && node -e \"process.exit(require('./node_modules/playwright-core/package.json').version==='1.64.1'?0:1)\""   # own pinned playwright-core (its node_modules was found deleted at ~21:59 Oct 29)
step G0-pins HARD bash -c "cd $FX && sha256sum -c FIXTURES.sha256 && cd $V/spec && sha256sum -c SPEC.sha256 && cd $SC && sha256sum -c SCRIPTS.sha256"
# 0b ship-flag set (D-CEO-20261030-09/-10; ship-set of record product/v5-ship-set.md rev 2, sha256 pinned in SHIPSET_SHA above).
#    The COMMITTED src/config/balance.json at the run SHA (git show, not the worktree) is kept as rc-balance.json; the ship-set .md is copied to
#    ship-set.md and parsed to ship-set.derived.json by scripts/g1-ship-set.cjs. All three sha256s go into status.log and STATUS.sha256.
#    FAIL closed: ship-set missing/unparseable/sha != pin; expected balance sha (HoE pins at RC cut) not supplied or != ; any exact key/value
#    differs or an m4.flags key is unlisted; economy CSV path/sha placeholder in the ship-set, path != data/economy.csv, override ECONOMY_CSV != ship-set path, CSV != sha;
#    tc_* tunables (tc_streak_cap) HARD in balance.json AND the CSV (both values logged).
BJ=$R/rc-balance.json; git -C "$GIT" show "$FULL:src/config/balance.json" > "$BJ" 2>/dev/null || : > "$BJ"; BSHA=$(sha256sum < "$BJ" | cut -c1-64)
[ -z "$EBS" ] && [ -f "$V/expected-balance.sha256" ] && EBS=$(grep -oE '\b[0-9a-f]{64}\b' "$V/expected-balance.sha256" | head -1)
SJ=$R/ship-set.md; DJ=$R/ship-set.derived.json; rm -f "$DJ"; if [ -f "$SHIPSET" ]; then cp "$SHIPSET" "$SJ"; SSHA=$(sha256sum < "$SJ" | cut -c1-64); else rm -f "$SJ"; SSHA=MISSING; fi
say "balance.json@$S7 (committed src/config/balance.json) sha256 $BSHA; expected ${EBS:-<not supplied>}"
say "ship-set $SHIPSET sha256 $SSHA (pinned $SHIPSET_SHA); economy CSV path from ship-set, override ${ECSV:-<none>}"
flagck(){ local out rc; say "START G1-flags-ship-set"
  out=$(node "$SC/g1-ship-set.cjs" --balance "$BJ" --shipset "$SJ" --shipset-sha "$SHIPSET_SHA" --out "$DJ" --expected-balance-sha "$EBS" --csv-path "$ECSV" --git "$GIT" --rc "$FULL" 2>&1); rc=$?
  echo "$out" > "$R/G1-flags-ship-set.log"; DSHA=$([ -f "$DJ" ] && sha256sum < "$DJ" | cut -c1-64 || echo MISSING)
  say "ship-set.derived.json sha256 $DSHA"; echo "$out" | grep -o 'TUNABLE tc_[^;|]*' | while read -r l; do say "$l"; done
  if [ $rc = 0 ]; then echo "G1-flags-ship-set | PASS | HARD | $out" | tee -a "$SUM"; say "END G1-flags-ship-set PASS"
  else HF=$((HF+1)); echo "G1-flags-ship-set | FAIL | HARD | flags≠ship-set: $out" | tee -a "$SUM"; say "END G1-flags-ship-set FAIL"; fi; }
flagck
# 1 candidate worktree + builds
WT=$Q/wt-v5saves-$S7; WB=$Q/wt-v5saves-base-${BASE:0:7}
build(){ ( [ -e "$WT" ] || git -C "$GIT" worktree add --detach "$WT" "$FULL" || return 1; cd "$WT" && npm ci --no-audit --no-fund && git status --porcelain > "$R/porcelain-after-ci.txt" && [ ! -s "$R/porcelain-after-ci.txt" ] && npm run build:html && npm run build:qa && [ -z "$(git status --porcelain -- . ':!tests/*.qa.test.ts')" ] ); }
NEEDBUILD=1; step G1-build HARD build
HTML=$WT/dist-html/egg-farm.html; PREFIX=$(sed -n "s/^export const BUILD_PREFIX = '\(.*\)';/\1/p" "$WT/scripts/build-id.ts" 2>/dev/null); XB=$PREFIX+$S7
if [ -f "$HTML" ]; then cp "$HTML" "$R/rc-egg-farm.html"; echo "$(sha256sum < $HTML | cut -d' ' -f1)  size $(stat -c %s $HTML)  build-id $XB" > "$R/rc-build.txt"
  step G1-build-id HARD bash -c "[ \"\$(grep -o '$PREFIX+[0-9a-z+]*' '$HTML' | sort -u)\" = '$XB' ] && ! grep -q '+dirty' '$HTML'"
  SV=$(grep -ho 'SAVE_VERSION *= *[0-9]*' "$WT"/src/save/*.ts | head -1 | grep -o '[0-9]*$'); echo "SAVE_VERSION=$SV (expected 6: no bump per m5.0-sizing F2 / breeds spec §6)" | tee -a "$SUM"
  [ -z "$FLAGS" ] && FLAGS=$(cd "$WT" && node -e "try{const b=require('./src/config/balance.json');const m=b.m4||{};const f=m.flags||{};console.log(m.enabled?Object.keys(f).filter(k=>f[k]===1||f[k]===true).join(','):'')}catch(e){console.log('')}" 2>/dev/null); echo "telemetry flags on (m4.enabled && m4.flags.*=1, v5-rc-manifest rule 5): '$FLAGS'" | tee -a "$SUM"
  # 2 saves-browser, one engine per lock hold
  for E in chromium firefox webkit; do [[ ",$ENGINES," == *",$E,"* ]] || notrun S-$E HARD "engine not selected (--engines $ENGINES)"; done
  for E in ${ENGINES//,/ }; do step S-$E HARD LK S-$E timeout 600 node "$SC/saves-browser.mjs" --html "$HTML" --engine $E --port $PORT --out "$R/saves-$E" --expect-build "$XB" --expect-version ${SV:-6} \
      --old-l41 "$FX/src-m4.1-5d9efa6.egg-farm.html" --old-p1 "$FX/src-m4.1-p1-30b29d3.egg-farm.html"; done
  # 3 telemetry v0.6.2 (Chromium)
  # T-AC2 hidden split (HoQ 2026-10-29 20:12): HARD on Chromium (in T-chromium); Firefox/WebKit run TS2 only, HARD unless the document.hidden stub can't apply (reason logged by the checker)
  MIDS=$(cd "$WT" && node -e "try{const M=require('./src/config/balance.json').m4.milestones;console.log([...M.hens.map(m=>'hens:'+m.level),...M.grades.map(g=>'grade:'+g.level),...M.balanced.map((_,i)=>'balanced:'+(i+1))].join(','))}catch(e){console.log('')}" 2>/dev/null); echo "milestone id enum (RC balance.json): '$MIDS'" | tee -a "$SUM"
  RING=$(cd "$WT" && node -e "try{const b=require('./src/config/balance.json');const f=o=>o&&typeof o==='object'?('ring_size' in o?o.ring_size:Object.values(o).map(f).find(x=>x!==undefined)):undefined;console.log(f(b)??'')}catch(e){console.log('')}" 2>/dev/null); echo "telemetry ring_size (RC balance.json): '$RING'" | tee -a "$SUM"
  # T steps (HoQ Q-TEL-1, 2026-10-30): --schema v062 + --balance = the COMMITTED balance.json at the run SHA (rc-balance.json, the one G1 checked); telemetry-check
  # derives the flags from it and exits 2 if --flags differs. --tel-schema shipped is a DIAGNOSTIC/regression mode only: it is a HARD FAIL on a non-dry run.
  case $TSCHEMA in v062) ;; shipped) if [ $DRY = 0 ]; then HF=$((HF+1)); echo "T-schema | FAIL | HARD | --tel-schema shipped is diagnostic only, not v5 gate evidence (HoQ Q-TEL-1)" | tee -a "$SUM"; else echo "T-schema | INFO | DIAG | --tel-schema shipped (dry run diagnostic)" | tee -a "$SUM"; fi;; *) echo "--tel-schema v062|shipped"; exit 2;; esac
  say "T steps: --schema $TSCHEMA --balance rc-balance.json (sha256 $BSHA)"
  [[ ",$ENGINES," == *,chromium,* ]] || notrun T-chromium HARD "engine not selected"
  [[ ",$ENGINES," == *,chromium,* ]] && step T-chromium HARD LK T-chromium timeout 600 node "$SC/telemetry-check.mjs" --schema $TSCHEMA --balance "$BJ" --html "$HTML" --engine chromium --port $PORT --out "$R/telemetry" --expect-build "$XB" ${FLAGS:+--flags "$FLAGS"} ${MIDS:+--milestone-ids "$MIDS"} ${RING:+--ring-size $RING} --qa-dir "$WT/dist-qa"
  # SS-15 Rule 2 share guard (Q10). TODO(RC): set SS15_MODULE (path under the worktree), SS15_EXPORT and SS15_SIG from the #5b PR body.
  if [ -n "${SS15_MODULE:-}" ]; then step U-ss15-share-guard HARD bash -c "cd $WT && node_modules/.bin/vite-node $SC/ss15-share-guard.mjs -- --module $WT/$SS15_MODULE --export ${SS15_EXPORT:?} --sig ${SS15_SIG:-loss,income} --out $R/ss15/result.json"
  elif C=$(na_cite U-ss15-share-guard); then na U-ss15-share-guard HARD "$C"
  else notrun U-ss15-share-guard HARD "SS15_MODULE/SS15_EXPORT not bound and no cited N/A in gate-na.txt"; fi
  for E in firefox webkit; do [[ ",$ENGINES," == *",$E,"* ]] || notrun T2-$E HARD "engine not selected"; done
  for E in ${ENGINES//,/ }; do [ $E = chromium ] && continue; step T2-$E HARD LK T2-$E timeout 600 node "$SC/telemetry-check.mjs" --schema $TSCHEMA --balance "$BJ" --html "$HTML" --engine $E --port $PORT --out "$R/telemetry-$E" --expect-build "$XB" --only TS2 ${FLAGS:+--flags "$FLAGS"}; done
else for id in S-chromium S-firefox S-webkit T-chromium U-ss15-share-guard T2-firefox T2-webkit; do notrun $id HARD "no RC html ($HTML)"; done
fi
# 4 existing suites (may need adapting to M5 APIs: triage a FAIL before calling it a defect)
for t in m41-7-save-noreg oq2-offline-grant-once; do [ -d "$WT/tests" ] && cp "$M3/$t.qa.test.ts" "$WT/tests/"; done
step V-oq2 HARD bash -c "cd $WT && npx vitest run tests/oq2-offline-grant-once.qa.test.ts --maxWorkers=2 --minWorkers=1"
basewt(){ ( [ -e "$WB" ] || git -C "$GIT" worktree add --detach "$WB" "$BASE" || return 1; cd "$WB" && { [ -d node_modules ] || npm ci --no-audit --no-fund; } && cp "$M3/m41-7-save-noreg.qa.test.ts" tests/ && NOREG_OUT=$R/noreg-base-${BASE:0:7}.json npx vitest run tests/m41-7-save-noreg.qa.test.ts --maxWorkers=2 --minWorkers=1 ); }
step V-noreg-base INFO basewt
step V-noreg-rc HARD bash -c "cd $WT && NOREG_OUT=$R/noreg-rc-$S7.json npx vitest run tests/m41-7-save-noreg.qa.test.ts --maxWorkers=2 --minWorkers=1"
step V-noreg-compare HARD bash -c "node $M3/m41-7-save-noreg-compare.mjs $R/noreg-rc-$S7.json $R/noreg-base-${BASE:0:7}.json > $R/noreg-compare.txt && sed -n 2,4p $R/noreg-compare.txt && grep -q 'valid-DIFF 0, .*errors 0' $R/noreg-compare.txt && grep -q 'reloadLossless=false: none' $R/noreg-compare.txt && ! grep -qE 'samePick=false|sameState=false' $R/noreg-compare.txt"
csr8(){ ( set +o pipefail; LK B-csr8-lease timeout 600 node $M3/csr-m41-7-b8-14.mjs $WT $PORT $R/csr8 $S7 csr8 | tee /dev/stderr | grep -q '^DONE fails=0$' ); }
step B-csr8-lease HARD csr8
# resetat full run held the lock ~9.5 min in the dry run: split into two holds to stay under 10 min each
step B-resetat-AC1-3 HARD LK B-resetat-AC1-3 env ONLY=BRS-AC1,BRS-AC2,BRS-AC3 timeout 600 node "$M3/csr-m41-7-resetat.mjs" "$WT" $PORT "$R/resetat-a" $S7 chromium
step B-resetat-AC4-CLK HARD LK B-resetat-AC4-CLK env ONLY=BRS-AC4,BRS-CLK timeout 600 node "$M3/csr-m41-7-resetat.mjs" "$WT" $PORT "$R/resetat-b" $S7 chromium
# 5 cleanup (own worktrees only; keep if dirty) + manifest
for w in "$WT" "$WB"; do [ -d "$w" ] && { rm -f "$w"/tests/*.qa.test.ts; git -C "$w" status --porcelain | grep -q . && say "KEEP dirty $w" || git -C "$GIT" worktree remove --force "$w"; }; done
stopwin; say "lock window used: $(( ($(date +%s)-T0)/60 )) min of $((GATE_WINDOW_S/60))$([ $(( $(date +%s)-T0 )) -gt $GATE_WINDOW_S ] && echo ' OVERRUN: HoQ + UI QA must already have been told')"
say "LOCK handover: Saves gate holds no browser lock from here (last 'released' line above); lock order per HoQ QA-D-1030-SAVES-RC-2: Saves first, ui lane holds no lock from 13:50 until the Saves release"
NR=$(grep -c '| FAIL | HARD' "$SUM"); echo "counts: PASS $(grep -c '| PASS |' "$SUM"), FAIL-HARD $NR, NOT-RUN-HARD $(grep -c '| NOT RUN | HARD' "$SUM"), N/A $(grep -c '| N/A |' "$SUM") (N/A only from gate-na.txt, cited)" | tee -a "$SUM"; VERD=$([ $HF = 0 ] && echo PASS || echo FAIL); echo "VERDICT: $VERD (hard_fail=$HF) $([ $DRY = 1 ] && echo DRYRUN)" | tee -a "$SUM"; say "DONE $VERD"
sign_results   # LAST writer of status.log, then signs it (see sign_results above)
exit $([ $HF = 0 ] && echo 0 || echo 1)
