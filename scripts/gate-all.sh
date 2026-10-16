#!/usr/bin/env bash
# X-1 (m4-design §6, ADR M4-7): run every merge gate locally on the box. Exits non-zero if any blocking gate fails.
# TR-5 (pacing) is REPORT-ONLY (ADR M4-6): its result is printed but never fails the run. HoE flips it to blocking
# after 5 consecutive green runs with no flake (set TR5_BLOCKING=1).
# Usage: scripts/gate-all.sh            # all gates, rc0 on chromium/firefox/webkit
#        ENGINES="chromium" scripts/gate-all.sh ; SKIP_BROWSER=1 scripts/gate-all.sh
set -uo pipefail
cd "$(dirname "$0")/.."
ENGINES="${ENGINES:-chromium firefox webkit}"
TR5_GLOB="${TR5_GLOB:-tests/m4a-pacing*.test.ts tests/*tr5*.test.ts}"   # TR-5 pacing tests: report-only, excluded from the blocking unit run
LOG="${GATE_LOG_DIR:-$(mktemp -d /tmp/gate-all.XXXX)}"; mkdir -p "$LOG"
export SHOTS="${SHOTS:-$LOG/screenshots}"
BROWSER_TIMEOUT="${BROWSER_TIMEOUT:-900}"; PORT_BASE="${PORT_BASE:-$((7000 + RANDOM % 1000))}"  # own ports: the box is shared
declare -a RES; FAIL=0
run() { local name="$1"; shift; local t0=$SECONDS
  if "$@" >"$LOG/$name.log" 2>&1; then RES+=("PASS  $name ($((SECONDS-t0))s)"); else RES+=("FAIL  $name ($((SECONDS-t0))s)  -> $LOG/$name.log"); FAIL=1; fi; }
skip() { RES+=("SKIP  $1 ($2)"); }

TR5_FILES=$(ls $TR5_GLOB 2>/dev/null || true)
EXCL=(); for f in $TR5_FILES; do EXCL+=(--exclude "$f"); done

run check-economy-copy node scripts/check-economy-copy.mjs
run sync-economy-check npx vite-node scripts/sync-economy-cli.ts -- --check
run unit npx vitest run "${EXCL[@]}"
run tsc npx tsc --noEmit
run release-build bash -c 'npx vite build && node scripts/check-release-build.mjs dist'
run qa-build npx vite build --mode qa --outDir dist-qa
if [[ -n "$(git status --porcelain)" ]]; then echo "gate-all: working tree dirty; check-release-build will fail (commit first)" >&2; fi
if [[ -n "${SKIP_BROWSER:-}" ]]; then skip check-globals SKIP_BROWSER; for e in $ENGINES; do skip "rc0-$e" SKIP_BROWSER; done
else
  for e in $ENGINES; do
    run "check-globals-$e" env PORT=$((PORT_BASE++)) timeout "$BROWSER_TIMEOUT" node scripts/release-globals-browser.mjs "$e"
    run "rc0-$e" env PORT=$((PORT_BASE++)) timeout "$BROWSER_TIMEOUT" node scripts/rc0-browser.mjs "$e"
  done
fi
# TR-5: report-only
if [[ -z "$TR5_FILES" ]]; then RES+=("SKIP  TR-5 (no $TR5_GLOB on this branch)")
elif npx vitest run $TR5_FILES >"$LOG/tr5.log" 2>&1; then RES+=("PASS  TR-5 [report-only]")
else if [[ -n "${TR5_BLOCKING:-}" ]]; then RES+=("FAIL  TR-5 [blocking] -> $LOG/tr5.log"); FAIL=1; else RES+=("WARN  TR-5 [report-only, not blocking] -> $LOG/tr5.log"); fi; fi

echo "== gate-all @ $(git rev-parse --short HEAD) =="; printf '%s\n' "${RES[@]}"; echo "logs: $LOG"
[[ $FAIL -eq 0 ]] && echo "RESULT: GREEN" || echo "RESULT: RED"
exit $FAIL
