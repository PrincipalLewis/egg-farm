. /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/gate.sh
step() { gate; flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 "$@"; }
cd /tmp/qa-x/pr16
step env PORT=4651 node scripts/offline-v2-browser.mjs chromium > /workspace/egg-farm-studio/qa/m3-recheck/pr16-offline-v2-5248dd9-evidence/offline-v2-chromium.log 2>&1; echo exit=$? >> /workspace/egg-farm-studio/qa/m3-recheck/pr16-offline-v2-5248dd9-evidence/offline-v2-chromium.log
o=4652; for e in firefox webkit; do
 step env ENGINE=$e PORT=$o DIST=dist-qa OUT=/workspace/egg-farm-studio/qa/m3-recheck/pr16-offline-v2-5248dd9-evidence/shots-oc-$e node /workspace/egg-farm-studio/qa/m3-scripts/combined/offline-clock.mjs /tmp/qa-x/pr16 > /workspace/egg-farm-studio/qa/m3-recheck/pr16-offline-v2-5248dd9-evidence/offline-clock-$e.log 2>&1; echo exit=$? >> /workspace/egg-farm-studio/qa/m3-recheck/pr16-offline-v2-5248dd9-evidence/offline-clock-$e.log; o=$((o+1))
 step env PORT=$o node scripts/offline-v2-browser.mjs $e > /workspace/egg-farm-studio/qa/m3-recheck/pr16-offline-v2-5248dd9-evidence/offline-v2-$e.log 2>&1; echo exit=$? >> /workspace/egg-farm-studio/qa/m3-recheck/pr16-offline-v2-5248dd9-evidence/offline-v2-$e.log; o=$((o+1))
done
cd /tmp/qa-x/pr4b
step node /tmp/qa-x/smoke.mjs chromium 4660 /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/shots > /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/smoke-chromium.log 2>&1; echo exit=$? >> /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/smoke-chromium.log
step npx vitest run --maxWorkers=2 --minWorkers=1 > /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/vitest-full.log 2>&1; echo vitest_exit=$? >> /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/vitest-full.log
o=4661; for e in chromium firefox webkit; do
 step node qa-pr4-manage.mjs $e $o /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/shots > /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/manage-$e.log 2>&1; echo exit=$? >> /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/manage-$e.log; o=$((o+1))
 step env PORT=$o SHOTS=/workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/shots/rc0-$e SHOTS_ALL=1 node scripts/rc0-browser.mjs $e > /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/rc0-$e.log 2>&1; echo exit=$? >> /workspace/egg-farm-studio/qa/m3-recheck/pr4-b2-4e47d77-evidence/rc0-$e.log; o=$((o+1))
done
