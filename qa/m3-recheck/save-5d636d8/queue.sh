#!/bin/bash
L=/workspace/egg-farm-studio/qa/m3-recheck/save-5d636d8
for spec in chromium:4500 firefox:4530 webkit:4560; do E=${spec%:*}; B=${spec#*:}
  while [ "$(cut -d. -f1 /proc/loadavg)" -gt 50 ]; do sleep 30; done
  echo "queue $E $(date +%T)"
  flock /workspace/egg-farm-studio/.browser-test.lock timeout 7200 $L/run-engine.sh $E $B
  echo "$E rc=$? $(date +%T)"; ss -ltnp 2>/dev/null | rg ":45[0-9][0-9] " || true
done; echo ALLDONE
