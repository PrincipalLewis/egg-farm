# yield gate (fixed 07:17): wait until pr25 report has a FINAL Verdict line (not IN PROGRESS) or PR25 gate chain PID 341360 exits; check every 2 min
G=/workspace/egg-farm-studio/qa/m3-recheck/pr25-hidden-tab-59cce62.md
gate() { while kill -0 341360 2>/dev/null && ! rg -i 'Verdict' $G 2>/dev/null | rg -vqi 'in progress'; do sleep 120; done; }
