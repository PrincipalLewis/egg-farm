#!/bin/bash
# step.sh ENGINE BASEPORT CHECK... ; runs given checks inside ONE lock hold (timeout 590 total)
set -u; E=$1; B=$2; shift 2
G=/workspace/egg-farm-studio/qa/scratch/sd5-1-5d636d8; Q=/workspace/egg-farm-studio/qa/m3-scripts; C=$Q/combined
# Pinned to 5d636d8, the SHA this historical re-check verifies. PR #71 (VER-1, 31e1538) retired scripts/recovery-v11-browser.mjs
# (and 7 other one-offs), so this must never run on a post-#71 checkout. Missing $G -> detached worktree at the pin; wrong SHA -> abort.
PIN71=5d636d86e99d29ac1c576b5e7c6e7e59f26eda7e; [ -e "$G" ] || git -C /workspace/egg-farm-studio/game worktree add --detach "$G" "$PIN71" || exit 9
[ "$(git -C "$G" rev-parse HEAD 2>/dev/null)" = "$PIN71" ] || { echo "PIN71: $G is not at $PIN71 (#71 retired scripts used here); check out $PIN71 there first" >&2; exit 9; }
S2=/workspace/egg-farm-studio/qa/m3-recheck/s2-8-wage-rate.mjs; L=/workspace/egg-farm-studio/qa/m3-recheck/save-5d636d8
LOG=$L/logs-$E; mkdir -p $LOG $L/shots/$E; cd $G
echo "  lock acquired $E $(date +%T) load=$(cut -d' ' -f1 /proc/loadavg)"
r(){ n=$1; shift; echo "  --- $n start $(date +%T)"; env "$@" > $LOG/$n.log 2>&1; echo "  --- $n exit=$? $(date +%T)"; }
r 01-buildid PORT=$B node $L/buildid.mjs $E
rg -q "PASS \[$E dist\] runtime build id m3-rc1-pre\+5d636d8" $LOG/01-buildid.log && rg -q "PASS \[$E dist-qa\] runtime build id m3-rc1-pre\+5d636d8" $LOG/01-buildid.log || { echo "  BUILD ID NOT VERIFIED $E"; exit 9; }
for c in "$@"; do case $c in
 guard) r 16-guard-save DIST=dist-qa ENGINE=$E PORT=$((B+17)) OUT=$L/out/qags-$E.json node $L/guard-3da5099e.mjs $G;;
 quota2) r 02-quota2 PORT=$((B+2)) node $L/quota2.mjs $E;;
 probe3) r 03-probe3 DIST=dist-qa PORT=$((B+3)) node $L/probe3.mjs $E;;
 probe3rel) r 04-probe3-rel DIST=dist ONLY=2,6 PORT=$((B+4)) node $L/probe3.mjs $E;;
 probe) r 05-probe DIST=dist PORT=$((B+5)) node $L/probe.mjs $E;;
 claude) r 06-claude-items PORT=$((B+6)) node $L/claude-items.mjs $E;;
 relglob) r 07-release-globals PORT=$((B+7)) node scripts/release-globals-browser.mjs $E;;
 qaglob) r 08-qa-globals MODE=globals DIST=dist ENGINE=$E PORT=$((B+8)) OUT=$L/out node $Q/s2-43eb112-save-globals.mjs $G;;
 v6) r 09-save-v6 MODE=save DIST=dist-qa ENGINE=$E PORT=$((B+9)) OUT=$L/out node $Q/s2-43eb112-save-globals.mjs $G;;
 v6lw) r 09b-save-v6-longwait MODE=save DIST=dist-qa ENGINE=$E PORT=$((B+10)) OUT=$L/out node $Q/s2-43eb112-save-globals-longwait.mjs $G;;
 offline) r 10-offline-clock DIST=dist-qa ENGINE=$E PORT=$((B+11)) OUT=$L/out node $C/offline-clock.mjs $G;;
 wage) r 11-exact-wage DIST=dist-qa ENGINE=$E PORT=$((B+12)) OUT=$L/out FARM=3 REAL_S=60 node $S2 $G;;
 tabguard) r 12-tab-guard PORT=$((B+13)) node scripts/tab-guard-browser.mjs $E;;
 rc0) r 13-rc0 PORT=$((B+14)) SHOTS=$L/shots/$E node scripts/rc0-browser.mjs $E;;
 d2) r 14-d2-kill PORT=$((B+15)) node scripts/d2-kill-browser.mjs $E;;
 recov) r 15-recovery-v11 node scripts/recovery-v11-browser.mjs $E;;
esac; done; echo "  lock release $E $(date +%T)"
