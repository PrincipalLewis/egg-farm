# Shared job list for smoke.sh (port) and ref.sh (reference): same env, same seeds, same files. Sourced, not run.
# Jobs (seeds 1..SEEDS, CSV = the tree's data/economy.csv): m5px 3 profiles x on/off x PERT 0/1 (12 jsonl); m5lx o1a CFG=base and
# CFG=auto with PERSEED (nw-*.json stdout, nw-*.log stderr, ps-o1a.* per seed); m5lx g1 (CFG=base WIN=man,auto,idleA); pool2/pool2b
# (Econ's scripts on this side's own 12 jsonl) only when SEEDS=200 (they skip any file that does not have exactly 200 rows).
# Two job streams in parallel; every job's rc and both stream statuses are checked (fail closed).
log() { echo "$(date +%T) [$1] ${*:2}" >> "$O/../run.log"; }
check_tree() { local got; got=$(git rev-parse HEAD); [ "$got" = "$1" ] || { echo "HEAD $got != $1" >&2; exit 1; }
  got=$(git status --porcelain | tr '\n' ' ' | sed 's/ $//'); [ "$got" = "$2" ] || { echo "worktree not as expected: [$got] vs [$2]" >&2; exit 1; }; }
job() { local side=$1 name=$2; shift 2; log "$side" "START $name"; local rc=0; "$@" || rc=$?; log "$side" "END $name rc=$rc"; [ "$rc" = 0 ] || { log "$side" "FAIL $name"; return 1; }; }
px() { env CSV=data/economy.csv SEEDS="$SEEDS" S0=1 PROFS="$1" CFGS="$2" PERT="$3" OUT="$O/pr" nice -n 10 "${VN[@]}" "${PX[@]}" 2> "$O/pr.$1.$2.p$3.log"; }
lx() { env CSV=data/economy.csv SEEDS="$SEEDS" S0=1 AT=30 RES=0 REST=0 NOWIN=1 MANAT=32 CFG="$1" PERSEED="$O/ps-o1a" nice -n 10 "${VN[@]}" "${LX[@]}" > "$O/nw-$1.json" 2> "$O/nw-$1.log"; }
g1() { env CSV=data/economy.csv SEEDS="$SEEDS" S0=1 AT=30 RES=0 REST=0 MANAT=32 CFG=base WIN=man,auto,idleA nice -n 10 "${VN[@]}" "${LX[@]}" > "$O/g1.json" 2> "$O/g1.log"; }
# Explicit "|| return 1" on every job: errexit is not relied on (it is silently ignored when a caller tests the function's status).
streamA() { local s=$1 p c; for p in casual optimal seller15; do for c in on off; do job "$s" "px $p $c p0" px $p $c 0 || return 1; done; done; job "$s" g1 g1 || return 1; }
streamB() { local s=$1 p c; for p in casual optimal seller15; do for c in on off; do job "$s" "px $p $c p1" px $p $c 1 || return 1; done; done
  job "$s" "lx base" lx base || return 1; job "$s" "lx auto" lx auto || return 1; }
run_all() { local s=$1 a b ra=0 rb=0; mkdir -p "$O" || exit 1; log "$s" "start head=$(git rev-parse HEAD) node=$(node -v) SEEDS=$SEEDS csv=$(sha256sum data/economy.csv | cut -c1-64)"
  streamA "$s" & a=$!; streamB "$s" & b=$!; wait "$a" || ra=$?; wait "$b" || rb=$?
  log "$s" "streams rc A=$ra B=$rb"; [ "$ra" = 0 ] && [ "$rb" = 0 ] || exit 1
  if [ "$SEEDS" = 200 ]; then for p in pool2 pool2b; do job "$s" "$p" env PDIR="$O" PYTHONPATH="$D/econ-orig" python3 "$D/econ-orig/$p.py" > "$O/$p.stdout" || exit 1; done; fi; }
# QA-D-1030-SHIPFLAGS: record the tree's src/config/balance.json sha256 and its m4.enabled / m4.flags values (and the CSV sha256)
# in <outroot>/results/tree-<side>.txt; covered by run-smoke.sh's SHA256SUMS. Fails (exit 1) if any of it cannot be read.
record_tree() { local side=$1 r="$O/../results" t; mkdir -p "$r" || exit 1; t="$r/tree-$side.txt"
  python3 - "$side" > "$t" <<'PY' || { echo "record_tree: cannot read src/config/balance.json m4.flags in $(pwd)" >&2; rm -f "$t"; exit 1; }
import hashlib, json, subprocess, sys
raw = open("src/config/balance.json", "rb").read()
b = json.loads(raw); m4 = b["m4"]; flags = m4["flags"]
assert isinstance(flags, dict) and flags, "m4.flags missing or empty"
print(f"side {sys.argv[1]}")
print("head " + subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip())
print("src/config/balance.json sha256 " + hashlib.sha256(raw).hexdigest())
print("data/economy.csv sha256 " + hashlib.sha256(open("data/economy.csv", "rb").read()).hexdigest())
print("m4.enabled " + json.dumps(m4["enabled"]))
print("m4.flags " + json.dumps(flags, sort_keys=True, separators=(",", ":")))
PY
  [ -s "$t" ] || exit 1; log "$side" "tree: $(sed -n 3p "$t")"; }
