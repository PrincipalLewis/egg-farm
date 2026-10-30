Economy's ORIGINAL o1a drivers, vendored unmodified as the independent reference for the bot-m5 B smoke parity (QA-D-1030-B94).
They are not part of the game or the test suite; ref.sh copies the four .ts files into the root of a clean worktree of the SHA under
test (their imports are root-relative: ./src, ./tests, ./scripts) and runs them there. Sources and sha1 pins:
- m5p.ts 9eed2879, m5px.ts c20ad937, m5l.ts e930c8c7, m5lx.ts 7123fc25: /workspace/egg-farm-studio/scratch/m51-refill/h2/ (m5-o1a-ts REQUIREMENTS L5/L27).
- pool2.py, pool2b.py, press.py: /workspace/egg-farm-studio/scratch/m52-press/ (REQUIREMENTS L34; pool2.py sha256 c48dedee…, pool2b.py d125a921…).
sha256 of every file: ../MANIFEST.sha256 (checked by ref.sh and run-smoke.sh before use).
