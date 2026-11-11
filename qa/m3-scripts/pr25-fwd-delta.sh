#!/bin/bash
# PR #25 forward-merge delta QA: bash qa/m3-scripts/pr25-fwd-delta.sh <sha> [steps="1 2 3 4 5 6 7"]  (DRY=1: no browser/lock steps)
# Ports 5861-5866 (never 4173). Kills only its own servers (cwd = worktree). No push/merge/tag/messages.
set -u
SHA=${1:?sha}; STEPS=${2:-1 2 3 4 5 6 7}; DRY=${DRY:-0}
R=/workspace/egg-farm-studio; G=$R/game; L=$R/.browser-test.lock; Q=$R/qa/m3-recheck; SC=$R/qa/m3-scripts
git -C $G fetch -q origin; S7=$(git -C $G rev-parse --short=7 $SHA) || exit 1; FULL=$(git -C $G rev-parse --verify "$SHA^{commit}") || exit 1
BX="node $SC/build-id-expect.mjs"  # M41-10: BUILD_PREFIX at $FULL (fallback regex); hash==sha7; no suffix
EV=$Q/pr25-fwd-$S7-evidence; W=/tmp/qa-pr25fwd/$S7; mkdir -p $EV
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $EV/summary.txt; }
reap(){ for pid in $(ss -ltnp | grep -E ":$1 " | grep -o 'pid=[0-9]*' | cut -d= -f2); do case "$(readlink /proc/$pid/cwd)" in $W*) kill $pid && log "reaped own server $pid :$1";; esac; done; }
rgc(){ n=$(rg -c "$@"); echo ${n:-0}; }
has(){ case " $STEPS " in *" $1 "*) return 0;; esac; return 1; }
CF="src/sim/actions.ts src/sim/payout.ts src/ui/app.ts src/game.ts src/config/formulas.ts src/config/balance.json src/ui/format.ts src/ui/styles.css tests/qa-rc1-bugs.test.ts"
[ -d $W ] || git -C $G worktree add --detach $W $SHA >/dev/null 2>&1 || { git clone -q $G $W && git -C $W checkout -q $SHA; }
cd $W
if has 1; then
  for a in d75d41f 72078b5 8e6d53e; do log "ancestry $a: $(git merge-base --is-ancestor $a $SHA && echo contained || echo NOT-contained)"; done
  log "parents: $(git log -1 --format=%P $SHA)"; log "#31 merged on main? $(git merge-base --is-ancestor d75d41f origin/main && echo yes || echo no)"
  for base in 59cce62 72078b5 d75d41f; do git diff $base $SHA -- $CF > $EV/conflict-diff-vs-$base.patch; git diff --stat $base $SHA -- $CF > $EV/conflict-stat-vs-$base.txt; done
  git diff --name-only d75d41f $SHA -- src > $EV/src-files-vs-d75d41f.txt; git diff --name-only 72078b5 $SHA -- src > $EV/src-files-vs-72078b5.txt
  # resolution invariants from HoE plan
  { echo "payout base salePriceCents: $(rgc 'salePriceCents\(s, b\)' src/sim/payout.ts)"; echo "payout eggPriceCents left: $(rgc 'eggPriceCents' src/sim/payout.ts)";
    echo "actions local saleValueCents defs (want 0): $(rgc 'const saleValueCents|function saleValueCents' src/sim/actions.ts)"; echo "actions re-export: $(rgc "export \{ sellAllPreview \} from './payout'" src/sim/actions.ts)";
    echo "app sellAllPreview from actions (want 0): $(rgc "sellAllPreview.*from '../sim/actions'" src/ui/app.ts)"; echo "app unit via saleValueCents: $(rgc 'saleValueCents\(s, k, b\)' src/ui/app.ts)";
    echo "app fmtMoneyShort uses: $(rg -o 'fmtMoneyShort\([a-zA-Z.]+' src/ui/app.ts | sort | uniq -c | tr '\n' ';')";
    echo "save hidden stamp: $(rgc 'hidden \? this\.hidden\.at' src/game.ts) quotaRetry(t, st): $(rgc 'saveWithQuotaRetry\(t, ?[a-z]' src/game.ts) persisted(st: $(rgc 'persisted\(st' src/game.ts) N6: $(rgc 'mirrorResumeOnSave = false' src/game.ts)";
    echo "hiddenSimMaxSeconds: balance $(rgc hiddenSimMaxSeconds src/config/balance.json) formulas $(rgc hiddenSimMaxSeconds src/config/formulas.ts) m4 block $(rgc '\"m4\"' src/config/balance.json)";
    echo "format exports: $(rg -o 'export (const|function) (fmtMoneyPreview|fmtMoneyExact|fmtAffordableIn|fmtMoneyShort)' src/ui/format.ts | tr '\n' ';')";
    echo "styles: tgPlay48 $(rgc 'tgPlay\{?\s*min-height:48px|#tgPlay\{min-height:48px' src/ui/styles.css) ghosts $(rgc ghost src/ui/styles.css)"; } > $EV/resolution-invariants.txt
  log "step1 done: $(tr '\n' '|' < $EV/resolution-invariants.txt)"
fi
if has 2; then t0=$(date +%s)
  ( npm ci --no-audit --no-fund && npm run build && npm run build:qa && npm run build:html ) > $EV/build.log 2>&1; log "build exit=$? $(( $(date +%s)-t0 ))s"
  log "static build-id: $($BX scan $G $FULL dist/index.html dist-qa/index.html dist-html/egg-farm.html 2>/dev/null | tr '\n' ' ')"
  npx vite-node scripts/sync-economy-cli.ts -- --check > $EV/sync-check.log 2>&1; log "sync-economy --check exit=$?"
  t0=$(date +%s); npx vitest run --maxWorkers=2 --minWorkers=1 > $EV/unit.log 2>&1; log "unit exit=$? $(( $(date +%s)-t0 ))s $(rg 'Tests ' $EV/unit.log | tail -1)"
  # M4-on QA build for step 4 (worktree-local edit, reverted)
  cp src/config/balance.json /tmp/qa-pr25fwd/balance.$S7.bak; node -e "const f='src/config/balance.json',j=require('./'+f);if(!j.m4){console.error('NO m4 block');process.exit(3)}j.m4.enabled=1;require('fs').writeFileSync(f,JSON.stringify(j,null,2)+'\n')"
  [ $? = 0 ] && npx vite build --mode qa --outDir dist-qa-m4 > $EV/build-m4on.log 2>&1; log "build dist-qa-m4 (m4.enabled=1) exit=$?"; cp /tmp/qa-pr25fwd/balance.$S7.bak src/config/balance.json; log "worktree clean after m4 build: $(git status --porcelain | rg -v '^\?\?' | wc -l) tracked changes"
fi
if has 4; then
  ( cd $W && npx vitest run --maxWorkers=2 --minWorkers=1 tests/sellall-label-grader.test.ts tests/qa-rc1-bugs.test.ts $(ls tests | rg -i 'payout|hidden|m4a-tracks|sale' | sed 's#^#tests/#') ) > $EV/payout-unit.log 2>&1; log "payout/parity unit exit=$? $(rg 'Tests ' $EV/payout-unit.log | tail -1)"
fi
if [ "$DRY" = 1 ]; then log "DRY=1: skipping browser steps 3/4/7"; STEPS=$(echo " $STEPS " | sed 's/ [347] / /g'); fi
if has 3; then reap 5863; mkdir -p $EV/shots-rc0-webkit; t0=$(date +%s)
  if [ -n "${RC0_CHUNKS:-}" ]; then i=0; for c in $RC0_CHUNKS; do i=$((i+1)); flock $L timeout 600 env PORT=5863 ONLY=$c SHOTS=$EV/shots-rc0-webkit node scripts/rc0-browser.mjs webkit > $EV/rc0-webkit-c$i.log 2>&1; log "rc0 webkit chunk$i [$c] exit=$? $(rg -o '[0-9]+/[0-9]+ passed' $EV/rc0-webkit-c$i.log | tail -1)"; reap 5863; done
  else flock $L timeout 600 env PORT=5863 SHOTS=$EV/shots-rc0-webkit node scripts/rc0-browser.mjs webkit > $EV/rc0-webkit.log 2>&1; ec=$?; log "rc0 webkit exit=$ec $(( $(date +%s)-t0 ))s $(rg -o '[0-9]+/[0-9]+ passed' $EV/rc0-webkit.log | tail -1)"; [ $ec = 124 ] && log "rc0 webkit TIMEOUT 600s -> rerun with RC0_CHUNKS (see PLAN)"; reap 5863; fi
fi
if has 4; then for e in ${HIDDEN_ENGINES:-webkit chromium}; do for d in dist-qa dist-qa-m4; do p=5864; reap $p; o=$EV/hidden-$e-$d; mkdir -p $o; t0=$(date +%s)
  flock $L timeout 600 env PORT=$p DIST=$d BUILD_SHA=$FULL OUT=$o node $SC/pr25-fwd-hidden.mjs $e > $o/run.log 2>&1; ec=$?; reap $p
  log "hidden $e $d exit=$ec $(( $(date +%s)-t0 ))s $(rg -o '[0-9]+/[0-9]+' $o/run.log | tail -1)"; done; done
fi
if has 5; then ( npx vitest run --maxWorkers=2 --minWorkers=1 $(ls tests | rg -i 'save|mirror|quota|saveseq|newer|bug6|hidden' | sed 's#^#tests/#') ) > $EV/save-unit.log 2>&1; log "save() unit subset exit=$? $(rg 'Tests ' $EV/save-unit.log | tail -1)"
  sed -n '/^  save(/,/^  }/p' src/game.ts > $EV/save-fn.txt; log "save() body captured ($(wc -l < $EV/save-fn.txt) lines); reviewer checks hidden.at/hidden.state flow into persisted, quota retry, mirror fallback"
fi
if has 6; then for f in tests/qa-rc1-bugs.test.ts; do git diff 72078b5 $SHA -- $f > $EV/loosened-vs-72078b5.patch; done
  log "loosened: ghost 1500 ms in app: $(rgc 'setTimeout\(.*1500\)|spawn\(el, 1500\)' src/ui/app.ts); fmtMoneyShort non-trackPrice uses in app (want 0): $(rgc 'fmtMoneyShort\((?!trackPriceCents)' --pcre2 src/ui/app.ts)"
  npx vitest run tests/qa-rc1-bugs.test.ts > $EV/qa-rc1-bugs.log 2>&1; log "qa-rc1-bugs exit=$? $(rg 'Tests ' $EV/qa-rc1-bugs.log | tail -1)"
fi
if has 7; then for e in ${GLOBALS_ENGINES:-webkit}; do reap 5862; flock $L timeout 600 env PORT=5862 node scripts/release-globals-browser.mjs $e > $EV/globals-$e.log 2>&1; log "globals $e exit=$? $(rg -o 'PASS.*|FAIL.*' $EV/globals-$e.log | tail -1)"; reap 5862; done; fi
log "ALL_DONE steps=[$STEPS]"
