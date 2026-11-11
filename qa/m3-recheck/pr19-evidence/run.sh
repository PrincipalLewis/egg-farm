cd /tmp/qa-pr19; E=/workspace/egg-farm-studio/qa/m3-recheck/pr19-evidence
git rev-parse HEAD > $E/head.txt
git diff --name-only origin/main...HEAD > $E/files.txt
(npx tsc --noEmit; echo tsc-exit=$?) > $E/tsc.log 2>&1
(npx vite-node scripts/sync-economy-cli.ts -- --check; echo sync-exit=$?) > $E/sync.log 2>&1
(npx vitest run --maxWorkers=2 --minWorkers=1; echo exit=$?) > $E/vitest-default.log 2>&1
for i in 1 2; do (npx vitest run --config vitest.slow.config.ts --maxWorkers=2 --minWorkers=1 --reporter=verbose; echo exit=$?) > $E/slow-run$i.log 2>&1; done
(npx vite build && node scripts/check-release-build.mjs dist; echo build-exit=$?) > $E/build.log 2>&1
echo DONE
