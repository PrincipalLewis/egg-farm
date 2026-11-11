# Duplicate-run note (05:33 CEST): second executor's results for #17 cf50663 / #18 d8d680e / M4-A c108440
After the 04:43 reset a second QA run (worktree /tmp/qa-final, /tmp/qa-y) was writing the same reports and exits.txt. At 05:27 it overwrote pr17-cf50663.md and pr18-d8d680e.md. To stop two queues competing for .browser-test.lock, I stopped my own driver (qa/scratch/pr17-18-y/run2.sh, PIDs 96885/186009/186011) and kept the other run's reports as the record.
My valid results (scripts and clones are in qa/scratch/pr17-18-y/):
- Heads re-checked 04:49: PR17=cf50663, PR18=d8d680e, m4/m4a-tracks-v3=c108440. None had moved.
- Rebuild after the reset: static build-ids match each head. Asset hashes are identical to the pre-reset builds.
- Runtime build-id, Chromium: #17 ["m3-rc1-pre+cf50663"] (04:56), #18 ["m3-rc1-pre+d8d680e"] (05:13). The probe v1 (copied from c08cff5) never clicked start and returned []. That was a probe defect, fixed in scratch/pr17-18-y/buildid-probe.mjs.
- #18 balance.json is sha256-identical to 3ea9f04 (f0dcf767…).
- M4-A html sha256 94b4084d…6ec4 MATCHES.
Observed hazard: the other run's vite preview (PID 110437, /tmp/qa-y/m4a-prov, since 04:55) holds :5723, and its own M4-A globals step (PID 185276) uses --strictPort 5723, so that step will likely fail EADDRINUSE. Not mine, so not killed.
