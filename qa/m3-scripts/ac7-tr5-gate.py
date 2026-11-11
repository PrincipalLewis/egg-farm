#!/usr/bin/env python3
"""QA TR-5 gate — HoP 23:15 + 23:30 rulings (ac7-qa-threshold-changes.md).
QA-owned; does not edit product/farm/m4/tr5_run.py.

Hard PASS/FAIL:
  need=ceil(0.95N); F18 17.8-21.7; L@30 L18-22; gap P95<=3.0 + worst<=4.0;
  L18-25 absolute level time worst-seed <=8 min;
  level-step ratio HARD only from L30+ (P95<=2.0, worst<=2.25), ratio counts only when
  previous level took >=1 min.

Warn-only (never flips RESULT):
  L18-29 step-ratio P95/worst with prev>=1 min floor (L26-29 ratio-only; L18-25 also has abs <=8 min hard).
  Table of every seed ratio >2.25x. Legacy prev>=30 s printed as [HIST] only.

Default table: economy.csv if M4 cols, else economy.f1-m4cols.csv.
Exit 0 PASS / 1 FAIL / 2 usage.
"""
import argparse, csv, math, os, sys, statistics as st
STUDIO = '/workspace/egg-farm-studio'
PROD = os.path.join(STUDIO, 'product')
HERE = os.path.join(PROD, 'farm', 'm4')
ap = argparse.ArgumentParser()
ap.add_argument('--csv')
ap.add_argument('--seeds', type=int, default=30)
ap.add_argument('--minutes', type=int, default=30)
ap.add_argument('--scenario', default='standard', choices=['standard', 'casual', 'd25'])
a = ap.parse_args()
if a.seeds < 30:
  print('ERROR: HoP standard requires >=30 seeds for P95'); sys.exit(2)
M4COLS = ('hens_cost', 'egg_value_cost')
def has_m4(p):
  try: h = next(csv.reader(open(p)))
  except Exception: return False
  return all(c in h for c in M4COLS)
default = os.path.join(PROD, 'economy.csv')
fallback = os.path.join(PROD, 'economy.f1-m4cols.csv')
path = a.csv or (default if has_m4(default) else fallback)
if not os.path.exists(path): print(f'ERROR: table not found: {path}'); sys.exit(2)
os.environ['ECON_CSV'] = path
sys.path.insert(0, HERE); import m4_sim as m
m.TUNE.update(hb=36.0, hg=1.30, vb=48.0, vg=1.33)
src = 'formula params Hens 36x1.3^H, Value 48x1.33^V'
if has_m4(path):
  rows = list(csv.DictReader(open(path))); hc = [float(r['hens_cost']) for r in rows]; vc = [float(r['egg_value_cost']) for r in rows]
  if 'hens_cap_over_farm' in rows[0]: m.TUNE['hcap'] = int(float(rows[0]['hens_cap_over_farm']))
  if 'egg_value_cap_over_farm' in rows[0]: m.TUNE['vcap'] = int(float(rows[0]['egg_value_cap_over_farm']))
  base_cost = m.cost
  def cost(k, L, T=m.TUNE):
    if L >= 30: return math.inf
    if k == 'h': return hc[int(L)]
    if k == 'v': return vc[int(L)]
    return base_cost(k, L, T)
  m.cost = cost; src = 'table columns hens_cost / egg_value_cost'
model = {'standard': 's15', 'casual': 'casual', 'd25': 'd25'}[a.scenario]
rs = [m.run(('greedy', s, model, a.minutes * 60, None)) for s in range(a.seeds)]
N = len(rs)
need_old = math.ceil(0.8 * N); need = math.ceil(0.95 * N)
STEP_MAX, STEP_WORST = 2.0, 2.25
GAP_P95_MAX, GAP_WORST = 3.0, 4.0  # Economy: gap P95<=3 / worst<=4 at every level (run-wide purchase gaps)
FLOOR_1MIN, FLOOR_30S = 60.0, 30.0  # HoP: >=1 min; legacy 30 s for info
LT_ABS_LO, LT_ABS_HI, LT_WORST_MIN = 18, 25, 8.0  # absolute level-time guard
WARN_LO, WARN_HI, HARD_FROM = 18, 29, 30

t18 = [r['reach'].get(18, math.inf) / 60 for r in rs]
L30 = [r['L30'] for r in rs]
gaps = [r['gap'][0] / 60 for r in rs]

def band_count(vals, lo, hi):
  return sum(lo <= v <= hi for v in vals)
def p95(vals):
  v = sorted(vals); return v[need - 1]
def steps(r):
  t = sorted((L, x) for L, x in r['reach'].items() if x != math.inf)
  return [(t[i][0], t[i][1] - t[i - 1][1], t[i - 1][1], t[i][1]) for i in range(1, len(t))]
  # (L, dt_s, t_prev_reach, t_reach)

def ratios_for(r, lo, hi, floor_s):
  """List of (ratio, L, dt_prev_s, dt_s, t_prev, t_cur) for transitions into L in [lo,hi]."""
  d = steps(r); out = []
  for i in range(1, len(d)):
    L_prev, dt_prev, _, _ = d[i - 1]
    L, dt, t_prev, t_cur = d[i]
    if not (lo <= L <= hi): continue
    if dt_prev < floor_s: continue  # HoP: previous level must take >= floor
    out.append((dt / dt_prev, L, dt_prev, dt, t_prev, t_cur))
  return out

def worst_ratio(r, lo, hi, floor_s):
  rr = ratios_for(r, lo, hi, floor_s)
  return max(rr, key=lambda x: x[0]) if rr else None

def ratio_summary(lo, hi, floor_s):
  got = []
  for s, r in enumerate(rs):
    w = worst_ratio(r, lo, hi, floor_s)
    if w: got.append((s, w))
  if not got: return None
  vals = sorted(x[1][0] for x in got)
  p = vals[min(len(vals), math.ceil(0.95 * len(vals))) - 1]
  seed_w, w = max(got, key=lambda x: x[1][0])
  return dict(p95=p, worst=w[0], worst_L=w[1], worst_seed=seed_w, n=len(got),
              pass_=p <= STEP_MAX and w[0] <= STEP_WORST, rows=got)

t_n = band_count(t18, 17.8, 21.7); l_n = band_count(L30, 18, 22)
t_med, l_med, g_med = st.median(t18), st.median(L30), st.median(gaps)
g_p95 = p95(gaps); gap_worst_r = max(rs, key=lambda r: r['gap'][0])['gap']; g_worst = gap_worst_r[0] / 60

# Absolute L18-25 level times (seconds -> min)
lt_abs = []
for s, r in enumerate(rs):
  for L, dt, _, _ in steps(r):
    if LT_ABS_LO <= L <= LT_ABS_HI:
      lt_abs.append((dt / 60, L, s))
lt_w = max(lt_abs) if lt_abs else None
lt_ok = lt_w is None or lt_w[0] <= LT_WORST_MIN

hard = ratio_summary(HARD_FROM, 10**9, FLOOR_1MIN)
warn = ratio_summary(WARN_LO, WARN_HI, FLOOR_1MIN)
warn30 = ratio_summary(WARN_LO, WARN_HI, FLOOR_30S)  # informational legacy floor

# OLD pre-HoP
old_t = (17.8 <= t_med <= 21.7) and t_n >= need_old
old_l = (18 <= l_med <= 22) and l_n >= need_old
old_g = (0 <= g_med <= GAP_P95_MAX) and band_count(gaps, 0, GAP_P95_MAX) >= need_old
old_ok = old_t and old_l and old_g

# NEW hard
new_t = t_n >= need; new_l = l_n >= need
new_g = g_p95 <= GAP_P95_MAX and g_worst <= GAP_WORST
s_ok = hard is None or hard['pass_']
new_ok = new_t and new_l and new_g and lt_ok and s_ok

fmt = lambda x: 'not reached' if x == math.inf else f'{x:.2f}'
print(f'QA ac7-tr5-gate | table {os.path.relpath(path, PROD)} | {src} | seeds {N} | need_old={need_old} need_new={need}')
print(f'[{"PASS" if new_t else "FAIL"}] F18 17.8-21.7: median {fmt(t_med)}, in band {t_n}/{N} (need {need}); OLD={"PASS" if old_t else "FAIL"}')
print(f'[{"PASS" if new_l else "FAIL"}] L@30 L18-22: median L{l_med:g}, in band {l_n}/{N}; OLD={"PASS" if old_l else "FAIL"}')
print(f'[{"PASS" if new_g else "FAIL"}] gap: P95 {g_p95:.2f} (<= {GAP_P95_MAX:g}), worst {g_worst:.2f} (<= {GAP_WORST:g}) at F{gap_worst_r[1]}; OLD={"PASS" if old_g else "FAIL"}')
if hard is None:
  print(f'[PASS] level-step ratio L{HARD_FROM}+ (HARD, prev>=1 min): n/a (no seed reached L{HARD_FROM}+1 in {a.minutes} min)')
else:
  print(f'[{"PASS" if s_ok else "FAIL"}] level-step ratio L{HARD_FROM}+ (HARD, prev>=1 min): P95 {hard["p95"]:.2f}x, worst {hard["worst"]:.2f}x at F{hard["worst_L"]} seed {hard["worst_seed"]} ({hard["n"]}/{N} seeds)')
print(f'[{"PASS" if lt_ok else "FAIL"}] level time L{LT_ABS_LO}-{LT_ABS_HI} worst seed <= {LT_WORST_MIN:g} min: ' +
      ('n/a' if lt_w is None else f'worst {lt_w[0]:.2f} min at F{lt_w[1]} seed {lt_w[2]}'))

# WARN-only L18-29
def emit_warn(tag, sm):
  if sm is None:
    print(f'[WARN] {tag}: n/a (no ratios)'); return
  flag = 'WARN' if not sm['pass_'] else 'WARN-OK'
  print(f'[{flag}] {tag}: P95 {sm["p95"]:.2f}x, worst {sm["worst"]:.2f}x at F{sm["worst_L"]} seed {sm["worst_seed"]} '
        f'(target P95<={STEP_MAX:g} worst<={STEP_WORST:g}; WARN-ONLY does not fail RESULT)')
emit_warn(f'L{WARN_LO}-{WARN_HI} step ratio WARN (prev>=1 min; L18-25 abs hard separately; L26-29 ratio warn-only; hard ratio L30+)', warn)
print('[HIST] L18-29 step ratio under legacy prev>=30 s floor (not the WARN bar; Economy 23:35: floor is >=1 min):')
if warn30 is None:
  print('[HIST] n/a')
else:
  print(f'[HIST] P95 {warn30["p95"]:.2f}x, worst {warn30["worst"]:.2f}x at F{warn30["worst_L"]} seed {warn30["worst_seed"]} (historical 30 s floor only)')

# Table: every seed ratio >2.25x under HoP >=1 min floor, L18-29
print('--- seeds with L18-29 step ratio >2.25x (prev level >=1 min); informational ---')
print('| seed | level pair | t(L-1) min | t(L) min | ratio |')
print('|---|---|---|---|---|')
n_over = 0
for s, r in enumerate(rs):
  for ratio, L, dt_prev, dt, t_prev, t_cur in ratios_for(r, WARN_LO, WARN_HI, FLOOR_1MIN):
    if ratio > STEP_WORST:
      n_over += 1
      print(f'| {s} | F{L-1}->F{L} | {dt_prev/60:.2f} | {dt/60:.2f} | {ratio:.2f}x |')
if n_over == 0:
  print('| — | none | — | — | — |')
print(f'over_2.25x_count={n_over}')

print('--- seeds with L18-29 step ratio >2.25x (prev level >=30 s, legacy); informational ---')
print('| seed | level pair | t(L-1) min | t(L) min | ratio |')
print('|---|---|---|---|---|')
n_over30 = 0
for s, r in enumerate(rs):
  for ratio, L, dt_prev, dt, t_prev, t_cur in ratios_for(r, WARN_LO, WARN_HI, FLOOR_30S):
    if ratio > STEP_WORST:
      n_over30 += 1
      print(f'| {s} | F{L-1}->F{L} | {dt_prev/60:.2f} | {dt/60:.2f} | {ratio:.2f}x |')
if n_over30 == 0:
  print('| — | none | — | — | — |')
print(f'over_2.25x_count_legacy30s={n_over30}')

print(f'OLD_RESULT: {"PASS" if old_ok else "FAIL"}')
print(f'NEW_RESULT: {"PASS" if new_ok else "FAIL"}')
print('RESULT:', 'PASS' if new_ok else 'FAIL')
sys.exit(0 if new_ok else 1)
