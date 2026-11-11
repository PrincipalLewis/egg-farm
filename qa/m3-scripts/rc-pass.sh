#!/bin/bash
# Final RC pass, Saves & Release QA lane 1 (qa/rc-pass-plan.md + HoQA carry-overs). Checklist: qa/m3-recheck/rc-pass-CHECKLIST.md
# usage: bash qa/m3-scripts/rc-pass.sh <full-rc-sha> [steps="pre unit ac7 l30 saves browser"]
#   ENGINES="chromium firefox webkit" (browser order)  DRY=1 (no browser/lock; preflight 'main==SHA'/'pushed' become warnings)
#   L30_CSV=<path> force the L30+ gate (auto when RC changes any *.csv vs CSV_BASE=dd52bfd)
# Ports 5961-5966 only (never 4173). Kills only its own servers (cwd under the RC worktree). Never pushes/merges/tags/messages.
set -u
SHA=${1:?full rc sha}; STEPS=${2:-pre unit ac7 l30 saves browser}; DRY=${DRY:-0}; ENGINES=${ENGINES:-chromium firefox webkit}
R=/workspace/egg-farm-studio; G=$R/game; L=$R/.browser-test.lock; Q=$R/qa/m3-recheck; SC=$R/qa/m3-scripts; CSV_BASE=${CSV_BASE:-dd52bfd}
git -C $G fetch -q origin || exit 1
FULL=$(git -C $G rev-parse --verify "$SHA^{commit}") || exit 1; S7=${FULL:0:7}
EV=$Q/rc-pass-$S7-evidence; W=/tmp/qa-rc/$S7; mkdir -p $EV /tmp/qa-rc
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $EV/summary.txt; }
reap(){ for pid in $(ss -ltnp | grep -E ":$1 " | grep -o 'pid=[0-9]*' | cut -d= -f2); do case "$(readlink /proc/$pid/cwd)" in $W*) kill $pid && log "reaped own server $pid :$1";; esac; done; }
has(){ case " $STEPS " in *" $1 "*) return 0;; esac; return 1; }
lock(){ if [ "$DRY" = 1 ]; then log "DRY skip: $*"; return 0; fi; flock $L timeout 600 "$@"; }
T0=$(date +%s); log "=== RC pass $FULL steps=[$STEPS] engines=[$ENGINES] DRY=$DRY"
[ -d $W ] || git -C $G worktree add --detach $W $FULL >/dev/null 2>&1 || exit 1
cd $W; [ "$(git rev-parse HEAD)" = "$FULL" ] || { log "worktree HEAD mismatch"; exit 1; }
BX="node $SC/build-id-expect.mjs"  # M41-10: expected prefix = BUILD_PREFIX in scripts/build-id.ts AT $FULL (fallback ^(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}); hash==sha7; no suffix
EXPECT=$($BX expect $G $FULL) || exit 1
if has pre; then t0=$(date +%s)
  pushed=$(git -C $G branch -r --contains $FULL | tr -d ' ' | tr '\n' ' '); main=$(git -C $G rev-parse origin/main)
  log "pushed on: ${pushed:-NONE}; origin/main=$main; main==RC: $([ "$main" = "$FULL" ] && echo YES || echo NO)"
  if [ "$main" != "$FULL" ] || [ -z "$pushed" ]; then [ "$DRY" = 1 ] && log "WARN preflight (DRY)" || { log "STOP: RC SHA must be pushed and equal origin/main"; exit 3; }; fi
  git log --oneline $CSV_BASE..$FULL > $EV/commits-since-$CSV_BASE.txt; git diff --stat $CSV_BASE $FULL > $EV/diffstat-since-$CSV_BASE.txt
  git diff --name-only $CSV_BASE $FULL -- '*.csv' > $EV/csv-changed.txt; log "csv changed vs $CSV_BASE: $(wc -l < $EV/csv-changed.txt) ($(tr '\n' ' ' < $EV/csv-changed.txt))"
  sha256sum data/*.csv data/staging/*.csv > $EV/csv-sha256.txt
  ( npm ci --no-audit --no-fund && npm run build && npm run build:qa && npm run build:html ) > $EV/build.log 2>&1; log "build (dist, dist-qa, dist-html + check-release-build) exit=$? $(( $(date +%s)-t0 ))s"
  log "static build-id: $($BX scan $G $FULL dist/index.html dist-qa/index.html dist-html/egg-farm.html | tr '\n' ' ')"
  node scripts/check-release-build.mjs dist-html/egg-farm.html > $EV/check-release-html.log 2>&1; log "check-release-build dist-html exit=$?"
  git status --porcelain | rg -v '^\?\?' > $EV/dirty.txt; log "tracked changes after build: $(wc -l < $EV/dirty.txt)"
fi
if has unit; then t0=$(date +%s)
  npx vite-node scripts/sync-economy-cli.ts -- --check > $EV/sync-check.log 2>&1; log "sync-economy --check exit=$?"
  npx tsc --noEmit > $EV/tsc.log 2>&1; log "tsc exit=$?"
  npx vitest run --maxWorkers=2 --minWorkers=1 > $EV/unit.log 2>&1; log "unit exit=$? $(( $(date +%s)-t0 ))s $(rg 'Tests ' $EV/unit.log | tail -1)"
  t0=$(date +%s); npm run -s test:slow > $EV/slow.log 2>&1; log "test:slow (vendor pins + AC7 band/worst-seed TS hard asserts) exit=$? $(( $(date +%s)-t0 ))s $(rg 'Tests ' $EV/slow.log | tail -1)"
  npx vitest run --maxWorkers=2 --minWorkers=1 tests/qa-rc1-bugs.test.ts $(ls tests | rg -i 'payout|parity|sellall|sale|m4a-tracks|hidden' | sed 's#^#tests/#') > $EV/payout-unit.log 2>&1; log "payout preview==credited unit (M4 on/off cases) exit=$? $(rg 'Tests ' $EV/payout-unit.log | tail -1)"
fi
if has ac7; then t0=$(date +%s)
  SEEDS=100 npx vite-node $SC/ac7-l18-25-gate-workers.ts $W > $EV/ac7-ts-workers.log 2>&1; log "AC7 TS bot WITH workers (official per HoP 00:35; L@30 band 20-24, L18-25 step) 100 seeds exit=$? $(( $(date +%s)-t0 ))s $(rg '^RESULT' $EV/ac7-ts-workers.log)"
  log "AC7 TS variance bot hard asserts = test:slow above ($(rg -o 'variance L18-25 slowest.*' $EV/slow.log 2>/dev/null | head -1))"
  t0=$(date +%s); SEEDS=100 npx vite-node $SC/ac7-l18-25-gate.ts $W > $EV/ac7-ts-noworkers-INFO.log 2>&1; log "INFO only (pre-F1 no-workers M2 gate; dd52bfd baseline = FAIL step 10.0): $(rg '^RESULT' $EV/ac7-ts-noworkers-INFO.log) $(( $(date +%s)-t0 ))s"
  t0=$(date +%s); sed -e "s#/workspace/egg-farm-studio/qa/wt-l30fix-C2#$W#g" -e "s#/workspace/egg-farm-studio/qa/scratch/l30fix-C2/C2_comb_L30b59_hv35.csv#$W/data/economy.csv#g" -e "s#py_ac7_C2.json#$EV/py_ac7.json#" $Q/l30fix-C2-1536be49/py_ac7_C2.py > $EV/py_ac7.py
  python3 $EV/py_ac7.py > $EV/py_ac7.log 2>&1; ec=$?
  t20=$(rg '^no workers variance' $EV/py_ac7.log | rg -o '"t20_P95": [0-9]+' | rg -o '[0-9]+$')
  log "Python cross-check (variance sim, 100 seeds) exit=$ec $(( $(date +%s)-t0 ))s no-workers t20 P95=${t20:-?} s (warn line 1740; HoP-recorded 1737) $([ -n "$t20" ] && [ "$t20" -le 1740 ] && echo OK || echo 'WARN >1740 or missing -> report to HoQA/HoP')"
fi
if has l30; then
  if [ -s $EV/csv-changed.txt ] || [ -n "${L30_CSV:-}" ]; then t0=$(date +%s); C=${L30_CSV:-$R/product/economy.l30plus-polish.csv}
    LC=$(sha256sum $R/product/sim/late/late_curve.py | cut -c1-12); CS=$(sha256sum $C | cut -c1-12)
    python3 $SC/l30plus-gate.py --seeds 100 --csv $C --csv-sha $CS --late-curve-sha $LC > $EV/l30plus-$CS.log 2>&1; log "L30+ gate (HoP rule: CSV change) csv=$CS lc=$LC exit=$? $(( $(date +%s)-t0 ))s $(rg -o 'OVERALL.*' $EV/l30plus-$CS.log | tail -1)"
  else log "L30+ gate: N/A (no CSV change vs $CSV_BASE)"; fi
fi
if has saves; then t0=$(date +%s)
  npx vitest run --maxWorkers=2 --minWorkers=1 $(ls tests | rg -i 'save|migrat|mirror|quota|saveseq|offline|hidden|clock|newer|bug6' | sed 's#^#tests/#') > $EV/save-unit.log 2>&1; log "save/load, migration, offline, hidden, quota unit subset exit=$? $(( $(date +%s)-t0 ))s $(rg 'Tests ' $EV/save-unit.log | tail -1)"
  cp src/config/balance.json $EV/balance.bak; node -e "const f='src/config/balance.json',j=require('./'+f);if(!j.m4){process.exit(3)}j.m4.enabled=1;require('fs').writeFileSync(f,JSON.stringify(j,null,2)+'\n')" && npx vite build --mode qa --outDir dist-qa-m4 > $EV/build-m4on.log 2>&1; log "dist-qa-m4 (M4 on, +dirty by design) exit=$?"
  cp $EV/balance.bak src/config/balance.json; log "worktree tracked changes after m4 build: $(git status --porcelain | rg -v '^\?\?' | wc -l) (want 0)"
fi
if has browser; then cp $SC/pr25-fwd-hidden.mjs $W/qa-hidden.mjs   # must run from the worktree (qa/ playwright lacks webkit; module resolution)
  for e in $ENGINES; do log "--- engine $e"
    p=5961; reap $p; t0=$(date +%s); lock env BUILD_SHA=$FULL node $Q/../scratch/m4a-31-delta/buildid-probe.mjs $W $e $p > $EV/buildid-$e.log 2>&1; log "runtime build-id $e exit=$? $(( $(date +%s)-t0 ))s $(rg -o 'runtime build ids.*' $EV/buildid-$e.log) (want [\"$EXPECT\"])"; reap $p
    p=5962; reap $p; t0=$(date +%s); lock env PORT=$p node scripts/release-globals-browser.mjs $e > $EV/globals-$e.log 2>&1; log "runtime globals $e exit=$? $(( $(date +%s)-t0 ))s $(rg -o '(PASS|FAIL).*' $EV/globals-$e.log | tail -1 | cut -c1-200)"; reap $p
    p=5963; reap $p; mkdir -p $EV/shots-rc0-$e; t0=$(date +%s); lock env PORT=$p SHOTS=$EV/shots-rc0-$e node scripts/rc0-browser.mjs $e > $EV/rc0-$e.log 2>&1; ec=$?; log "rc0 $e exit=$ec $(( $(date +%s)-t0 ))s $(rg -o '[0-9]+/[0-9]+ passed' $EV/rc0-$e.log | tail -1)"; [ $ec = 124 ] && log "rc0 $e TIMEOUT 600 -> rerun chunked with ONLY= (see checklist)"; reap $p
    t0=$(date +%s); lock node $SC/rc-html-open.mjs $W $e $EV/shots-html $FULL > $EV/html-open-$e.log 2>&1; log "dist-html file:// $e exit=$? $(( $(date +%s)-t0 ))s $(rg -o '(PASS|FAIL).*' $EV/html-open-$e.log | cut -c1-200)"
    case " ${HIDDEN_ENGINES:-firefox} " in *" $e "*) for d in dist-qa dist-qa-m4; do p=5964; reap $p; o=$EV/hidden-$e-$d; mkdir -p $o; t0=$(date +%s); x=forbid; [ $d = dist-qa-m4 ] && x=require
      lock env PORT=$p DIST=$d BUILD_SHA=$FULL BUILD_DIRTY=$x OUT=$o node qa-hidden.mjs $e > $o/run.log 2>&1; log "hidden-tab ACs $e $d exit=$? $(( $(date +%s)-t0 ))s $(rg -o '[0-9]+/[0-9]+' $o/run.log | tail -1) (flag-off want 32/32; M4-on: invariants only, 20/32 baseline)"; reap $p; done;; esac
  done; rm -f $W/qa-hidden.mjs
fi
log "ALL_DONE $(( $(date +%s)-T0 ))s  expect: build-id $EXPECT; globals only eggfarmExportTelemetry; rc0 >=234/234; hidden ff 32/32; AC7 RESULT PASS; t20 <=1740"
