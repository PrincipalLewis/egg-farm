#!/usr/bin/env bash
# lane-run.sh <lane> -- <cmd...>   (standing rule 21, D-CEO-20261029-04). No name/pattern mode.
# Starts <cmd> in its own session/process group and appends one line to
# /workspace/egg-farm-studio/.pids/<lane>.pids:
#   PID STARTTIME BOOT_ID ISO-time NONCE cmd
# Prints the PID. Exit 143 if TERM arrived between fork and record (Architect 5.1 design).
set -euo pipefail
PIDDIR=/workspace/egg-farm-studio/.pids
usage() { echo "usage: lane-run.sh <lane> -- <cmd...>" >&2; exit 2; }
lane="${1:-}"; [[ "$lane" =~ ^[A-Za-z0-9._-]+$ ]] || usage
shift; [[ "${1:-}" == "--" ]] && shift; [[ $# -gt 0 ]] || usage
mkdir -p "$PIDDIR"
boot=$(cat /proc/sys/kernel/random/boot_id)
[[ "$boot" =~ ^[0-9a-f]{8}-[0-9a-f-]+$ ]] || { echo "lane-run: bad boot_id" >&2; exit 1; }
nonce=$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')
[[ "$nonce" =~ ^[0-9a-f]{16}$ ]] || { echo "lane-run: bad nonce" >&2; exit 1; }
when=$(TZ=Europe/Belgrade date -Iseconds)
[[ "$when" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]] || { echo "lane-run: bad timestamp" >&2; exit 1; }

LR_TERM=
trap 'LR_TERM=1' TERM
export LANE_RUN_TAG="${lane}:${nonce}"

# Parse /proc/PID/stat fields after comm via awk (bash $20 == ${2}0 without braces — never use bare $20).
parse_stat() {
  local rest
  rest=$(sed 's/^.*) //' "/proc/$1/stat" 2>/dev/null) || return 1
  _st=$(awk '{print $20}' <<<"$rest")
  _pgrp=$(awk '{print $3}' <<<"$rest")
  _sid=$(awk '{print $4}' <<<"$rest")
  _ppid=$(awk '{print $2}' <<<"$rest")
  [[ -n "$_st" && -n "$_pgrp" && -n "$_sid" ]] || return 1
}

setsid -- "$@" </dev/null >/dev/null 2>&1 &
pid=$!

became=0
for _ in $(seq 1 40); do
  if parse_stat "$pid" && [[ "$_pgrp" == "$pid" && "$_sid" == "$pid" ]]; then
    became=1
    break
  fi
  sleep 0.05
done

if [[ "$became" != 1 ]]; then
  if ! parse_stat "$pid"; then
    m=""
    for f in /proc/[0-9]*/stat; do
      rest=$(sed 's/^.*) //' "$f" 2>/dev/null) || continue
      [[ "$(awk '{print $3}' <<<"$rest")" == "$pid" ]] && { f=${f#/proc/}; m+="${f%/stat} "; }
    done
    echo "lane-run: leader $pid exited before it was recorded; not recorded.${m:+ Group $pid members still running: ${m% } (stop them via their own shutdown).}" >&2
    exit 1
  fi
  echo "lane-run: pid $pid is not session/group leader (pgrp=$_pgrp sid=$_sid); not recorded." >&2
  exit 1
fi
st=$_st

sleep 0.05
if ! parse_stat "$pid" || [[ "$_st" != "$st" ]] || [[ "$_pgrp" != "$pid" || "$_sid" != "$pid" ]]; then
  echo "lane-run: leader $pid exited or lost leadership before it was recorded (post-settle); not recorded." >&2
  exit 1
fi

cmd=$(printf '%s ' "$@" | tr '\n\r\t' '   ')
cmd=${cmd% }
if ((${#cmd} > 512)); then cmd="${cmd:0:509}..."; fi

printf '%s %s %s %s %s %s\n' "$pid" "$st" "$boot" "$when" "$nonce" "$cmd" >> "$PIDDIR/$lane.pids"
echo "$pid"

if [[ -n "${LR_TERM}" ]]; then
  exit 143
fi
exit 0
