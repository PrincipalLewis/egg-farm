#!/usr/bin/env bash
cd /workspace/wt-arch-review100-ae12da4
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH
A=/workspace/egg-farm-studio/engineering/reviews/evidence-v5-m51-bbv2-ae12da4
{ nice -n 10 ./node_modules/.bin/vite-node $A/frame-probe.ts; echo "EXIT:$?"; } > $A/frame-probe.log 2>&1
