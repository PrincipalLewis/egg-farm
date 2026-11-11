set -u; E=/workspace/egg-farm-studio/qa/m3-recheck/pr26-evidence-5aa5472; S=/workspace/egg-farm-studio/scratch/qa-pr24; P=/tmp/pr26env/product; cd /tmp/pr26env/game
git log --format='%h %s' -1 > $E/head.txt; echo "pr=5aa5472 main=$(git rev-parse --short origin/main)" >> $E/head.txt
git diff --name-only origin/main...5aa5472 > $E/files.txt
fresh() { rm -rf $P; mkdir -p $P; cp -a $S/* $P/; }; fresh
(npx tsc --noEmit; echo tsc-exit=$?) > $E/tsc.log 2>&1
(npx vite-node scripts/sync-economy-cli.ts -- --check; echo sync-exit=$?) > $E/sync.log 2>&1
(npm test -- --maxWorkers=2 --minWorkers=1; echo exit=$?) > $E/unit.log 2>&1
(npm run build; echo build-exit=$?) > $E/build.log 2>&1; rm -rf dist
for i in 1 2; do (npm run test:slow -- --reporter=verbose; echo exit=$?) > $E/slow-run$i.log 2>&1; done
cc() { (node scripts/check-economy-copy.mjs "$@"; echo exit=$?) 2>&1; }
V="npx vitest run --maxWorkers=2 --minWorkers=1"
{ echo "## match default"; cc; echo "## match --product"; cc --product; echo "## match --strict"; cc --strict
  sed -i '2s/,[0-9]*,/,99999,/' $P/economy.csv; echo "## csv drift default"; cc; echo "## csv drift --product"; cc --product; echo "## csv drift --strict"; cc --strict
  fresh; printf '\n# qa\n' >> $P/sim/economy_sim.py; echo "## product sim drift --strict"; cc --strict
  rm -rf $P; echo "## hidden default"; cc; echo "## hidden --strict"; cc --strict; fresh
  cp vendor/economy-sim/SOURCE /tmp/pr26env/SOURCE.bak
  echo "## SOURCE duplicate row"; tail -n1 /tmp/pr26env/SOURCE.bak >> vendor/economy-sim/SOURCE; cc --strict; cp /tmp/pr26env/SOURCE.bak vendor/economy-sim/SOURCE
  echo "## SOURCE extra row"; echo "0000000000000000000000000000000000000000000000000000000000000000  sim/extra.py  product/sim/extra.py" >> vendor/economy-sim/SOURCE; cc --strict; cp /tmp/pr26env/SOURCE.bak vendor/economy-sim/SOURCE
  echo "## SOURCE missing row"; grep -v seller_variance_sim /tmp/pr26env/SOURCE.bak > vendor/economy-sim/SOURCE; cc --strict; cp /tmp/pr26env/SOURCE.bak vendor/economy-sim/SOURCE
  echo "## vendored sim tampered --strict"; cp vendor/economy-sim/sim/economy_sim.py /tmp/pr26env/e.bak; printf '\n# t\n' >> vendor/economy-sim/sim/economy_sim.py; cc --strict; cp /tmp/pr26env/e.bak vendor/economy-sim/sim/economy_sim.py
} > $E/copycheck.log 2>&1
{ echo "## tampered seller_variance_sim.py: npm run test:slow alone"; cp vendor/economy-sim/sim/seller_variance_sim.py /tmp/pr26env/s.bak; printf '\n# tamper\n' >> vendor/economy-sim/sim/seller_variance_sim.py
  npm run test:slow 2>&1 | tail -n 8; echo "exit=${PIPESTATUS[0]}"
  echo "## default suite"; $V tests/economy.test.ts 2>&1 | grep -E 'Error:|Tests ' | head -3
  cp /tmp/pr26env/s.bak vendor/economy-sim/sim/seller_variance_sim.py
  echo "## check-vendor-pins clean"; node scripts/check-vendor-pins.mjs; echo exit=$?
  echo "## pins: SHA256SUMS row with .."; cp vendor/economy-sim/SHA256SUMS /tmp/pr26env/sums.bak; echo "0000000000000000000000000000000000000000000000000000000000000000  ../x" >> vendor/economy-sim/SHA256SUMS; node scripts/check-vendor-pins.mjs; echo exit=$?; cp /tmp/pr26env/sums.bak vendor/economy-sim/SHA256SUMS
} > $E/tamper-slow.log 2>&1
rm -rf $P
{ python3 scripts/gen-sim-fixtures.py; echo exit=$?; python3 scripts/gen-seller-variance-fixtures.py; echo exit=$?; echo "## git status --porcelain (expect empty)"; git status --porcelain; echo "## ignored"; git status --porcelain --ignored | grep -v node_modules; git diff --exit-code --stat; echo fixture-diff-exit=$?; } > $E/generators.log 2>&1
echo PR26-DONE
