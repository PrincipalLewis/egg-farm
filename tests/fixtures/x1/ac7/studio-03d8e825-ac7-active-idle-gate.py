#!/usr/bin/env python3
"""QA 2x active/idle gate (HoP 23:15 / ac7-qa-threshold-changes.md).
10-min window; >=30 seeds; P95<=2.0 and worst<=2.25; F22-24 exception P95<=2.15 (worst still <=2.25).
Strictest reading: check F in {10,18,22,23,24}; player=optimal with ALL stack (Focus 10% as in logged exception);
TR h_base=36/v_base=48 (adopted). Uses product/sim/m4/m4_active.py read-only.
Exit 0 PASS / 1 FAIL.
"""
import math, sys, statistics as st
sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'stub'))  # FIXTURE: only changed line
import m4_active as a
N = int(sys.argv[1]) if len(sys.argv) > 1 else 30
if N < 30:
  print('ERROR: need >=30 seeds'); sys.exit(2)
# Strictest: adopted F1/M4 track bases; ALL stack matching run_ratio / HoP Focus exception context
TR = dict(a.TR, h_base=36, v_base=48, v_cap=3, price='A')
ALL = dict(cb=0.05, leave_pen=0.05, streak=True, st_spec=True, st_cap=0.30, egg=True, egg_v=3,
           abil=True, focus=0.10, focus_cards=1)
FS = (10, 18, 22, 23, 24)
seeds = range(N)
need = math.ceil(0.95 * N)
def p95(vals):
  return sorted(vals)[need - 1]
print(f'QA ac7-active-idle-gate | CSV {a.CSV} | {N} seeds | need index {need} | ALL stack focus=0.10 | player=optimal vs idle')
print('| F | P95 limit | mean | P95 | worst | verdict |')
print('|---|---|---|---|---|---|')
fail = 0
for F in FS:
  lim = 2.15 if 22 <= F <= 24 else 2.0
  ratios = []
  for s in seeds:
    act = a.window(F, F, F, max(0, F - 3), 'optimal', ALL, s, TR)
    idle = a.window(F, F, F, max(0, F - 3), 'idle', {}, s, TR)
    ratios.append(act / idle if idle > 0 else float('inf'))
  ratios.sort()
  mean, p, w = st.mean(ratios), p95(ratios), ratios[-1]
  ok = p <= lim and w <= 2.25
  if not ok: fail += 1
  print(f'| F{F} | {lim:.2f} | {mean:.3f} | {p:.3f} | {w:.3f} | {"PASS" if ok else "FAIL"} |')
print(f'RESULT: {"PASS" if fail == 0 else "FAIL"} ({len(FS) - fail}/{len(FS)} levels)')
sys.exit(0 if fail == 0 else 1)
