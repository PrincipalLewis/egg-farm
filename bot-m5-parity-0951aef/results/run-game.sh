#!/bin/sh
# Parity run 2: CSV rc/v5 data/economy.csv (b48be8a4, the game copy at 22eac98), seeds 1-200, CFG none,AssZ x PROFS casual (the m5x-casual profile).
cd /workspace/egg-farm-studio/scratch/v2-econ/h && env CSV=/workspace/wt-v5-botm5/data/economy.csv SEEDS=200 S0=1 CFG=none,AssZ PROFS=casual nice node node_modules/.bin/vite-node m5x.ts > /workspace/egg-farm-studio/artifacts/bot-m5-parity/results/game.orig.json 2> /workspace/egg-farm-studio/artifacts/bot-m5-parity/results/game.orig.log &
cd /workspace/wt-v5-botm5 && env CSV=/workspace/wt-v5-botm5/data/economy.csv SEEDS=200 S0=1 CFG=none,AssZ PROFS=casual nice node node_modules/.bin/vite-node scripts/bot-m5x.ts > /workspace/egg-farm-studio/artifacts/bot-m5-parity/results/game.port.json 2> /workspace/egg-farm-studio/artifacts/bot-m5-parity/results/game.port.log &
wait; echo ALLDONE > /workspace/egg-farm-studio/artifacts/bot-m5-parity/results/game.done
