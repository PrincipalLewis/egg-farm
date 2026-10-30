#!/usr/bin/env bash
# PORT side of the bot-m5 B smoke parity: B's committed drivers (scripts/bot-m5px.ts, scripts/bot-m5lx.ts) in a clean worktree.
# Usage: smoke.sh <expected-head-sha> <worktree> <outdir>   (env SEEDS, default 20). Fails closed: any job rc != 0 -> exit 1.
set -euo pipefail
SHA=$1 W=$2 O=$3; SEEDS=${SEEDS:-20}; D=$(cd "$(dirname "$0")" && pwd)
. "$D/jobs.sh"
cd "$W"; check_tree "$SHA" ""
VN=(node node_modules/vite-node/vite-node.mjs)
PX=(scripts/bot-m5px.ts) LX=(scripts/bot-m5lx.ts)
run_all port
# The committed bot-m5lx.ts must refuse CLOCK=1 (exit 2): clock wage is the M5.1 src piece, not on this tree.
set +e; env CSV=data/economy.csv SEEDS=1 CLOCK=1 CFG=auto "${VN[@]}" "${LX[@]}" > "$O/../port-clock1.stdout" 2> "$O/../port-clock1.stderr"; rc=$?; set -e
log port "CLOCK=1 refusal rc=$rc (expected 2)"; [ "$rc" = 2 ] || { log port "FAIL: CLOCK=1 not refused"; exit 1; }
check_tree "$SHA" ""; log port DONE
