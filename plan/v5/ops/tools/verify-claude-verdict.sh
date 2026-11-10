#!/usr/bin/env bash
# Read-only: proves a Claude-role verdict rests on a real Claude call (rule 22, D-CEO-20261030-01).
# Usage: ops/tools/verify-claude-verdict.sh <PASS_ID> [role]
# Prints matching ops/claude/usage.log lines; exit 0 only if >=1 line has status "ok".
set -u
LOG="$(dirname "$0")/../claude/usage.log"
id="${1:-}"; role="${2:-}"
[ -n "$id" ] || { echo "usage: $0 <PASS_ID> [role]" >&2; exit 2; }
[ -r "$LOG" ] || { echo "no usage.log at $LOG" >&2; exit 2; }
matches=$(awk -F'\t' -v id="$id" -v r="$role" '$2==id && (r=="" || $3==r) {print NR": "$0}' "$LOG")
ok=$(printf '%s\n' "$matches" | awk -F'\t' 'NF && $5=="ok"' | wc -l)
if [ -n "$matches" ]; then printf '%s\n' "$matches" | cut -f1-8; fi
if [ "$ok" -ge 1 ]; then echo "Claude calls used: $ok (status ok) for PASS_ID $id"; exit 0
else echo "Claude calls used: 0 — no Claude review — no verdict (PASS_ID $id)"; exit 1; fi
