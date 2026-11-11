#!/usr/bin/env bash
G=/workspace/qa-sd3/game; Q=/workspace/egg-farm-studio/qa/m3-scripts; C=$Q/combined; L=/workspace/egg-farm-studio/qa/m3-recheck/save-durability-4a25d0d; S2=/workspace/egg-farm-studio/qa/m3-recheck/s2-8-wage-rate.mjs; O=/workspace/egg-farm-studio/qa/m3-recheck/save-durability-2959ba0
# Pinned to 4a25d0d, the SHA this historical re-check verifies. PR #71 (VER-1, 31e1538) retired scripts/recovery-v11-browser.mjs
# (and 7 other one-offs), so this must never run on a post-#71 checkout. Missing $G -> detached worktree at the pin; wrong SHA -> abort.
PIN71=4a25d0d499355e23f6bde646381faf5d4bf50f2b; [ -e "$G" ] || git -C /workspace/egg-farm-studio/game worktree add --detach "$G" "$PIN71" || exit 9
[ "$(git -C "$G" rev-parse HEAD 2>/dev/null)" = "$PIN71" ] || { echo "PIN71: $G is not at $PIN71 (#71 retired scripts used here); check out $PIN71 there first" >&2; exit 9; }
mkdir -p $L/out $L/shots; cd $G
waitqa(){ while ps -eo args | grep -v -E 'qa-sd3|grep|vite' | grep -q -E '(sd3|rc0-browser|tab-guard-browser|d2-kill-browser|recovery-v11-browser|release-globals-browser|rc1-guard-save-qa|s2-43eb112|offline-clock|probe[0-9]*)\.mjs'; do sleep 10; done; }
crashed(){ grep -q -E 'triggerUncaughtException|^Node\.js v[0-9]|serveOwn: port|Target page, context or browser has been closed|browser has disconnected|ECONNREFUSED' "$1" || ! grep -q -E '^(PASS|FAIL|OK |LOSS)' "$1"; }
run(){ local name=$1; shift; local i=1; while :; do local f=$L/$name.log; [ $i -gt 1 ] && f=$L/$name.try$i.log
  waitqa; echo "[$(date +%T) load $(cut -d' ' -f1 /proc/loadavg)] $name try $i" >> $L/run.log
  ( "$@" ) > $f 2>&1; local r=$?; echo "  exit $r pass=$(grep -c '^PASS' $f) fail=$(grep -c '^FAIL' $f)" >> $L/run.log
  if crashed $f && [ $i -lt 3 ]; then echo "  CRASH -> retry" >> $L/run.log; i=$((i+1)); sleep 5; else break; fi; done; }
sed -e 's#/workspace/qa-sd/game#/workspace/qa-sd3/game#g' $O/probe.mjs > $L/probe.mjs
sed -e 's#/workspace/qa-sd/game#/workspace/qa-sd3/game#g' $O/claude-items.mjs > $L/claude-items.mjs
cp /workspace/qa-sd3/probe3.mjs $L/probe3.mjs
P=6500
for e in ${ENGINES:-chromium firefox webkit}; do P=$((P+20))
 run probe3-$e env DIST=dist-qa PORT=$((P+0)) node $L/probe3.mjs $e
 run probe3-release-$e env DIST=dist ONLY=2,6 PORT=$((P+10)) node $L/probe3.mjs $e
 run probe-dist-$e env DIST=dist PORT=$((P+1)) node $L/probe.mjs $e
 run claude-items-$e env PORT=$((P+11)) node $L/claude-items.mjs $e
 run eng-release-globals-$e env PORT=$((P+3)) node scripts/release-globals-browser.mjs $e
 run qa-globals-$e env MODE=globals DIST=dist ENGINE=$e PORT=$((P+4)) OUT=$L/out node $Q/s2-43eb112-save-globals.mjs $G
 run save-v6-$e env MODE=save DIST=dist-qa ENGINE=$e PORT=$((P+5)) OUT=$L/out node $Q/s2-43eb112-save-globals.mjs $G
 run save-v6-longwait-$e env MODE=save DIST=dist-qa ENGINE=$e PORT=$((P+14)) OUT=$L/out node $Q/s2-43eb112-save-globals-longwait.mjs $G
 run guard-save-R1R6-$e env ENGINE=$e PORT=$((P+15)) node $Q/rc1-guard-save-qa.mjs $G
 run offline-clock-$e env DIST=dist-qa ENGINE=$e PORT=$((P+6)) OUT=$L/out node $C/offline-clock.mjs $G
 run exact-wage-$e env DIST=dist-qa ENGINE=$e PORT=$((P+7)) OUT=$L/out FARM=3 REAL_S=60 node $S2 $G
 run eng-tab-guard-$e env PORT=$((P+8)) node scripts/tab-guard-browser.mjs $e
 run rc0-browser-$e env PORT=$((P+9)) SHOTS=$L/shots node scripts/rc0-browser.mjs $e
 run d2-kill-$e env PORT=$((P+12)) node scripts/d2-kill-browser.mjs $e
 run recovery-v11-$e env PORT=$((P+13)) node scripts/recovery-v11-browser.mjs $e
done
mkdir -p $L/fastcollect; for i in $(seq -w 1 20); do waitqa; ONLY=fastcollect PORT=6601 SHOTS=$L/shots node scripts/rc0-browser.mjs chromium > $L/fastcollect/run$i.log 2>&1; echo "fc$i exit $?" >> $L/run.log; done
echo ALLDONE >> $L/run.log
