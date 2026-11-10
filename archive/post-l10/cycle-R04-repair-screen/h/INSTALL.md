# scratch/v2-econ/h: node_modules install record

Restored 2026-10-28 ~08:05 (Europe/Belgrade, UTC+1) by Econ, with HoE approval (08:01). node_modules was lost in the Oct 27 ~23:38 workspace restore, and there was no lockfile.

## Pinned files
- package.json: sha256 7247d1bf481962622509e912886c0172b083ec3d0c35dca37987f2f91f6c4731 (left as it was; it's the game-repo copy. Its devDependencies are identical to the game repo's, ranges included)
- package-lock.json: sha256 56569550486f3450a31b435e94b807a7dc95d1e7ee7d3e9d5e09606e0ff6f75e
  (a byte-identical copy of /workspace/wt-ver1c/package-lock.json, repo commit 5cf99b7 (2026-10-28 00:13 UTC+1), lockfileVersion 3; npm ci left it unchanged)

## Resolved versions (exact, from the lock)
vite-node 2.1.9 · vite 5.4.21 · vitest 2.1.9 · esbuild 0.21.5 (@esbuild/linux-x64) · rollup 4.64.7 · typescript 5.9.3 ·
@types/node 20.19.43 · playwright-core 1.64.1 · jsdom 26.1.0 · @fontsource/fredoka 5.3.0 · @fontsource/nunito 5.3.0
Runtime: node v20.19.2, npm 11.21.1. The main game checkout's lock (game/, ce7d59a, a58e7f44…) has the same versions for all of these; it just has no jsdom.

## Bare imports used by the harness .ts files
Top-level harness files import only node: builtins plus local ./src, ./scripts and ./tests. Bare packages in the tree: vite, vitest, playwright-core. Runner: vite-node.

## Reproduce
    cd scratch/v2-econ/h && rm -rf node_modules && npm ci --no-audit --no-fund
Note: npm 11 does not run esbuild's postinstall (allowScripts). It isn't needed, because the @esbuild/linux-x64 binary installs as an optional dependency.

## Smoke test (2026-10-28)
- node node_modules/.bin/vite-node --version  ->  vite-node/2.1.9 linux-x64 node-v20.19.2
- CSV=data/economy.csv SEEDS=1 S0=1 T=600 CFG=none PROFS=casual NOWIN=1 vite-node m5x.ts  ->  exit 0, under 1 s, csv sha c7bb783f…
- m5.ts 29d423c53effa343ef63c1258b04e02d07eda7c797c26b2daa9bdb3f64c2e0b6 and m5x.ts 196e8ed59392f80dd63e2dc38d53d3f7d9552994c7878bf703bf1d2b155a729a are unchanged, and every *.ts hash is unchanged.
