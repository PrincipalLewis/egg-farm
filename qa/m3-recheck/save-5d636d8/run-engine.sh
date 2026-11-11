#!/bin/bash
# usage: run-engine.sh ENGINE BASEPORT  (run inside flock)
set -u; E=$1; B=$2
G=/workspace/egg-farm-studio/qa/scratch/sd5-1-5d636d8; Q=/workspace/egg-farm-studio/qa/m3-scripts; C=$Q/combined
# Pinned to 5d636d8, the SHA this historical re-check verifies. PR #71 (VER-1, 31e1538) retired scripts/recovery-v11-browser.mjs
# (and 7 other one-offs), so this must never run on a post-#71 checkout. Missing $G -> detached worktree at the pin; wrong SHA -> abort.
PIN71=5d636d86e99d29ac1c576b5e7c6e7e59f26eda7e; [ -e "$G" ] || git -C /workspace/egg-farm-studio/game worktree add --detach "$G" "$PIN71" || exit 9
[ "$(git -C "$G" rev-parse HEAD 2>/dev/null)" = "$PIN71" ] || { echo "PIN71: $G is not at $PIN71 (#71 retired scripts used here); check out $PIN71 there first" >&2; exit 9; }
S2=/workspace/egg-farm-studio/qa/m3-recheck/s2-8-wage-rate.mjs; L=/workspace/egg-farm-studio/qa/m3-recheck/save-5d636d8
LOG=$L/logs-$E; mkdir -p $LOG $L/out $L/shots/$E; cd $G
echo "engine $E start $(date "+%F %T %Z")"
r(){ n=$1; to=$2; shift 2; [ $to -gt 590 ] && to=590; while [ "$(cut -d. -f1 /proc/loadavg)" -gt 50 ]; do sleep 30; done; echo "--- $n queued $(date +%T)"; flock /workspace/egg-farm-studio/.browser-test.lock timeout $to env "$@" > $LOG/$n.log 2>&1; echo "--- $n exit=$? $(date +%T) load=$(cut -d" " -f1 /proc/loadavg)"; }
r 01-buildid 300 PORT=$B node $L/buildid.mjs $E
if ! rg -q "PASS \[$E dist\] runtime build id m3-rc1-pre\+5d636d8" $LOG/01-buildid.log || ! rg -q "PASS \[$E dist-qa\] runtime build id m3-rc1-pre\+5d636d8" $LOG/01-buildid.log; then echo "BUILD ID NOT VERIFIED - abort $E"; exit 9; fi
r 16-guard-save 590 DIST=dist-qa ENGINE=$E PORT=$((B+17)) OUT=$L/out/qags-$E.json node $L/guard-3da5099e.mjs $G
[ -n "${ONLYG:-}" ] && { echo "engine $E done (guard only)"; exit 0; }
r 02-quota2 400 PORT=$((B+2)) node $L/quota2.mjs $E
r 03-probe3 600 DIST=dist-qa PORT=$((B+3)) node $L/probe3.mjs $E
r 04-probe3-rel 400 DIST=dist ONLY=2,6 PORT=$((B+4)) node $L/probe3.mjs $E
r 05-probe 600 DIST=dist PORT=$((B+5)) node $L/probe.mjs $E
r 06-claude-items 400 PORT=$((B+6)) node $L/claude-items.mjs $E
r 07-release-globals 300 PORT=$((B+7)) node scripts/release-globals-browser.mjs $E
r 08-qa-globals 400 MODE=globals DIST=dist ENGINE=$E PORT=$((B+8)) OUT=$L/out node $Q/s2-43eb112-save-globals.mjs $G
r 09-save-v6 400 MODE=save DIST=dist-qa ENGINE=$E PORT=$((B+9)) OUT=$L/out node $Q/s2-43eb112-save-globals.mjs $G
r 09b-save-v6-longwait 600 MODE=save DIST=dist-qa ENGINE=$E PORT=$((B+10)) OUT=$L/out node $Q/s2-43eb112-save-globals-longwait.mjs $G
r 10-offline-clock 600 DIST=dist-qa ENGINE=$E PORT=$((B+11)) OUT=$L/out node $C/offline-clock.mjs $G
r 11-exact-wage 400 DIST=dist-qa ENGINE=$E PORT=$((B+12)) OUT=$L/out FARM=3 REAL_S=60 node $S2 $G
r 12-tab-guard 400 PORT=$((B+13)) node scripts/tab-guard-browser.mjs $E
r 13-rc0 1200 PORT=$((B+14)) SHOTS=$L/shots/$E node scripts/rc0-browser.mjs $E
r 14-d2-kill 600 PORT=$((B+15)) node scripts/d2-kill-browser.mjs $E
r 15-recovery-v11 600 node scripts/recovery-v11-browser.mjs $E
echo "engine $E done $(date "+%F %T %Z")"
