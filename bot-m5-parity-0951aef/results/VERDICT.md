# bot-m5 port A parity verdict (rc/v5, Q-ZG-H3 option A)

Written 2026-10-29 20:40 CET by Senior Software Architect.

**Both runs PASS: the outputs are byte-identical.** `tests/bot-m5.ts` + `scripts/bot-m5x.ts` @ port commit
`0951aefa37f7c2fd9171071ccf9095f55a8373c4` (branch `tests/bot-m5-port`, PR #78) reproduce Economy's
`m5x.ts` byte for byte on stdout (JSON) and stderr (per-cfg/profile lines).

| run | CSV (sha256) | seeds | CFG x PROFS | stdout diff | stderr diff | verdict |
|---|---|---|---|---|---|---|
| game | rc/v5 `data/economy.csv` `b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857` | 1-200 | none,AssZ x casual (2 combos) | `game.diff` 0 bytes | `cmp game.orig.log game.port.log` = 0 | **PASS** |
| m50 | `scratch/v2-econ/economy.m50-draft.csv` `8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b` | 1-200 | none,AssZ,AssZhold x optimal,seller15,casual (9 combos) | `m50.diff` 0 bytes | `cmp m50.orig.log m50.port.log` = 0 | **PASS** |

The byte-exact diff matched for both runs, so no semantic comparison was needed and there is no first divergence.
Output sha256: game.{orig,port}.json `5470dde8f546fcd105c448da4ff3e700f5677b73910b5ecc634ccaf4bc763aa7`;
m50.{orig,port}.json `a36bb9f8e6585ff8fb5aa41b3ff60567e2e4391dd8d622e8befb5cf6fda9a9f8`.
Both JSON headers report T 12000, STEP 300, seeds [1,200] and the CSV sha256 above. The m50 run ended at 20:38 CET (`m50.done`), the game run at 20:25 CET (`game.done`).

## Sources
| file | expected | actual sha256 |
|---|---|---|
| scratch/v2-econ/h/m5.ts (original) | 29d423c5 | `29d423c53effa343ef63c1258b04e02d07eda7c797c26b2daa9bdb3f64c2e0b6` (git blob 4e3f5bbc) |
| scratch/v2-econ/h/m5x.ts (original) | 196e8ed5 | `196e8ed59392f80dd63e2dc38d53d3f7d9552994c7878bf703bf1d2b155a729a` (git blob 9e20ba1a) |
| tests/bot-m5.ts @ 0951aef (port) | n/a | `554b3a064a9cdf37fac02961307d40f9d5f5ff54ab802565db18aa32e23d6d2c` |
| scripts/bot-m5x.ts @ 0951aef (port CLI) | n/a | `161722fffae0fa7191db87ecad96cc860e96c454868effa06845a78e5dcc8f66` |

Node v20.19.2, vite-node from each tree's node_modules.

## Exact commands
`run-game.sh` (in this dir):
```sh
cd /workspace/egg-farm-studio/scratch/v2-econ/h && env CSV=/workspace/wt-v5-botm5/data/economy.csv SEEDS=200 S0=1 CFG=none,AssZ PROFS=casual nice node node_modules/.bin/vite-node m5x.ts > game.orig.json 2> game.orig.log &
cd /workspace/wt-v5-botm5 && env CSV=/workspace/wt-v5-botm5/data/economy.csv SEEDS=200 S0=1 CFG=none,AssZ PROFS=casual nice node node_modules/.bin/vite-node scripts/bot-m5x.ts > game.port.json 2> game.port.log &
wait
```
`run-m50.sh` (in this dir):
```sh
cd /workspace/egg-farm-studio/scratch/v2-econ/h && env CSV=/workspace/egg-farm-studio/scratch/v2-econ/economy.m50-draft.csv SEEDS=200 S0=1 CFG=none,AssZ,AssZhold PROFS=optimal,seller15,casual nice node node_modules/.bin/vite-node m5x.ts > m50.orig.json 2> m50.orig.log &
cd /workspace/wt-v5-botm5 && env CSV=/workspace/egg-farm-studio/scratch/v2-econ/economy.m50-draft.csv SEEDS=200 S0=1 CFG=none,AssZ,AssZhold PROFS=optimal,seller15,casual nice node node_modules/.bin/vite-node scripts/bot-m5x.ts > m50.port.json 2> m50.port.log &
wait
```
(The scripts write to absolute paths under artifacts/bot-m5-parity/results/. Their header comments number the runs the other way round: run-m50.sh says "Parity run 1" and run-game.sh says "Parity run 2".)
Diffs: `diff game.orig.json game.port.json > game.diff`, `diff m50.orig.json m50.port.json > m50.diff`, plus `cmp` on the .log pairs.

## Scope
This is parity of the M5.0 bot port with Economy's m5.ts/m5x.ts only. It is **not** o1a parity (artifacts/m51-o1a, m52-o1a; steps B and M5.1-src in engineering/tasks/m5-o1a-ts/REQUIREMENTS.md).
