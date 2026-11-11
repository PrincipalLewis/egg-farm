#!/bin/bash
# M41-7 delta run on the fix SHA (Saves QA, 2026-10-22): explainer gate = (a) D-HOP-2026-10-22-06 (1)-(5) on M1/M2, (b) §17 M4A-EXP-B2 Welcome-back queueing,
# (c) M4A-EXP-B1 AC(1)-(5) regression (AC(4) via unit), plus INFO probes; CSR-9/9a/9b dialog tests,
# optionally the gates-run browser scripts (QEL-12/13, runtime build-id, check-globals, rc0 Chromium). Chromium blocking.
# -07 (D-HOP-2026-10-22-07, spec 073fafd3): csr9c = -07(a) HARD (M1/M2 seen-on-dismiss; commit/Welcome-back/reload: seen-at-show, auto-hide counts, reload 0);
#   testdiff = -07 m4-exp1 byte-identical to dfdf49c (HARD) + review diffs; resetat = -07(b) vitest 'RESET_AT' block + Chromium csr-m41-7-resetat.mjs.
# usage: bash qa/m3-scripts/m41-7-delta.sh <full-sha> [steps="prep testdiff dialogs csr9c resetat qel rc0"]     DRY=1 = preflight + syntax only
# Worktree qa/wt-m41-7-<sha7>-acs (shared with csr-m41-7-acs.sh; clean, own npm ci, dist-qa built before any QA file is copied in).
# Browser steps: :5961 only, each under its own `flock .browser-test.lock timeout 600`. Evidence: qa/m41/m41-7-<sha7>/delta/. Never pushes/merges/tags/messages.
set -u
SHA=${1:?full sha}; STEPS=${2:-prep testdiff dialogs csr9c resetat qel rc0}; DRY=${DRY:-0}
R=/workspace/egg-farm-studio; G=$R/game; Q=$R/qa; SC=$Q/m3-scripts; L=$R/.browser-test.lock; PORT=5961
git -C $G fetch -q origin || exit 1
FULL=$(git -C $G rev-parse --verify "$SHA^{commit}") || exit 1; S7=${FULL:0:7}; W=$Q/wt-m41-7-$S7-acs; EV=$Q/m41/m41-7-$S7/delta; mkdir -p $EV
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $EV/summary.txt; }
has(){ case " $STEPS " in *" $1 "*) return 0;; esac; return 1; }
lk(){ local n=$1; shift; local t0=$(date +%s); flock $L timeout 600 "$@"; local ec=$?; log "$n exit=$ec $(( $(date +%s)-t0 ))s"; return $ec; }
log "=== M41-7 delta on $FULL steps='$STEPS' DRY=$DRY"
SPEC_WANT=2fbcd4eb61115c7f6e5130daf050b8536b235ac0cc4ffec105917febe2faf445; SPEC_GOT=$(sha256sum $R/product/farm/corrupt-save-recovery-spec.m41-final.md | cut -c1-64)
log "spec sha256: ${SPEC_GOT:0:16}… (want 2fbcd4eb61115c7f…, D-HOP-2026-10-23-01)"; [ "$SPEC_GOT" = "$SPEC_WANT" -o "$SPEC_GOT" = "530b29d3d37ab965d2375ad05a2c431c4aaac976e959eb245395f6ef9fe3f874" ] || { log "SPEC OF RECORD CHANGED: re-baseline the oracle before running"; exit 1; }
log "ancestors: $(for a in dd223f5 1682a0c 66680eb 9cce82d 4c94704 dfdf49c b986cd3; do printf '%s %s, ' $a $(git -C $G merge-base --is-ancestor $a $FULL 2>/dev/null && echo Y || echo N); done) pushed on: $(git -C $G branch -r --contains $FULL | tr -d ' ' | tr '\n' ' ')"
if [ "$DRY" = 1 ]; then
  for f in csr9c-explainer-queue.mjs csr-m41-7-ui.mjs csr-m41-7-browser.mjs qe-late-browser.mjs csr-m41-7-resetat.mjs; do node --check $SC/$f && log "DRY syntax ok $f" || log "DRY SYNTAX FAIL $f"; done
  bash -n $SC/m41-7-testdiff.sh && log "DRY syntax ok m41-7-testdiff.sh" || log "DRY SYNTAX FAIL m41-7-testdiff.sh"
  node $SC/csr9c-explainer-queue.mjs --dry-run | tee -a $EV/summary.txt; node $SC/csr-m41-7-resetat.mjs --dry-run | tee -a $EV/summary.txt
  log "DRY -07(a) hard asserts in csr9c: $(rg -c '\-07\(a\)' $SC/csr9c-explainer-queue.mjs) lines; RESET_AT describe in vitest: $(rg -c "describe\('RESET_AT -07" $SC/csr-m41-7.qa.test.ts) (want 1)"
  log "DRY plan: prep (worktree $W, npm ci, build:qa, build-id m3-rc1-pre+$S7 or m4.1+$S7, no +dirty) | testdiff (m41-7-testdiff.sh: m4-exp1 vs dfdf49c HARD, review diffs) | resetat (vitest -t RESET_AT + csr-m41-7-resetat.mjs) | dialogs (vitest -t 'CSR-?9' + csr-m41-7-ui.mjs + csr-m41-7-browser.mjs) | csr9c (csr9c-explainer-queue.mjs) | qel (qe-late-browser.mjs) | rc0 (buildid-probe.mjs, check-globals, scripts/rc0-browser.mjs) all on :$PORT"
  log "DRY :$PORT $(ss -ltn | rg -q ":$PORT " && echo BUSY || echo free)"; exit 0; fi
if has prep; then
  [ -d $W ] || git -C $G worktree add --detach $W $FULL >/dev/null 2>&1 || exit 1
  cd $W; [ "$(git rev-parse HEAD)" = "$FULL" ] || { log "HEAD mismatch"; exit 1; }
  rm -f tests/csr-m41-7.qa.test.ts; [ -z "$(git status --porcelain)" ] || { log "worktree not clean"; exit 1; }
  [ -d node_modules ] || { npm ci --no-audit --no-fund > $EV/npm-ci.log 2>&1; log "npm ci exit=$?"; }
  npm run build > $EV/build.log 2>&1; npm run build:qa > $EV/build-qa.log 2>&1; log "build:qa exit=$? build-id: $(rg -o '(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}(\+dirty)?' dist-qa/index.html | sort -u | tr '\n' ' ')"
fi
cd $W || exit 1
if has testdiff; then bash $SC/m41-7-testdiff.sh $FULL $EV/testdiff > /dev/null 2>&1; log "-07 testdiff exit=$? $(rg -o 'TESTDIFF .*' $EV/testdiff/summary.txt | tail -1) (HARD: m4-exp1 must be IDENTICAL to dfdf49c unless HoE justifies each line in $EV/testdiff/m4-exp1.changed-lines.txt)"; fi
if has dialogs; then
  cp $SC/csr-m41-7.qa.test.ts tests/; CSR_OUT=$EV/vitest-csr9.json timeout 600 npx vitest run --maxWorkers=2 --minWorkers=1 tests/csr-m41-7.qa.test.ts -t 'CSR-?9' > $EV/vitest-csr9.log 2>&1; log "vitest CSR-9/9a/9b exit=$? $(rg 'Tests ' $EV/vitest-csr9.log | tail -1)"
  rm -f tests/csr-m41-7.qa.test.ts; log "porcelain after vitest: $(git status --porcelain | wc -l) (want 0)"
  mkdir -p $EV/ui $EV/dom; lk ui-dialogs node $SC/csr-m41-7-ui.mjs $W chromium $PORT $EV/ui $S7 > $EV/ui/run.log 2>&1
  log "  ui: PASS=$(rg -c '^PASS' $EV/ui/run.log) FAIL=$(rg -c '^FAIL' $EV/ui/run.log) INFO=$(rg -c '^INFO' $EV/ui/run.log)"
  lk dom-subset node $SC/csr-m41-7-browser.mjs $W chromium $PORT $EV/dom $S7 > $EV/dom/run.log 2>&1
  log "  dom (CSR-9a age/level, M1/M3 copy): PASS=$(rg -c '^PASS' $EV/dom/run.log) FAIL=$(rg -c '^FAIL' $EV/dom/run.log)"
fi
if has csr9c; then timeout 300 npx vitest run --maxWorkers=2 --minWorkers=1 tests/m4-exp1-explainer.test.ts > $EV/m4-exp1-unit.log 2>&1; log "unit tests/m4-exp1-explainer.test.ts (incl. EXP-B1 AC(4) M4 off) exit=$? $(rg 'Tests ' $EV/m4-exp1-unit.log | tail -1)"
  mkdir -p $EV/csr9c; lk csr9c-explainer node $SC/csr9c-explainer-queue.mjs $W $PORT $EV/csr9c $S7 12 > $EV/csr9c/run.log 2>&1; log "  $(rg '^CSR9C_EXPLAINER' $EV/csr9c/run.log)"; fi
if has resetat; then
  cp $SC/csr-m41-7.qa.test.ts tests/; CSR_OUT=$EV/vitest-resetat.json timeout 600 npx vitest run --maxWorkers=2 --minWorkers=1 tests/csr-m41-7.qa.test.ts -t 'RESET_AT' > $EV/vitest-resetat.log 2>&1; log "vitest RESET_AT -07(b) exit=$? $(rg 'Tests ' $EV/vitest-resetat.log | tail -1)"
  rm -f tests/csr-m41-7.qa.test.ts; log "porcelain after vitest: $(git status --porcelain | wc -l) (want 0)"
  mkdir -p $EV/resetat; lk resetat-browser node $SC/csr-m41-7-resetat.mjs $W $PORT $EV/resetat $S7 > $EV/resetat/run.log 2>&1; log "  $(rg '^CSR_RESET_AT' $EV/resetat/run.log) PASS=$(rg -c '^PASS' $EV/resetat/run.log) FAIL=$(rg -c '^FAIL' $EV/resetat/run.log) INFO=$(rg -c '^INFO' $EV/resetat/run.log)"; fi
if has qel; then mkdir -p $EV/qel; lk qe-late-browser node $SC/qe-late-browser.mjs $W chromium $PORT $EV/qel $S7 > $EV/qel/run.log 2>&1; log "  $(rg '^QE_LATE_BROWSER' $EV/qel/run.log)"; fi
if has rc0; then mkdir -p $EV/rc0/shots
  lk buildid-dist env BUILD_SHA=$FULL node $R/qa/scratch/m4a-31-delta/buildid-probe.mjs $W chromium $PORT > $EV/rc0/buildid.log 2>&1; log "  $(rg -o '(PASS|FAIL) runtime build-id.*' $EV/rc0/buildid.log | head -1)"
  lk check-globals env PORT=$PORT npm run -s check-globals -- chromium > $EV/rc0/check-globals.log 2>&1
  lk rc0-chromium env PORT=$PORT SHOTS=$EV/rc0/shots node scripts/rc0-browser.mjs chromium > $EV/rc0/rc0.log 2>&1
fi
log "porcelain end: $(git status --porcelain | wc -l) (want 0); :$PORT $(ss -ltn | rg -q ":$PORT " && echo 'STILL LISTENING' || echo free)"; log "DELTA_DONE"
