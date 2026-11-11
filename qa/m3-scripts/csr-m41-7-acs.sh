#!/bin/bash
# M41-7 CSR AC run (CSR-1..16, CSR-AC-IDB1, D-HOP-2026-10-22-01 a-c, -03, -04, -07(b) reset_at, CSR-10 store, CSR-9 copy; B-CSR8, B-CSR14, tap-target re-measure). Saves QA.
# 2026-10-23 00:3x: spec of record 2fbcd4eb (D-HOP-2026-10-23-01: -07(b) = IDB reset.surfaced key membership; LS reset_at VOID). Was: -07 (22:2x CEST): spec of record 073fafd3 (line 28 = D-HOP-2026-10-22-07). Adds: -07 m4-exp1 byte-identity check (m41-7-testdiff.sh, HARD),
#   vitest 'RESET_AT -07(b)' block (in csr-m41-7.qa.test.ts) and the Chromium reset_at gate (csr-m41-7-resetat.mjs). -07(a) explainer: m41-7-delta.sh csr9c.
# usage: bash qa/m3-scripts/csr-m41-7-acs.sh <full-sha> [browser=1]
#   Clean detached worktree qa/wt-m41-7-<sha7>-acs (own npm ci). vitest max 2 workers. Chromium DOM subset on :5961 under the flock
#   (one hold, timeout 600). Builds dist-qa BEFORE copying QA tests in (so the runtime build-id has no +dirty).
#   Output: qa/m41/csr-acs-<sha7>/ (vitest json/log, browser result.json/run.log/shots, summary.txt). Never pushes/merges/tags.
#   DRY=1: preflight only (spec sha, fixtures, ancestry, node --check of every script, port/lock state); runs no test, starts no server.
#   CSR_EV=<dir>: evidence dir override (e.g. qa/m41/m41-7-<sha7>/csr).
set -u
SHA=${1:?full sha}; BROWSER=${2:-1}; DRY=${DRY:-0}; R=/workspace/egg-farm-studio; G=$R/game; Q=$R/qa; SC=$Q/m3-scripts
git -C $G fetch -q origin || exit 1
FULL=$(git -C $G rev-parse --verify "$SHA^{commit}") || exit 1; S7=${FULL:0:7}; W=$Q/wt-m41-7-$S7-acs; EV=${CSR_EV:-$Q/m41/csr-acs-$S7}; mkdir -p $EV
log(){ echo "$(date '+%F %T %Z') $*" | tee -a $EV/summary.txt; }
log "=== CSR ACs on $FULL"
SPEC_WANT=2fbcd4eb61115c7f6e5130daf050b8536b235ac0cc4ffec105917febe2faf445 # D-HOP-2026-10-23-01 amends -07(b) to key membership (supersedes 073fafd3, cc6b7e23, fcebedb3, 6131c290)
SPEC_GOT=$(sha256sum $R/product/farm/corrupt-save-recovery-spec.m41-final.md | cut -c1-64); log "spec sha256: $SPEC_GOT (want 2fbcd4eb…af445)"
[ "$SPEC_GOT" = "$SPEC_WANT" -o "$SPEC_GOT" = "530b29d3d37ab965d2375ad05a2c431c4aaac976e959eb245395f6ef9fe3f874" ] || { log "SPEC OF RECORD CHANGED: re-baseline the oracle before running"; exit 1; }
log "fixtures: $(cd $Q/m41/csr-fixtures && sha256sum -c SHA256SUMS --quiet >/dev/null 2>&1 && echo 'SHA256SUMS OK' || echo 'SHA256SUMS MISMATCH') SHA256SUMS=$(sha256sum $Q/m41/csr-fixtures/SHA256SUMS | cut -c1-16)"
log "ancestors: dd223f5 $(git -C $G merge-base --is-ancestor dd223f5 $FULL && echo Y || echo N), 1682a0c $(git -C $G merge-base --is-ancestor 1682a0c $FULL && echo Y || echo N), 66680eb $(git -C $G merge-base --is-ancestor 66680eb $FULL && echo Y || echo N), 4c94704 $(git -C $G merge-base --is-ancestor 4c94704 $FULL 2>/dev/null && echo Y || echo N), dfdf49c $(git -C $G merge-base --is-ancestor dfdf49c $FULL 2>/dev/null && echo Y || echo N), b986cd3 $(git -C $G merge-base --is-ancestor b986cd3 $FULL 2>/dev/null && echo Y || echo N) (info: ff from b986cd3?); pushed on: $(git -C $G branch -r --contains $FULL | tr -d ' ' | tr '\n' ' ')"
if [ "$DRY" = 1 ]; then for f in csr-m41-7-browser.mjs csr-m41-7-b8-14.mjs csr-m41-7-ui.mjs csr12-ls-throw-probe.mjs csr9c-explainer-queue.mjs csr-m41-7-fixtures.mjs csr-m41-7-resetat.mjs; do node --check $SC/$f && log "DRY syntax ok $f" || log "DRY SYNTAX FAIL $f"; done
  bash -n $SC/m41-7-testdiff.sh && log "DRY syntax ok m41-7-testdiff.sh" || log "DRY SYNTAX FAIL m41-7-testdiff.sh"; node $SC/csr-m41-7-resetat.mjs --dry-run | tee -a $EV/summary.txt
  log "DRY RESET_AT vitest block present: $(rg -c "describe\('RESET_AT -07" $SC/csr-m41-7.qa.test.ts) (want 1); it() in block: $(sed -n "/RESET_AT -07(b) eggfarm/,\$p" $SC/csr-m41-7.qa.test.ts | rg -c "^\s*it\(")"
  log "DRY plan: testdiff (-07 m4-exp1 byte-identity vs dfdf49c, HARD; review diffs); worktree $W; npm ci; build:qa; vitest csr-m41-7.qa.test.ts (incl. RESET_AT -07(b)); [browser] resetat (csr-m41-7-resetat.mjs) -> flock:5961 csr-m41-7-browser.mjs -> b8-14 (CSR-8a/8b, CSR-14 M5/Q, re-measure) -> ui (M1/M1cf/M2/M3/M4/M5/legacy @360/375/390, settled+mid-animation, aria, copy); evidence $EV"
  log "DRY :5961 $(ss -ltn | rg -q ':5961 ' && echo BUSY || echo free); lock holders: $(lslocks 2>/dev/null | rg -c browser-test || echo 0)"; exit 0; fi
# -07 test integrity (read-only git; HARD): m4-exp1 must be byte-identical to dfdf49c; review diffs for m41-6*, hop-rulings, rc0-browser
bash $SC/m41-7-testdiff.sh $FULL $EV/testdiff > /dev/null 2>&1; TD=$?; log "-07 testdiff exit=$TD $(rg -o "TESTDIFF .*" $EV/testdiff/summary.txt | tail -1) (0 = m4-exp1 identical; 1 = changed lines need HoE justification: $EV/testdiff/m4-exp1.changed-lines.txt)"
[ -d $W ] || git -C $G worktree add --detach $W $FULL >/dev/null 2>&1 || exit 1
cd $W; [ "$(git rev-parse HEAD)" = "$FULL" ] || { log "HEAD mismatch"; exit 1; }
rm -f tests/csr-m41-7.qa.test.ts; [ -z "$(git status --porcelain)" ] || { log "worktree not clean"; git status --porcelain | tee -a $EV/summary.txt; exit 1; }
[ -d node_modules ] || { npm ci --no-audit --no-fund > $EV/npm-ci.log 2>&1; log "npm ci exit=$?"; }
if [ "$BROWSER" = 1 ]; then npm run build:qa > $EV/build-qa.log 2>&1; log "build:qa exit=$? build-id: $(rg -o '(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}(\+dirty)?' dist-qa/index.html | sort -u | tr '\n' ' ')"; fi
cp $SC/csr-m41-7.qa.test.ts tests/
t0=$(date +%s); CSR_OUT=$EV/vitest-$S7.json timeout 900 npx vitest run --maxWorkers=2 --minWorkers=1 tests/csr-m41-7.qa.test.ts > $EV/vitest.log 2>&1; log "vitest exit=$? $(( $(date +%s)-t0 ))s $(rg 'Tests ' $EV/vitest.log | tail -1)"
rm -f tests/csr-m41-7.qa.test.ts; log "worktree tracked/untracked changes after run: $(git status --porcelain | wc -l) (want 0)"
log "RESET_AT -07(b) vitest: $(node -e 'const r=require(process.argv[1]).results;const e=Object.entries(r).filter(([k])=>k.startsWith("RESET_AT-"));const h=e.filter(([k,v])=>v.pass!==null),f=h.filter(([k,v])=>!v.pass);console.log(`hard ${h.length-f.length}/${h.length} pass, info ${e.length-h.length}`+(f.length?` FAIL: ${f.map(x=>x[0]).join(",")}`:""))' $EV/vitest-$S7.json 2>/dev/null || echo 'no result json')"
if [ "$BROWSER" = 1 ]; then t0=$(date +%s); mkdir -p $EV/browser-chromium
  flock $R/.browser-test.lock timeout 600 node $SC/csr-m41-7-browser.mjs $W chromium 5961 $EV/browser-chromium $S7 > $EV/browser-chromium/run.log 2>&1
  log "chromium DOM subset exit=$? $(( $(date +%s)-t0 ))s PASS=$(rg -c '^PASS' $EV/browser-chromium/run.log) FAIL=$(rg -c '^FAIL' $EV/browser-chromium/run.log)"
  # B-CSR8 two-tab lease, B-CSR14 (M5 lease-quota, case Q preserve-quota), Art & UX tap-target re-measure 360/375/390 (strict CSS px). Own flock hold.
  t0=$(date +%s); mkdir -p $EV/browser-b8-14
  flock $R/.browser-test.lock timeout 600 node $SC/csr-m41-7-b8-14.mjs $W 5961 $EV/browser-b8-14 $S7 > $EV/browser-b8-14/run.log 2>&1
  log "B-CSR8/B-CSR14/re-measure exit=$? $(( $(date +%s)-t0 ))s PASS=$(rg -c '^PASS' $EV/browser-b8-14/run.log) FAIL=$(rg -c '^FAIL' $EV/browser-b8-14/run.log); re-measure: $(rg '^(PASS|FAIL) REMEASURE.*(primary|export link)' -o -r '' $EV/browser-b8-14/run.log | wc -l) checks, fails: $(rg -c '^FAIL REMEASURE' $EV/browser-b8-14/run.log || echo 0) (fail => log M4.2 Minor, min-height fix absent)"
  # Dialog UI: tap targets settled vs mid-animation (M1, M1 copy_failed, M2, M3, M4, M5, legacy Q, legacy cantsave @360/375/390), EXPORT_ARIA / WCAG 2.5.3, rendered copy vs art-ux.
  t0=$(date +%s); mkdir -p $EV/browser-ui
  flock $R/.browser-test.lock timeout 600 node $SC/csr-m41-7-ui.mjs $W chromium 5961 $EV/browser-ui $S7 > $EV/browser-ui/run.log 2>&1
  log "dialog UI exit=$? $(( $(date +%s)-t0 ))s PASS=$(rg -c '^PASS' $EV/browser-ui/run.log) FAIL=$(rg -c '^FAIL' $EV/browser-ui/run.log) INFO=$(rg -c '^INFO' $EV/browser-ui/run.log)"
  # -07(b) reset_at in Chromium (real IndexedDB, real Settings > Reset): pre-reset copies silent x3 loads, post-reset chain M1/M3, Export, quota-blocked edge.
  t0=$(date +%s); mkdir -p $EV/browser-resetat
  flock $R/.browser-test.lock timeout 600 node $SC/csr-m41-7-resetat.mjs $W 5961 $EV/browser-resetat $S7 > $EV/browser-resetat/run.log 2>&1
  log "-07(b) reset_at browser exit=$? $(( $(date +%s)-t0 ))s PASS=$(rg -c '^PASS' $EV/browser-resetat/run.log) FAIL=$(rg -c '^FAIL' $EV/browser-resetat/run.log) INFO=$(rg -c '^INFO' $EV/browser-resetat/run.log) $(rg -o '^CSR_RESET_AT.*' $EV/browser-resetat/run.log)"
  ss -ltn | rg -q ':5961 ' && log "WARN :5961 still listening" || log ":5961 free"; fi
log "ALL_DONE"
