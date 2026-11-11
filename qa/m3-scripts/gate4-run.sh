#!/bin/bash
# GATE 4 (M4-on saves & release) runner. usage: bash qa/m3-scripts/gate4-run.sh <full-sha> [steps="pre unit saves release browser"]
#   BASE=dd52bfd (diff report base)  ENGINES="firefox webkit chromium"  ALLOW_DIFF=<regex of allowed changed paths> (default: any; report only)
# Ports 5961-5964 only, every browser step under flock .browser-test.lock timeout 600, one engine at a time.
# vitest max 2 workers. Kills only its own vite servers (cwd under $W). Never pushes/merges/tags/messages.
set -u
SHA=${1:?full sha}; STEPS=${2:-pre unit saves marker release browser}; PROFILE=${PROFILE:-full};  # PROFILE=full (L30+) | capped (farm max 30, D-CEO-09)
 ENGINES=${ENGINES:-firefox webkit chromium}; BASE=${BASE:-dd52bfd}
R=/workspace/egg-farm-studio; G=$R/game; L=$R/.browser-test.lock; Q=$R/qa/m3-recheck; SC=$R/qa/m3-scripts
git -C $G fetch -q origin || exit 1; FULL=$(git -C $G rev-parse --verify "$SHA^{commit}") || exit 1; S7=${FULL:0:7}
BX="node $SC/build-id-expect.mjs"  # M41-10: expected prefix = BUILD_PREFIX in scripts/build-id.ts AT $FULL (fallback ^(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}); hash==sha7; no suffix
EXPECT=$($BX expect $G $FULL) || exit 1
EV=$Q/gate4-$S7-evidence; W=${WT:-/tmp/qa-rc/$S7}; mkdir -p $EV; log(){ echo "$(date '+%F %T %Z') $*" | tee -a $EV/summary.txt; }
has(){ case " $STEPS " in *" $1 "*) return 0;; esac; return 1; }
reap(){ for pid in $(ss -ltnp | grep -E ":$1 " | grep -o 'pid=[0-9]*' | cut -d= -f2); do case "$(readlink /proc/$pid/cwd)" in $W*) kill $pid && log "reaped own server $pid :$1";; esac; done; }
lk(){ flock $L timeout 600 "$@"; }
T0=$(date +%s); log "=== GATE4 $FULL profile=$PROFILE steps=[$STEPS] engines=[$ENGINES]"
[ -d $W ] || git -C $G worktree add --detach $W $FULL >/dev/null 2>&1 || exit 1; cd $W; [ "$(git rev-parse HEAD)" = "$FULL" ] || { log "HEAD mismatch"; exit 1; }
[ -d node_modules ] && [ ! -L node_modules ] || { rm -f node_modules; npm ci --no-audit --no-fund > $EV/npm-ci.log 2>&1; log "own npm ci exit=$?"; }
if has pre; then
  log "pushed on: $(git -C $G branch -r --contains $FULL | tr -d ' ' | tr '\n' ' ')  origin/main=$(git -C $G rev-parse origin/main)"
  git diff --stat $BASE $FULL > $EV/diffstat-vs-$BASE.txt; git log --oneline $BASE..$FULL > $EV/commits-vs-$BASE.txt
  log "m4.enabled at SHA: $(git show $FULL:src/config/balance.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).m4.enabled))') (want 1)"
  if [ -n "${ALLOW_DIFF:-}" ]; then bad=$(git diff --name-only $BASE $FULL | rg -v "$ALLOW_DIFF"); [ -n "$bad" ] && { log "STOP: unexpected paths vs $BASE: $bad"; exit 4; }; fi
  ( npm run build && npm run build:qa && npm run build:html ) > $EV/build.log 2>&1; log "build exit=$?"
  log "static build-id: $($BX scan $G $FULL dist/index.html dist-qa/index.html dist-html/egg-farm.html | tr '\n' ' ')"
fi
if has unit; then t0=$(date +%s)
  npx tsc --noEmit > $EV/tsc.log 2>&1; log "tsc exit=$?"; npx vite-node scripts/sync-economy-cli.ts -- --check > $EV/sync.log 2>&1; log "sync --check exit=$?"
  npx vitest run --maxWorkers=2 --minWorkers=1 > $EV/unit.log 2>&1; log "unit exit=$? $(( $(date +%s)-t0 ))s $(rg 'Tests ' $EV/unit.log | tail -1)"
  t0=$(date +%s); npm run -s test:slow > $EV/slow.log 2>&1; log "test:slow exit=$? $(( $(date +%s)-t0 ))s $(rg 'Tests ' $EV/slow.log | tail -1)"
fi
if has saves; then cp $SC/gate4-m4on-saves.qa.test.ts $SC/m4on-migrate.qa.test.ts tests/
  npx vitest run --maxWorkers=2 --minWorkers=1 tests/gate4-m4on-saves.qa.test.ts tests/m4on-migrate.qa.test.ts > $EV/gate4-saves.log 2>&1; log "R1-R5 + M1 + F1-F5 unit exit=$? $(rg 'Tests ' $EV/gate4-saves.log | tail -1)"
  rm -f tests/gate4-m4on-saves.qa.test.ts tests/m4on-migrate.qa.test.ts
fi
if has marker; then
  cp $SC/gate4-marker.qa.test.ts tests/; ex=""; grep -q sanitizeLevel src/save/save.ts && { cp $SC/gate4-sanitize.qa.test.ts tests/; ex="tests/gate4-sanitize.qa.test.ts"; }; [ -f src/ui/tracks-explainer.ts ] && { cp $SC/gate4-explainer.qa.test.ts tests/; ex="$ex tests/gate4-explainer.qa.test.ts"; }
  QA_PROFILE=$PROFILE QA_TAG=$S7 npx vitest run --maxWorkers=2 --minWorkers=1 tests/gate4-marker.qa.test.ts $ex > $EV/marker.log 2>&1; log "marker/migrate-once/rollback/F50/flag-off${ex:+ + explainer} profile=$PROFILE exit=$? $(rg 'Tests ' $EV/marker.log | tail -1) $([ -z "$ex" ] && echo '(explainer NOT in tree: EXP cases not run)')"
  log "loader fix a399d27 in history: $(git merge-base --is-ancestor a399d27 $FULL && echo YES || echo NO)  explainer e43bc00 in history: $(git merge-base --is-ancestor e43bc00 $FULL && echo YES || echo NO)  maxLevel=$(node -e 'console.log(require("./src/config/balance.json").maxLevel)')  csv=$(sha256sum data/economy.csv | cut -c1-8)"
  rm -f tests/gate4-marker.qa.test.ts tests/gate4-explainer.qa.test.ts tests/gate4-sanitize.qa.test.ts
fi
if has release; then node scripts/check-release-build.mjs dist-html/egg-farm.html > $EV/check-release-build.log 2>&1; log "check-release-build exit=$?"; fi
if has browser; then cp $SC/m4-hidden.mjs qa-hidden.mjs; cp $SC/gate4-m4on-clock.mjs qa-clock.mjs; cp $SC/m4on-browser-v6load.mjs qa-v6load.mjs
  for e in $ENGINES; do log "--- $e"
    p=5961; reap $p; lk env BUILD_SHA=$FULL node $Q/../scratch/m4a-31-delta/buildid-probe.mjs $W $e $p > $EV/buildid-$e.log 2>&1; log "runtime build-id $e exit=$? $(rg -o 'runtime build ids.*' $EV/buildid-$e.log)"; reap $p
    p=5962; reap $p; lk env PORT=$p node scripts/release-globals-browser.mjs $e > $EV/check-globals-$e.log 2>&1; log "check-globals $e exit=$? $(rg -o '(PASS|FAIL).*' $EV/check-globals-$e.log | tail -1 | cut -c1-160)"; reap $p
    p=5963; reap $p; mkdir -p $EV/rc0-$e; lk env PORT=$p SHOTS=$EV/rc0-$e node scripts/rc0-browser.mjs $e > $EV/rc0-$e.log 2>&1; log "rc0 $e exit=$? $(rg -o '[0-9]+/[0-9]+ passed' $EV/rc0-$e.log | tail -1)"; reap $p
    lk node $SC/rc-html-open.mjs $W $e $EV/shots-html $FULL > $EV/html-open-$e.log 2>&1; log "dist-html file:// $e exit=$?"
    p=5964; reap $p; o=$EV/hidden-$e; mkdir -p $o; lk env PORT=$p DIST=dist-qa BUILD_SHA=$FULL OUT=$o node qa-hidden.mjs $e > $o/run.log 2>&1; log "hidden-tab M4 $e exit=$? $(rg -o '[0-9]+/[0-9]+ \(' $o/run.log | tail -1)"; reap $p
    p=5962; reap $p; o=$EV/clock-$e; mkdir -p $o; lk env PORT=$p OUT=$o BUILD_SHA=$FULL node qa-clock.mjs $e > $o/run.log 2>&1; log "offline/clock/reload M4 $e exit=$? $(rg -o '[0-9]+/[0-9]+ \(' $o/run.log | tail -1)"; reap $p
    p=5961; reap $p; o=$EV/v6load; mkdir -p $o; lk env PORT=$p OUT=$o BUILD_SHA=$FULL node qa-v6load.mjs $e > $o/run-$e.log 2>&1; log "browser v6 load F1-F5+M1 $e exit=$? $(tail -1 $o/run-$e.log)"; reap $p
  done; rm -f qa-hidden.mjs qa-clock.mjs qa-v6load.mjs
fi
log "ALL_DONE $(( $(date +%s)-T0 ))s"
