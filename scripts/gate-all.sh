#!/usr/bin/env bash
# X-1 (m4-design §6, ADR M4-6/M4-7): run every merge gate locally on the box. No hosted CI.
# Order: preflight -> economy-copy -> sync-economy --check -> tsc -> unit -> clean-tree -> release build+check -> QA build
#        -> per engine: check-globals, rc0 -> TR-5 (report-only).
# Exit codes: 0 GREEN · 1 RED (a blocking gate failed) · 2 preflight failed (run npm ci / install browsers) · 3 FLAKY
#   (everything passed, but only after a retry; never reported as fully green).
# Env:
#   KEEP_GOING=1      don't stop at the first blocking failure (full report). Default: fail fast.
#   RETRY_FLAKY=1     (alias RETRY_BROWSER=1) rerun a failed browser gate once; a pass on retry is FLAKY, both logs kept.
#   ENGINES="chromium firefox webkit" (default) · SKIP_BROWSER=1 · BROWSER_TIMEOUT=900 (s per browser gate)
#   TR5_BLOCKING=1    make TR-5 blocking (HoE flips this after 5 consecutive green runs, ADR M4-6)
#   GATE_LOG_DIR=dir  logs go here (default /tmp/gate-all.XXXX; remove with `rm -rf /tmp/gate-all.*` when done)
set -uo pipefail
cd "$(dirname "$0")/.."
T0=$SECONDS
ENGINES="${ENGINES:-chromium firefox webkit}"
TR5_GLOB="${TR5_GLOB:-tests/m4a-pacing*.test.ts tests/*tr5*.test.ts}"
RETRY="${RETRY_FLAKY:-${RETRY_BROWSER:-}}"
BROWSER_TIMEOUT="${BROWSER_TIMEOUT:-900}"; PORT_BASE="${PORT_BASE:-$((7000 + RANDOM % 1000))}"  # own ports: the box is shared
LOG="${GATE_LOG_DIR:-$(mktemp -d /tmp/gate-all.XXXX)}"; mkdir -p "$LOG"
export SHOTS="${SHOTS:-$LOG/screenshots}"
declare -a RES; FAIL=0; FLAKY=0

summary() {
  echo "== gate-all @ $(git rev-parse --short HEAD) · engines: ${SKIP_BROWSER:+(skipped) }$ENGINES · total $((SECONDS-T0))s =="
  printf '%s\n' "${RES[@]}"; echo "logs: $LOG"
  if [[ $FAIL -ne 0 ]]; then echo "RESULT: RED"; exit 1; elif [[ $FLAKY -ne 0 ]]; then echo "RESULT: FLAKY (passed only after retry; not green)"; exit 3; else echo "RESULT: GREEN"; exit 0; fi
}
stop_if_failed() { if [[ $FAIL -ne 0 && -z "${KEEP_GOING:-}" ]]; then RES+=("STOP  fail-fast (KEEP_GOING=1 for a full report)"); summary; fi; }
run() { local name="$1"; shift; local t0=$SECONDS
  if "$@" >"$LOG/$name.log" 2>&1; then RES+=("PASS  $name ($((SECONDS-t0))s)"); else RES+=("FAIL  $name ($((SECONDS-t0))s)  -> $LOG/$name.log"); FAIL=1; fi
  stop_if_failed; }
# browser gate: optional single retry, never hidden
brun() { local name="$1"; shift; local t0=$SECONDS
  if "$@" >"$LOG/$name.log" 2>&1; then RES+=("PASS  $name ($((SECONDS-t0))s)")
  elif [[ -n "$RETRY" ]] && mv "$LOG/$name.log" "$LOG/$name.try1.log" && "$@" >"$LOG/$name.log" 2>&1; then
    RES+=("FLAKY $name (failed 1/2, passed on retry; log kept: $LOG/$name.try1.log)"); FLAKY=1
  else RES+=("FAIL  $name ($((SECONDS-t0))s${RETRY:+, also failed retry})  -> $LOG/$name.log"); FAIL=1; fi
  stop_if_failed; }

# --- preflight (exit 2) ---
pre=()
[[ -d node_modules ]] || pre+=("node_modules missing")
[[ -d node_modules && package-lock.json -nt node_modules/.package-lock.json ]] && pre+=("node_modules older than package-lock.json")
for bin in vitest tsc vite vite-node; do [[ -x node_modules/.bin/$bin ]] || pre+=("node_modules/.bin/$bin missing"); done
if [[ -z "${SKIP_BROWSER:-}" && -d node_modules/playwright-core ]]; then
  for e in $ENGINES; do
    if [[ $e == chromium ]]; then [[ -x "${CHROME:-/usr/bin/google-chrome}" ]] || pre+=("chromium: ${CHROME:-/usr/bin/google-chrome} not found");
    else node -e "const p=require('playwright-core')['$e'].executablePath();require('fs').accessSync(p)" 2>/dev/null || pre+=("$e: Playwright browser not installed (npx playwright-core install $e)"); fi
  done
fi
if [[ ${#pre[@]} -gt 0 ]]; then printf 'gate-all preflight FAILED: %s\n' "${pre[@]}" >&2; echo "gate-all: run npm ci (and install the Playwright browsers), then retry." >&2; exit 2; fi
RES+=("PASS  preflight (node_modules, browsers: ${SKIP_BROWSER:+skipped}${SKIP_BROWSER:-$ENGINES})")

TR5_FILES=$(ls $TR5_GLOB 2>/dev/null || true)
EXCL=(); for f in $TR5_FILES; do EXCL+=(--exclude "$f"); done

run check-economy-copy node scripts/check-economy-copy.mjs
run sync-economy-check npx vite-node scripts/sync-economy-cli.ts -- --check
run tsc npx tsc --noEmit
run unit npx vitest run "${EXCL[@]}"
if [[ -n "$(git status --porcelain)" ]]; then git status --porcelain >"$LOG/clean-tree.log"; RES+=("FAIL  clean-tree (uncommitted changes; check-release-build needs a clean tree)  -> $LOG/clean-tree.log"); FAIL=1; stop_if_failed
  RES+=("SKIP  release-build (dirty tree)")
else RES+=("PASS  clean-tree"); run release-build bash -c 'npx vite build && node scripts/check-release-build.mjs dist'; fi
run qa-build npx vite build --mode qa --outDir dist-qa
if [[ -n "${SKIP_BROWSER:-}" ]]; then RES+=("SKIP  check-globals + rc0 (SKIP_BROWSER)")
else
  for e in $ENGINES; do
    brun "check-globals-$e" env PORT=$((PORT_BASE++)) timeout "$BROWSER_TIMEOUT" node scripts/release-globals-browser.mjs "$e"
    brun "rc0-$e" env PORT=$((PORT_BASE++)) timeout "$BROWSER_TIMEOUT" node scripts/rc0-browser.mjs "$e"
  done
fi
# TR-5: report-only unless TR5_BLOCKING=1
if [[ -z "$TR5_FILES" ]]; then RES+=("SKIP  TR-5 (looked for: $TR5_GLOB; none on this branch)")
elif npx vitest run $TR5_FILES >"$LOG/tr5.log" 2>&1; then RES+=("PASS  TR-5 [${TR5_BLOCKING:+blocking}${TR5_BLOCKING:-report-only}] ($(echo $TR5_FILES))")
elif [[ -n "${TR5_BLOCKING:-}" ]]; then RES+=("FAIL  TR-5 [blocking] ($(echo $TR5_FILES)) -> $LOG/tr5.log"); FAIL=1
else RES+=("WARN  TR-5 [report-only, not blocking] ($(echo $TR5_FILES)) -> $LOG/tr5.log"); fi
summary
