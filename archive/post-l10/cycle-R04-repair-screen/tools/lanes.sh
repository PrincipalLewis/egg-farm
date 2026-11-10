#!/bin/bash
# lanes.sh: list LIVE econ lane jobs (pid alive AND /proc starttime + boot_id match the .pids record). Read-only.
boot=$(cat /proc/sys/kernel/random/boot_id)
while read -r pid st b when nonce cmd; do
  [ "$b" = "$boot" ] || continue
  [ -r /proc/$pid/stat ] || continue
  cur=$(sed 's/^.*) //' /proc/$pid/stat | awk '{print $20}')
  [ "$cur" = "$st" ] && echo "LIVE $pid $when $cmd"
done < /workspace/egg-farm-studio/.pids/econ.pids
