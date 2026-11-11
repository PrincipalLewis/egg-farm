set -u; Q=/workspace/egg-farm-studio/qa/m3-recheck; E=$Q/pr24-evidence-8569fef; mkdir -p $E; R=/workspace/egg-farm-studio/game; S=/workspace/egg-farm-studio/scratch/qa-pr24; P=/tmp/pr24env/product; W=/tmp/pr24env/game
cd $R; C=$(git commit-tree $(git merge-tree --write-tree 8569fef origin/main) -p 8569fef -p origin/main -m qa-local-merge-pr24); echo "pr=8569fef main=$(git rev-parse --short origin/main) localmerge=$C" > $E/head.txt
mkdir -p /tmp/pr24env; git worktree add -q --detach $W $C; ln -s $R/node_modules $W/node_modules; cd $W
rg -n "\.\./product|/workspace/product|\.\./\.\./product|'product'" tests scripts vite.config.ts vitest.slow.config.ts package.json > $E/grep-product.txt
(npx tsc --noEmit; echo tsc-exit=$?) > $E/tsc.log 2>&1
(npx vite-node scripts/sync-economy-cli.ts -- --check; echo sync-exit=$?) > $E/sync.log 2>&1
fresh() { rm -rf $P; mkdir -p $P; cp -a $S/* $P/; }
ut() { (npm test -- --maxWorkers=2 --minWorkers=1; echo exit=$?) > $E/unit-$1.log 2>&1; }
fresh; ut A-product-present
cc() { (node scripts/check-economy-copy.mjs "$@"; echo exit=$?) 2>&1; }
{ echo "## match: default"; cc; echo "## match: --product"; cc --product; echo "## match: --strict"; cc --strict; } > $E/copycheck-match.log
sed -i '2s/,[0-9]*,/,99999,/' $P/economy.csv
{ echo "## csv drift: default"; cc; echo "## csv drift: --product"; cc --product; echo "## csv drift: --strict alone"; cc --strict; echo "## --product --strict"; cc --product --strict; } > $E/copycheck-csvdrift.log
fresh; printf '\n# qa edit\n' >> $P/sim/economy_sim.py
{ echo "## product sim edited: --strict"; cc --strict; echo "## default"; cc; } > $E/copycheck-simdrift.log
sed -i '2s/,[0-9]*,/,99999,/' $P/economy.csv; sed -i 's/^COLL_SHARE = 0.5; SELL_EVERY = 15/COLL_SHARE = 0.9; SELL_EVERY = 3/' $P/sim/economy_sim.py; printf '\n# qa\n' >> $P/sim/seller_variance_sim.py
ut B-product-edited
rm -rf $P; ut C-product-hidden
{ echo "## hidden: default"; cc; echo "## hidden: --strict"; cc --strict; } > $E/copycheck-hidden.log
# generators with product hidden; fixtures byte-identical
(python3 scripts/gen-sim-fixtures.py; echo exit=$?; python3 scripts/gen-seller-variance-fixtures.py; echo exit=$?; git status --porcelain tests/fixtures; git diff --exit-code --stat tests/fixtures; echo fixture-diff-exit=$?) > $E/regen-fixtures.log 2>&1
# tampered vendored sim
cp vendor/economy-sim/sim/economy_sim.py /tmp/pr24env/esim.bak; printf '\n# tamper\n' >> vendor/economy-sim/sim/economy_sim.py
(npx vitest run tests/economy.test.ts --maxWorkers=2; echo exit=$?) > $E/tamper-economy-test.log 2>&1
cp /tmp/pr24env/esim.bak vendor/economy-sim/sim/economy_sim.py; cp vendor/economy-sim/sim/seller_variance_sim.py /tmp/pr24env/sv.bak; printf '\n# tamper\n' >> vendor/economy-sim/sim/seller_variance_sim.py
(npx vitest run --config vitest.slow.config.ts --maxWorkers=2 -t 'sha|pin' ; echo exit=$?) > $E/tamper-sv-slow.log 2>&1
cp /tmp/pr24env/sv.bak vendor/economy-sim/sim/seller_variance_sim.py;
# SOURCE row count: extra and missing rows
cp vendor/economy-sim/SOURCE /tmp/pr24env/SOURCE.bak
fresh
{ echo "## SOURCE extra row"; tail -n1 vendor/economy-sim/SOURCE | sed 's/economy.csv/economy-extra.csv/' >> vendor/economy-sim/SOURCE; cat vendor/economy-sim/SOURCE; cc --strict; npx vitest run tests/economy.test.ts tests/economy-copy.test.ts --maxWorkers=2 2>&1 | tail -n6; cp /tmp/pr24env/SOURCE.bak vendor/economy-sim/SOURCE
  echo "## SOURCE missing row"; grep -v seller_variance vendor/economy-sim/SOURCE > /tmp/pr24env/S2 || true; cp /tmp/pr24env/S2 vendor/economy-sim/SOURCE; cat vendor/economy-sim/SOURCE; cc --strict; npx vitest run tests/economy.test.ts tests/economy-copy.test.ts --maxWorkers=2 2>&1 | tail -n6; cp /tmp/pr24env/SOURCE.bak vendor/economy-sim/SOURCE; } > $E/source-rowcount.log 2>&1
rm -rf $P
 git status --porcelain > $E/clean-after-tamper.txt
for i in 1 2; do (npm run test:slow -- --reporter=verbose; echo exit=$?) > $E/slow-run$i.log 2>&1; done
echo PR24-DONE
