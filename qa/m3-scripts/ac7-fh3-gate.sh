#!/usr/bin/env bash
# QA AC-FH3 casual sim run (HoP list). Invokes product/sim/market/first_hire.py with >=30 seeds.
# AC-FH3 already uses P95<=8; this is the QA-owned runner + PASS assert on the nudge case.
set -euo pipefail
N=${1:-30}
if [ "$N" -lt 30 ]; then echo "ERROR: need >=30 seeds"; exit 2; fi
OUT=/tmp/ac7-fh3-out-$$.md
python3 /workspace/egg-farm-studio/product/sim/market/first_hire.py "$N" > "$OUT"
cat "$OUT"
# nudge row must say PASS in last column
if grep -E '^\| nudge \|' "$OUT" | grep -q ' PASS |'; then
  echo "RESULT: PASS (nudge AC-FH3)"
  exit 0
else
  echo "RESULT: FAIL (nudge AC-FH3)"
  exit 1
fi
