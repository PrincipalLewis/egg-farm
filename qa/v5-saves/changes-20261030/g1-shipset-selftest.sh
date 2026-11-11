#!/usr/bin/env bash
# Self-tests for G1-flags-ship-set (pinned scripts/g1-ship-set.cjs + the gate's 0b block). Static: no browser, no lock, no network.
# Amendment 2026-10-30 13:1x (HoQ/HoE): tc_streak_cap HARD in balance.json AND data/economy.csv; CSV path from the ship-set only.
# Re-pin 2026-10-30 14:5x (TASK saves-qa/g1-d71ed8cf): ship-set d71ed8cf (D-HOP-51 / D-CEO-20261030-10: m4.flags.bestBuyV2 = 1 REQUIRED); fixtures now have all 14 flags = 1.
set -u; ST=/workspace/egg-farm-studio; D=$(cd "$(dirname "$0")" && pwd)
C=${C:-$ST/qa/v5-saves/scripts/g1-ship-set.cjs}; GATE=${GATE:-$ST/qa/v5-saves/scripts/v5-saves-gate.sh}
REAL=$ST/product/v5-ship-set.md; PIN=d71ed8cf7a5d2e7132ccf1eda30e3b6eb472c21d3e9d3f41101dec2c1a30fcaa
BAL0=$ST/qa/v5-saves/dryrun/gate-DRYRUN-3f582db/results/rc-balance.json; T=$(mktemp -d /tmp/g1st.XXXX); P=0; F=0
h(){ sha256sum < "$1" | cut -c1-64; }
git -C $T init -q repo; mkdir -p $T/repo/data
# commit a CSV (tc_streak_cap value per row, "" = column absent); prints the commit sha
mkcsv(){ local v=$1 f=${2:-data/economy.csv}; if [ "$v" = none ]; then printf 'level,tc_x\n0,1\n1,1\n' > $T/repo/$f; else printf 'level,tc_streak_cap\n0,%s\n1,%s\n' $v ${3:-$v} > $T/repo/$f; fi
  git -C $T/repo add -A; git -C $T/repo -c user.email=qa@x -c user.name=qa commit -qm "csv $v" --allow-empty; git -C $T/repo rev-parse HEAD; }
R27=$(mkcsv 0.27); CS27=$(git -C $T/repo show $R27:data/economy.csv | sha256sum | cut -c1-64)
mkss(){ sed "s#sha recorded here on merge#$1#" $REAL > $2; }    # rewrites only the economy CSV line of the real rev 2 file
mkss "sha256 $CS27 path data/economy.csv" $T/ss.md; SSH=$(h $T/ss.md)
mkb(){ node -e 'const fs=require("fs");const [src,out,ov]=process.argv.slice(1);const b=JSON.parse(fs.readFileSync(src));for(const k of Object.keys(b.m4.flags))b.m4.flags[k]=1;b.m4.enabled=1;b.m4.zeroGain={confirm:0};b.m4.tc.streak_cap=0.27;
 for(const [p,v] of Object.entries(JSON.parse(ov))){const ks=p.split(".");let o=b;for(const k of ks.slice(0,-1))o=o[k];if(v===null)delete o[ks.at(-1)];else o[ks.at(-1)]=v}fs.writeFileSync(out,JSON.stringify(b))' "$BAL0" "$1" "${2:-{\}}"; }
mkb $T/ok.json; OKS=$(h $T/ok.json)
ck(){ local name=$1 want=$2; shift 2; out=$(env -u ECONOMY_CSV -u EXPECTED_BALANCE_SHA node "$C" --out $T/d.json "$@" 2>&1); rc=$?
  if { [ $want = pass ] && [ $rc = 0 ]; } || { [ $want = fail ] && [ $rc = 1 ]; }; then P=$((P+1)); echo "ok   $name (rc=$rc) ${out:0:180}"; else F=$((F+1)); echo "FAIL $name (rc=$rc want $want) $out"; fi; }
OK="--balance $T/ok.json --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $OKS --git $T/repo --rc $R27"
ck "01 pass: == ship-set, cap 0.27 in balance+CSV, CSV path+sha from ship-set, expected sha" pass $OK
echo "$out" | grep -q 'TUNABLE tc_streak_cap: ship-set 0.27, balance m4.tc.streak_cap=0.27, csv tc_streak_cap=0.27' && { P=$((P+1)); echo "ok   01b both cap values logged"; } || { F=$((F+1)); echo "FAIL 01b TUNABLE line: $out"; }
ck "01c pass: ECONOMY_CSV override equal to ship-set path" pass $OK --csv-path data/economy.csv
mkb $T/flip.json '{"m4.flags.pause":0}'; ck "02 fail: one flipped key (pause=0)" fail --balance $T/flip.json --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $(h $T/flip.json) --git $T/repo --rc $R27
mkb $T/zg.json '{"m4.zeroGain.confirm":1}'; ck "02b fail: m4.zeroGain.confirm=1" fail --balance $T/zg.json --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $(h $T/zg.json) --git $T/repo --rc $R27
mkb $T/en.json '{"m4.enabled":0}'; ck "02c fail: m4.enabled=0" fail --balance $T/en.json --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $(h $T/en.json) --git $T/repo --rc $R27
ck "03 fail: ship-set file missing" fail --balance $T/ok.json --shipset $T/nope.md --shipset-sha $SSH --expected-balance-sha $OKS --git $T/repo --rc $R27
printf '# junk\n' > $T/junk.md; ck "03b fail: ship-set unparseable" fail --balance $T/ok.json --shipset $T/junk.md --shipset-sha $(h $T/junk.md) --expected-balance-sha $OKS --git $T/repo --rc $R27
ck "04 fail: REAL rev 2 file (CSV path+sha placeholder), real pin" fail --balance $T/ok.json --shipset $REAL --shipset-sha $PIN --expected-balance-sha $OKS --git $T/repo --rc $R27
mkss "sha256 $CS27" $T/nopath.md; ck "04b fail: CSV path missing in ship-set (sha present)" fail --balance $T/ok.json --shipset $T/nopath.md --shipset-sha $(h $T/nopath.md) --expected-balance-sha $OKS --git $T/repo --rc $R27
mkss "sha256 $CS27 path <tbd>" $T/phpath.md; ck "04c fail: CSV path placeholder <tbd>" fail --balance $T/ok.json --shipset $T/phpath.md --shipset-sha $(h $T/phpath.md) --expected-balance-sha $OKS --git $T/repo --rc $R27
mkss "path data/economy.csv, sha TBD" $T/nosha.md; ck "04d fail: CSV path present, sha placeholder" fail --balance $T/ok.json --shipset $T/nosha.md --shipset-sha $(h $T/nosha.md) --expected-balance-sha $OKS --git $T/repo --rc $R27
ck "04e fail: ECONOMY_CSV override != ship-set path" fail $OK --csv-path data/economy.f1.csv
RF1=$(mkcsv 0.27 data/economy.f1.csv); CF1=$(git -C $T/repo show $RF1:data/economy.f1.csv | sha256sum | cut -c1-64)
mkss "sha256 $CF1 path data/economy.f1.csv" $T/f1.md; ck "04f fail: ship-set names data/economy.f1.csv (test-only)" fail --balance $T/ok.json --shipset $T/f1.md --shipset-sha $(h $T/f1.md) --expected-balance-sha $OKS --git $T/repo --rc $RF1
mkss "sha256 $(printf '%064d' 0) path data/economy.csv" $T/badsha.md; ck "04g fail: CSV sha != committed CSV" fail --balance $T/ok.json --shipset $T/badsha.md --shipset-sha $(h $T/badsha.md) --expected-balance-sha $OKS --git $T/repo --rc $R27
ck "05 fail: expected balance sha missing" fail --balance $T/ok.json --shipset $T/ss.md --shipset-sha $SSH --git $T/repo --rc $R27
ck "06 fail: expected balance sha wrong" fail --balance $T/ok.json --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $(h $BAL0) --git $T/repo --rc $R27
mkb $T/extra.json '{"m4.flags.newFlag":1}'; ck "07 fail: extra m4.flags key" fail --balance $T/extra.json --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $(h $T/extra.json) --git $T/repo --rc $R27
mkb $T/miss.json '{"m4.flags.breeds":null}'; ck "07b fail: missing m4.flags key" fail --balance $T/miss.json --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $(h $T/miss.json) --git $T/repo --rc $R27
mkb $T/mzg.json '{"m4.zeroGain":null}'; ck "07c fail: missing m4.zeroGain.confirm" fail --balance $T/mzg.json --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $(h $T/mzg.json) --git $T/repo --rc $R27
ck "08 fail: real 3f582db balance (all 0 AND cap 0.28)" fail --balance $BAL0 --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $(h $BAL0) --git $T/repo --rc $R27
echo "$out" | grep -q 'm4.flags.streak=0 != ship-set 1' && echo "$out" | grep -q 'm4.tc.streak_cap=0.28 != ship-set 0.27' && { P=$((P+1)); echo "ok   08b fails for both reasons (flags + cap)"; } || { F=$((F+1)); echo "FAIL 08b"; }
sed 's/m4.flags.golden = 1/m4.flags.golden = 0/' $T/ss.md > $T/ss2.md; ck "09 fail: changed ship-set (sha != pinned)" fail --balance $T/ok.json --shipset $T/ss2.md --shipset-sha $SSH --expected-balance-sha $OKS --git $T/repo --rc $R27
sed 's/^- m4.flags.streak = 1/- m4.flags.telemetry = 1\n- m4.flags.streak = 1/' $T/ss.md > $T/sstel.md; ck "10 pass: telemetry listed as a key is excluded, not encoded" pass --balance $T/ok.json --shipset $T/sstel.md --shipset-sha $(h $T/sstel.md) --expected-balance-sha $OKS --git $T/repo --rc $R27
for v in 0.28 0.30; do mkb $T/c$v.json "{\"m4.tc.streak_cap\":$v}"; R=$(mkcsv $v); CS=$(git -C $T/repo show $R:data/economy.csv | sha256sum | cut -c1-64); mkss "sha256 $CS path data/economy.csv" $T/s$v.md
  ck "11 fail: cap $v in balance AND CSV" fail --balance $T/c$v.json --shipset $T/s$v.md --shipset-sha $(h $T/s$v.md) --expected-balance-sha $(h $T/c$v.json) --git $T/repo --rc $R; done
mkb $T/c28.json '{"m4.tc.streak_cap":0.28}'; ck "12a fail: CSV 0.27, balance 0.28 (disagree)" fail --balance $T/c28.json --shipset $T/ss.md --shipset-sha $SSH --expected-balance-sha $(h $T/c28.json) --git $T/repo --rc $R27
R28=$(mkcsv 0.28); CS28=$(git -C $T/repo show $R28:data/economy.csv | sha256sum | cut -c1-64); mkss "sha256 $CS28 path data/economy.csv" $T/s28b.md
ck "12b fail: CSV 0.28, balance 0.27 (disagree)" fail --balance $T/ok.json --shipset $T/s28b.md --shipset-sha $(h $T/s28b.md) --expected-balance-sha $OKS --git $T/repo --rc $R28
RM=$(mkcsv 0.27 data/economy.csv 0.28); CM=$(git -C $T/repo show $RM:data/economy.csv | sha256sum | cut -c1-64); mkss "sha256 $CM path data/economy.csv" $T/smix.md
ck "12c fail: CSV rows mixed 0.27/0.28" fail --balance $T/ok.json --shipset $T/smix.md --shipset-sha $(h $T/smix.md) --expected-balance-sha $OKS --git $T/repo --rc $RM
RN=$(mkcsv none); CN=$(git -C $T/repo show $RN:data/economy.csv | sha256sum | cut -c1-64); mkss "sha256 $CN path data/economy.csv" $T/snone.md
ck "12d fail: CSV has no tc_streak_cap column" fail --balance $T/ok.json --shipset $T/snone.md --shipset-sha $(h $T/snone.md) --expected-balance-sha $OKS --git $T/repo --rc $RN
# D-HOP-2026-10-30-36: the "Not in v5" section (first_worker_hired via_nudge=false) is never parsed as a key
ck "13 fail (CSV placeholder only): REAL file parses; Not in v5 adds no key" fail --balance $T/ok.json --shipset $REAL --shipset-sha $PIN --expected-balance-sha $OKS --git $T/repo --rc $R27
if ! echo "$out" | grep -q 'sha256 .* != pinned' && node -e 'const d=require(process.argv[1]);const p=d.expected.map(e=>e.path);process.exit(p.length===17&&!JSON.stringify(d).match(/via_nudge|first_worker_hired|first_hire/)?0:1)' $T/d.json; then P=$((P+1)); echo "ok   13b real file: no sha failure, 16 keys + 1 tunable, no via_nudge/first_worker_hired key"; else F=$((F+1)); echo "FAIL 13b $out"; fi
sed 's/^- First-hire nudge.*/- m4.flags.firstHireNudge = 0\n- first_worker_hired.via_nudge = 0/' $REAL > $T/ssnv.md; ck "13c pass-parse: key-like lines under Not in v5 are ignored (fixture)" fail --balance $T/ok.json --shipset $T/ssnv.md --shipset-sha $(h $T/ssnv.md) --expected-balance-sha $OKS --git $T/repo --rc $R27
node -e 'const d=require(process.argv[1]);process.exit(d.expected.length===17&&!JSON.stringify(d.expected).match(/firstHireNudge|via_nudge/)?0:1)' $T/d.json && { P=$((P+1)); echo "ok   13d Not-in-v5 key-like lines not in expected keys"; } || { F=$((F+1)); echo "FAIL 13d"; }
# D-HOP-2026-10-30-40: reworded "Not flags" L23 (d170eb09, errata-v5, #T card) keeps telemetry excluded and adds no key (-41: L23 also names TELEMETRY_SCHEMA_VERSION "0.6.2"/legacy:true; still no key)
ck "14a fail (CSV placeholder only): REAL d71ed8cf file with the real pin" fail --balance $T/ok.json --shipset $REAL --shipset-sha $PIN --expected-balance-sha $OKS --git $T/repo --rc $R27
node -e 'const d=require(process.argv[1]);const ex=JSON.stringify(d.expected)+JSON.stringify(d.excluded);const nf=d.not_flags.join(" ");process.exit(d.expected.length===17&&d.excluded.length===0&&!/telemetry|d170eb09|errata|#T|schema/i.test(ex)&&/telemetry v0\.6\.2 .*d170eb09.*errata-v5.*#T card/.test(nf)?0:1)' $T/d.json && { P=$((P+1)); echo "ok   14 real d71ed8cf: L23 stays under Not flags; no telemetry/d170eb09/errata/#T key; 16 keys + 1 tunable"; } || { F=$((F+1)); echo "FAIL 14 $(cat $T/d.json)"; }
sed 's/^- m4.flags.streak = 1/- telemetry v0.6.2 (telemetry-spec.md d170eb09) + telemetry-spec-errata-v5.md: no flag, #T card\n- m4.flags.streak = 1/' $T/ss.md > $T/ssjunk.md; ck "14b fail closed: L23-style text inside Exact config keys is unparseable, never encoded" fail --balance $T/ok.json --shipset $T/ssjunk.md --shipset-sha $(h $T/ssjunk.md) --expected-balance-sha $OKS --git $T/repo --rc $R27
echo "$out" | grep -q 'unparseable line in Exact config keys' && { P=$((P+1)); echo "ok   14c reason = unparseable line"; } || { F=$((F+1)); echo "FAIL 14c $out"; }
# gate 0b block, extracted from the pinned gate and run with stubs (SC = checker dir)
blk=$(sed -n '/^SHIPSET_SHA=/p' "$GATE"; sed -n '/^# 0b ship-flag set/,/^flagck$/p' "$GATE" | grep -v '^BJ=' | grep -v '^flagck$')
gk(){ local name=$1 want=$2 ss=$3 bal=$4 ebs=$5 ecsv=$6 pin=${7:-}; local R=$T/r$RANDOM; mkdir -p $R; cp $bal $R/rc-balance.json
  ( V=$T/v; SC=$(dirname $C); S7=t; HF=0; SUM=$R/summary.txt; BJ=$R/rc-balance.json; BSHA=$(h $BJ); GIT=$T/repo; FULL=$R27; SHIPSET=$ss; EBS=$ebs; ECSV=$ecsv; say(){ echo "$*" >> $R/status.log; }
    eval "$blk"; [ -n "$pin" ] && SHIPSET_SHA=$pin; flagck >/dev/null; echo "HF=$HF" ) > $R/out.txt 2>&1
  hf=$(grep -o 'HF=[0-9]*' $R/out.txt | tail -1); n=$(grep -cE 'balance.json@.* sha256 [0-9a-f]{64}|ship-set .* sha256 |derived.json sha256 ' $R/status.log); tl=$(grep -c '^TUNABLE tc_streak_cap: ship-set 0.27, balance .*, csv ' $R/status.log)
  if { { [ $want = pass ] && [ "$hf" = HF=0 ]; } || { [ $want = fail ] && [ "$hf" = HF=1 ]; }; } && [ "$n" = 3 ] && { [ "$tl" = 1 ] || [ ! -f "$ss" ]; }; then P=$((P+1)); echo "ok   $name ($hf; 3 sha lines + cap line in status.log)"; else F=$((F+1)); echo "FAIL $name ($hf n=$n tl=$tl) $(cat $R/out.txt $R/status.log)"; fi; }
gk "G-a gate: fixture match passes (pin = fixture sha, no override)" pass $T/ss.md $T/ok.json $OKS "" $SSH
gk "G-b gate: REAL ship-set + real pin fails closed" fail $REAL $T/ok.json $OKS ""
gk "G-c gate: fixture ship-set vs real pin fails (sha != d71ed8cf)" fail $T/ss.md $T/ok.json $OKS ""
gk "G-d gate: ship-set missing fails closed" fail $T/none.md $T/ok.json $OKS ""
gk "G-e gate: no expected sha, no pinned file fails closed" fail $T/ss.md $T/ok.json "" "" $SSH
gk "G-f gate: ECONOMY_CSV override != ship-set path fails" fail $T/ss.md $T/ok.json $OKS data/economy.f1.csv $SSH
gk "G-g gate: ECONOMY_CSV override == ship-set path passes" pass $T/ss.md $T/ok.json $OKS data/economy.csv $SSH
echo "RESULT pass=$P fail=$F"; rm -rf "$T"; [ $F = 0 ]
