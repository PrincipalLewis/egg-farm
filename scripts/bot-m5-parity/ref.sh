#!/usr/bin/env bash
# REFERENCE side: Economy's original drivers (econ-orig/, sha256-pinned in MANIFEST.sha256) copied unmodified into the root of a clean
# worktree of the SAME SHA. Usage: ref.sh <expected-head-sha> <worktree> <outdir>   (env SEEDS, default 20). Fails closed.
set -euo pipefail
SHA=$1 W=$2 O=$3; SEEDS=${SEEDS:-20}; D=$(cd "$(dirname "$0")" && pwd)
. "$D/jobs.sh"
(cd "$D" && sha256sum --quiet -c MANIFEST.sha256) || { echo "ref.sh: MANIFEST.sha256 check failed" >&2; exit 1; }
cd "$W"; check_tree "$SHA" ""
mkdir -p "$O"; record_tree ref
for f in m5p.ts m5px.ts m5l.ts m5lx.ts; do [ ! -e "$f" ] || { echo "ref.sh: $W/$f already exists" >&2; exit 1; }; cp "$D/econ-orig/$f" "$f"; done
cmp -s m5px.ts "$D/econ-orig/m5px.ts"
VN=(node node_modules/vite-node/vite-node.mjs)
PX=(m5px.ts) LX=(m5lx.ts)
run_all ref
check_tree "$SHA" "?? m5l.ts ?? m5lx.ts ?? m5p.ts ?? m5px.ts"; log ref DONE
