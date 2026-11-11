Q=/workspace/egg-farm-studio/qa/m3-recheck; E=$Q/pr20-evidence; mkdir -p $E/shots
cd /tmp/qa-pr20 && grep -q f1e24d4 dist/assets/*.js && echo "build-id f1e24d4 in bundle" > $E/buildid.txt; grep -o 'm3-rc1-pre+[0-9a-f+dirty]*' dist/assets/*.js | sort -u >> $E/buildid.txt
G=/tmp/qa-pr20 PORT=4296 OUT=$E/shots flock /workspace/egg-farm-studio/.browser-test-2.lock timeout 600 node $Q/batch-0218/dlg-layout.mjs chromium > $E/dlg-layout-chromium.log 2>&1; echo "exit=$?" >> $E/dlg-layout-chromium.log
mkdir -p /tmp/pr20-rc0; PORT=4297 SHOTS=/tmp/pr20-rc0 flock /workspace/egg-farm-studio/.browser-test-2.lock timeout 600 node scripts/rc0-browser.mjs chromium > $E/rc0-chromium.log 2>&1; echo "exit=$?" >> $E/rc0-chromium.log
echo PR20-BROWSER-DONE
$Q/batch-0218/gates.sh 735bc72 pr23
cd /tmp/qa-pr23; E=$Q/pr23-evidence; for i in 1 2; do (npm run test:slow -- --reporter=verbose; echo exit=$?) > $E/slow-run$i.log 2>&1; done; echo PR23-DONE
