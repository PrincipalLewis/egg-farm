# V4-2: Recovery dialog a11y check fails
Severity: Minor | Build: m3-rc1-pre+5d636d8 (verified at runtime, logs-chromium/01-buildid.log) | Engine: Chromium | Script: scripts/recovery-v11-browser.mjs (step exit=1)
Repro: cd qa/scratch/sd5-1-5d636d8 (worktree at 5d636d8) && node scripts/recovery-v11-browser.mjs chromium
Failing checks (log: qa/m3-recheck/save-5d636d8/logs-chromium/15-recovery-v11.log):
1. "8 a11y alertdialog/modal/name/description (360)": FAIL (line 2)
2. "8 a11y alertdialog/modal/name/description (960)": FAIL (line 6)
Passing (5): "6 Q export…(360)", "8 Tab cycles primary <-> Export only", "7 Settings Export old save…", "6 Q export…(960)", "v1.1-2 failed export…".
Count reconciliation: the log has 7 checks, **2 FAIL and 5 PASS**. 2 is correct. The 5 matches the PASS count, not failures. Both failures are the same check at two viewports, so it is really one defect. No a11y failures in the guard (16-guard-save.log, whose 2 FAILs are Handover SECONDARY and D3/D4), tab-guard, rc0 or probe3 logs.
Observation: the FAIL payload reports role=alertdialog, aria-modal=true, name "A fresh start" and a description present. So the failing sub-assertion is not visible in the log (likely the labelledby/describedby linkage or focus target). It needs the script's assertion detail or a re-run with verbose output.
