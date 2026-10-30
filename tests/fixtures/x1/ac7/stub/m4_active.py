"""Test stub for product/sim/m4/m4_active.py (pacing-x1-ac7 unit tests only). Same names the AC7 gate uses: CSV (built-in
default, like m4_active's hard-coded f1 path), R, SP, m.spec_from_csv, TR, window(). window() is deterministic: active/idle
= 1.5, so the gate's own logic says PASS. It exists so the REAL argv/CSV-RECORD code of the two gate scripts runs in CI."""
import csv, os, types
CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'builtin-default.csv')
R = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open(CSV))]
m = types.SimpleNamespace(spec_from_csv=lambda path: {'path': path})
SP = m.spec_from_csv(CSV)
TR = {}
def window(F, a, b, c, player, stack, seed, tr): return 1.5 if player == 'optimal' else 1.0
