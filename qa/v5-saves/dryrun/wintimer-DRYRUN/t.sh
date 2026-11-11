ST=/workspace/egg-farm-studio/qa/v5-saves/dryrun/wintimer-DRYRUN/st; SUM=/workspace/egg-farm-studio/qa/v5-saves/dryrun/wintimer-DRYRUN/sum; : > $SUM
T0=$(date +%s); GATE_WINDOW_S=3; GATE_WARN_S=1
winwarn(){ sleep "$GATE_WARN_S"; echo "$(date '+%F %T %Z') WARNING lock window: $((GATE_WARN_S/60)) min elapsed of $((GATE_WINDOW_S/60)) (QA-D-1029-V5E-SCOPE). If it will overrun, tell HoQ and UI QA NOW." | tee -a "$ST" "$SUM" >&2
  sleep $((GATE_WINDOW_S-GATE_WARN_S)); echo "$(date '+%F %T %Z') OVERRUN lock window: $((GATE_WINDOW_S/60)) min exceeded. Tell HoQ and UI QA at once." | tee -a "$ST" "$SUM" >&2; }
winwarn & WINPID=$!; stopwin(){ pkill -P $WINPID 2>/dev/null; kill $WINPID 2>/dev/null; }; trap stopwin EXIT   # own timer subshell + its sleep only
sleep 4; stopwin; sleep 0.2; pgrep -P $WINPID | wc -l
