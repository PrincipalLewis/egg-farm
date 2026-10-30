# AC7 gate fixtures (pacing-x1-ac7 tests, R2 of QA-D-1030-PR93-1)
- `a7dd71b-ac7-active-idle-gate.py`: Econ's `econ/ac7-gate-csv-arg` @ a7dd71bd7a5eddb94263724f7593bf1a5b065302
  `qa/m3-scripts/ac7-active-idle-gate.py` (sha256 3ba1909db39a1385696275f3d1bee2c30cd20fb85ed9d907744909f8850272f6, local-only
  commit, read from local git objects), byte-for-byte except ONE line: the `sys.path.insert` of the studio m4 path points to `stub/`.
- `studio-03d8e825-ac7-active-idle-gate.py`: the studio's `qa/m3-scripts/ac7-active-idle-gate.py` (sha256 03d8e825…f38f,
  argv[1]-only, no --csv), same single-line change.
- The unit test restores that line and checks both sha256 values, so the fixtures stay faithful.
- `stub/m4_active.py`: a deterministic stand-in (active/idle = 1.5) so the real argv and CSV-RECORD code runs without the studio sim.
