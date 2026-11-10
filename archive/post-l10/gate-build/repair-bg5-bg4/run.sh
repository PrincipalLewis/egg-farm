#!/bin/bash
# repair-bg5-bg4 runner (SYNTHETIC only; no bytecode; writes only inside repair-bg5-bg4/).
# run.sh <mode> <tag>  -> logs/<tag>.log + logs/<tag>.exit
#   suite      : pkg/tests (incl. repair-bg12 BG1/BG2 tests) + tests/ (BG5) against pkg/
#   bg5-old    : tests/test_bg5.py against baseline/ (= byte copy of repair-bg12/pkg, the pre-BG5 code) -> must FAIL
#   bg12suite  : repair-bg12/pkg/tests VERBATIM (copied to .tmp, never edited) against pkg/ code
#   mutate     : pkg/mutate.py (expanded) against pkg/
#   proofs     : proofs/prove_bg5.py against baseline/ and pkg/
set -u
R=/workspace/egg-farm-studio/scratch/post-l10/gate-build/repair-bg5-bg4; export PYTHONDONTWRITEBYTECODE=1; L="$R/logs/$2"
case "$1" in
  suite)     (cd "$R/pkg" && python3 -m unittest discover -s tests -p 'test_*.py' -v && GB_TARGET="$R/pkg" python3 -m unittest discover -s "$R/tests" -p 'test_*.py' -v) ;;
  bg5-old)   (cd "$R/baseline" && GB_TARGET="$R/baseline" python3 -m unittest discover -s "$R/tests" -p 'test_bg5.py' -v) ;;
  bg12suite) X="$R/.tmp/bg12suite"; rm -rf "$X"; mkdir -p "$X"; cp "$R"/pkg/*.py "$R/pkg/authority.json" "$X/"; cp -r /workspace/egg-farm-studio/scratch/post-l10/gate-build/repair-bg12/pkg/tests "$X/tests"
             (cd "$X" && sha256sum tests/*.py && python3 -m unittest discover -s tests -p 'test_*.py' -v) ;;
  mutate)    (cd "$R/pkg" && python3 mutate.py) ;;
  proofs)    (cd "$R/proofs" && for t in baseline pkg; do echo "== $t"; GB_TARGET="$R/$t" GB_OUT="$R/proofs/$2-$t.json" python3 prove_bg5.py; echo "exit=$?"; done) ;;
esac > "$L.log" 2>&1; echo $? > "$L.exit"; rm -rf "$R/.tmp" "$R/pkg/.tmp" "$R/baseline/.tmp"
