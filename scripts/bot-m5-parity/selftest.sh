#!/usr/bin/env bash
# Fail-closed self-test of the smoke parity harness (no simulation; seconds). Each case states the exit it must produce;
# the self-test itself exits 1 if any case does not. Usage: selftest.sh   (run from anywhere inside the repo)
set -euo pipefail
D=$(cd "$(dirname "$0")" && pwd); T=$(mktemp -d); trap 'rm -rf "$T"' EXIT; bad=0
expect() { local want=$1 name=$2; shift 2; local rc=0; "$@" > "$T/last.out" 2>&1 || rc=$?
  if { [ "$want" = 0 ] && [ "$rc" = 0 ]; } || { [ "$want" = nz ] && [ "$rc" != 0 ]; }; then echo "ok   rc=$rc  $name"; else echo "BAD  rc=$rc (want $want)  $name"; bad=1; fi
  sed 's/^/       | /' "$T/last.out" | grep -E 'FAIL|RESULT|streams|HEAD|MANIFEST|refus|rc=[1-9]' | head -4 || true; }
# Stub driver in place of vite-node: writes the files a driver would, and fails (rc 3) when STUBFAIL matches "PROFS.CFGS.pPERT" or CFG.
cat > "$T/stub.sh" <<'S'
#!/usr/bin/env bash
k="${PROFS:-}.${CFGS:-}.p${PERT:-}"; [ -n "${STUBFAIL:-}" ] && { [ "$k" = "$STUBFAIL" ] || [ "${CFG:-}" = "$STUBFAIL" ]; } && exit 3
if [ -n "${OUT:-}" ]; then echo "{\"seed\":1,\"k\":\"$k\"}" > "$OUT.$PROFS.$CFGS.p$PERT.jsonl"; echo "$PROFS $CFGS p$PERT done" >&2; exit 0; fi
if [ -n "${PERSEED:-}" ]; then for p in casual optimal seller15; do echo "[]" > "$PERSEED.$CFG.$p.json"; done; fi
echo "{\"cfg\":\"$CFG\",\"win\":\"${WIN:-}\"}"; echo "log $CFG" >&2
S
chmod +x "$T/stub.sh"
runall() { ( set -euo pipefail; export STUBFAIL=${3:-}; O=$1 SEEDS=20 VN=(bash "$T/stub.sh") PX=() LX=(); cd "$D"; . "$D/jobs.sh"; run_all "$2" ); local rc=$?; grep -h "FAIL\|streams" "$1/../run.log" || true; return $rc; }
echo "# jobs.sh run_all with stub drivers"
expect 0  "all jobs succeed -> run_all 0"                       runall "$T/a/out" stubA
expect nz "one px job fails (optimal.off.p1, stream B) -> non-zero" runall "$T/b/out" stubB optimal.off.p1
expect nz "lx auto fails (last job of stream B) -> non-zero"    runall "$T/c/out" stubC auto
expect nz "g1 fails (last job of stream A) -> non-zero"         runall "$T/d/out" stubD base
rt() { ( set -euo pipefail; O=$1; cd "$2"; log() { :; }; . "$D/jobs.sh"; log() { :; }; record_tree "$3" ); }
expect 0  "record_tree on this tree -> writes balance.json sha256 + m4.flags"  rt "$T/r/out" "$D/../.." port
grep -E "^(src/config/balance.json sha256|m4.flags) " "$T/r/results/tree-port.txt" | cut -c1-120 | sed 's/^/       | /'
mkdir -p "$T/nobal/src/config"; git -C "$T/nobal" init -q; git -C "$T/nobal" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
expect nz "record_tree on a tree with no src/config/balance.json -> FAIL"       rt "$T/s/out" "$T/nobal" port
cp "$D/../../data/economy.csv" "$T/nobal/" 2>/dev/null || true; echo '{"m4":{"enabled":1}}' > "$T/nobal/src/config/balance.json"; mkdir -p "$T/nobal/data"; cp "$D/../../data/economy.csv" "$T/nobal/data/"
expect nz "record_tree on a balance.json without m4.flags -> FAIL"             rt "$T/u/out" "$T/nobal" port
echo "# compare-smoke.py on the stub outputs"
cp -r "$T/a/out" "$T/a/ref"
expect 0  "identical full sets -> PASS"                          python3 "$D/compare-smoke.py" "$T/a/ref" "$T/a/out" 20
cp -r "$T/a/out" "$T/e"; f="$T/e/pr.casual.on.p0.jsonl"; python3 - "$f" <<'P'
import sys; p=sys.argv[1]; b=bytearray(open(p,'rb').read()); b[3]^=1; open(p,'wb').write(b)
P
expect nz "1-byte diff in one file -> FAIL"                      python3 "$D/compare-smoke.py" "$T/a/ref" "$T/e" 20
cp -r "$T/a/out" "$T/f"; rm "$T/f/g1.log"
expect nz "file missing on port side -> FAIL"                    python3 "$D/compare-smoke.py" "$T/a/ref" "$T/f" 20
expect nz "file missing on ref side -> FAIL"                     python3 "$D/compare-smoke.py" "$T/f" "$T/a/ref" 20
cp -r "$T/a/out" "$T/g"; echo x > "$T/g/pr.casual.on.p0.jsonl.tog.json"
expect nz "extra file on port side -> FAIL"                      python3 "$D/compare-smoke.py" "$T/a/ref" "$T/g" 20
expect nz "same files but SEEDS=200 (pool outputs missing) -> FAIL" python3 "$D/compare-smoke.py" "$T/a/ref" "$T/a/out" 200
expect nz "usage error -> non-zero"                              python3 "$D/compare-smoke.py" "$T/a/ref"
echo "# entry scripts"
expect nz "smoke.sh with a HEAD other than the expected SHA"      bash "$D/smoke.sh" 0000000000000000000000000000000000000000 "$D/../.." "$T/h/out"
cp -r "$D" "$T/tamper"; printf ' ' >> "$T/tamper/econ-orig/m5px.ts"
expect nz "ref.sh with a tampered original (MANIFEST check)"      bash "$T/tamper/ref.sh" "$(git -C "$D" rev-parse HEAD)" "$D/../.." "$T/i/out"
expect nz "run-smoke.sh into an existing OUTROOT (no reuse)"      bash "$D/run-smoke.sh" "$(git -C "$D" rev-parse HEAD)" "$T"
[ "$bad" = 0 ] && echo "SELFTEST PASS" || { echo "SELFTEST FAIL"; exit 1; }
