#!/bin/bash
# Self-test for v5-saves-gate.sh results signing (fix 2026-10-30). Builds a full mock results folder, signs it through the gate's
# own code path (v5-saves-gate.sh --selftest-sign -> sign_results), then asserts:
#  P1 sha256sum -c SHA256SUMS passes        P2 sha256sum -c STATUS.sha256 passes     P3 status.log not in SHA256SUMS, everything else is
#  P4 nothing touched status.log after it was signed (re-hash == STATUS.sha256)      P5 gate's own SHA256SUMS.check.txt has no FAILED
#  N1 tamper a suite log -> -c SHA256SUMS fails     N2 tamper status.log -> -c STATUS.sha256 fails     N3 delete a signed file -> -c SHA256SUMS fails
#  L1 control: the pre-fix L72 one-liner on the same mock fails on status.log (proves the test detects the original bug)
# usage: selftest-gate-sums.sh [outdir]   (default qa/v5-saves/changes-20261030/selftest-gate-sums; never /tmp, rule 19)
set -u -o pipefail
SC=$(cd "$(dirname "$0")" && pwd); GATE=$SC/v5-saves-gate.sh; OUT=$(realpath -m "${1:-$SC/../changes-20261030/selftest-gate-sums}")
case "$OUT" in /tmp/*|*/tmp/*) echo "refusing $OUT"; exit 2;; esac
rm -rf "$OUT"; mkdir -p "$OUT"; P=0; F=0
ok(){ echo "PASS $*"; P=$((P+1)); }; ko(){ echo "FAIL $*"; F=$((F+1)); }
mock(){ local R=$1; mkdir -p "$R"/{saves-chromium/shots,saves-firefox,telemetry,telemetry-firefox,csr8,resetat-a,resetat-b,ss15,.serve/x}
  local ST=$R/status.log; say(){ echo "$(date '+%F %T %Z') $*" >> "$ST"; }
  say "lock window: Saves first, exclusive, 7200s across all engines; warning at 6300s"; say "gate=v5-rc-saves rc=0000000000000000000000000000000000000000 dry=1 *** SELFTEST ***"
  for id in G0-port-free G0-tools G0-pins G1-build G1-build-id S-chromium S-firefox T-chromium T2-firefox V-oq2 V-noreg-base V-noreg-rc V-noreg-compare B-csr8-lease B-resetat-AC1-3 B-resetat-AC4-CLK; do
    say "START $id"; printf 'mock log for %s\nline 2\n' "$id" > "$R/$id.log"; echo "$id | PASS | HARD | exit 0" >> "$R/summary.txt"; say "END $id PASS"; done
  echo '<!doctype html><title>m4.1+0000000</title>' > "$R/rc-egg-farm.html"; echo "deadbeef  size 42  build-id m4.1+0000000" > "$R/rc-build.txt"; : > "$R/porcelain-after-ci.txt"
  echo '{"cases":3}' > "$R/saves-chromium/result.json"; head -c 2048 /dev/urandom > "$R/saves-chromium/shots/a.png"; echo '{}' > "$R/saves-firefox/result.json"
  echo '{"pass":25}' > "$R/telemetry/result.json"; echo '{}' > "$R/telemetry-firefox/result.json"; echo DONE fails=0 > "$R/csr8/out.txt"; echo ok > "$R/resetat-a/r.txt"; echo ok > "$R/resetat-b/r.txt"
  echo '{}' > "$R/noreg-rc-0000000.json"; echo '{}' > "$R/noreg-base-30b29d3.json"; echo 'valid-DIFF 0, errors 0' > "$R/noreg-compare.txt"; echo served > "$R/.serve/x/index.html"
  echo "lock window used: 1 min of 120" >> "$ST"; echo "VERDICT: PASS (hard_fail=0) DRYRUN" >> "$R/summary.txt"; say "DONE PASS"; }
# --- positive
R=$OUT/mock-results; mock "$R"; bash "$GATE" --selftest-sign "$R" > "$OUT/sign.stdout" 2>&1; echo "sign exit $?" >> "$OUT/sign.stdout"
(cd "$R" && sha256sum -c SHA256SUMS > "$OUT/P1.check.txt" 2>&1) && ok "P1 sha256sum -c SHA256SUMS ($(grep -c ': OK$' "$OUT/P1.check.txt") OK, 0 FAILED)" || ko "P1 sha256sum -c SHA256SUMS: $(grep -v ': OK$' "$OUT/P1.check.txt" | head -3)"
(cd "$R" && sha256sum -c STATUS.sha256 > "$OUT/P2.check.txt" 2>&1) && ok "P2 sha256sum -c STATUS.sha256 ($(cat "$OUT/P2.check.txt"))" || ko "P2 STATUS.sha256: $(cat "$OUT/P2.check.txt")"
EXP=$(cd "$R" && find . -type f ! -name SHA256SUMS ! -name SHA256SUMS.check.txt ! -name STATUS.sha256 ! -path ./status.log ! -path '*/.serve/*' | sort); GOT=$(cut -c67- "$R/SHA256SUMS")
! grep -q ' \./status\.log$' "$R/SHA256SUMS" && [ "$EXP" = "$GOT" ] && ok "P3 manifest = all $(echo "$GOT" | wc -l) files except status.log/.serve/self" || ko "P3 manifest membership: $(diff <(echo "$EXP") <(echo "$GOT") | head -5)"
grep -q 'SHA256SUMS -c OK' "$R/status.log" && tail -1 "$R/status.log" | grep -qP '^[0-9.,]+[KMGT]?\t'"$R"'$' && [ "$(cd "$R" && sha256sum status.log)" = "$(cat "$R/STATUS.sha256")" ] && ok "P4 status.log final before signing (last line: $(tail -1 "$R/status.log"))" || ko "P4 status.log changed after signing"
! grep -q FAILED "$R/SHA256SUMS.check.txt" && grep -q '^status.log: OK$' "$R/SHA256SUMS.check.txt" && ok "P5 gate check file: $(grep -c ': OK$' "$R/SHA256SUMS.check.txt") OK incl. status.log" || ko "P5 gate check file: $(grep FAILED "$R/SHA256SUMS.check.txt")"
# --- negative controls (on copies; the signed mock stays intact as evidence)
N=$OUT/neg-suite; cp -a "$R" "$N"; echo tampered >> "$N/S-chromium.log"; (cd "$N" && sha256sum -c SHA256SUMS > "$OUT/N1.check.txt" 2>&1) && ko "N1 tampered S-chromium.log still passes" || ok "N1 tamper S-chromium.log -> -c FAILS ($(grep FAILED "$OUT/N1.check.txt" | head -1))"
N=$OUT/neg-status; cp -a "$R" "$N"; echo "$(date '+%F %T %Z') late line" >> "$N/status.log"; (cd "$N" && sha256sum -c STATUS.sha256 > "$OUT/N2.check.txt" 2>&1) && ko "N2 late status.log line still passes" || ok "N2 late status.log line -> -c STATUS.sha256 FAILS ($(grep FAILED "$OUT/N2.check.txt" | head -1))"
N=$OUT/neg-deleted; cp -a "$R" "$N"; rm "$N/telemetry/result.json"; (cd "$N" && sha256sum -c SHA256SUMS > "$OUT/N3.check.txt" 2>&1) && ko "N3 deleted file still passes" || ok "N3 delete telemetry/result.json -> -c FAILS ($(grep -m1 -E 'FAILED|No such' "$OUT/N3.check.txt"))"
# --- legacy control: the original L72 (verbatim) on a fresh mock must fail on status.log
L=$OUT/legacy-l72; mock "$L"; ST=$L/status.log; say(){ echo "$(date '+%F %T %Z') $*" | tee -a "$ST"; }; R0=$R; R=$L
{ (cd "$R" && find . -type f ! -name SHA256SUMS ! -path '*/.serve/*' | sort | xargs sha256sum > SHA256SUMS); (cd "$R" && sha256sum -c SHA256SUMS > "$R/SHA256SUMS.check.txt" 2>&1) && say "SHA256SUMS -c OK $(sha256sum $R/SHA256SUMS | cut -c1-64)" || say "SHA256SUMS -c FAILED (see SHA256SUMS.check.txt)"; du -sh "$R" | tee -a "$ST"; } > /dev/null
R=$R0; (cd "$L" && sha256sum -c SHA256SUMS > "$OUT/L1.check.txt" 2>&1) && ko "L1 legacy L72 unexpectedly passes" || ok "L1 legacy L72 -> later -c FAILS ($(grep FAILED "$OUT/L1.check.txt" | head -1)) = original bug reproduced"
echo "SELFTEST gate-sums: $P passed, $F failed"; [ $F = 0 ]
