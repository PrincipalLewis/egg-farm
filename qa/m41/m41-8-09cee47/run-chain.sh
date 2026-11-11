#!/bin/bash
# Sequential Chromium chain @ 09cee47 (lane 2 when load<12 else lane 1). One browser at a time.
Q=/workspace/egg-farm-studio/qa/m41/m41-8-09cee47; cd $Q
lk(){ l=$(cut -d' ' -f1 /proc/loadavg); awk "BEGIN{exit !($l>=12)}" && echo /workspace/egg-farm-studio/.browser-test.lock || echo /workspace/egg-farm-studio/.browser-test-2.lock; }
WIDTHS="375 390 430" browser/run-chromium.sh > browser/run-chromium-375-430.out 2>&1
echo "== axe $(date +%T) $(lk)"; BASE=http://127.0.0.1:4941/ flock $(lk) timeout 600 node axe/axe62.mjs 360,390,430 > axe/axe-run.out 2>&1; echo "axe exit=$?"
for w in 360 390 430; do echo "== lin 09cee47 $w $(date +%T)"; BASE=http://127.0.0.1:4941/ BID=09cee47 flock $(lk) timeout 600 node lin/lin-sweep.mjs $w > lin/lin-09cee47-$w.out 2>&1; echo "exit=$?"; cp lin/lin-09cee47.jsonl lin/lin-09cee47-$w.jsonl; done
for w in 360 390 430; do echo "== lin dd223f5 $w $(date +%T)"; BASE=http://127.0.0.1:4942/ BID=dd223f5 flock $(lk) timeout 600 node lin/lin-sweep.mjs $w > lin/lin-dd223f5-$w.out 2>&1; echo "exit=$?"; cp lin/lin-dd223f5.jsonl lin/lin-dd223f5-$w.jsonl; done
echo "== clip 09cee47 $(date +%T)"; BASE=http://127.0.0.1:4941/ BID=09cee47 flock $(lk) timeout 600 node clip/clip.mjs chromium 360,375,390 > clip/clip-09cee47-a.out 2>&1; echo "exit=$?"; cp clip/clip-09cee47-chromium.jsonl clip/clip-09cee47-chromium-a.jsonl
BASE=http://127.0.0.1:4941/ BID=09cee47 flock $(lk) timeout 600 node clip/clip.mjs chromium 430,1280 > clip/clip-09cee47-b.out 2>&1; echo "exit=$?"; cp clip/clip-09cee47-chromium.jsonl clip/clip-09cee47-chromium-b.jsonl
echo "chain done $(date +%T)"
