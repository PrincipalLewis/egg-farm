TASK HoQA/PR113-F2: verify #113 (F-2) at exact head 560b4d437f06df1e399d3f91c7af850b2b1e2bb5
Write scope: qa/m3-recheck/ only (report + evidence). Scratch under qa/scratch/f2-560b4d4/ OK.

Tip (HoE + Saves confirmed; Architect PASS claimed):
- SHA: 560b4d437f06df1e399d3f91c7af850b2b1e2bb5
- Branch: origin/fix/saves-telemetry-ring-export
- Base: rc/v5 844f8e15774daeb1c0a855cb69b1fabd2f0ab820
- PR: https://github.com/PrincipalLewis/egg-farm/pull/113 (Ready, open, MERGEABLE)
- Hosted: ci/gate 42114655500 SUCCESS; verify-smoke 42114655541 SUCCESS; k10 42114655863 SUCCESS; pacing-x1-stack 42114655642 still in progress at dispatch — poll to conclusion

Bar (all required for PASS):
1. Re-confirm tip identity; contains 844f8e15; remote head match
2. F-2 functional:
   - ring stored as {v, events}
   - legacy:true on old/unversioned rings; load does not throw
   - export schema_version = TELEMETRY_SCHEMA_VERSION
   - old-save → new-save → export round trip
   Prefer tests/telemetry-ring-export.test.ts and related; also independent probes if needed
3. tsc --noEmit clean
4. full vitest 0 fail
5. zg suites + telemetry-schema + F-1 set 86/86 unchanged (k10-breeds-offset, verify incl VER-1h, telemetry-m3, pacing-x1-ac7)
6. build + check-release-build
7. Hosted gate SUCCESS (42114655500 already success — re-confirm). release-globals skipped ≠ pass
8. Pacing: shards SUCCESS; aggregate FAIL OK only with RC-only row 904 named

Hard rules: never push/merge/tag; never print GITHUB_TOKEN; lane-run.sh saves-qa / lane-kill.sh; vitest flock /workspace/egg-farm-studio/.vitest-eng.lock nice -n 10 1 worker; cite 560b4d4 only; no writes outside qa/.

Report: qa/m3-recheck/f2-560b4d4.md with PASS/FAIL, sha256, evidence under qa/m3-recheck/evidence/f2-560b4d4/.
