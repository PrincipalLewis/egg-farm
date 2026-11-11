#!/bin/bash
# full vitest suite at aa0ed32 (no complete Architect artifact for the final #80 code; CI skipped as Draft)
cd /workspace/egg-farm-studio/qa/scratch/wt-pr80-aa0ed32
W=/workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr80-aa0ed32
{ echo "== full @ $(git rev-parse HEAD) $(date '+%F %T %Z')"; npx vitest run --minWorkers=1 --maxWorkers=2; echo "vitest exit=$?"; echo "end $(date '+%F %T %Z')"; } > $W/20-full-vitest.log 2>&1
