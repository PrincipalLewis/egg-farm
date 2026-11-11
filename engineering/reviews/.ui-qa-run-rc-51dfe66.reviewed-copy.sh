#!/bin/bash
# [v5-ui harness, NEW 2026-10-29] v5 single-RC UI QA lane (queue row V5-U; D-CEO-20261029-01). ONE command once HoE posts the RC SHA:
#   QA_CI_ACK="<CI run url / 'green per HoE msg <ts>'>" artifacts/v5-ui/harness/run-rc.sh <40-char-sha> [steps]
#   QA_DRYRUN=1 -> writes to artifacts/v5-ui/dryrun-<sha7>/run-rc/ labelled HARNESS DRY-RUN, NOT EVIDENCE (main / feature branches only)
#   steps (comma list, default all): setup,gates,variants,unit,browser,shots,manifest     ENGS="chromium firefox webkit" (one engine at a time, in order)
#   Capacity defaults per HoQ ruling QA-D-1029-V5UCAP:
#   (a) TWO LANES (HoQ QA-D-1030-V5ULANE, after the 23:21 incident; replaces the D-CEO-03 three-lane wiring). PARALLEL=2 (default):
#       lane A: firefox alone          -> $ROOT/.browser-test.lock    ports PO=0   (never pauses)
#       lane B: chromium, then webkit  -> $ROOT/.browser-test-2.lock  ports PO=1   (pauses before its next step while the 1-min load >= MAXLOAD 12,
#                                                                                   resumes below it; every pause/resume logged in lanes.txt + summary)
#       The lane-3 lock (.browser-test-3.lock) is retired. PARALLEL=0 = one serial lane (A lock) over $ENGS.
#       PROCESS RULE 21 (D-CEO-20261029-04, HoO interim rule): every spawned step goes through ops/tools/lane-run.sh under this run's own lane
#       names (uiqa-<sha7>-<stamp>-{main,A,B,zg}, pidfiles in $ROOT/.pids/); the ONLY stop path is ops/tools/lane-kill.sh <lane> <pid> with a PID
#       read from this run's pidfile (600 s watchdog on browser steps). No kill/pkill/killall/pgrep/ps/awk-walk anywhere; never touch Claude
#       processes. If a TERMed step is still alive 30 s later, run-rc STOPS and reports (no SIGKILL, no descendant search).
#       WEBKIT (HoQ 07:40): main run = all 3 engines; lane B runs Chromium, then lib/wk-preflight.mjs (one headless WebKit launch via lane-run,
#       logs version + rc), then WebKit. Preflight failure skips ONLY WebKit (engines/webkit.SKIPPED.json); Cr/FF continue. No package installs.
#       FALLBACK segment (WebKit down/skipped):  ENGINES=webkit MODE=prerun ./run-rc.sh --lane wk   (P2_HEAD default; P2_HEAD_CONFIRMED needed)
#                                                ENGINES=webkit QA_CI_ACK=... ./run-rc.sh <sha> --lane wk  (RC)
#       -> lane W on the lane-B lock, ports +2, same load pause, same preflight; reuses main's worktree/build (refuses setup/build/gates/variants/unit);
#       writes ONLY <run-dir>/wk/ with its own SHA256SUMS and, last, wk/WK-DONE.json (manifest hash). Refuses to start if WK-DONE.json exists.
#       Main manifests exclude ./wk/. Each engine writes engines/<eng>.DONE.json; lib/merge-engines.py writes MERGED.json (DONE/PENDING/BROKEN);
#       at the RC carry-over.py runs a second time on prerun-p2/wk/ only if WK-DONE.json's hash verifies -> WK_CARRY_SUITES (else WK re-runs).
#       Never wraps, changes or signals the Claude Code setup or any Claude-powered bot's processes (Vadim's rule); it only stops its own pidfile PIDs.
#       QA_LOAD_STUB_FILE=<file> overrides /proc/loadavg (dry-run only). One results manifest per engine: results/manifests/SHA256SUMS.<engine>.
#   (b) Art: Chromium full width set; FF/WK only 360x640 375x667 390x844 1280x800 + docked 1280x720.
#   (c) Legacy p1-30b29d3 regressions: full in Chromium, 375 only in FF and WK, unless lib/legacy-overlap.py (module graph + CSS selector diff,
#       BASE_SHA..RC) finds an overlap for a suite -> that suite full in all 3 engines. Decision -> results/legacy-overlap.{json,txt} + summary.
#   MATRIX=full forces the full matrix everywhere (pre-ruling behaviour).
#   (c') NARROWED by QA-D-1029-V5UCAP2: a module overlaps only if the suite measures it directly (changed non-comment lines emitting a measured
#       class/id; reachability through app.ts does not count) -> suites with CSS-selector or direct overlap FULL in all 3 engines, others Cr full + FF/WK 375.
#   MODE=prerun (QA-D-1029-V5UPRE, D-CEO-20261029-02, one-time v5 exception): P2_HEAD=<sha> P2_HEAD_CONFIRMED="<ref>" MODE=prerun run-rc.sh <P2_HEAD>
#       -> ONLY the legacy suites on the confirmed P2_HEAD with the V5UCAP2 split; artifacts/v5-rc-ui/prerun-p2/<suite>/ + PRERUN.json + SHA256SUMS,
#       PROVISIONAL. No Art, no v5 probes. At the RC (MODE=rc, default) lib/carry-over.py diffs P2_HEAD..RC: carried suites get the one 3-engine smoke
#       pass at 360/390/1280 + carry-over.json; the rest (all of them if any shared input changed) re-run with the V5UCAP2 matrix. NO_CARRY=1 disables.
# Rules baked in: worktree /tmp/qa-v5-<sha7> (detached, never pushed); own ports (never :4173; probes use OS-assigned ports, fixed ones below are
# 5171-5199); EVERY browser command runs via lane-run.sh as lib/lane-step.sh (flock on the lane lock, only that command under it, 600 s watchdog -> lane-kill.sh); build-id asserted in-page on every
# load by every probe (QA_BID from the built dist-qa, must contain +<sha7>); outputs -> artifacts/v5-ui/<sha7>/results/ with SHA256SUMS in every dir.
# Stops only PIDs recorded in its own lane pidfiles, and only via ops/tools/lane-kill.sh (rule 21). No git push/merge/tag, no GitHub comments, no messages, GITHUB_TOKEN never read or printed.
set -u -o pipefail
# QA-D-1030 (HoQ 07:35): WebKit is a separately startable lane segment. `--lane wk` (anywhere in the args) or SEG=wk. ENGINES= is an alias of ENGS=.
SEG=${SEG:-main}; _a=(); while [ $# -gt 0 ]; do case $1 in --lane) SEG=${2:?--lane needs wk|main}; shift 2;; --lane=*) SEG=${1#--lane=}; shift;; *) _a+=("$1"); shift;; esac; done; set -- "${_a[@]+"${_a[@]}"}"
case $SEG in main|wk) ;; *) echo "--lane must be main or wk"; exit 2;; esac
[ -n "${ENGINES:-}" ] && ENGS=$ENGINES
[ $# -eq 0 ] && [ "$SEG" = wk ] && [ "${MODE:-rc}" = prerun ] && set -- "${P2_HEAD:-76390f2834b98e981ef52a3e165436acd9170654}"   # WK pre-run segment targets P2_HEAD
SHA=${1:?usage: run-rc.sh <40-char sha> [steps]}; [[ $SHA =~ ^[0-9a-f]{40}$ ]] || { echo "need the full 40-char SHA"; exit 2; }
unset QA_M5_FORCE   # plumbing-smoke switch, never at the RC
MODE=${MODE:-rc}   # rc | prerun (QA-D-1029-V5UPRE, D-CEO-20261029-02: one-time v5 exception) | m5dry (QA-D-1029-V5UCAP3 (2): MODE=m5dry PIECE=<piece> run-rc.sh <PR-head sha>)
export QA_MODE=$MODE   # m5/streak.mjs: streak cap != 0.28 is FAIL only when QA_MODE=rc (D-HOP-2026-10-29-08 (1))
if [ "$SEG" = wk ]; then   # WK segment: reuses the main segment's worktree + builds; never setup/build/gates/variants/unit (those belong to main)
  [ "$MODE" = m5dry ] && { echo "--lane wk is for MODE=prerun or rc"; exit 2; }
  if [ "$MODE" = prerun ]; then STEPS=${2:-legacy,manifest}; ok="legacy manifest"; else STEPS=${2:-browser,shots,manifest}; ok="browser shots manifest"; fi
  for x in ${STEPS//,/ }; do [[ " $ok " == *" $x "* ]] || { echo "--lane wk allows only [$ok]; got $x"; exit 2; }; done
elif [ "$MODE" = prerun ]; then STEPS=${2:-setup,build,legacy,manifest}
  for x in ${STEPS//,/ }; do case $x in setup|build|legacy|manifest) ;; *) echo "PRERUN allows only setup,build,legacy,manifest (no Art, no v5 probes: RC-only); got $x"; exit 2;; esac; done
elif [ "$MODE" = m5dry ]; then STEPS=${2:-setup,m5variant,m5,manifest}   # QA-D-1029-V5UCAP3 (2): per-piece PR-head dry-run, PREP / NOT EVIDENCE
  case "${PIECE:-}" in golden|streak|abilities|broody|bbstop|pause) ;; *) echo "MODE=m5dry needs PIECE=<golden|streak|abilities|broody|bbstop|pause>"; exit 2;; esac
  for x in ${STEPS//,/ }; do case $x in setup|m5variant|m5|manifest) ;; *) echo "m5dry allows only setup,m5variant,m5,manifest; got $x"; exit 2;; esac; done
else STEPS=${2:-setup,gates,variants,unit,browser,shots,manifest}; fi; has(){ [[ ",$STEPS," == *",$1,"* ]]; }
S7=${SHA:0:7}; ROOT=/workspace/egg-farm-studio; REPO=$ROOT/game; HN=$(cd "$(dirname "$0")" && pwd); V5=$(dirname "$HN"); LOCK=$ROOT/.browser-test.lock; LOCK2=$ROOT/.browser-test-2.lock
MATRIX=${MATRIX:-ruled}; FULL_SUITES=all; MAXLOAD=${MAXLOAD:-12}; LANE=A; PO=0; PARALLEL=${PARALLEL:-2}; [ "$PARALLEL" = 0 ] || PARALLEL=2
LANE_RUN=$ROOT/ops/tools/lane-run.sh; LANE_KILL=$ROOT/ops/tools/lane-kill.sh; PIDDIR=$ROOT/.pids; LNB=uiqa-${SHA:0:7}-$(date +%Y%m%d%H%M%S)   # rule 21: this run's own lane names/pidfiles
if [ "$MODE" = m5dry ]; then R=$V5/dryrun-m5-$PIECE-$S7/; elif [ "${QA_DRYRUN:-0}" = 1 ]; then R=$V5/dryrun-$S7/run-rc$([ "$MODE" = prerun ] && echo -prerun)/; elif [ "$MODE" = prerun ]; then R=$ROOT/artifacts/v5-rc-ui/prerun-p2/; else R=$ROOT/artifacts/v5-rc-ui/$S7/results/; fi;   # results dir per HoE 20:20 amendment (engineering/decisions.md L236) + HoQA rulings; prep tree stays artifacts/v5-ui/
 WT=/tmp/qa-v5-$S7; ENGS=${ENGS:-chromium firefox webkit}   # HoQ 07:40: all 3 engines (A = FF; B = Cr then WK after wk-preflight). Fallback: ENGS="chromium firefox" + --lane wk later
if [ "$SEG" = wk ]; then [ "$(echo $ENGS)" = webkit ] || { echo "--lane wk runs ENGS=webkit only (got [$ENGS])"; exit 2; }
  R=${R%/}/wk/   # own result subfolder + own SHA256SUMS; never writes into the Cr/FF tree
  [ -e $R/WK-DONE.json ] && { echo "refusing: $R/WK-DONE.json exists - the WK segment never re-runs or overwrites a completed WK result (move it aside only with HoQ sign-off)"; exit 2; }
  [ -d $WT ] && [ -f $WT/dist-qa/index.html ] || { echo "--lane wk needs the main segment's worktree+build at $WT (run the main segment's setup/build first)"; exit 3; }
else [[ " $ENGS " == *" webkit "* ]] || echo "note: WebKit not in this main run -> PENDING until the --lane wk segment (fallback) writes wk/WK-DONE.json"; fi
BASE_SHA=${BASE_SHA:-30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134}   # last shipped UI baseline (M4.1 p1); import-isolation compares against it
V5_BASE=${V5_BASE:-22eac98c75b9e82944f34a1feb77830521f34aee}      # v5 base (main before p2/M5); HoQA Q3 goldens at the v5-p2 piece gate compare P2_HEAD vs this
P2_HEAD=${P2_HEAD:-76390f2834b98e981ef52a3e165436acd9170654}   # FINAL (UI eng 23:15, HoQ 23:15, manifest row 3; verified = refs/pull/83/head + gh headRefOid 23:15 CET): carry-over base
PRERUN_DIR=${PRERUN_DIR:-$ROOT/artifacts/v5-rc-ui/prerun-p2}   # pre-run evidence read by carry-over.py at the RC
if [ "$MODE" = prerun ]; then [ "$SHA" = "$P2_HEAD" ] || { echo "PRERUN targets the confirmed P2_HEAD only: export P2_HEAD=$SHA after UI eng confirms it (manifest row 3)"; exit 2; }
  [ -n "${P2_HEAD_CONFIRMED:-}" ] || { echo "PRERUN refused: set P2_HEAD_CONFIRMED to the confirmation reference (manifest row 3 line / message ts)"; exit 2; }
  [ "${QA_DRYRUN:-0}" = 1 ] || [ ! -e ${R%/}/PRERUN.json ] || { echo "prerun-p2/ already holds a pre-run (one-time exception); move it aside only with HoQ sign-off"; exit 2; }; fi
CARRY_SUITES=""; RERUN_SUITES=all; WK_CARRY_SUITES=""
ZG_BASE_SHA=${ZG_BASE_SHA:-$P2_HEAD}  # pre-ZG build for the ZG-AC12 'flag off = M4.1' comparison (zg-compare.py); unset -> AC12 compare UNVERIFIED
FLAG_FILE=${FLAG_FILE:-src/config/balance.json}   # HoQA Q8 CLOSED (QA-D-1029-Q8): single m4 namespace (flag block L165, F3 Draft PR #82 @ c5b03719)
M4_FLAG=m4.enabled; ZG_FLAG=m4.flags.zeroGainUi; BB_FLAG=m4.flags.bestBuyV2; ZG_CONFIRM=m4.zeroGain.confirm; SS_FLAG=m4.flags.salesStopped; FC_FLAG=m4.flags.fatigueCue; PAUSE_FLAG=m4.flags.pause
MANIFEST=${MANIFEST:-$ROOT/engineering/v5-rc-manifest.md}   # row 34 ship-value table (L82-101); read at RC time by lib/ship-values.py
SHIP_VALUES=${SHIP_VALUES:-}   # HoQ's recorded values at the RC SHA for the still-conditional rows, "path=v,path=v" (rule: 1 if piece passed its gate, 0 if cut).
                               # When every unruled row is covered -> variant 'shipped' is built and the Art set is shot on it (QA_ART_VARIANT=shipped).
export QA_STRICT=1   # missing surfaces on the RC are FAIL, not UNVERIFIED
[ "$MODE" = m5dry ] && export QA_STRICT=0   # m5dry: probe debugging on a PR head; missing surfaces/hooks = UNVERIFIED (gap records)
AXE=$V5/tools/axe-core-4.14.0/axe.min.js; AXE_SHA=20c09fe157a8a34a30e241aaa1fcdade657734f08ab379ecfbeb7d45cc46e878
mkdir -p $R; RTOP=$R; exec > >(tee -a $R/run-rc.log) 2>&1
if [ "$MODE" = prerun ]; then LR=$R; else LR=$R/legacy/; fi; mkdir -p $LR
[ "$MODE" = m5dry ] && { QA_CI_ACK="PREP: m5dry $PIECE on PR head $S7 - NOT EVIDENCE"; echo "PREP / NOT EVIDENCE: QA-D-1029-V5UCAP3 (2) per-piece PR-head dry-run of m5/$PIECE probes on $SHA ($(date '+%F %T %Z')). For debugging the probes before the RC; no verdict." > $R/PREP-NOT-EVIDENCE.txt; }
[ "${QA_DRYRUN:-0}" = 1 ] && { QA_CI_ACK="HARNESS DRY-RUN, NOT EVIDENCE"; echo "HARNESS DRY-RUN, NOT EVIDENCE" > $R/DRY-RUN-NOT-EVIDENCE.txt; }
[ -n "${QA_CI_ACK:-}" ] || { echo "refusing: set QA_CI_ACK to the CI-green evidence for $SHA (UI QA runs only on a CI-green RC)"; exit 2; }
echo "== run-rc $SHA steps=$STEPS engines=[$ENGS] $(date '+%F %T %Z') load=$(cut -d' ' -f1-3 /proc/loadavg) ci_ack=$QA_CI_ACK" | tee -a $R/summary.txt
# ---- rule 21 process plumbing: spawn ONLY via lane-run.sh, stop ONLY via lane-kill.sh with a PID from this run's own pidfile ----
[ -x $LANE_RUN ] && [ -x $LANE_KILL ] || { echo "rule 21: $LANE_RUN / $LANE_KILL missing -> refusing to run"; exit 3; }
stof(){ local p s _r; while read -r p s _r; do [ "$p" = "$2" ] && echo "$s"; done < "$PIDDIR/$1.pids" | tail -1; }   # recorded start time (field 22) of PID $2 in lane $1
alive(){ [ -r /proc/$1/stat ] && [ "$(sed 's/^.*) //' /proc/$1/stat 2>/dev/null | cut -d' ' -f20)" = "$2" ]; }    # same process as recorded (PID reuse safe)
lstop(){ local ln=$1 pid=$2 st=$3 why=$4; echo "$(date +%T) lane-kill.sh $ln $pid ($why)" | tee -a $RTOP/lanes.txt; $LANE_KILL $ln $pid >> $RTOP/lane-kill.log 2>&1
  local i; for i in $(seq 30); do alive $pid $st || return 0; sleep 1; done
  echo "STOP (rule 21): $ln pid $pid still alive 30 s after lane-kill.sh TERM ($why). run-rc halts here; no escalation, no descendant search - report to HoQ/HoO." | tee -a $RTOP/summary.txt; exit 9; }
# lrun <lane> <name> <lockfile|-> <watchdog_s|0> <log> -- cmd...   (blocks; returns the step's exit code; 124 = watchdog, 125 = no exit code)
lrun(){ local ln=$1 n=$2 lk=$3 tmo=$4 log=$5; shift 5; [ "${1:-}" = "--" ] && shift; local d=$RTOP/run/$n; mkdir -p $d; rm -f $d/exit $d/stamp
  local pid st; pid=$($LANE_RUN $ln -- bash $HN/lib/lane-step.sh "$log" $d/exit $d/stamp $lk -- "$@") || { [ -s $d/exit ] && return $(cat $d/exit); echo "lane-run failed for $n" >> $log; return 125; }
  echo "$ln $pid" > $d/pid; st=$(stof $ln $pid)
  while alive $pid "$st"; do
    if [ "$tmo" -gt 0 ] && [ -s $d/stamp ] && [ $(( $(date +%s) - $(cat $d/stamp) )) -gt $tmo ]; then lstop $ln $pid "$st" "watchdog: $n > ${tmo}s after lock"; echo 124 > $d/exit; break; fi
    sleep 1; done
  [ -s $d/exit ] && return $(cat $d/exit); return 125; }
step(){ n=$1; shift; s=$(date +%s); lrun $LNB-main $n - 0 $R/logs/$n.log -- "$@"; e=$?; printf '%s\t%s\t%ss\t%s\n' "$(date +%T)" "$n" "$(( $(date +%s)-s ))" "exit=$e" | tee -a $R/steps.tsv; return $e; }
# QA-D-1029-V5UCAP4: background ZG sims - no browser lock, own log + exit code, nice'd single process (box is shared); joined before manifest/summary.
ZG_BG_WANT=; ZGPID=; ZG_T0=
zgbg_start(){ [ -n "$ZG_BG_WANT" ] && [ -z "$ZGPID" ] || return 0; mkdir -p $R/zg $RTOP/run/zg-trace; ZG_T0=$(date +%s); rm -f $RTOP/run/zg-trace/exit
  ZGPID=$($LANE_RUN $LNB-zg -- bash $HN/lib/lane-step.sh $R/logs/zg-trace.log $RTOP/run/zg-trace/exit $RTOP/run/zg-trace/stamp - -- bash -c "cd $WT && exec nice -n 10 env ZG_SEEDS=${ZG_SEEDS:-200} ZG_T=12000 ZG_F27_T=12000 npx vite-node $HN/zg/zg-trace.ts -- $WT $R/zg") || ZGPID=
  ZGST=$(stof $LNB-zg ${ZGPID:-x}); echo "${ZGPID:-none} $ZGST" > $R/zg/zg-trace.pid; printf '%s\t%s\t%s\t%s\n' "$(date +%T)" "zg-trace(bg start, lane-run $LNB-zg)" "pid=${ZGPID:-FAILED}" "-" | tee -a $R/steps.tsv; ZGPID=${ZGPID:-failed}; }
zgbg_join(){ [ -n "$ZGPID" ] || return 0; local e=0; [ "$ZGPID" = failed ] || while alive $ZGPID "$ZGST"; do sleep 5; done; [ -s $RTOP/run/zg-trace/exit ] && e=$(cat $RTOP/run/zg-trace/exit) || e=125; local dt=$(( $(date +%s)-ZG_T0 ))
  printf '%s\t%s\t%ss\t%s\n' "$(date +%T)" "zg-trace(bg join)" "$dt" "exit=$e" | tee -a $R/steps.tsv; echo "exit=$e elapsed_s=$dt pid=$ZGPID" > $R/zg/zg-trace.exit
  if [ $e -ne 0 ] || ! grep -q '^DONE zg-trace' $R/logs/zg-trace.log; then   # crash: recorded, never swallowed -> its rows FAIL
    python3 -c "import json,sys;json.dump(dict(crash=True,exit=$e,elapsed_s=$dt,rows=['FX-F27','ZG-AC5 horizon','ZG-AC7','ZG-AC7 horizon','ZG-AC20','ZG-AC20 horizon'],result='FAIL (zg-trace crashed or did not finish; see logs/zg-trace.log tail)',tail=open('$R/logs/zg-trace.log',errors='replace').read()[-2000:]),open('$R/zg/zg-trace-CRASH.json','w'),indent=1)"
    echo "zg-trace CRASH (bg, exit=$e, ${dt}s): FX-F27 + ZG-AC5/7/20 rows FAIL (zg/zg-trace-CRASH.json)" | tee -a $R/summary.txt; ZGPID=; return 1; fi
  echo "zg-trace (bg, ${dt}s, exit=$e): $(grep -hE '^(PASS|FAIL|UNVERIFIED|BLOCKED-HoE) ' $R/logs/zg-trace.log | cut -c1-120 | tr '\n' ';')" >> $R/summary.txt; ZGPID=; }
H="node --import $HN/lib/console-hook.mjs"
# browser step: ONLY the browser command is under the lock. env QA_* passed through. Records load average for the lane log.
loadnow(){ if [ -n "${QA_LOAD_STUB_FILE:-}" ] && [ -s "$QA_LOAD_STUB_FILE" ]; then head -c 16 "$QA_LOAD_STUB_FILE" | tr -d '\n '; else cut -d' ' -f1 /proc/loadavg; fi; }
lanelock(){ case $LANE in B|W) echo $LOCK2;; *) echo $LOCK;; esac; }   # W = WebKit segment (shares the B lock: runs after/between Cr steps, never two engines on one lock)
guard(){ [ "$LANE" = B ] || [ "$LANE" = W ] || return 0; local ld p=0   # lane B only: pause before its next step while load >= MAXLOAD; lane A never pauses
  while ld=$(loadnow); awk "BEGIN{exit !($ld >= $MAXLOAD)}"; do [ $p = 1 ] || { echo "$(date +%T) lane $LANE: PAUSE (1-min load $ld >= $MAXLOAD) before $1" | tee -a $RTOP/lanes.txt >> $RTOP/summary.txt; p=1; }; sleep 15; done
  [ $p = 0 ] || echo "$(date +%T) lane $LANE: RESUME (load $ld < $MAXLOAD) -> $1" | tee -a $RTOP/lanes.txt >> $RTOP/summary.txt; }
b(){ n=$1; shift; guard $n; s=$(date +%s); lrun $LNB-$LANE $n $(lanelock) 600 $R/logs/$n.log -- env CONSOLE_LOG=$R/console/$n.jsonl RUN_TAG=$n "$@"; e=$?
     printf '%s\t%s\t%ss\t%s\tload=%s\tlane=%s\t%s\n' "$(date +%T)" "$n" "$(( $(date +%s)-s ))" "exit=$e" "$(loadnow)" "$LANE" "$(grep -h '^DONE' $R/logs/$n.log | tail -1 | cut -c1-160)" | tee -a $R/steps.tsv; }
# QA-D-1029-V5UCAP (c): legacy suite widths. lw <suite> <full widths...> -> full in Chromium / MATRIX=full / overlapping suites, else 375
lfull(){ [ "$MATRIX" = full ] || [ $eng = chromium ] || [ "$FULL_SUITES" = all ] || [[ ",$FULL_SUITES," == *",$1,"* ]]; }
lw(){ local su=$1; shift; if lfull $su; then echo "$@"; else echo 375; fi; }
mkdir -p $R/logs $R/console
export AXE QA_EV=$R QA_SHA=$SHA QA_SHA7=$S7
# ---------------------------------------------------------------- setup
if has setup; then
  echo "$(sha256sum $AXE | cut -c1-64)" | grep -qx $AXE_SHA || { echo "axe sha256 mismatch"; exit 3; }
  cd $REPO && git fetch -q origin && git cat-file -e $SHA^{commit} || { echo "SHA $SHA not found after fetch"; exit 3; }
  [ -d $WT ] || git worktree add --detach $WT $SHA > /dev/null; cd $WT; [ "$(git rev-parse HEAD)" = "$SHA" ] || { echo "HEAD mismatch in $WT"; exit 3; }
  step npm-ci npm ci --no-audit --no-fund
  step pw-install npx playwright-core install firefox webkit          # browsers into ~/.cache/ms-playwright (no system change)
  MB=$(ls -d ~/.cache/ms-playwright/webkit-*/minibrowser-wpe 2>/dev/null | tail -1)
  if [ -n "$MB" ] && LD_LIBRARY_PATH=$MB/lib:$MB/sys/lib ldd $MB/bin/MiniBrowser 2>/dev/null | grep -q 'not found'; then
    echo "webkit: restoring missing system libs from /workspace/qa-v5-runtime (debs extracted, no apt)"; [ -d /workspace/qa-v5-runtime/root ] || python3 /workspace/qa-v5-runtime/fetch-webkit-libs.py
    find /workspace/qa-v5-runtime/root -name '*.so*' \( -type f -o -type l \) -exec cp -an {} $MB/sys/lib/ \; ; fi
  { echo "browsers:"; /usr/bin/google-chrome --version; ls -d ~/.cache/ms-playwright/{firefox,webkit}-* ; } >> $R/summary.txt 2>&1
  [ -f $V5/tools/README.md ] && { echo "webkit system debs (Q12; list from tools/README.md by UI eng, versions read live via dpkg-query):"; awk -F'|' '/^\| [a-z]/ && NR>5 {gsub(/ /,"",$2); print $2}' $V5/tools/README.md | xargs -r dpkg-query -W -f='  ${Package} ${Architecture} ${Version}\n'; } > $R/browser-env.txt 2>&1; [ -f $R/browser-env.txt ] && cat $R/browser-env.txt >> $R/summary.txt
fi
cd $WT 2>/dev/null || { echo "no worktree $WT (run setup)"; exit 3; }
if has build; then step build-qa npm run build:qa; step build npm run build; fi
[ "$MODE" = m5dry ] && { step build-qa npm run build:qa || { echo "m5dry: build:qa failed on $S7"; exit 4; }; }
[ "$MODE" = m5dry ] && [ "$PIECE" = bbstop ] && { step build npm run build; step sg12-grep bash $HN/m5/sg12-grep.sh $WT; echo "sg12-grep (PREP): $(tail -1 $R/logs/sg12-grep.log)" >> $R/summary.txt; }   # SG-12(e) also in the bbstop dry-run   # m5dry: plain QA build (build-id check + fallback when the piece flag block is absent)   # PRERUN: the builds the legacy suites need (RC: in gates)
# ---------------------------------------------------------------- non-browser gates (CI-equivalent, re-run locally)
if has gates; then
  echo "HEAD $(git rev-parse HEAD) porcelain=$(git status --porcelain | wc -l)" >> $R/summary.txt
  step sync-check npx vite-node scripts/sync-economy-cli.ts -- --check
  step tsc npx tsc --noEmit
  step vitest npx vitest run --minWorkers=1 --maxWorkers=2
  step build npm run build; step build-html npm run build:html; step build-qa npm run build:qa
  step check-release-dist node scripts/check-release-build.mjs dist
  step check-release-html node scripts/check-release-build.mjs dist-html/egg-farm.html
  step sg12-grep bash $HN/m5/sg12-grep.sh $WT; echo "sg12-grep (SG-12(e), bb-stopgap d4c590ad; exit 0 PASS / 1 FAIL / 2 UNVERIFIED): $(tail -1 $R/logs/sg12-grep.log)" >> $R/summary.txt   # HoQ 23:01 (b): non-browser
  for d in dist dist-html dist-qa; do f=$(ls $d/*.html | head -1); echo "$d $(grep -o 'name="build-id" content="[^"]*"' $f) $(sha256sum $f | cut -c1-64)" >> $R/summary.txt; done
  echo "porcelain-after-gates=$(git status --porcelain | tr '\n' ' ')" >> $R/summary.txt
fi
BID=$(grep -o 'name="build-id" content="[^"]*"' $WT/dist-qa/index.html | sed 's/.*content="//;s/"//'); [[ $BID == *"+$S7" ]] || { echo "dist-qa build-id '$BID' does not end in +$S7 (dirty or stale build)"; exit 4; }
export QA_BID=$BID QA_WT=$WT; echo "QA_BID=$BID" >> $R/summary.txt
# shipped flag values (UNVERIFIED UNTIL RC: paths may differ; a missing path is reported, not guessed)
python3 - "$WT/$FLAG_FILE" $M4_FLAG $ZG_FLAG $ZG_CONFIRM $SS_FLAG $BB_FLAG $FC_FLAG $PAUSE_FLAG m4.flags.clockWage m4.flags.breeds >> $R/summary.txt <<'PY'
import json,sys; d=json.load(open(sys.argv[1]))
def g(p):
  x=d
  for k in p.split('.'):
    if not isinstance(x,dict) or k not in x: return '<absent>'
    x=x[k]
  return x
print('shipped flags:', {p: g(p) for p in sys.argv[2:]})
PY
# ---------------------------------------------------------------- variant builds (+dirty build-ids, flag edit only)
mkvariant(){ v=$1; shift; VW=$WT-$v; [ -d $VW ] || (cd $REPO && git worktree add --detach $VW $SHA > /dev/null)
  (cd $VW && git checkout -q -- . && python3 - "$FLAG_FILE" "$@" <<'PY'
import json,sys; f=sys.argv[1]; t=open(f,encoding='utf-8').read(); d=json.loads(t)
if json.dumps(d,indent=2,ensure_ascii=False)+'\n'!=t: sys.exit(f'{f}: JSON round-trip is not byte-identical; refusing a flag edit that would trip sync-economy --check')
for kv in sys.argv[2:]:
  p,v=kv.split('='); ks=p.split('.'); x=d
  for k in ks[:-1]:
    if k not in x: sys.exit(f'flag path {p} absent in {f}')
    x=x[k]
  if ks[-1] not in x: sys.exit(f'flag path {p} absent in {f}')
  x[ks[-1]]=json.loads(v)
open(f,'w',encoding='utf-8').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')   # ensure_ascii=False: byte-identical to JSON.stringify(...,2) (the § in workers._note broke build:qa's sync-economy --check; found by m5dry 22:56)
PY
  ) && (cd $VW && npm ci --no-audit --no-fund > /dev/null 2>&1 && npm run build:qa) && (cd $VW && git diff --stat) ; }
if has variants; then mkdir -p $R/flags
  # HoQA Q8: read ship values at the RC SHA (manifest row 34 vs the RC's balance.json); ruled values that differ from the RC build = FAIL
  python3 $HN/lib/ship-values.py $MANIFEST $WT/$FLAG_FILE $R/flags/ship-values.json > $R/flags/ship-values.txt 2>&1; SVX=$?
  echo "ship-values exit=$SVX (0 = RC balance.json matches every ruled row; see flags/ship-values.txt)" | tee -a $R/summary.txt
  sv(){ python3 -c "import json,sys;r=json.load(open('$R/flags/ship-values.json'))['rows'].get('$1',{});v=r.get('ship');print('' if v is None else v)"; }
  rec(){ v=$(echo ",$SHIP_VALUES," | grep -o ",$1=[^,]*" | cut -d= -f2); [ -n "$v" ] && echo $v || sv $1; }   # recorded (HoQ at RC) > ruled in manifest > '' (unruled)
  PAUSE_SHIP=$(rec $PAUSE_FLAG); export QA_PAUSE=${PAUSE_SHIP:-1}   # pause ruled/recorded 0 -> Pause cut -> SS-17 mh_paused N/A
  E="$M4_FLAG=1"   # every variant needs m4.enabled=1 (Q8)
  step variant-m4off mkvariant m4off "$M4_FLAG=0"
  step variant-zg-on mkvariant zg-on "$E" "$ZG_FLAG=1" "$BB_FLAG=0" "$ZG_CONFIRM=0"     # ZG ACs run flag-on; bestBuyV2 + confirm at their ruled ship value 0
  step variant-zg-off mkvariant zg-off "$E" "$ZG_FLAG=0" "$BB_FLAG=0" "$ZG_CONFIRM=0"
  step variant-zg-confirm mkvariant zg-confirm "$E" "$ZG_FLAG=1" "$BB_FLAG=0" "$ZG_CONFIRM=1"   # ZG-AC10 control (numeric 0/1)
  if [ "$QA_PAUSE" = 0 ]; then step variant-ss-on mkvariant ss-on "$E" "$SS_FLAG=1" "$FC_FLAG=1" "$PAUSE_FLAG=0"
  else step variant-ss-on mkvariant ss-on "$E" "$SS_FLAG=1" "$FC_FLAG=1" "$PAUSE_FLAG=1"; fi   # SS probes + eggfarmQa.stall/worker seams need salesStopped=1 (paused also pause=1, F>=10)
  step variant-ss-off mkvariant ss-off "$E" "$SS_FLAG=0"
  step variant-fc-off mkvariant fc-off "$E" "$SS_FLAG=1" "$FC_FLAG=0"   # fatigueCue = cut flag for the #5b Rule 2 chip: chip absent, rest of SS intact
  P5=$([ "${QA_PAUSE:-1}" = 0 ] || [[ ",${PIECE_CUT:-}," == *",pause,"* ]] && echo 0 || echo 1)
  step variant-m5-on mkvariant m5-on "$E" "m4.flags.golden=1" "m4.flags.streak=1" "m4.flags.tapCoins=1" "m4.flags.abilities=1" "m4.flags.broody=1" "$PAUSE_FLAG=$P5"   # M5.0 UI rows; bb stopgap follows m4.enabled
  # as-shipped variant: every unruled row needs a value recorded by HoQ at the RC SHA (SHIP_VALUES); otherwise the Art set stays on zg-on/ss-on (UNVERIFIED as-shipped)
  MISS=""; KV=""; for pth in $(python3 -c "import json;r=json.load(open('$R/flags/ship-values.json'))['rows'];print(' '.join(p for p in r if not p.startswith('m4.tc.')))"); do
    v=$(rec $pth); if [ -z "$v" ]; then MISS="$MISS $pth"; else KV="$KV $pth=$v"; fi; done
  if [ -z "$MISS" ]; then step variant-shipped mkvariant shipped $KV; export QA_ART_VARIANT=shipped; echo "variant shipped:$KV" >> $R/summary.txt
  else echo "variant shipped NOT BUILT: ship value not recorded for$MISS -> Art set shot on zg-on/ss-on; as-shipped Art set UNVERIFIED until HoQ records SHIP_VALUES at the RC" >> $R/summary.txt; fi
  MB=$WT-minbase; [ -d $MB ] || (cd $REPO && git worktree add --detach $MB $V5_BASE > /dev/null); step variant-minbase bash -c "cd $MB && npm ci --no-audit --no-fund > /dev/null 2>&1 && npm run build:qa"   # Art-minors baseline (p1 UI) for p2/minors-compare.py
  if [ -n "$ZG_BASE_SHA" ]; then BZ=$WT-base; [ -d $BZ ] || (cd $REPO && git worktree add --detach $BZ $ZG_BASE_SHA > /dev/null); step variant-base bash -c "cd $BZ && npm ci --no-audit --no-fund > /dev/null 2>&1 && npm run build:qa"; else echo "variant base (pre-ZG) NOT BUILT: ZG_BASE_SHA/P2_HEAD unset -> ZG-AC12 cross-build compare UNVERIFIED" >> $R/summary.txt; fi
  for v in m4off zg-on zg-off zg-confirm ss-on ss-off fc-off shipped base; do f=$WT-$v/dist-qa/index.html; [ -f $f ] && echo "variant $v $(grep -o 'name="build-id" content="[^"]*"' $f) diff: $(git -C $WT-$v diff --stat | tail -1)" >> $R/summary.txt || echo "variant $v NOT BUILT (see logs/variant-$v.log)" >> $R/summary.txt; done
fi
if [ "$MODE" = m5dry ] && has m5variant; then   # piece flag(s) on (+ m4.enabled); a SHA without the flag block -> build fails -> probes run on the plain build and flagGate records UNVERIFIED
  case $PIECE in golden) PF="m4.flags.golden=1";; streak) PF="m4.flags.streak=1 m4.flags.tapCoins=1";; abilities) PF="m4.flags.abilities=1";; broody) PF="m4.flags.broody=1";; bbstop) PF="";; pause) PF="$PAUSE_FLAG=1";; esac
  step variant-m5-$PIECE mkvariant m5-$PIECE "$M4_FLAG=1" $PF; VX=$?; echo "m5dry variant m5-$PIECE exit=$VX flags: $M4_FLAG=1 $PF" | tee -a $R/summary.txt
fi
vbid(){ grep -o 'name="build-id" content="[^"]*"' $WT-$1/dist-qa/index.html 2>/dev/null | sed 's/.*content="//;s/"//'; }
# ---------------------------------------------------------------- unit-level (no browser)
if has unit; then
  mkdir -p $R/zg $R/e4 $R/ss $R/isolation
  step zg-unit bash -c "cd $WT && npx vite-node $HN/zg/zg-unit.ts -- $WT $R/zg/zg-unit.json"
  ZG_BG_WANT=1   # QA-D-1029-V5UCAP4: the 12,000 s ZG sims (FX-F27 + ZG-AC5/7/20, D-HOP-09) start in the BACKGROUND at lane start (zgbg_start), joined before manifest (zgbg_join)
  for v in m4off; do [ -d $WT-$v ] && step e4-$v bash -c "cd $WT-$v && npx vite-node $HN/e4/qa-golden.ts -- $WT-$v | tee $R/e4/qa-golden-$v.out"; done
  step e4-head bash -c "cd $WT && npx vite-node $HN/e4/qa-golden.ts -- $WT | tee $R/e4/qa-golden-head.out"
  grep -h GOLDEN1 $R/e4/*.out | sed 's/^/E-4 /' >> $R/summary.txt; echo "E-4 expect flag-off GOLDEN1 f90d1678… (m4off); head (M4-on) QA-script GOLDEN1 was d0793b1b… on 30b29d3 and 22eac98: equal => no sim change vs p1; different => must match an intended M5 sim change (committed golden harness M4-on a54c9cf9 runs in vitest)" >> $R/summary.txt
  BW=/tmp/qa-v5-base-${BASE_SHA:0:7}; [ -d $BW ] || (cd $REPO && git worktree add --detach $BW $BASE_SHA > /dev/null && cd $BW && npm ci --no-audit --no-fund > /dev/null 2>&1)
  # SS-15 (R) and the Rule 2 share guard are Saves QA lane (HoQA Q10) -> not run here.
  # HoQA Q3 (a) module graph of the trace harness vs p2 changed files; (c) goldens at the v5-p2 piece gate (P2_HEAD vs V5_BASE)
  if [ -n "$P2_HEAD" ]; then python3 $HN/lib/module-graph.py $WT tests/bot-m4.ts $V5_BASE..$P2_HEAD > $R/isolation/module-graph.json; MGX=$?; echo "Q3(a) module-graph exit=$MGX (0 = no overlap; 1 = revert overlapping files in a /tmp variant)" >> $R/summary.txt
    if [ $MGX = 1 ]; then RV=$WT-q3rev; OV=$(python3 -c "import json;print(' '.join(json.load(open('$R/isolation/module-graph.json'))['overlap']))")   # HoQA Q3: revert just the overlapping files in a /tmp variant
      [ -d $RV ] || (cd $REPO && git worktree add --detach $RV $SHA > /dev/null); (cd $RV && git checkout -q -- . && git checkout -q $V5_BASE -- $OV && ln -sfn $WT/node_modules node_modules)
      git -C $WT diff $V5_BASE $P2_HEAD -- $OV > $R/isolation/q3-overlap.diff; step e4-q3rev bash -c "cd $RV && npx vite-node $HN/e4/qa-golden.ts -- $RV | tee $R/e4/qa-golden-q3rev.out"
      echo "Q3 revert variant $RV: reverted [$OV] to ${V5_BASE:0:7} (diff: isolation/q3-overlap.diff); trace-harness runs for TP1-R15/R17e use it; golden $(grep -h GOLDEN1 $R/e4/qa-golden-q3rev.out | cut -c1-20)" >> $R/summary.txt; fi
    for X in p2:$P2_HEAD v5base:$V5_BASE; do n=${X%%:*}; x=${X#*:}; XW=/tmp/qa-v5-$n-${x:0:7}; [ -d $XW ] || (cd $REPO && git worktree add --detach $XW $x > /dev/null && cd $XW && npm ci --no-audit --no-fund > /dev/null 2>&1); step e4-$n bash -c "cd $XW && npx vite-node $HN/e4/qa-golden.ts -- $XW | tee $R/e4/qa-golden-$n.out"; done
    a=$(grep -h GOLDEN1 $R/e4/qa-golden-p2.out); b=$(grep -h GOLDEN1 $R/e4/qa-golden-v5base.out); echo "Q3(c) goldens p2 vs v5 base: $([ -n "$a" ] && [ "$a" = "$b" ] && echo UNCHANGED || echo "DIFFER/MISSING ($a | $b)")" >> $R/summary.txt
  else echo "Q3 (a)/(c) UNVERIFIED: P2_HEAD (p2 commit list, manifest row 3) not provided" >> $R/summary.txt; fi
  # UI-M5-8 (no-emoji unit test, HoQA Q6): must exist in the RC and pass in the gates vitest run
  f=$(grep -rl "UI-M5-8" $WT/src $WT/tests 2>/dev/null | head -3 | tr "\n" " "); echo "UI-M5-8 test files: ${f:-NONE (FAIL)}; vitest log mentions: $(grep -c "UI-M5-8" $R/logs/vitest.log 2>/dev/null)" >> $R/summary.txt
  # AC-R15/R17e/ZG no-sim-change: UI-only diff evidence (import isolation): sim/config files touched by the RC vs baseline + any sim->ui import
  { echo "git diff --stat $BASE_SHA..$SHA -- src/sim src/config src/save:"; git -C $WT diff --stat $BASE_SHA $SHA -- src/sim src/config src/save
    echo "sim/save importing ui (must be empty):"; grep -rnE "from ['\"][./]*(\.\./)+ui/" $WT/src/sim $WT/src/save || echo none; } > $R/isolation/import-isolation.txt 2>&1
fi
# ---------------------------------------------------------------- legacy p1-30b29d3 regression suites (QA-D-1029-V5UCAP2 split; QA-D-1029-V5UPRE pre-run/carry-over)
# Output per suite: $LR/<suite>/ (RC: results/legacy/<suite>/, PRERUN: artifacts/v5-rc-ui/prerun-p2/<suite>/). Widths per suite:
#   PRERUN, or RC with the suite in RERUN_SUITES: V5UCAP2 split (FULL_SUITES from legacy-overlap.py: full in all 3 engines; others Cr full, FF/WK 375)
#   RC with the suite CARRIED (carry-over.py): the one 3-engine smoke pass at the main widths 360/390/1280 (those the suite supports)
csfor(){ [ "${eng:-}" = webkit ] && echo "$WK_CARRY_SUITES" || echo "$CARRY_SUITES"; }   # WebKit carries only from a DONE WK pre-run segment
lsel(){ local su=$1; shift; if [ "$MODE" = rc ] && [[ ",$(csfor)," == *",$su,"* ]]; then local o=""; for w in "$@"; do case ${w%%x*} in 360|390|1280) o="$o $w";; esac; done; echo ${o:-$1}; else lw $su "$@"; fi; }
lb(){ local su=$1; shift; [ -z "${LEGACY_ONLY:-}" ] || [[ ",$LEGACY_ONLY," == *",$su,"* ]] || return 0   # LEGACY_ONLY=<suites>: dry-run subset only
  ( R=$LR/$su/; mkdir -p $R/logs $R/console $R/$su $R/p1 $R/csr $R/p64 $R/p62 $R/browser $R/mrc1 $R/axe; export QA_EV=$R; b "$@"
    tail -1 $R/steps.tsv >> $R/progress.$eng.tsv   # partial results after every suite command: progress + per-engine partial manifest (lane-safe: one file per engine)
    (cd $R && find . -type f ! -name 'SHA256SUMS*' ! -name 'progress.*' | grep -E "(^|[-_/.])$eng([-_/.]|$)" | sort | xargs -r sha256sum > SHA256SUMS.partial.$eng) ); }   # copied p1-era probes write into <EV>/<suite>/ without creating it (found by the 23d2b78 sanity run, 22:23 CET)
run_legacy(){ eng=$1; export QA_VARIANT=default
  for w in $(lsel p1 360 375 390 1280); do lb p1 p1-$eng-$w env QA_TAG=full $H $HN/p1/p1.mjs $eng $w hens,asleep,axe,taps; done
  { [ "$MODE" = prerun ] || [[ ",$(csfor)," != *",p1,"* ]]; } && lfull p1 && lb p1 p1-$eng-430 env QA_TAG=full $H $HN/p1/p1.mjs $eng 430 asleep,axe
  for w in $(lsel tap 360 375 390); do lb tap tap-$eng-$w $H $HN/browser/p65-tap.mjs $eng $w $SHA; done
  lb sweep sweep-$eng $H $HN/browser/scroll-sweep-p1.mjs $eng $(lsel sweep 360 375 390)
  lb mrc1 mrc1-$eng $H $HN/mrc1/mrc1.mjs $eng rc
  for w in $(lsel p64 360 375 390); do lb p64 p64-$eng-$w env QA_PORT=$((5190+PO)) QA_TAG=ra $H $HN/p64/p64.mjs $eng $w head ra,huge; done
  for w in $(lsel csr 360 390); do lb csr csr-$eng-$w $H $HN/csr/csr-spot.mjs $eng $w; done
  SPORT=$((5185+PO)); mkdir -p $LR/p62/logs; SP=$($LANE_RUN $LNB-$LANE -- bash -c "exec node $HN/lib/serve.mjs $SPORT > $LR/p62/logs/serve-$SPORT-$eng.log 2>&1"); SPST=$(stof $LNB-$LANE $SP); sleep 1; export BASE=http://127.0.0.1:$SPORT/
  for w in $(lsel p62 360 375 390); do lb p62 p62-$eng-$w $H $HN/p62/p62.mjs $eng $w; done
  [ $eng = chromium ] && lb axe62 axe62 $H $HN/axe/axe62.mjs $( [ "$MODE" = rc ] && [[ ",$CARRY_SUITES," == *",axe62,"* ]] && echo 360,390 || echo 360,375,390)
  [ -n "$SP" ] && alive $SP "$SPST" && lstop $LNB-$LANE $SP "$SPST" "p62 static server done ($eng)"; unset BASE
  if [ $eng = chromium ]; then mkdir -p $LR/rc0-mrc1/rc0-shots; lb rc0-mrc1 rc0-chromium env PORT=$((5175+2*PO)) SHOTS=$LR/rc0-mrc1/rc0-shots $H scripts/rc0-browser.mjs chromium; lb rc0-mrc1 check-globals env PORT=$((5176+2*PO)) npm run check-globals
  else lb rc0-mrc1 rc0-mrc1-$eng env PORT=$((5175+2*PO)) ONLY=mrc1,sceneGuard,bannerFit,s28rate SHOTS=$LR/rc0-mrc1/rc0-shots $H scripts/rc0-browser.mjs $eng; fi; }
# ---------------------------------------------------------------- browser probes, one engine at a time
# ---------------------------------------------------------------- M5.0 UI rows (62 incl. AC-M5A-10; qa/m5 plans): spec-derived probes, UNVERIFIED until run on the RC SHA
# QA-D-1029-V5UCAP3 (1) default matrix, from harness/m5/bl.json: B rows -> Chromium only; L rows -> Chromium full set + FF/WK at 360x640 and 1280x800 only.
# Chromium full set: 360x640 360x844 390x844 1280x800 (+ BH-AC13/13b matrix, AC-P15 / SG-11 sizes). PIECE_CUT=<piece>[,..] (pause also QA_PAUSE=0) -> rows N/A.
m5secs(){ python3 -c "import json,sys;d=json.load(open('$HN/m5/bl.json'))['$1'];print(','.join(k for k,v in d.items() if '$2'=='all' or v[0]=='$2'))"; }
run_m5(){ local eng=$1 v=$2 vb=$3; local M5O=(env QA_WT=$WT${v:+-$v} QA_BID=$vb QA_VARIANT=${v:-default} PIECE_CUT=${PIECE_CUT:-} QA_PAUSE=${QA_PAUSE:-})
  for pc in ${M5_PIECES:-golden streak abilities broody bbstop pause}; do
    if [ $eng = chromium ]; then secs=$(m5secs $pc all); sizes="360x640 360x844 390x844 1280x800"; else secs=$(m5secs $pc L); sizes="360x640 1280x800"; fi
    [ -n "$secs" ] || continue
    for z in $sizes; do b m5-$pc-$eng-$z "${M5O[@]}" $H $HN/m5/$pc.mjs $eng $z $secs; done
    [ $pc = streak ] && for z in $(node -e "import('$HN/m5/oracles.mjs').then(o=>console.log(Object.values(o.streak26b()).filter(r=>/^yes/.test(r.matrix)).map(r=>r.viewport).join(' ')))"); do case " $sizes " in *" $z "*) continue;; esac
      b m5-st26b-$eng-$z "${M5O[@]}" $H $HN/m5/streak.mjs $eng $z ac26b; done   # ST-AC26b: every §9.1 CSV matrix row, 3 engines (spec acb4cdbb; 375x844 derived -> INFO)
    if [ $eng = chromium ]; then
      [ $pc = broody ] && for z in 375x667 375x844 430x844 1024x474 1280x720 1366x768 959x600 960x600 960x1280 1024x1366; do b m5-broody13-$eng-$z "${M5O[@]}" $H $HN/m5/broody.mjs $eng $z ac13,ac13b; done
      [ $pc = pause ] && for z in 959x600 960x600 1024x1366 1280x720; do b m5-pause15-$eng-$z "${M5O[@]}" $H $HN/m5/pause.mjs $eng $z p15; done
      [ $pc = bbstop ] && for z in 959x600 960x600; do b m5-sg11-$eng-$z "${M5O[@]}" env ZG_BASE_URL=${ZG_BASE_URL:-} ZG_BASE_BID=$(vbid base) $H $HN/m5/bbstop.mjs $eng $z sg11; done; fi
  done; }
run_engine(){ eng=$1; export QA_VARIANT=default QA_ZG_PRE=$R/zg/zg-unit.json QA_SUPERSEDE_R17=1   # p1 S1-S3 superseded per harness/p1/superseded-by-AC-R17.md (HoQA Q14)
  b env-$eng $H $HN/lib/env-versions.mjs $eng   # HoQA Q12
  for z in 360x640 390x844 1280x800; do b c2-$eng-$z $H $HN/p2/c2-welcome.mjs $eng $z; done   # TP1-C2 (HoQA Q2)
  SSB=$(vbid ss-on); SSO=(env QA_WT=$WT-ss-on QA_BID=$SSB QA_VARIANT=ss-on)   # SS probes need salesStopped=1 (eggfarmQa seams, Q9)
  [ -n "$SSB" ] || echo "SS probes NOT RUN on $eng: variant ss-on not built -> SS rows FAIL (QA_STRICT)" >> $R/summary.txt
  [ -n "$SSB" ] && for z in 360x640 390x844 959x600 1280x800; do b ssb-$eng-$z "${SSO[@]}" $H $HN/ss/ss-banner.mjs $eng $z s25,s12,s20,s24; done   # SS-12/20/24/25 (HoQA Q5/Q10)
  vb=$(vbid fc-off); [ -n "$vb" ] && for z in 390x844 1280x800; do b ssb-fcoff-$eng-$z env QA_WT=$WT-fc-off QA_BID=$vb QA_VARIANT=fc-off $H $HN/ss/ss-banner.mjs $eng $z s24; done   # cut flag: chip absent
  vb=$(vbid ss-off); [ -n "$vb" ] && for z in 390x844 1280x800; do b ssb-ssoff-$eng-$z env QA_WT=$WT-ss-off QA_BID=$vb QA_VARIANT=ss-off $H $HN/ss/ss-banner.mjs $eng $z s23a; done
  vb=$(vbid base); [ -n "$vb" ] && for z in 360x640 390x844 1280x800; do b zg-base-$eng-$z env QA_WT=$WT-base QA_BID=$vb QA_SHA7=${ZG_BASE_SHA:0:7} QA_VARIANT=base $H $HN/zg/zg.mjs $eng $z flagoff; done   # ZG-AC12 baseline
  for w in $(lw p1 360 375 390 1280); do b p1-$eng-$w env QA_TAG=full $H $HN/p1/p1.mjs $eng $w hens,asleep,axe,taps; done; lfull p1 && b p1-$eng-430 env QA_TAG=full $H $HN/p1/p1.mjs $eng 430 asleep,axe
  for z in 360x640 375x667 390x844 430x932 1280x800; do b p2-$eng-$z $H $HN/p2/p2.mjs $eng $z r17,p2b,r16,explore,minors; done
  for z in 360x640 375x844 390x844 959x600 960x600 1024x1366 1280x800; do [ -n "$SSB" ] && b ss1617-$eng-$z "${SSO[@]}" $H $HN/ss/ss1617.mjs $eng $z rects,copy; done   # forced shows: no sales_stall asserted (Q9)
  [ -n "$SSB" ] && for z in 360x640 1280x800; do b ssac-$eng-$z "${SSO[@]}" $H $HN/ss/ss-ac.mjs $eng $z; done   # SS-1..8,18,26,30,31,33,34,35 (natural triggers; SS-35 forced, no telemetry)
  for z in 360x640 390x844 1280x800; do b wk51-$eng-$z $H $HN/m51/wk51.mjs $eng $z fc9,fc12,lr14,lr17; done   # M5.1 worker UI FC9/FC12/LR14/LR17(+LR18); flag off -> N/A
  MBB=$(grep -o 'name="build-id" content="[^"]*"' $WT-minbase/dist-qa/index.html 2>/dev/null | sed 's/.*content="//;s/"//')
  for z in 360x800 390x844 1280x800; do b minors-$eng-$z $H $HN/p2/minors.mjs $eng $z; [ -n "$MBB" ] && b minors-base-$eng-$z env QA_WT=$WT-minbase QA_BID=$MBB QA_SHA7=${V5_BASE:0:7} QA_VARIANT=minors-base $H $HN/p2/minors.mjs $eng $z; done   # Art minors (HoQA Q6) + P2-5 refund pop; Art Minors are non-blocking (V5UCAP d)
  for z in 360x640 390x844 959x600 960x600 1280x800; do b zg-default-$eng-$z $H $HN/zg/zg.mjs $eng $z; done
  for v in zg-on zg-off zg-confirm m4off; do vb=$(vbid $v); [ -n "$vb" ] || { echo "skip $v (not built)"; continue; }
    secs=$([ $v = zg-confirm ] && echo confirm,buy || ([ $v = zg-on ] && echo display,flip,star,nav,buy,layout,tele || echo flagoff,display,tele))
    for z in 360x640 390x844 1280x800; do b zg-$v-$eng-$z env QA_WT=$WT-$v QA_BID=$vb QA_VARIANT=$v $H $HN/zg/zg.mjs $eng $z $secs; done
    [ $v = zg-on ] && for z in 959x600 960x600; do b zg-$v-$eng-$z env QA_WT=$WT-$v QA_BID=$vb QA_VARIANT=$v $H $HN/zg/zg.mjs $eng $z layout; done
    [ $v = m4off ] && for w in $(lw p1 360 375 390); do b p1flagoff-$eng-$w env QA_WT=$WT-$v QA_BID=$vb QA_TAG=flagoff $H $HN/p1/p1.mjs $eng $w flagoff; done; done
  M5O=(); vb=$(vbid m5-on); [ -n "$vb" ] && run_m5 $eng m5-on $vb || echo "m5-on variant not built: 62 M5.0 rows UNVERIFIED on $eng" >> $R/summary.txt
  run_legacy $eng; }
shots_engine(){ eng=$1; for v in default zg-on zg-off zg-confirm ss-on shipped; do
    if [ $v = default ]; then vw=$WT; vb=$BID; else vw=$WT-$v; vb=$(vbid $v); [ -n "$vb" ] || continue; fi
    for z in $(python3 -c "import json,sys;L=json.load(open('$R/shot-list.json'));print(' '.join(sorted({p['size'] for p in L['planned'] if p['engine']=='$eng' and p['variant']=='$v'})))"); do
      if [ "$MATRIX" != full ] && [ $eng != chromium ]; then case $z in 360x640|375x667|390x844|1280x800|1280x720) ;; *) continue;; esac; fi   # (b)
      b art-$v-$eng-$z env QA_WT=$vw QA_BID=$vb QA_VARIANT=$v QA_ZG_PRE=$R/zg/zg-unit.json $H $HN/shots/art-set.mjs $eng $z $R/shot-list.json; done; done; }
engdone(){ mkdir -p $RTOP/engines; python3 -c "import json,time;json.dump(dict(engine='$1',segment='$SEG',lane='$LANE',sha='$SHA',build_id='${BID:-}',mode='$MODE',finished=time.strftime('%Y-%m-%dT%H:%M:%S%z')),open('$RTOP/engines/$1.DONE.json','w'),indent=1)"; }
wk_preflight(){ mkdir -p $RTOP/logs; lrun $LNB-$LANE wk-preflight - 120 $RTOP/logs/wk-preflight.log -- node $HN/lib/wk-preflight.mjs $WT; local e=$?
  echo "$(date +%T) lane $LANE: $(grep -h '^WK-PREFLIGHT' $RTOP/logs/wk-preflight.log | tail -1 || echo "WK-PREFLIGHT no output") (exit=$e)" | tee -a $RTOP/lanes.txt >> $RTOP/summary.txt
  if [ $e -ne 0 ]; then mkdir -p $RTOP/engines; python3 -c "import json,time;json.dump(dict(engine='webkit',status='SKIPPED',reason='wk-preflight failed (exit $e); see logs/wk-preflight.log',rejoin='ENGINES=webkit ... run-rc.sh --lane wk (writes wk/, never re-runs Cr/FF)',at=time.strftime('%Y-%m-%dT%H:%M:%S%z')),open('$RTOP/engines/webkit.SKIPPED.json','w'),indent=1)"
    echo "WebKit SKIPPED in lane $LANE (preflight failed): Cr/FF unaffected; WebKit rejoins later via --lane wk (fallback)" | tee -a $RTOP/summary.txt; return 1; fi; }
lane(){ for eng in "$@"; do [ $eng = webkit ] && { has browser || has legacy; } && { wk_preflight || continue; }   # HoQ 07:40: aborts only the WK part of the lane
  echo "== lane $LANE engine $eng $(date +%T)"; if [ "$MODE" = prerun ]; then has legacy && run_legacy $eng; elif [ "$MODE" = m5dry ]; then has m5 && { vb=$(vbid m5-$PIECE); if [ -n "$vb" ]; then M5_PIECES=$PIECE run_m5 $eng m5-$PIECE $vb; else M5_PIECES=$PIECE run_m5 $eng "" $(grep -o 'name="build-id" content="[^"]*"' $WT/dist-qa/index.html | sed 's/.*content="//;s/"//'); fi; }; else has browser && run_engine $eng; has shots && shots_engine $eng; fi; engdone $eng; done; }   # per-engine completion marker (merge picks engines up by these)
# ---------------------------------------------------------------- browser probes + Art screenshot set (D-CEO-20261028-02)
if has shots; then python3 $HN/shots/gen-shot-list.py $R/shot-list.json > $R/logs/shot-list.txt; fi
if has browser || has shots || has legacy || has m5; then
  if [ "$MODE" = rc ] && has browser; then   # QA-D-1029-V5UPRE carry-over: P2_HEAD..RC; only with a pre-run on record
    if [ -f $PRERUN_DIR/PRERUN.json ] && [ -z "${NO_CARRY:-}" ]; then PH=$(python3 -c "import json;print(json.load(open('$PRERUN_DIR/PRERUN.json'))['p2_head'])")
      python3 $HN/lib/carry-over.py $WT $PH..$SHA $HN $PRERUN_DIR $LR > $R/carry-over.txt 2>&1
      CARRY_SUITES=$(grep '^CARRY_SUITES=' $R/carry-over.txt | cut -d= -f2); RERUN_SUITES=$(grep '^RERUN_SUITES=' $R/carry-over.txt | cut -d= -f2)
      for su in ${CARRY_SUITES//,/ }; do mkdir -p $LR/$su/prerun; cp -a $PRERUN_DIR/$su/. $LR/$su/prerun/; done
      if [[ " $ENGS " == *" webkit "* ]]; then WKD=$PRERUN_DIR/wk   # WK pre-run counts only when its segment wrote WK-DONE.json and its own sums verify
        if [ -f $WKD/WK-DONE.json ] && [ "$(sha256sum $WKD/SHA256SUMS 2>/dev/null | cut -c1-64)" = "$(python3 -c "import json;print(json.load(open('$WKD/WK-DONE.json'))['sha256sums_sha256'])")" ]; then
          python3 $HN/lib/carry-over.py $WT $PH..$SHA $HN $WKD $LR/wk-carry > $R/carry-over-wk.txt 2>&1; WK_CARRY_SUITES=$(grep '^CARRY_SUITES=' $R/carry-over-wk.txt | cut -d= -f2)
          for su in ${WK_CARRY_SUITES//,/ }; do mkdir -p $LR/$su/prerun-wk; cp -a $WKD/$su/. $LR/$su/prerun-wk/; done
          echo "carry-over WebKit (from $WKD, WK-DONE): carried [${WK_CARRY_SUITES:-none}]" | tee -a $R/summary.txt
        else echo "carry-over WebKit: no DONE WK pre-run segment ($WKD/WK-DONE.json missing or sums mismatch) -> every WebKit legacy suite runs on the RC" | tee -a $R/summary.txt; fi; fi
      echo "carry-over (${PH:0:7}..$S7): carried [${CARRY_SUITES:-none}] -> 3-engine smoke 360/390/1280 only; re-run on RC [${RERUN_SUITES:-none}] (V5UCAP2 matrix); results/carry-over.txt, legacy/*/carry-over.json" | tee -a $R/summary.txt
    else echo "carry-over: no pre-run on record ($PRERUN_DIR/PRERUN.json) or NO_CARRY set -> every legacy suite runs on the RC (V5UCAP2 matrix)" | tee -a $R/summary.txt; fi; fi
  if [ "$MODE" != m5dry ] && [ "$MATRIX" != full ]; then python3 $HN/lib/legacy-overlap.py $WT $BASE_SHA..$SHA $HN $R/legacy-overlap.json > $R/legacy-overlap.txt 2>&1
    FULL_SUITES=$(grep '^FULL_SUITES=' $R/legacy-overlap.txt | cut -d= -f2); grep -q '^FULL_SUITES=' $R/legacy-overlap.txt || FULL_SUITES=all
    echo "legacy-overlap (QA-D-1029-V5UCAP2 narrowed rule, $BASE_SHA..$S7): full in all engines = [${FULL_SUITES:-none}]; others Cr full + FF/WK 375 (results/legacy-overlap.json)" | tee -a $R/summary.txt; fi
  echo "lanes: PARALLEL=$PARALLEL MATRIX=$MATRIX" | tee -a $R/summary.txt
  zgbg_start   # V5UCAP4: ZG sims run alongside the lanes (sim only, no lock)
  if [ "$SEG" = wk ]; then echo "$(date +%T) lane W (webkit segment, lock $LOCK2, ports +2, pauses at load >= $MAXLOAD)" >> $R/lanes.txt; LANE=W; PO=2; lane webkit
  elif [ "$PARALLEL" = 2 ]; then EA=$(echo $ENGS | tr ' ' '\n' | grep -x firefox); EB=$(for e in chromium webkit; do [[ " $ENGS " == *" $e "* ]] && echo $e; done)
    [ -n "$EA" ] && { ( LANE=A; PO=0; lane $EA ) > $R/logs/laneA.log 2>&1 & LA=$!; echo "$(date +%T) lane A ($EA, lock $LOCK, ports +0) driver subshell $LA" >> $R/lanes.txt; }
    [ -n "$EB" ] && { ( LANE=B; PO=1; lane $EB ) > $R/logs/laneB.log 2>&1 & LBP=$!; echo "$(date +%T) lane B ($(echo $EB), lock $LOCK2, ports +1, pauses at load >= $MAXLOAD) driver subshell $LBP" >> $R/lanes.txt; }
    for x in ${LA:-} ${LBP:-}; do wait $x; echo "$(date +%T) lane driver $x exit=$?" >> $R/lanes.txt; done   # bash's own subshells; joined, never signalled
  else lane $ENGS; fi
  { has browser || has legacy; } && mkdir -p $LR/sweep/logs && (cd $WT && QA_EV=$LR/sweep/ node $HN/browser/scroll-sweep-p1.mjs --summary > $LR/sweep/logs/sweep-summary.txt 2>&1)
  if has browser; then
    python3 $HN/p2/minors-compare.py $R > $R/logs/minors-compare.txt 2>&1; echo "minors-compare exit=$? (0 PASS, 1 FAIL, 2 nothing comparable)" | tee -a $R/summary.txt
    python3 $HN/zg/zg-compare.py $R > $R/logs/zg-compare.txt 2>&1; echo "zg-compare exit=$? (0 PASS, 1 FAIL, 2 nothing comparable, 3 some UNVERIFIED): $(tail -1 $R/logs/zg-compare.txt)" | tee -a $R/summary.txt; fi
fi
zgbg_start; zgbg_join || true   # V5UCAP4: join before manifest/summary (start here if no browser steps ran); a crash is recorded above and fails its rows
mkdir -p $RTOP/pids; for f in $PIDDIR/$LNB-*.pids; do [ -f "$f" ] && cp "$f" $RTOP/pids/; done   # rule 21: this run's own pidfiles go into the evidence
# ---------------------------------------------------------------- manifest + tallies
if has manifest && [ "$MODE" = prerun ]; then   # per-suite PRERUN.json + recursive SHA256SUMS (carry-over.py verifies them at the RC)
  echo "PROVISIONAL pre-run (QA-D-1029-V5UPRE, D-CEO-20261029-02 one-time v5 exception): legacy suites on P2_HEAD $SHA ($BID), confirmed: $P2_HEAD_CONFIRMED. Stands for the RC only through carry-over.py; never a verdict on its own." > $R/PROVISIONAL.txt
  for su in p1 tap sweep mrc1 p64 csr p62 axe62 rc0-mrc1; do [ -d $R/$su ] || continue
    python3 -c "import json,sys;json.dump(dict(p2_head='$SHA',build_id='$BID',suite='$su',engines='$ENGS'.split(),full_in_all_engines='$su' in '$FULL_SUITES'.split(',') or '$FULL_SUITES'=='all',matrix_rule='QA-D-1029-V5UCAP2',classification='legacy-overlap.json',label='PROVISIONAL pre-run, not evidence until carried over at the RC',confirmed='''$P2_HEAD_CONFIRMED''',ended='$(date '+%F %T %Z')'),open('$R/$su/PRERUN.json','w'),indent=1)"
    (cd $R/$su && find . -type f ! -name 'SHA256SUMS*' | sort | xargs -r sha256sum > SHA256SUMS); done
  cp $R/legacy-overlap.json $R/legacy-overlap.txt $R/ 2>/dev/null; python3 -c "import json;json.dump(dict(p2_head='$SHA',build_id='$BID',confirmed='''$P2_HEAD_CONFIRMED''',full_suites='$FULL_SUITES'),open('$R/PRERUN.json','w'),indent=1)"
  (cd $R && find . -type f ! -path './wk/*' ! -name 'SHA256SUMS*' | sort | xargs -r sha256sum > SHA256SUMS); echo "prerun results: $R ($(wc -l < $R/SHA256SUMS) files)"
elif has manifest && [ "$MODE" = m5dry ]; then   # PREP / NOT EVIDENCE
  python3 $HN/m5/m5-gaps.py $R $R/m5-gaps.json >> $R/summary.txt 2>&1
  (cd $R && find . -type f ! -name 'SHA256SUMS*' | sort | xargs -r sha256sum > SHA256SUMS); echo "m5dry $PIECE $S7 done $(date '+%F %T %Z') - PREP, NOT EVIDENCE" | tee -a $R/summary.txt
elif has manifest; then [ -f $R/shot-list.json ] || python3 $HN/shots/gen-shot-list.py $R/shot-list.json > $R/logs/shot-list.txt
  python3 $HN/shots/make-shot-manifest.py $R $R/shot-list.json > $R/logs/shot-manifest.txt 2>&1; echo "shot manifest exit=$? $(cat $R/logs/shot-manifest.txt)" >> $R/summary.txt
  python3 $HN/m5/m5-gaps.py $R $R/m5-gaps.json >> $R/summary.txt 2>&1   # M5.0: per-piece tallies + spec gaps (not a verdict)
  python3 - $R >> $R/summary.txt <<'PY'
import json,glob,sys,collections; R=sys.argv[1]; c=collections.Counter(); bad=[]
for f in glob.glob(R+'console/*.jsonl'):
  for l in open(f):
    o=json.loads(l); k=o.get('kind'); c[k]+=1
    if k in ('console.error','pageerror') or (k=='load' and o.get('bidOk') is False and o.get('bid')): bad.append((f.split('/')[-1],k,str(o.get('text') or o.get('bid'))[:120]))
print('console tally', dict(c), 'problems', len(bad)); [print('  ',*b) for b in bad[:40]]
t=collections.Counter()
for f in glob.glob(R+'**/*.jsonl',recursive=True):
  for l in open(f):
    try: o=json.loads(l)
    except: continue
    if o.get('rt')=='done': t['pass']+=o.get('pass',0); t['fail']+=o.get('fail',0); t['unverified']+=o.get('unverified',0)
print('probe tally', dict(t))
PY
  echo "end $(date '+%F %T %Z') HEAD $(git -C $WT rev-parse HEAD) porcelain=$(git -C $WT status --porcelain | wc -l)" >> $R/summary.txt
  (cd $R && find . -type d ! -path './wk' ! -path './wk/*' | while read d; do (cd "$d" && find . -maxdepth 1 -type f ! -name 'SHA256SUMS*' -print0 | sort -z | xargs -0 -r sha256sum > SHA256SUMS); done)
  mkdir -p $R/manifests; for e in chromium firefox webkit; do (cd $R && find . -type f ! -path './manifests/*' ! -path './wk/*' ! -name 'SHA256SUMS*' | grep -E "(^|[-_/.])$e([-_/.]|$)" | sort | xargs -r sha256sum > manifests/SHA256SUMS.$e); echo "manifest $e: $(wc -l < $R/manifests/SHA256SUMS.$e) files" >> $R/summary.txt; done   # QA-D-1029-V5UCAP (a)
  (cd $R && find . -type f ! -path './wk/*' ! -name 'SHA256SUMS*' -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.all); echo "results: $R ($(wc -l < $R/SHA256SUMS.all) files)"
fi
# QA-D-1030: WK segment completion marker (written last, after its own sums) + merge view (never rewrites the Cr/FF or WK manifests)
if has manifest && [ "$SEG" = wk ]; then if [ "$MODE" = rc ]; then F=$R/SHA256SUMS.all; else F=$R/SHA256SUMS; fi
  python3 -c "import json,time,hashlib;json.dump(dict(segment='wk',engine='webkit',sha='$SHA',build_id='${BID:-}',mode='$MODE',sha256sums='${F##*/}',sha256sums_sha256=hashlib.sha256(open('$F','rb').read()).hexdigest(),finished=time.strftime('%Y-%m-%dT%H:%M:%S%z')),open('$R/WK-DONE.json','w'),indent=1)"
  echo "WK segment DONE $(date '+%F %T %Z'): $R/WK-DONE.json" | tee -a $R/summary.txt; fi
has manifest && python3 $HN/lib/merge-engines.py ${R%/wk/}/ > /dev/null 2>&1 || true   # MERGED.json: which engines are DONE (Cr/FF in main, WK from wk/)
