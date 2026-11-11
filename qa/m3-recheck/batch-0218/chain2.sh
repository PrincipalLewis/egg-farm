Q=/workspace/egg-farm-studio/qa/m3-recheck
while pgrep -f chain1.sh >/dev/null; do sleep 20; done
# PR20 check-globals chromium (lane 2)
# PR22: check-globals + rc0 chromium lane2; layout 360 chromium lane2, firefox/webkit main lock
cd /tmp/qa-pr22; E=$Q/pr22-evidence; mkdir -p $E/shots; ID=$(grep -o 'm3-rc1-pre+[0-9a-f]*' dist/assets/index-*.js | head -1); EX=${ID#*+}
(PORT=4298 flock /workspace/egg-farm-studio/.browser-test-2.lock timeout 600 node scripts/release-globals-browser.mjs chromium; echo exit=$?) > $E/check-globals-chromium.log 2>&1
(PORT=4299 EXPECT=$EX WIDTHS=360,390 flock /workspace/egg-farm-studio/.browser-test-2.lock timeout 600 node qa-layout-pr22.mjs chromium $E/shots; echo exit=$?) > $E/layout-chromium.log 2>&1
for eng in firefox webkit; do (PORT=4299 EXPECT=$EX WIDTHS=360,390 flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node qa-layout-pr22.mjs $eng $E/shots; echo exit=$?) > $E/layout-$eng.log 2>&1; done
mkdir -p /tmp/pr22-rc0; (PORT=4297 SHOTS=/tmp/pr22-rc0 flock /workspace/egg-farm-studio/.browser-test-2.lock timeout 600 node scripts/rc0-browser.mjs chromium; echo exit=$?) > $E/rc0-chromium.log 2>&1
echo PR22-BROWSER-DONE
$Q/batch-0218/pr24.sh
