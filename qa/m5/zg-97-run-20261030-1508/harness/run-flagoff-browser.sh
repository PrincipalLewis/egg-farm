#!/usr/bin/env bash
# Flag-off browser slices for TASK HoQA/zg-97-run: ZG-AC10 default (confirm=0) + ZG-AC12/19 flagoff marks.
# One engine at a time. Caller holds flock and sets QA_PORT.
set -euo pipefail
SCOPE=/workspace/egg-farm-studio/qa/m5/zg-97-run-20261030-1508
WT=$SCOPE/build/0ad018de
EV=$SCOPE/evidence/
ENG=${1:?engine}
SZ=${2:?size}
SECS=${3:-confirm,flagoff}
export QA_WT=$WT QA_BID=m4.1+0ad018d QA_SHA7=0ad018d QA_EV=$EV QA_DIST=dist-qa
export QA_VARIANT=zg-off QA_ZG_PRE=$EV/unit/zg-unit-0ad018de.json
export AXE=$SCOPE/harness/tools/axe-core-4.14.0/axe.min.js
export QA_PORT=${QA_PORT:?}
cd $SCOPE/harness
exec node zg/zg.mjs "$ENG" "$SZ" "$SECS"
