#!/bin/bash
# Self-test for the v5-saves-gate.sh RC lock-window timer (rule 21 fix 2026-10-30, HoQ OK). Drives the gate's OWN code path
# (v5-saves-gate.sh --selftest-timer -> startwin / stopwin / sign_results) with short env thresholds, then asserts:
#  T1 timer started via lane-run: PID recorded in .pids/saves-qa.pids (this boot, cmd = gate --win-timer)
#  T2 while running: own session + process group (pgid = sid = PID); group = timer + its sleep only, all children of the timer
#  T3 WARNING line appears in status.log, summary.txt and the gate's stderr     T4 stopwin via lane-kill: exit 0, no ERROR
#  T5 after stop: PID and its whole process group are gone; lane-kill now reports exactly "GONE PID"
#  T6 past the OVERRUN threshold: no OVERRUN line, status.log byte-identical to STATUS.sha256 (no writes after stop)
#  T7 signing still passes: sha256sum -c SHA256SUMS and -c STATUS.sha256
#  N1 leader gone but a group member survives -> gate stops (exit 3), says ask HoO, and signals NOTHING (member still alive)
#  N2 PID not recorded in lane saves-qa -> lane-kill REFUSED -> gate stops (exit 3), says ask HoO
#  G1 gate code has no pkill / killall / pgrep / direct kill
# Every process here is started via lane-run (lane saves-qa) or is a plain foreground/waited child; nothing is killed except via the gate's stopwin.
# usage: selftest-gate-timer.sh [outdir]  (default qa/v5-saves/changes-20261030/selftest-gate-timer; never /tmp, rule 19)
set -u -o pipefail
SC=$(cd "$(dirname "$0")" && pwd); GATE=$SC/v5-saves-gate.sh; OUT=$(realpath -m "${1:-$SC/../changes-20261030/selftest-gate-timer}")
LT=/workspace/egg-farm-studio/ops/tools; PIDF=/workspace/egg-farm-studio/.pids/saves-qa.pids; BOOT=$(cat /proc/sys/kernel/random/boot_id)
case "$OUT" in /tmp/*|*/tmp/*) echo "refusing $OUT"; exit 2;; esac
rm -rf "$OUT"; mkdir -p "$OUT"; P=0; F=0
ok(){ echo "PASS $*"; P=$((P+1)); }; ko(){ echo "FAIL $*"; F=$((F+1)); }
grp(){ cat /proc/[0-9]*/stat 2>/dev/null | sed 's/^\([0-9]*\) (.*) /\1 /' | awk -v g="$1" '$4==g {print $1}'; }   # read-only one-pass /proc scan (pid state ppid pgrp), no signals
f(){ sed 's/^.*) //' "/proc/$1/stat" 2>/dev/null | awk -v n="$2" '{print $(n-2)}'; }   # field n of /proc/PID/stat
# --- positive: WARN 2 s, WINDOW 6 s, stop at ~4 s
R=$OUT/mock-results; mkdir -p "$R"; echo "$(date '+%F %T %Z') gate=v5-rc-saves *** SELFTEST timer ***" > "$R/status.log"; echo "G0-pins | PASS | HARD | exit 0" > "$R/summary.txt"
GATE_WARN_S=2 GATE_WINDOW_S=6 bash "$GATE" --selftest-timer "$R" 4 > "$OUT/gate.stdout" 2> "$OUT/gate.stderr" & GP=$!
for _ in $(seq 1 30); do grep -q '^WINPID ' "$OUT/gate.stdout" && break; sleep 0.1; done; WP=$(awk '/^WINPID /{print $2}' "$OUT/gate.stdout")
sleep 2.8   # t~3 s: after WARN, before stop
{ echo "WINPID=$WP"; echo "pgid=$(f "$WP" 5) sid=$(f "$WP" 6) comm=$(cat /proc/$WP/comm 2>/dev/null)"; for m in $(grp "$WP"); do echo "member $m ppid=$(f "$m" 4) comm=$(cat /proc/$m/comm 2>/dev/null) cmd=$(tr '\0' ' ' < /proc/$m/cmdline 2>/dev/null)"; done; } > "$OUT/T2.running.txt"
grep "^$WP " "$PIDF" | tail -1 > "$OUT/T1.pidfile-line.txt"
wait $GP; GRC=$?; echo "gate exit $GRC" >> "$OUT/gate.stdout"
[[ "$WP" =~ ^[0-9]+$ ]] && awk -v p="$WP" -v b="$BOOT" '$1==p && $3==b' "$OUT/T1.pidfile-line.txt" | grep -q -- "v5-saves-gate.sh --win-timer $R/status.log" && ok "T1 lane-run recorded PID $WP in .pids/saves-qa.pids ($(cut -c1-90 "$OUT/T1.pidfile-line.txt")…)" || ko "T1 pidfile record for '$WP': $(cat "$OUT/T1.pidfile-line.txt")"
MEM=$(grep -c '^member ' "$OUT/T2.running.txt"); BAD=$(grep '^member ' "$OUT/T2.running.txt" | grep -v "^member $WP " | grep -vc "ppid=$WP comm=sleep")
grep -q "^pgid=$WP sid=$WP comm=bash" "$OUT/T2.running.txt" && [ "$MEM" -ge 1 ] && [ "$MEM" -le 2 ] && [ "$BAD" = 0 ] && ok "T2 own session+group (pgid=sid=$WP); group = $MEM process(es): timer bash + its sleep only" || ko "T2 running state: $(tr '\n' ';' < "$OUT/T2.running.txt")"
grep -q 'WARNING lock window: 0 min elapsed of 0' "$R/status.log" && grep -q 'WARNING lock window' "$R/summary.txt" && grep -q 'WARNING lock window' "$OUT/gate.stderr" && ok "T3 WARNING line in status.log, summary.txt and gate stderr ($(grep -m1 WARNING "$R/status.log" | cut -c1-60)…)" || ko "T3 WARNING missing (status: $(grep -c WARNING "$R/status.log"), summary: $(grep -c WARNING "$R/summary.txt"), stderr: $(grep -c WARNING "$OUT/gate.stderr"))"
[ $GRC = 0 ] && grep -q "^STOPPED $WP$" "$OUT/gate.stdout" && ! grep -q ERROR "$OUT/gate.stderr" "$R/status.log" && ok "T4 stopwin via lane-kill: gate exit 0, STOPPED $WP, no ERROR" || ko "T4 stop: exit $GRC; $(tr '\n' ';' < "$OUT/gate.stderr")"
LK=$("$LT/lane-kill.sh" saves-qa "$WP" 2>&1); LKR=$?; echo "$LK (rc $LKR)" > "$OUT/T5.lane-kill-after.txt"; G5=$(grp "$WP" | tr '\n' ' ')
[ ! -e "/proc/$WP" ] && [ -z "$G5" ] && [ "$LK" = "GONE $WP" ] && [ $LKR = 0 ] && ok "T5 PID $WP and its process group gone; lane-kill: '$LK'" || ko "T5 after stop: proc=$([ -e /proc/$WP ] && echo present || echo gone) group='$G5' lane-kill='$LK' rc=$LKR"
H1=$(sha256sum < "$R/status.log"); S1=$(sha256sum < "$R/summary.txt"); M1=$(stat -c %Y.%y "$R/status.log"); sleep 3   # now t~8 s > WINDOW 6 s
H2=$(sha256sum < "$R/status.log"); S2=$(sha256sum < "$R/summary.txt"); M2=$(stat -c %Y.%y "$R/status.log")
! grep -q OVERRUN "$R/status.log" "$R/summary.txt" "$OUT/gate.stderr" && [ "$H1" = "$H2" ] && [ "$S1" = "$S2" ] && [ "$M1" = "$M2" ] && (cd "$R" && sha256sum -c STATUS.sha256 >/dev/null 2>&1) && ok "T6 past the 6 s OVERRUN threshold: no OVERRUN line, status.log/summary.txt unchanged since stop, = STATUS.sha256" || ko "T6 writes after stop (overrun lines: $(grep -c OVERRUN "$R/status.log"))"
(cd "$R" && sha256sum -c SHA256SUMS > "$OUT/T7.check.txt" 2>&1 && sha256sum -c STATUS.sha256 >> "$OUT/T7.check.txt" 2>&1) && ok "T7 signing: -c SHA256SUMS + -c STATUS.sha256 ($(grep -c ': OK$' "$OUT/T7.check.txt") OK, 0 FAILED)" || ko "T7 -c: $(grep -v ': OK$' "$OUT/T7.check.txt")"
# --- N1: leader exits at 1 s, a group member (sleep 12) survives -> gate must stop, ask HoO, and signal nothing
N=$OUT/neg-survivor; mkdir -p "$N"; echo start > "$N/status.log"
NP=$("$LT/lane-run.sh" saves-qa -- bash -c 'sleep 12 & sleep 1; exit 0'); sleep 1.6; SURV=$(grp "$NP" | tr '\n' ' ')
bash "$GATE" --selftest-stopwin "$N" "$NP" > "$OUT/N1.stdout" 2> "$OUT/N1.stderr"; NRC=$?; SURV2=$(grp "$NP" | tr '\n' ' ')
[ $NRC = 3 ] && grep -q 'ask HoO' "$OUT/N1.stderr" && grep -q 'group members remain' "$OUT/N1.stderr" && ! grep -q STOPPED "$OUT/N1.stdout" && [ -n "$SURV" ] && [ "$SURV" = "$SURV2" ] && ok "N1 leader $NP gone, member(s) $SURV survive -> gate exit 3, 'ask HoO', member(s) NOT signalled (still alive)" || ko "N1 rc=$NRC surv='$SURV'/'$SURV2' $(cat "$OUT/N1.stderr")"
for _ in $(seq 1 150); do [ -z "$(grp "$NP")" ] && break; sleep 0.1; done; echo "N1 survivor group after its own 12 s exit: '$(grp "$NP" | tr '\n' ' ')'" >> "$OUT/N1.stdout"
# --- N2: a PID lane saves-qa never started (this shell) -> REFUSED -> gate stops, ask HoO
N=$OUT/neg-refused; mkdir -p "$N"; echo start > "$N/status.log"
bash "$GATE" --selftest-stopwin "$N" "$$" > "$OUT/N2.stdout" 2> "$OUT/N2.stderr"; NRC=$?
[ $NRC = 3 ] && grep -q "REFUSED $$" "$OUT/N2.stderr" && grep -q 'ask HoO' "$OUT/N2.stderr" && grep -q 'ask HoO' "$N/status.log" && ok "N2 unrecorded PID $$ -> lane-kill REFUSED -> gate exit 3, 'ask HoO' (stderr + status.log)" || ko "N2 rc=$NRC $(cat "$OUT/N2.stderr")"
# --- G1: no pkill/killall/pgrep/direct kill in gate code (comments and message strings excluded)
sed -E 's/#[^!].*$//; s/"[^"]*"//g' "$GATE" | grep -nE '(^|[^a-z-])(pkill|killall|pgrep|kill)([^a-z_-]|$)' > "$OUT/G1.grep.txt"
[ ! -s "$OUT/G1.grep.txt" ] && ok "G1 gate code: no pkill/killall/pgrep/kill (only lane-run.sh / lane-kill.sh)" || ko "G1 kill usages: $(cat "$OUT/G1.grep.txt")"
echo "SELFTEST gate-timer: $P passed, $F failed"; [ $F = 0 ]
