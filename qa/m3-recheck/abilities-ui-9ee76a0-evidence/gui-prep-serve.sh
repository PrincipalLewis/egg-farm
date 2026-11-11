#!/bin/bash
set +e
cd /workspace/egg-farm-studio/qa/m3-recheck/abilities-ui-9ee76a0-run || exit 1
exec ./node_modules/.bin/vite preview --outDir dist --port 5216 --strictPort --host 127.0.0.1
