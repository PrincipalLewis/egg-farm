TASK saves-qa/schema-c7937c9: verify schema.ts at c7937c9a16fc81cde1eed526c804c5800bbd17b4 against telemetry errata rev13 a0e8f6d7, before merge.
Write scope: qa/ only (report qa/m3-recheck/, evidence qa/m3-recheck/evidence/schema-c7937c9/, scratch /workspace/egg-farm-studio/qa/scratch/schema-c793-2048). Do not modify /workspace/wt-v5-telemetry-schema.
Never push, merge or tag. Never print GITHUB_TOKEN. Long procs via lane-run.sh saves-qa; vitest 1 worker, flock .vitest-eng.lock, nice -n 10, load <=11. TS engine only.
